import API, { API_BASE_URL } from '../api/axios';

// Uploaded documents can be 10 MB; allow slower connections to finish.
const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;

export function resolveDocumentUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const source = value.trim();
  if (/^(https?:|blob:|data:)/i.test(source)) return source;
  if (/^\/?uploads\//i.test(source)) {
    return new URL(`/${source.replace(/^\//, '')}`, new URL(API_BASE_URL, window.location.origin)).href;
  }
  // Older records can contain the file itself as base64.
  if (/^[A-Za-z0-9+/\s]+={0,2}$/.test(source)) return `data:application/octet-stream;base64,${source}`;
  return '';
}

export function documentFileName(doc, url) {
  const explicit = typeof doc === 'object' && doc ? (doc.fileName || doc.originalName) : '';
  let urlName = '';
  try {
    if (/^https?:/i.test(url)) urlName = decodeURIComponent(new URL(url).pathname.split('/').pop());
  } catch { /* Fall back to the stored name if the URL is malformed. */ }
  const title = typeof doc === 'object' && doc ? (doc.name || doc.title) : '';
  return Array.from(explicit || urlName || title || 'application_document', character =>
    character === '/' || character === '\\' || character.charCodeAt(0) < 32 ? '_' : character
  ).join('');
}

export async function downloadApplicationDocument(source, fileName) {
  const url = resolveDocumentUrl(source);
  if (!url) throw new Error('The original file is unavailable. Please upload it again.');
  let blob;
  try {
    const response = await fetch(url, {
      cache: 'no-store', signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error('Unable to retrieve the file.');
    blob = await response.blob();
  } catch (error) {
    if (!/^https?:/i.test(url)) throw error;
    // The API can retrieve its own S3 objects without relying on bucket CORS.
    try {
      const response = await API.get('/upload/download', {
        params: { url, filename: fileName }, responseType: 'blob', timeout: DOWNLOAD_TIMEOUT_MS,
      });
      blob = response.data;
    } catch (fallbackError) {
      if (fallbackError.response?.status === 404) {
        throw new Error('The file download failed and the API download endpoint is unavailable. Please try again after refreshing the page.');
      }
      throw new Error('Unable to download the original file. Please try again or contact support.');
    }
  }
  if (!blob.size) throw new Error('The uploaded file is empty.');
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName || 'application_document';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser time to start reading the file before releasing its URL.
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
}
