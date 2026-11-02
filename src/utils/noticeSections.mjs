// Group by sender portal, never by read state or management permission.
export function splitNoticeSections(notices, portal) {
  const sent = [];
  const received = [];
  for (const notice of notices) {
    ((notice.senderPortal || 'Admin') === portal ? sent : received).push(notice);
  }
  return [
    { key: 'received', title: 'Received Notices', description: portal === 'Admin' ? 'Notices received from agents.' : 'Notices received from the admin team.', notices: received },
    { key: 'sent', title: 'Sent Notices', description: portal === 'Admin' ? 'Notices sent by the admin team.' : 'Notices sent by your account to the admin team.', notices: sent }
  ];
}
