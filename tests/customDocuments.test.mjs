import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addCustomDocumentName } from '../src/utils/documentNames.mjs';
import { appendDocumentFiles, planQueuedDocuments } from '../src/utils/documentQueue.mjs';
test('custom document names can be added alongside existing selections', () => {
  assert.equal(addCustomDocumentName('Passport Bio Page', '  University Consent Form  '), 'Passport Bio Page, University Consent Form');
  assert.equal(addCustomDocumentName('Passport Bio Page', 'Custom Proof', false), 'Custom Proof');
});
test('duplicate names and invalid custom input are handled', () => {
  assert.equal(addCustomDocumentName('Custom Proof', 'custom proof'), 'Custom Proof');
  assert.throws(() => addCustomDocumentName('', '  '));
  assert.throws(() => addCustomDocumentName('', 'First, Second'));
  assert.throws(() => addCustomDocumentName('', 'x'.repeat(201)));
});
test('custom document names stay with their files in the upload plan', () => {
  const name = addCustomDocumentName('', 'University Consent Form');
  const result = appendDocumentFiles([], [new File(['proof'], 'consent.pdf', { type: 'application/pdf' })], name);
  const plan = planQueuedDocuments(result.entries);
  assert.equal(plan[0].name, 'University Consent Form');
  assert.equal(plan[0].file.name, 'consent.pdf');
});
