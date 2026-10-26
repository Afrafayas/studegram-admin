const DISPLAY_ID = /^[A-Z][A-Z0-9]*-\d+$/i;

export function getDisplayId(record, fallback = '—') {
  const values = typeof record === 'string' ? [record] : [record?.displayId, record?.camsId, record?.partnerCode,
    record?.studentCode, record?.courseCode, record?.commissionId, record?.staffCode];
  return values.find(value => typeof value === 'string' && DISPLAY_ID.test(value)) || fallback;
}

// Preserve database identity for API requests, React keys, and relationships.
export function normalizeDisplayIds(value) {
  if (Array.isArray(value)) return value.map(normalizeDisplayIds);
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return value;
  const record = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalizeDisplayIds(child)]));
  if (typeof record.displayId === 'string' && DISPLAY_ID.test(record.displayId)) {
    const alias = { APP: 'camsId', CRS: 'courseCode', STD: 'studentCode', AGT: 'partnerCode', COM: 'commissionId', USR: 'staffCode', AST: 'staffCode' }[record.displayId.split('-')[0]];
    if (alias) record[alias] = record.displayId;
  }
  return record;
}
