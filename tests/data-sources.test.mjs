import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const portal = '../studegram-portal';
const backend = '../studgram backend';
const { mapCourse, mapNotice, publishedDeadlines } = await import(pathToFileURL(path.resolve(portal, 'src/utils/resourceData.js')));

test('course specifications retain API identifiers, fees, and populated intakes', () => {
  const course = mapCourse({ _id: 'course-api', title: 'Database Systems', degreeLevel: 'Master',
    university: { _id: 'university-api', name: 'API University', country: 'Example Country' },
    tuitionFee: 'EUR 12,345', intakes: [{ _id: 'intake-api', title: 'April 2028' }] });
  assert.equal(course.id, 'course-api');
  assert.equal(course.universityId, 'university-api');
  assert.equal(course.country, 'Example Country');
  assert.equal(course.fee, 'EUR 12,345');
  assert.equal(course.intake, 'April 2028');
});

test('missing course data does not produce a fee, intake, or university record', () => {
  const course = mapCourse({ _id: 'sparse', title: 'Sparse record' });
  assert.equal(course.university, '');
  assert.equal(course.intake, '');
  assert.equal(course.fee, 'Not provided');
});

test('notices use stored content, priority, poster, and identifier', () => {
  const notice = mapNotice({ _id: 'notice-api', title: 'Published notice', content: 'Original text', priority: 'Urgent',
    category: 'Policy', image: '/uploads/poster.png', badge: 'Update', createdAt: '2028-01-02T10:00:00Z' });
  assert.equal(notice.id, 'notice-api');
  assert.equal(notice.message, 'Original text');
  assert.equal(notice.type, 'Policy');
  assert.equal(notice.image, '/uploads/poster.png');
  assert.equal(notice.badge, 'Update');
  assert.equal(notice.popup, true);
});

test('deadlines require published dates and never infer one from an intake', () => {
  assert.deepEqual(publishedDeadlines([], []), []);
  assert.deepEqual(publishedDeadlines([{ _id: 'c', intakes: [{ title: 'September 2028' }] }], []), []);
  const deadlines = publishedDeadlines([], [{ _id: 's', university: 'Actual University', deadline: '2028-02-21', category: 'Research' }]);
  assert.equal(deadlines.length, 1);
  assert.equal(deadlines[0].university, 'Actual University');
  assert.equal(deadlines[0].scholarshipDeadline, '2028-02-21');
  assert.equal(deadlines[0].appDeadline, 'Not provided');
  assert.deepEqual(publishedDeadlines([], [{ _id: 'invalid', deadline: 'not a date' }]), []);
});

function loadController(file, dependencies) {
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(backend, file), 'utf8'), {
    exports, require: name => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    }, console, Date, Number, String, Boolean, Math, Array, Object, Set, Map,
    process: { env: { JWT_SECRET: 'isolated-regression-test-secret' } }
  }, { filename: file });
  return exports;
}

for (const withSession of [false, true]) {
  test(`staff report reads ${withSession ? 'an authentication-only session' : 'an empty collection'} without generating activity`, async () => {
    let writes = 0;
    const sessions = withSession ? [{ _id: 'session', loginTime: '2028-01-01T10:00:00Z', logoutTime: '2028-01-01T10:30:00Z',
      isActive: false, durationMinutes: 30, activities: [{ action: 'LOGIN' }], save: () => { writes++; } }] : [];
    const controller = loadController('controllers/staffActivityController.js', {
      '../models/StaffActivityLog': { find: () => ({ sort: async () => sessions }), insertMany: () => { writes++; } },
      '../models/User': { findById: () => ({ select: async () => ({ _id: 'a'.repeat(24), name: 'Actual Staff', email: 'staff@example.test' }) }) }
    });
    let status, result;
    const response = { status(value) { status = value; return this; }, json(value) { result = value; } };
    await controller.getStaffDetailTimeline({ params: { userId: 'a'.repeat(24) } }, response);
    assert.equal(status, 200);
    assert.equal(result.stats.totalSessions, withSession ? 1 : 0);
    assert.equal(result.timeline.filter(event => event.type === 'ACTIVITY').length, 0);
    assert.equal(writes, 0);
  });
}

