export const REMINDER_INTERVAL = 5 * 60 * 1000;
export function reminderDue(notice, closed, now) {
  return notice.shouldRemind === true && !notice.isRead && notice.status === 'Active' &&
    (!notice.expiresOn || now <= Date.parse(notice.expiresOn + 'T23:59:59.999+05:30')) &&
    (!closed[notice.id] || now - closed[notice.id] >= REMINDER_INTERVAL);
}
export function snoozeKey(storage) {
  try {
    const token = storage.getItem('admin_token') || storage.getItem('token');
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const id = JSON.parse(atob(encoded)).id;
    return 'notice_snoozes:Admin:' + id;
  } catch { return 'notice_snoozes:Admin:session'; }
}
