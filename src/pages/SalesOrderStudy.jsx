import React, { useState } from 'react';

export default function SalesOrderStudy({ 
  universities, 
  courses, 
  intakes, 
  staffList = [],
  onAddApplication, 
  onBack 
}) {
  const [fullName, setFullName] = useState('');
  const [phoneCode, setPhoneCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dob, setDob] = useState('');
  const [assignedTo, setAssignedTo] = useState(staffList[0]?.name || 'Super Admin');
  const [university, setUniversity] = useState(universities[0] || 'University of Surrey');
  const [course, setCourse] = useState(courses[0] || 'MSc Computer Science');
  const [intake, setIntake] = useState(intakes[0] || 'September/October 2026');
  
  const [isFlagDropdownOpen, setIsFlagDropdownOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  const countries = [
    { code: '+91', flag: '🇮🇳', name: 'India' },
    { code: '+44', flag: '🇬🇧', name: 'UK' },
    { code: '+1', flag: '🇺🇸', name: 'USA' },
    { code: '+971', flag: '🇦🇪', name: 'UAE' },
    { code: '+61', flag: '🇦🇺', name: 'Australia' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName || !phoneNumber || !dob) {
      alert("Please fill in all required fields.");
      return;
    }

    const newApp = {
      studentName: fullName,
      phone: `${phoneCode} ${phoneNumber}`,
      dob,
      assignedTo,
      universityName: university,
      courseName: course,
      intake,
      passportNo: `T${Math.floor(1000000 + Math.random() * 9000000)}`,
      secondaryStatus: 'Pending',
      dateAdded: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    onAddApplication(newApp);
    setSuccessMessage(true);

    setFullName('');
    setPhoneNumber('');
    setDob('');

    setTimeout(() => {
      setSuccessMessage(false);
    }, 4000);
  };

  const selectedCountry = countries.find(c => c.code === phoneCode) || countries[0];

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F8FAFC]">
      {/* Header with Back Arrow */}
      <div className="flex items-center gap-4 bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-xs">
        <button
          onClick={onBack}
          className="p-2 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
          title="Back to Dashboard"
        >
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Create Student Application</h1>
          <p className="text-xs text-slate-500 font-medium">Sales Order intake form. Fill in client metadata and university assignments.</p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-4 rounded-xl shadow-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>Application created and successfully synced with the Studegram client database.</span>
          </div>
          <button 
            onClick={() => setSuccessMessage(false)}
            className="text-emerald-500 hover:text-emerald-700 font-extrabold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Card Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-6 max-w-3xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider pb-1 border-b border-slate-100">Client Demographics</h3>
            
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Application Type</label>
              <select
                disabled
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 cursor-not-allowed"
              >
                <option value="Study">Study (Academic)</option>
                <option value="Tourist">Tourist (Package)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Full Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-900"
                placeholder="Enter student first and last name"
              />
            </div>

            <div className="space-y-1.5 relative">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Phone Number <span className="text-rose-500">*</span></label>
              <div className="flex border border-slate-200 rounded-xl overflow-visible bg-slate-50 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                <button
                  type="button"
                  onClick={() => setIsFlagDropdownOpen(!isFlagDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 border-r border-slate-200 hover:bg-slate-100 rounded-l-xl text-xs font-extrabold text-slate-700 shrink-0"
                >
                  <span>{selectedCountry.flag}</span>
                  <span>{selectedCountry.code}</span>
                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isFlagDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsFlagDropdownOpen(false)}></div>
                    <div className="absolute left-0 top-[60px] w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-20 text-xs font-semibold text-slate-700 animate-in fade-in slide-in-from-top-1 duration-150">
                      {countries.map(c => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setPhoneCode(c.code);
                            setIsFlagDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-left font-semibold"
                        >
                          <span className="text-sm">{c.flag}</span>
                          <span className="font-bold">{c.code}</span>
                          <span className="text-slate-400 font-medium truncate">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-transparent px-3 py-2.5 text-xs font-semibold focus:outline-none text-slate-900"
                  placeholder="98765 43210"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Date of Birth <span className="text-rose-500">*</span></label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider pb-1 border-b border-slate-100">Study Specific Fields</h3>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Destination University</label>
              <select
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
              >
                {universities.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Academic Program</label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
              >
                {courses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Intake Season</label>
              <select
                value={intake}
                onChange={(e) => setIntake(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
              >
                {intakes.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Assigned Operations Manager</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
              >
                {staffList && staffList.length > 0 ? (
                  staffList.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                  ))
                ) : (
                  <>
                    <option value="Super Admin">Super Admin</option>
                    <option value="Admin 1">Admin 1</option>
                    <option value="Admin 2">Admin 2</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#06B6D4] hover:scale-[1.01] hover:shadow-lg text-white font-extrabold text-xs rounded-xl transition-all duration-150 shadow-md uppercase tracking-wider"
          >
            Submit Application
          </button>
        </div>
      </form>
    </div>
  );
}
