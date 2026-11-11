export const STUDENT_AGE_ERROR = 'Student must be between 17 and 50 years old.';

export function getStudentDobYears(today = new Date()) {
  return Array.from({ length: 34 }, (_, index) => String(today.getFullYear() - 17 - index));
}

// Use calendar dates rather than elapsed milliseconds (which drift at leap years).
export function getStudentDobMax(today = new Date()) {
  const year = today.getFullYear() - 17;
  const month = today.getMonth();
  const day = Math.min(today.getDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getStudentDobError(value, today = new Date()) {
  if (!value) return 'Please select your date of birth.';
  const date = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Enter a valid date of birth.';
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < '0001-01-01') {
    return 'Enter a valid date of birth.';
  }
  const birthdayPending = date.slice(5) > `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const age = today.getFullYear() - parsed.getUTCFullYear() - Number(birthdayPending);
  return age < 17 || age > 50 ? STUDENT_AGE_ERROR : '';
}
