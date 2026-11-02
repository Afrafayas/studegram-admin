import { parseDocumentNames, planDocumentBatch } from './documentNames.mjs';
const identity = file => JSON.stringify([file.name, file.size, file.lastModified, file.type]);
export function appendDocumentFiles(existing, files, names = '') {
  planDocumentBatch(files, ''); // Validate the entire selection before changing the queue.
  const entries = [...existing];
  const seen = new Set(existing.map(entry => identity(entry.file)));
  const pending = parseDocumentNames(names);
  let consumed = 0;
  for (const file of files) {
    const id = identity(file);
    if (seen.has(id)) continue;
    seen.add(id);
    entries.push({ id, file, name: pending[consumed] || '' });
    consumed++;
  }
  return { entries, remainingNames: pending.slice(consumed).join(', ') };
}
export function planQueuedDocuments(entries) {
  if (!entries.length) throw new Error('Choose files to upload.');
  return entries.map(entry => ({ ...planDocumentBatch([entry.file], '')[0], ...entry, name: entry.name || entry.file.name }));
}
