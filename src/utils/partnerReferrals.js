const normalize = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const idOf = value => typeof value === 'object' && value !== null
  ? String(value._id || value.id || '') : String(value || '');
const aliases = partner => [partner.name, partner.companyName, partner.partnerCode].map(normalize).filter(Boolean);

export function getPartnerReferredStudents(partner, clients = [], applications = []) {
  if (!partner) return [];
  const partnerId = idOf(partner);
  const partnerAliases = aliases(partner);
  const partners = clients.filter(client => client.type === 'Agent');
  const matchesLegacyName = value => {
    const name = normalize(value);
    if (!name || ['agent', 'direct', 'agency'].includes(name) || !partnerAliases.includes(name)) return false;
    // A shared contact/company name is insufficient to identify a partner.
    return new Set(partners.filter(item => aliases(item).includes(name)).map(idOf)).size <= 1;
  };
  const matchesPartner = record => {
    const reference = record.partnerId || record.partner;
    if (reference) return Boolean(partnerId) && idOf(reference) === partnerId;
    const referralId = idOf(record.referredBy);
    if (/^[a-f0-9]{24}$/i.test(referralId)) return Boolean(partnerId) && referralId === partnerId;
    return matchesLegacyName(record.referredBy) || matchesLegacyName(record.partnerName)
      || matchesLegacyName(record.partnerCompanyName);
  };
  const students = clients.filter(client => client.type === 'Student');
  const records = new Map();
  const keyOf = student => {
    const id = idOf(student);
    if (id) return `id:${id}`;
    if (student.passportNo && student.passportNo !== 'Pending') return `passport:${normalize(student.passportNo)}`;
    if (student.email) return `email:${normalize(student.email)}`;
    return '';
  };
  const add = student => {
    const key = keyOf(student);
    if (key && !records.has(key)) records.set(key, student);
  };
  students.filter(matchesPartner).forEach(add);
  applications.filter(matchesPartner).forEach(app => {
    const rawStudent = typeof app.student === 'object' && app.student ? app.student : {};
    const studentId = idOf(app.studentId || app.student);
    let student = studentId ? students.find(item => idOf(item) === studentId) : null;
    if (!studentId) {
      const email = normalize(rawStudent.email || app.studentEmail);
      const passport = normalize(rawStudent.passportNo || app.passportNo);
      const matches = students.filter(item => (passport && passport !== 'pending' && normalize(item.passportNo) === passport)
        || (email && normalize(item.email) === email));
      if (matches.length === 1) student = matches[0];
    }
    add(student || {
      ...rawStudent,
      id: studentId || undefined,
      name: rawStudent.name || app.studentName || 'Not provided',
      email: rawStudent.email || app.studentEmail || '',
      phone: rawStudent.phone || app.phone || '',
      passportNo: rawStudent.passportNo || app.passportNo || '',
      status: rawStudent.status || '',
    });
  });
  return Array.from(records.values());
}
