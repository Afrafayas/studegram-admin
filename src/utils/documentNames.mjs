export const STUDENT_DOCUMENTS = [
  'Passport Bio Page', 'Passport Front Page', 'Passport Back Page', 'Passport Size Photograph',
  '10th Marksheet', '10th Certificate', '12th Marksheet', '12th Certificate', 'Diploma Certificate',
  'Diploma Transcripts', 'Degree Certificate', 'Provisional Degree Certificate', 'Academic Transcripts',
  'Semester Marksheets', 'Consolidated Marksheet', 'Medium of Instruction Certificate',
  'IELTS Score Report', 'PTE Score Report', 'TOEFL Score Report', 'Duolingo Score Report',
  'Statement of Purpose', 'Letter of Recommendation', 'Resume / CV', 'Work Experience Certificate',
  'Gap Explanation Letter', 'Offer Letter', 'Admission Letter', 'Tuition Fee Receipt',
  'Bank Statement', 'Education Loan Letter', 'Financial Sponsorship Letter', 'Affidavit of Support',
  'Birth Certificate', 'National ID', 'Visa', 'Visa Refusal Letter', 'Medical Certificate',
  'Police Clearance Certificate', 'Other Supporting Document'
];
export const AGENT_DOCUMENTS = [
  'Company Incorporation Certificate', 'Business Registration License', 'Tax / GST Registration Certificate',
  'PAN Card', 'Authorised Signatory ID Proof', 'Individual ID Proof (Passport / National ID)',
  'Address Proof / Resume', 'Company Address Proof', 'Bank Statement', 'Cancelled Cheque',
  'Bank Account Proof', 'Agency Agreement', 'Authorisation Letter', 'Company Profile',
  'Professional License', 'Other Agent Document'
];
export const parseDocumentNames = value => String(value || '').split(',').map(name => name.trim()).filter(Boolean);
export function documentNamesForRole(role) {
  if (role === 'Student') return STUDENT_DOCUMENTS;
  if (role === 'Agent') return AGENT_DOCUMENTS;
  throw new Error('Choose Student or Agent for document names.');
}
export function planDocumentBatch(files, value) {
  const names = parseDocumentNames(value);
  if (!files.length) throw new Error('Choose files to upload.');
  if (names.length && names.length !== files.length) throw new Error('Select one document name per file, in file selection order.');
  return files.map((file, index) => {
    if (file.size > 15 * 1024 * 1024) throw new Error(file.name + ': maximum file size is 15 MB.');
    if (!/\.(pdf|doc|docx|png|jpe?g)$/i.test(file.name)) throw new Error(file.name + ': choose PDF, Word, PNG or JPG.');
    return { file, name: names[index] || file.name };
  });
}
export async function uploadDocumentBatch(api, plan) {
  const results = await Promise.allSettled(plan.map(async ({ file, name }) => {
    const data = new FormData(); data.append('file', file);
    const response = await api.post('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    const url = response.data?.url || response.data?.fileUrl;
    if (!response.data?.success || !url) throw new Error('Upload failed. Please retry.');
    return { name, title: name, fileName: file.name, url, previewUrl: url, type: file.type?.includes('pdf') ? 'pdf' : file.type?.startsWith('image/') ? 'image' : file.type, uploadedAt: new Date().toISOString() };
  }));
  return { uploaded: results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []), failed: results.flatMap((result, index) => result.status === 'rejected' ? [{ ...plan[index], error: result.reason?.message || 'Upload failed.' }] : []) };
}

export function addCustomDocumentName(current, raw, multiple = true) {
  const name = String(raw || '').trim();
  if (!name) throw new Error('Enter a document name.');
  if (name.length > 200) throw new Error('Document names must be 200 characters or fewer.');
  if (name.includes(',')) throw new Error('Add one document name at a time, without commas.');
  if (!multiple) return name;
  const selected = parseDocumentNames(current);
  return selected.some(item => item.toLowerCase() === name.toLowerCase()) ? selected.join(', ') : [...selected, name].join(', ');
}