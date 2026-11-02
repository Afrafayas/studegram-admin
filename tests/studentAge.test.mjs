import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudentDobMax, getStudentDobError, STUDENT_AGE_ERROR } from '../src/utils/studentAge.mjs';

test('accepts the 17th birthday and older dates, rejects one day younger', () => {
  const today = new Date(2026, 9, 31);
  assert.equal(getStudentDobMax(today), '2009-10-31');
  assert.equal(getStudentDobError('2009-10-31', today), '');
  assert.equal(getStudentDobError('1990-01-01', today), '');
  assert.equal(getStudentDobError('2009-11-01', today), STUDENT_AGE_ERROR);
  assert.equal(getStudentDobError('2027-01-01', today), STUDENT_AGE_ERROR);
});

test('handles leap days and year boundaries using calendar birthdays', () => {
  assert.equal(getStudentDobMax(new Date(2024, 1, 29)), '2007-02-28');
  assert.equal(getStudentDobError('2008-02-29', new Date(2025, 1, 28)), STUDENT_AGE_ERROR);
  assert.equal(getStudentDobError('2008-02-29', new Date(2025, 2, 1)), '');
  assert.equal(getStudentDobMax(new Date(2027, 0, 1)), '2010-01-01');
});

test('preserves optional DOBs, accepts stored ISO dates and rejects invalid dates', () => {
  const today = new Date(2026, 9, 31);
  assert.equal(getStudentDobError('', today), '');
  assert.equal(getStudentDobError('2000-01-01T00:00:00.000Z', today), '');
  for (const date of ['2009-02-30', '2001-02-29', 'bad date', '0000-01-01']) {
    assert.equal(getStudentDobError(date, today), 'Enter a valid date of birth.');
  }
});
