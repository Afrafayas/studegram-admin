import React, { useState } from 'react';
import API from '../api/axios';
import { useToast } from '../context/ToastContext';

export default function SalesOrderStudy({ 
  universities = [], 
  courses = [], 
  intakes = [], 
  partners = [],
  staffList = [],
  students = [],
  onAddApplication, 
  onBack 
}) {
  const toast = useToast();
  const [studentSelectionMode, setStudentSelectionMode] = useState('new'); // 'new' or 'existing'
  const [selectedStudent, setSelectedStudent] = useState('');

  const [fullName, setFullName] = useState('');
  const [phoneCode, setPhoneCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dob, setDob] = useState('');
  const [assignedTo, setAssignedTo] = useState(staffList[0]?.name || 'Super Admin');

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // Set default values based on whether items are objects or strings
  const getInitialId = (items) => {
    if (!items || items.length === 0) return '';
    return typeof items[0] === 'object' ? items[0]._id : items[0];
  };

  const [university, setUniversity] = useState(() => getInitialId(universities));
  const [course, setCourse] = useState(() => getInitialId(courses));
  const [intake, setIntake] = useState(() => getInitialId(intakes));
  const [partner, setPartner] = useState('');
  const [notes, setNotes] = useState('');
  
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
    if (studentSelectionMode === 'new' && (!fullName || !phoneNumber || !dob)) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (studentSelectionMode === 'existing' && !selectedStudent) {
      toast.error("Please select a student.");
      return;
    }
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one supporting document (e.g. Passport, Transcripts) to submit the application.");
      return;
    }

    const selectedUniv = universities.find(u => (typeof u === 'object' ? u._id : u) === university);
    const selectedCourse = courses.find(c => (typeof c === 'object' ? c._id : c) === course);
    const selectedIntake = intakes.find(i => (typeof i === 'object' ? i._id : i) === intake);

    const uName = typeof selectedUniv === 'object' ? selectedUniv.name : selectedUniv;
    const cName = typeof selectedCourse === 'object' ? selectedCourse.title : selectedCourse;
    const iName = typeof selectedIntake === 'object' ? selectedIntake.title : selectedIntake;

    let newApp;
    if (studentSelectionMode === 'existing') {
      const studentObj = students.find(s => s.id === selectedStudent);
      newApp = {
        studentId: selectedStudent,
        studentName: studentObj?.name || 'Unknown',
        studentEmail: studentObj?.email || '',
        phone: studentObj?.phone || '',
        dob: studentObj?.dob || '',
        assignedTo,
        universityId: university,
        universityName: uName,
        courseId: course,
        courseName: cName,
        intakeId: intake,
        intake: iName,
        partnerId: partner || null,
        passportNo: studentObj?.passportNo || `T${Math.floor(1000000 + Math.random() * 9000000)}`,
        secondaryStatus: 'Pending',
        dateAdded: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        documents: uploadedFiles,
        notes: notes
      };
    } else {
      newApp = {
        studentName: fullName,
        studentEmail: `${fullName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        phone: `${phoneCode} ${phoneNumber}`,
        dob,
        assignedTo,
        universityId: university,
        universityName: uName,
        courseId: course,
        courseName: cName,
        intakeId: intake,
        intake: iName,
        partnerId: partner || null,
        passportNo: `T${Math.floor(1000000 + Math.random() * 9000000)}`,
        secondaryStatus: 'Pending',
        dateAdded: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        documents: uploadedFiles,
        notes: notes
      };
    }

    onAddApplication(newApp);
    setSuccessMessage(true);

    setFullName('');
    setPhoneNumber('');
    setDob('');
    setPartner('');
    setSelectedStudent('');
    setUploadedFiles([]);
    setNotes('');
    setStudentSelectionMode('new');

    setTimeout(() => {
      setSuccessMessage(false);
    }, 4000);
  };

  const selectedCountry = countries.find(c => c.code === phoneCode) || countries[0];

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F0F2F5]">
      {/* Header with Back Arrow */}
      <div className="flex items-center gap-4 bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs">
        <button
          onClick={onBack}
          className="p-2 text-slate-500 hover:text-[#D99A1C] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
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
      <form onSubmit={handleSubmit} className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#2563EB] rounded-2xl shadow-sm p-6 max-w-3xl space-y-6">
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

            <div className="space-y-3">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Student Information</label>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="studentSelectionMode"
                    checked={studentSelectionMode === 'new'}
                    onChange={() => setStudentSelectionMode('new')}
                    className="text-[#D99A1C] focus:ring-[#D99A1C]"
                  />
                  Register New Student
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="studentSelectionMode"
                    checked={studentSelectionMode === 'existing'}
                    onChange={() => setStudentSelectionMode('existing')}
                    className="text-[#D99A1C] focus:ring-[#D99A1C]"
                  />
                  Select Existing Student
                </label>
              </div>

              {studentSelectionMode === 'existing' ? (
                <div className="space-y-1.5">
                  <select
                    required={studentSelectionMode === 'existing'}
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#D99A1C] focus:border-[#D99A1C] text-slate-900 cursor-pointer"
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.passportNo || 'No Passport'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-4 bg-slate-50/50 border border-slate-100 rounded-xl p-4 shadow-3xs">
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Full Name <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required={studentSelectionMode === 'new'}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all text-slate-900"
                      placeholder="Enter student first and last name"
                    />
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Phone Number <span className="text-rose-500">*</span></label>
                    <div className="flex border border-slate-200 rounded-xl overflow-visible bg-white focus-within:border-[#D99A1C] focus-within:ring-1 focus-within:ring-[#D99A1C] transition-all">
                      <button
                        type="button"
                        onClick={() => setIsFlagDropdownOpen(!isFlagDropdownOpen)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border-r border-slate-200 hover:bg-slate-50 rounded-l-xl text-xs font-extrabold text-slate-700 shrink-0"
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
                          <div className="absolute left-0 top-[110px] w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-20 text-xs font-semibold text-slate-700 animate-in fade-in slide-in-from-top-1 duration-150">
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
                        required={studentSelectionMode === 'new'}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-transparent px-3 py-2 text-xs font-semibold focus:outline-none text-slate-900"
                        placeholder="98765 43210"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Date of Birth <span className="text-rose-500">*</span></label>
                    <input
                      type="date"
                      required={studentSelectionMode === 'new'}
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all text-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider pb-1 border-b border-slate-100">Study Specific Fields</h3>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Destination University</label>
              <select
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#D99A1C] focus:border-[#D99A1C]"
              >
                {universities.map(u => {
                  const value = typeof u === 'object' ? u._id : u;
                  const label = typeof u === 'object' ? u.name : u;
                  return <option key={value} value={value}>{label}</option>;
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Academic Program</label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#D99A1C] focus:border-[#D99A1C]"
              >
                {courses.map(c => {
                  const value = typeof c === 'object' ? c._id : c;
                  const label = typeof c === 'object' ? c.title : c;
                  return <option key={value} value={value}>{label}</option>;
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Intake Season</label>
              <select
                value={intake}
                onChange={(e) => setIntake(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#D99A1C] focus:border-[#D99A1C]"
              >
                {intakes.map(i => {
                  const value = typeof i === 'object' ? i._id : i;
                  const label = typeof i === 'object' ? i.title : i;
                  return <option key={value} value={value}>{label}</option>;
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">B2B Referral Partner</label>
              <select
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#D99A1C] focus:border-[#D99A1C]"
              >
                <option value="">Direct (No Partner)</option>
                {partners.map(p => {
                  const value = typeof p === 'object' ? p._id : p.id;
                  const label = typeof p === 'object' ? p.name : p.name;
                  return <option key={value} value={value}>{label}</option>;
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Assigned Operations Manager</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#D99A1C] focus:border-[#D99A1C]"
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

        {/* Document Upload Section */}
          <div className="space-y-4 bg-white border border-slate-250/70 p-5 rounded-2xl">
            <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider pb-1 border-b border-slate-105/60">Supporting Documents *</h3>
            
            <div className="border-2 border-dashed border-slate-200 hover:border-[#D99A1C] transition-colors rounded-xl p-6 text-center cursor-pointer relative bg-slate-50">
              <input
                type="file"
                multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;
                  setIsUploading(true);
                  setUploadError('');
                  try {
                    const uploadPromises = files.map(async (file) => {
                      const formData = new FormData();
                      formData.append('file', file);
                      const res = await API.post('/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                      });
                      return { name: file.name, url: res.data.url };
                    });
                    const results = await Promise.all(uploadPromises);
                    setUploadedFiles(prev => [...prev, ...results]);
                  } catch (err) {
                    console.error('File upload failed:', err);
                    setUploadError('Failed to upload some documents. Please check your connection.');
                  } finally {
                    setIsUploading(false);
                  }
                }}
              />
              <div className="space-y-1 text-slate-500">
                <span className="text-xl">📄</span>
                <p className="text-xs font-semibold text-slate-700">Click or drag files here to upload</p>
                <p className="text-[10px] text-slate-400 font-semibold">Upload at least one document (PDF, PNG, JPG, Word)</p>
              </div>
            </div>

            {isUploading && (
              <p className="text-[10px] text-[#D99A1C] font-semibold animate-pulse">⏳ Uploading files, please wait...</p>
            )}
            {uploadError && (
              <p className="text-[10px] text-red-500 font-semibold">❌ {uploadError}</p>
            )}

            {/* Uploaded File Badges */}
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1.5">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-[#D99A1C]/10 border border-[#D99A1C]/25 text-[#D99A1C] text-[10px] px-2.5 py-1 rounded-lg font-bold">
                    <span>📄</span>
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="hover:text-red-500 transition-colors pl-1 font-bold text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        {/* Comments / Notes */}
        <div className="space-y-4 bg-white border border-slate-250/70 p-5 rounded-2xl">
          <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider pb-1 border-b border-slate-105/60">Comments / Notes</h3>
          <textarea
            rows="3"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#D99A1C] focus:border-[#D99A1C] text-slate-900 resize-none"
            placeholder="Add any comments or notes for this application..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
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
            disabled={isUploading || uploadedFiles.length === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-[#D99A1C] to-[#F5B025] hover:scale-[1.01] hover:shadow-lg text-white font-extrabold text-xs rounded-xl transition-all duration-150 shadow-md uppercase tracking-wider disabled:opacity-50 disabled:pointer-events-none"
          >
            Submit Application
          </button>
        </div>
      </form>
    </div>
  );
}
