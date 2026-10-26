import { ActionButton } from './ActionControls';

function Field({ label, children }) {
  return <div className="space-y-1 min-w-0"><dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{label}</dt><dd className="text-xs font-bold text-slate-900 break-words">{children === 0 || children ? children : 'Not provided'}</dd></div>;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminStaffDetails({ staff, countries, assignedApplications, submittedApplications, onBack, onEdit }) {
  const related = new Map();
  assignedApplications.forEach(app => related.set(String(app._id || app.id), { app, assigned: true }));
  submittedApplications.forEach(app => {
    const key = String(app._id || app.id);
    related.set(key, { ...related.get(key), app, submitted: true });
  });
  return <div className="space-y-5" data-staff-details>
    <ActionButton type="button" onClick={onBack} className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-600 hover:text-[#D99A1C] focus-visible:outline focus-visible:outline-2 rounded-lg px-1 py-2">← Back to Staff Directory</ActionButton>
    {!staff ? <div className="bg-white border border-slate-200 rounded-2xl p-8"><h1 className="text-lg font-black text-slate-900">Staff member unavailable</h1><p className="text-xs text-slate-500 mt-2">This account may have been removed or is outside your permitted region.</p></div> : <>
      <header className="bg-white border border-slate-200 border-t-4 border-t-[#D99A1C] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0"><div className="w-14 h-14 shrink-0 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-center justify-center text-lg font-black">{(staff.name || 'Staff').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}</div><div className="min-w-0"><p className="text-[10px] text-[#D99A1C] font-black uppercase tracking-wider">Staff Profile</p><h1 className="text-xl font-black text-slate-900 break-words">{staff.name || 'Unnamed staff member'}</h1><p className="text-xs text-slate-500 font-semibold mt-1">{staff.role || 'Role not provided'}</p></div></div>
        <div className="flex items-center gap-3 flex-wrap"><span className={`px-3 py-1.5 rounded-lg border text-[11px] font-extrabold ${staff.status === 'Active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>{staff.status || 'Status not provided'}</span><ActionButton type="button" onClick={() => onEdit(staff)} className="px-4 py-2.5 rounded-xl bg-[#D99A1C] hover:bg-[#c28815] text-white text-xs font-extrabold">Edit Profile</ActionButton></div>
      </header>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6"><h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-4">Profile & Contact Details</h2><dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 pt-5"><Field label="Full Name">{staff.name}</Field><Field label="Email Address">{staff.email}</Field><Field label="Phone Number">{staff.phone}</Field><Field label="Designation / Role">{staff.role}</Field><Field label="Joined On">{formatDate(staff.createdAt) || staff.dateAdded}</Field><Field label="Last Updated">{formatDate(staff.updatedAt)}</Field><Field label="Staff ID">{String(staff._id || staff.id || '')}</Field></dl></section>
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6"><h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-4">Access & Responsibilities</h2><dl className="space-y-6 pt-5"><Field label="System Access Tier">{staff.accessLevel || staff.role}</Field><Field label="Assigned Countries"><span className="flex flex-wrap gap-2">{countries.length ? countries.map(country => <span key={country} className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px]">{country}</span>) : 'Not provided'}</span></Field><Field label="Assigned Application Files">{assignedApplications.length}</Field><Field label="Submitted Applications">{submittedApplications.length}</Field></dl></section>
      </div>
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden"><div className="p-5 sm:p-6 border-b border-slate-100"><h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Related Applications ({related.size})</h2><p className="text-[11px] text-slate-500 mt-1">Applications assigned to or submitted by this staff member.</p></div>{related.size ? <div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[650px]"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr>{['CAMS ID', 'Student', 'University / Course', 'Relationship', 'Status', ''].map((label, index) => <th key={index} className="px-5 py-3 font-extrabold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{Array.from(related.values()).map(({ app, assigned, submitted }) => <tr key={app._id || app.id}><td className="px-5 py-4 font-bold text-indigo-600">{app.camsId || 'Not provided'}</td><td className="px-5 py-4 font-bold text-slate-900">{app.studentName || 'Not provided'}</td><td className="px-5 py-4 text-slate-600"><p className="font-semibold">{app.universityName || 'Not provided'}</p><p className="text-[11px] mt-1">{app.courseName || 'Not provided'}</p></td><td className="px-5 py-4 text-slate-600">{[assigned && 'Assigned', submitted && 'Submitted'].filter(Boolean).join(' · ')}</td><td className="px-5 py-4 font-bold text-slate-700">{app.secondaryStatus || app.status || 'Not provided'}</td><td className="px-5 py-4"><ActionButton type="button" aria-label={`View application for ${app.studentName || 'student'}`} onClick={() => window.dispatchEvent(new CustomEvent('navigate_to_application', { detail: { appId: app._id || app.id } }))} className="text-[11px] font-extrabold text-[#D99A1C] hover:underline whitespace-nowrap">View Application →</ActionButton></td></tr>)}</tbody></table></div> : <p className="p-8 text-xs font-medium text-slate-500">No applications are currently assigned to or submitted by this staff member.</p>}</section>
    </>}
  </div>;
}
