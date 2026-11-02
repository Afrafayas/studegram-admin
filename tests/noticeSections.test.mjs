import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitNoticeSections } from '../src/utils/noticeSections.mjs';
test('received and sent notices stay separate for both portals, preserving order', () => {
  const notices = [{ id: 'a', senderPortal: 'Agent', isRead: true, canManage: true }, { id: 'b', senderPortal: 'Admin', isRead: false }, { id: 'c', senderPortal: 'Agent', isExpired: true }, { id: 'legacy' }];
  const admin = splitNoticeSections(notices, 'Admin');
  assert.deepEqual(admin[0].notices.map(n => n.id), ['a', 'c']);
  assert.deepEqual(admin[1].notices.map(n => n.id), ['b', 'legacy']);
  const agent = splitNoticeSections(notices, 'Agent');
  assert.deepEqual(agent[0].notices.map(n => n.id), ['b', 'legacy']);
  assert.deepEqual(agent[1].notices.map(n => n.id), ['a', 'c']);
  assert.equal(notices.length, 4);
});
test('both sections are present for empty lists', () => {
  const sections = splitNoticeSections([], 'Admin');
  assert.deepEqual(sections.map(s => s.key), ['received', 'sent']);
  assert.ok(sections.every(s => s.notices.length === 0));
});
