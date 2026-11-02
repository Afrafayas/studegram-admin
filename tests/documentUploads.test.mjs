import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentNamesForRole, parseDocumentNames, planDocumentBatch, uploadDocumentBatch } from '../src/utils/documentNames.mjs';
const file = name => new File(['document'], name, { type: 'application/pdf' });
test('student and agent catalogs stay separate and contain their required document names', () => {
  assert.ok(documentNamesForRole('Student').includes('Passport Bio Page'));
  assert.ok(documentNamesForRole('Agent').includes('Company Incorporation Certificate'));
  assert.equal(documentNamesForRole('Student').includes('Company Incorporation Certificate'), false);
  assert.equal(documentNamesForRole('Agent').includes('Degree Certificate'), false);
  assert.throws(() => documentNamesForRole('Unknown'));
});
test('selected names match files in selection order, with filename fallback', () => {
  const files = [file('a.pdf'), file('b.pdf')];
  assert.deepEqual(planDocumentBatch(files, 'Passport Bio Page, Degree Certificate').map(item => item.name), ['Passport Bio Page', 'Degree Certificate']);
  assert.deepEqual(planDocumentBatch(files, '').map(item => item.name), ['a.pdf', 'b.pdf']);
  assert.deepEqual(parseDocumentNames(' Passport Bio Page, Degree Certificate '), ['Passport Bio Page', 'Degree Certificate']);
  assert.throws(() => planDocumentBatch(files, 'Passport Bio Page'), /one document name/);
});
test('invalid batches fail before storage requests', () => {
  assert.throws(() => planDocumentBatch([], ''), /Choose files/);
  assert.throws(() => planDocumentBatch([{ name: 'huge.pdf', size: 16 * 1024 * 1024 }], ''), /15 MB/);
  assert.throws(() => planDocumentBatch([file('script.exe')], ''), /PDF, Word/);
});
test('batch upload keeps successful documents and exposes failed files for retry without mismatching labels', async () => {
  const api = { post: async (url, body) => {
    const item = body.get('file');
    if (item.name === 'b.pdf') throw new Error('Storage unavailable');
    return { data: { success: true, url: 'https://storage.example/' + item.name } };
  } };
  const result = await uploadDocumentBatch(api, planDocumentBatch([file('a.pdf'), file('b.pdf')], 'Passport Bio Page, Degree Certificate'));
  assert.equal(result.uploaded.length, 1);
  assert.equal(result.uploaded[0].name, 'Passport Bio Page');
  assert.equal(result.uploaded[0].fileName, 'a.pdf');
  assert.equal(result.uploaded[0].type, 'pdf');
  assert.equal(result.failed[0].name, 'Degree Certificate');
  assert.match(result.failed[0].error, /Storage unavailable/);
});
test('an upload without a confirmed storage URL is a failure', async () => {
  const result = await uploadDocumentBatch({ post: async () => ({ data: { success: true } }) }, planDocumentBatch([file('a.pdf')], 'Passport Bio Page'));
  assert.equal(result.uploaded.length, 0);
  assert.equal(result.failed.length, 1);
});
