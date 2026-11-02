const identity = value => String(value?._id || value?.id || value || '');
const feeValue = value => typeof value === 'number' ? value : Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0;
export function restoreListRows(rows, originals = [], resource = '') {
  const lookup = new Map(originals.map(row => [identity(row), row]));
  return rows.map(row => {
    const original = lookup.get(identity(row)) || {};
    const partnerWasLoaded = Object.hasOwn(row, 'partner');
    const partnerName = row.partner?.companyName || row.partner?.name || row.partnerName || (partnerWasLoaded && !row.partner ? 'Direct' : original.partnerName);
    const mapped = {
      ...original, ...row,
      id: original.id || row.id || row._id,
      studentName: row.student?.name || row.studentName || original.studentName,
      passportNo: row.student?.passportNo || row.passportNo || original.passportNo,
      universityName: row.university?.name || row.universityName || original.universityName,
      courseName: row.course?.title || row.courseName || original.courseName,
      partnerName,
      partnerCompanyName: row.partner?.companyName || (partnerWasLoaded && !row.partner ? 'Direct' : row.partnerCompanyName || original.partnerCompanyName),
      country: row.country ?? row.university?.country ?? original.country ?? '',
      secondaryStatus: row.paymentStatus === 'Paid' || row.status === 'Paid Students' ? 'Paid Students' : row.status ?? original.secondaryStatus,
      assignedBdm: partnerName || original.assignedBdm || 'Direct',
      dateAdded: row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : original.dateAdded || ''
    };
    if (resource === 'users') mapped.accessLevel = row.accessLevel || `${row.role || original.role || 'Executive'} (${['SuperAdmin', 'Super Admin', 'Director', 'Admin'].includes(row.role || original.role) ? 'Full Access' : 'Read & Write'})`;
    if (resource === 'commissions') {
      const fee = feeValue(row.fee ?? row.tuitionFee ?? row.courseFee ?? original.fee);
      const rate = Number(row.rate ?? original.rate ?? 0);
      const type = row.commissionType || original.commissionType || 'percentage';
      let amount = Number(row.amount || 0);
      if (amount <= 0) amount = type === 'fixed' && Number(row.fixedAmount || 0) > 0 ? Number(row.fixedAmount) : Math.round(fee * rate / 100);
      Object.assign(mapped, { fee, rate, amount, commissionType: type, status: row.status === 'Claimed' ? 'Pending Approval' : row.status || 'Pending Approval', currency: row.currency || row.application?.currency || row.application?.course?.currency || original.currency, feePeriod: row.feePeriod ?? row.application?.feePeriod ?? row.application?.course?.feePeriod ?? original.feePeriod, universityPaid: Boolean(row.universityPaid || row.universityPaymentStatus === 'University Paid'), isCommissionSet: Boolean(row.isCommissionSet || row.status === 'Paid') });
      mapped.universityPaymentStatus = mapped.universityPaid ? 'University Paid' : 'Waiting for University to Pay';
    }
    return mapped;
  });
}
