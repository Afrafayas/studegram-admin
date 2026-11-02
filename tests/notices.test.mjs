import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reminderDue, snoozeKey } from '../src/utils/noticeReminder.mjs';
const notice = { id: 'n', shouldRemind: true, isRead: false, status: 'Active', expiresOn: '2026-11-01' };
test('remind immediately, then exactly five minutes after dismissal', () => {
  const start = Date.parse('2026-11-01T12:00:00+05:30');
  assert.equal(reminderDue(notice, {}, start), true);
  assert.equal(reminderDue(notice, { n: start }, start + 299999), false);
  assert.equal(reminderDue(notice, { n: start }, start + 300000), true);
});
test('expiry includes the entire selected India calendar day', () => {
  const end = Date.parse('2026-11-01T23:59:59.999+05:30');
  assert.equal(reminderDue(notice, {}, end), true);
  assert.equal(reminderDue(notice, {}, end + 1), false);
  assert.equal(reminderDue({ ...notice, expiresOn: '' }, {}, end + 86400000), true);
});
test('read, archived, and ineligible notices cannot remind', () => {
  const now = Date.parse('2026-11-01T12:00:00+05:30');
  for (const change of [{ isRead: true }, { status: 'Archived' }, { shouldRemind: false }]) assert.equal(reminderDue({ ...notice, ...change }, {}, now), false);
});
test('snoozes belong to the authenticated account', () => {
  const storage = id => ({ getItem: () => 'header.' + Buffer.from(JSON.stringify({ id })).toString('base64url') + '.signature' });
  assert.notEqual(snoozeKey(storage('account1')), snoozeKey(storage('account2')));
});
