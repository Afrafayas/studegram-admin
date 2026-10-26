import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDisplayId, normalizeDisplayIds } from '../src/utils/displayId.js';

test('visible references use stored display IDs and never fall back to a database ID', () => {
  const raw = '6adf605c7132b76a3a1769d5';
  assert.equal(getDisplayId({ _id: raw, displayId: 'APP-001' }), 'APP-001');
  assert.equal(getDisplayId({ _id: raw, camsId: raw }), '—');
  assert.equal(getDisplayId(raw), '—');
  assert.equal(getDisplayId({ displayId: 'CRS-1000' }), 'CRS-1000');
});
test('normalization preserves API identities and nested relationships while adding display aliases', () => {
  const raw = '6adf605c7132b76a3a1769d5';
  const payload = { data: [{ _id: raw, id: raw, displayId: 'APP-001', partner: { _id: 'agent-id', displayId: 'AGT-002' }, course: { _id: 'course-id', displayId: 'CRS-013' } }] };
  const normalized = normalizeDisplayIds(payload);
  assert.equal(normalized.data[0]._id, raw);
  assert.equal(normalized.data[0].id, raw);
  assert.equal(normalized.data[0].camsId, 'APP-001');
  assert.equal(normalized.data[0].partner._id, 'agent-id');
  assert.equal(normalized.data[0].partner.partnerCode, 'AGT-002');
  assert.equal(normalized.data[0].course.courseCode, 'CRS-013');
  assert.equal(payload.data[0].camsId, undefined);
});
test('download blobs are preserved without rewriting their content', () => {
  const blob = new Blob(['document bytes']);
  assert.equal(normalizeDisplayIds(blob), blob);
});
test('existing aliases resolve for mapped records and server display IDs take precedence', () => {
  assert.equal(getDisplayId({ commissionId: 'COM-001' }), 'COM-001');
  assert.equal(getDisplayId({ studentCode: 'STD-003' }), 'STD-003');
  assert.equal(getDisplayId({ displayId: 'APP-002', camsId: 'CAMS-123' }), 'APP-002');
  assert.equal(normalizeDisplayIds({ displayId: 'APP-002', camsId: 'CAMS-123' }).camsId, 'APP-002');
});