test('zero commission values remain zero when synchronized to an application', async () => {
  let update;
  const commission = { application: 'application', rate: 0, amount: 0, fee: 0, save: async () => {} };
  const controller = loadController('controllers/commissionController.js', {
    '../models/Commission': { findById: async () => commission },
    '../models/Application': { findByIdAndUpdate: async (_, value) => { update = value; } },
    '../models/Partner': {}, '../models/Notification': {}, '../utils/sendEmail': () => {}
  });
  let status;
  await controller.updateCommission({ params: { id: 'commission' }, body: { amount: 0, rate: 0 } }, {
    status(value) { status = value; return this; }, json() {}
  });
  assert.equal(status, 200);
  assert.equal(update.commissionAmount, 0);
  assert.equal(update.commissionRate, 0);
});

test('unconfigured commissions have no invented fees, rates, or payout amounts', () => {
  const requireBackend = createRequire(path.resolve('../studgram backend/package.json'));
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(backend, 'models/Commission.js'), 'utf8'), {
    module, require: requireBackend, Number, String, Date, Math, isNaN, parseFloat
  });
  const commission = new module.exports({});
  assert.equal(commission.fee, 0);
  assert.equal(commission.tuitionFee, 0);
  assert.equal(commission.rate, 0);
  assert.equal(commission.amount, 0);
});

for (const existing of [false, true]) {
  test(`login ${existing ? 'rejects a wrong password' : 'rejects a missing database account'} without preset account creation or password changes`, async () => {
    let writes = 0;
    const controller = loadController('controllers/authController.js', {
      '../models/User': {
        findOne: async () => existing ? { matchPassword: async () => false, save: () => { writes++; } } : null,
        create: () => { writes++; }
      },
      jsonwebtoken: {}
    });
    let status;
    await controller.login({ body: { email: 'director@studegram.com', password: 'password123' } }, {
      status(value) { status = value; return this; }, json() {}
    });
    assert.equal(status, 401);
    assert.equal(writes, 0);
  });
}

for (const accountStatus of ['Active', 'Suspended']) {
  test(`stored password authentication preserves the ${accountStatus.toLowerCase()} account flow`, async () => {
    const requireBackend = createRequire(path.resolve('../studgram backend/package.json'));
    const User = requireBackend('./models/User');
    const bcrypt = requireBackend('bcryptjs');
    const jwt = requireBackend('jsonwebtoken');
    const user = new User({ name: 'Stored User', email: 'stored-user@example.test',
      password: bcrypt.hashSync('stored-valid-password', 4), role: 'Admin', status: accountStatus });
    let sessionWrites = 0;
    const controller = loadController('controllers/authController.js', {
      '../models/User': { findOne: async () => user }, jsonwebtoken: jwt,
      '../models/StaffActivityLog': { updateMany: async () => {}, create: async () => { sessionWrites++; return { _id: 'actual-session' }; } }
    });
    let status, result;
    await controller.login({ body: { email: user.email, password: 'stored-valid-password' }, headers: {}, socket: {} }, {
      status(value) { status = value; return this; }, json(value) { result = value; }
    });
    assert.equal(status, accountStatus === 'Active' ? 200 : 403);
    if (accountStatus === 'Active') {
      assert.equal(result.data.name, 'Stored User');
      assert.equal(result.data.country, user.country);
      assert.deepEqual(Array.from(result.data.countries), Array.from(user.countries));
      assert.equal(result.sessionId, 'actual-session');
      assert.equal(jwt.verify(result.token, 'isolated-regression-test-secret').id, String(user._id));
      assert.equal(sessionWrites, 1);
    } else {
      assert.equal(sessionWrites, 0);
    }
  });
}
