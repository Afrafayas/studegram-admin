import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendDocumentFiles, planQueuedDocuments } from '../src/utils/documentQueue.mjs';
const file = name => new File(['data'], name, { type: 'application/pdf', lastModified: 12345 });
test('files from successive folder selections accumulate without losing labels', () => {
  const first = appendDocumentFiles([], [file('passport.pdf')], 'Passport Bio Page, Degree Certificate');
  assert.equal(first.entries.length, 1);
  assert.equal(first.remainingNames, 'Degree Certificate');
  const next = appendDocumentFiles(first.entries, [file('degree.pdf')], first.remainingNames);
  assert.deepEqual(next.entries.map(entry => entry.file.name), ['passport.pdf', 'degree.pdf']);
  assert.deepEqual(planQueuedDocuments(next.entries).map(entry => entry.name), ['Passport Bio Page', 'Degree Certificate']);
  assert.equal(next.remainingNames, '');
  assert.equal(first.entries.length, 1);
});
test('adding files after earlier uploads or without names uses their own filenames', () => {
  const first = appendDocumentFiles([], [file('a.pdf')]);
  const next = appendDocumentFiles(first.entries, [file('b.pdf')]);
  assert.deepEqual(planQueuedDocuments(next.entries).map(entry => entry.name), ['a.pdf', 'b.pdf']);
});
test('removing and relabeling queued files does not shift labels onto other files', () => {
  const added = appendDocumentFiles([], [file('a.pdf'), file('b.pdf')], 'Passport Bio Page, Degree Certificate').entries;
  const changed = added.filter(entry => entry.file.name !== 'a.pdf').map(entry => ({ ...entry, name: 'Academic Transcripts' }));
  const more = appendDocumentFiles(changed, [file('c.pdf')], 'IELTS Score Report');
  assert.deepEqual(planQueuedDocuments(more.entries).map(entry => entry.name), ['Academic Transcripts', 'IELTS Score Report']);
});
test('accidentally choosing the same file twice does not duplicate it or consume another label', () => {
  const initial = appendDocumentFiles([], [file('a.pdf')], 'Passport Bio Page');
  const next = appendDocumentFiles(initial.entries, [file('a.pdf'), file('b.pdf')], 'Degree Certificate');
  assert.equal(next.entries.length, 2);
  assert.equal(next.entries[1].name, 'Degree Certificate');
});
test('invalid selections leave the existing queue intact and are rejected before upload', () => {
  const initial = appendDocumentFiles([], [file('a.pdf')], 'Passport Bio Page').entries;
  assert.throws(() => appendDocumentFiles(initial, [file('malware.exe')]), /PDF, Word/);
  assert.equal(initial.length, 1);
  assert.throws(() => planQueuedDocuments([]), /Choose files/);
});
