import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoreListRows } from '../src/utils/listRows.mjs';
test('server business fields replace stale parent data while stable UI identity remains', () => {
  const [row] = restoreListRows([{ _id: 'app1', status: 'Processed', paymentStatus: 'Paid', pickedBy: { name: 'New Staff' }, university: { name: 'New University', country: 'Canada' }, student: { name: 'New Student', passportNo: 'NEW123' }, course: { title: 'New Course' }, partner: null }], [{ id: 'ui-app1', _id: 'app1', status: 'Pending', universityName: 'Old University', studentName: 'Old Student', partnerName: 'Old Agent', activeApps: 4 }]);
  assert.equal(row.id, 'ui-app1');
  assert.equal(row.status, 'Processed');
  assert.equal(row.secondaryStatus, 'Paid Students');
  assert.equal(row.universityName, 'New University');
  assert.equal(row.studentName, 'New Student');
  assert.equal(row.passportNo, 'NEW123');
  assert.equal(row.partnerName, 'Direct');
  assert.equal(row.country, 'Canada');
  assert.equal(row.activeApps, 4);
});
test('commission calculations and visible statuses refresh from the server record', () => {
  const [row] = restoreListRows([{ _id: 'c1', status: 'Claimed', fee: 20000, rate: 15, amount: 0, universityPaid: true }], [{ id: 'COM001', _id: 'c1', status: 'Paid', fee: 10000, amount: 1000 }], 'commissions');
  assert.equal(row.id, 'COM001');
  assert.equal(row.status, 'Pending Approval');
  assert.equal(row.amount, 3000);
  assert.equal(row.universityPaymentStatus, 'University Paid');
});
test('new rows absent from the parent lookup still display with populated values', () => {
  const [row] = restoreListRows([{ _id: 'new', student: { name: 'Student' }, university: { name: 'Campus' }, course: { title: 'Course' } }]);
  assert.equal(row.id, 'new');
  assert.equal(row.studentName, 'Student');
  assert.equal(row.universityName, 'Campus');
});
test('staff access display follows updated role rather than cached access text', () => {
  const [row] = restoreListRows([{ _id: 'u1', role: 'Admin' }], [{ _id: 'u1', role: 'Executive', accessLevel: 'Executive (Read & Write)' }], 'users');
  assert.equal(row.accessLevel, 'Admin (Full Access)');
});
