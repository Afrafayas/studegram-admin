import React, { useState } from 'react';
import API from '../api/axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function BecomePartner({ setClients, onBack }) {
  const toast = useToast();
  const { addAuditLog } = useAuth();

  // Section 1: Partner Classification
  const [partnerType, setPartnerType] = useState('Company'); // 'Company' | 'Individual'

  // Section 2: Partner Profile Details
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    taxId: '',
    country: 'India'
  });

  // Section 3: Document Verification Uploads
  const [documents, setDocuments] = useState({
    // For Company Agent
    incorporationCert: null,
    taxCert: null,
    signatoryIdProof: null,
    // For Individual Agent
    idProof: null,
    addressProof: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [submittedPartnerCode, setSubmittedPartnerCode] = useState('');
  const [previewModalDoc, setPreviewModalDoc] = useState(null);

  const countriesList = [
    'India', 'United Kingdom', 'United States', 'Canada', 
    'Australia', 'Singapore', 'Germany', 'United Arab Emirates', 'Malaysia'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (docKey, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size exceeds 15MB limit. Please select a smaller file.');
      return;
    }

    setDocuments(prev => ({
      ...prev,
      [docKey]: {
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: file.type.includes('pdf') ? 'pdf' : 'image',
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    }));
    toast.success(`Uploaded ${file.name}`);
  };

  const handleRemoveFile = (docKey) => {
    setDocuments(prev => ({ ...prev, [docKey]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Please complete all required contact details.');
      return;
    }

    if (partnerType === 'Company' && !formData.companyName) {
      toast.error('Please enter the Registered Company Name.');
      return;
    }

    // Required Documents Check
    if (partnerType === 'Company') {
      if (!documents.incorporationCert) {
        toast.error('Please upload Company Incorporation Certificate.');
        return;
      }
    } else {
      if (!documents.idProof) {
        toast.error('Please upload Individual ID Proof (Passport / National ID).');
        return;
      }
    }

    setIsSubmitting(true);

    const docsPayload = [];
    if (partnerType === 'Company') {
      if (documents.incorporationCert) docsPayload.push({ title: 'Company Incorporation Certificate', fileName: documents.incorporationCert.name });
      if (documents.taxCert) docsPayload.push({ title: 'Tax / GST Registration Certificate', fileName: documents.taxCert.name });
      if (documents.signatoryIdProof) docsPayload.push({ title: 'Authorised Signatory ID Proof', fileName: documents.signatoryIdProof.name });
    } else {
      if (documents.idProof) docsPayload.push({ title: 'Individual ID Proof (Passport/National ID)', fileName: documents.idProof.name });
      if (documents.addressProof) docsPayload.push({ title: 'Address Proof / Resume', fileName: documents.addressProof.name });
    }

    const generatedCode = `PRT-${Math.floor(10000 + Math.random() * 90000)}`;

    try {
      const token = localStorage.getItem('admin_token');
      if (token && token !== 'mock-admin-token-12345') {
        const res = await API.post('/partners', {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          companyName: partnerType === 'Company' ? formData.companyName : formData.name,
          country: formData.country,
          partnerType: partnerType,
          taxId: formData.taxId,
          documents: docsPayload,
          status: 'Active'
        });

        if (res.data?.success) {
          setSubmittedPartnerCode(res.data.data._id || generatedCode);
          setIsSubmittedSuccess(true);
          toast.success('Partner Onboarded Successfully in Database!');
        } else {
          throw new Error(res.data?.message || 'API error');
        }
      } else {
        // Fallback local state update
        const newPartnerObj = {
          id: Date.now(),
          name: formData.name,
          type: 'Agent',
          partnerType: partnerType,
          companyName: partnerType === 'Company' ? formData.companyName : formData.name,
          taxId: formData.taxId,
          country: formData.country,
          email: formData.email,
          phone: formData.phone,
          partnerCode: generatedCode,
          status: 'Active',
          activeApps: 0,
          documents: docsPayload,
          dateAdded: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        };

        if (setClients) {
          setClients(prev => [newPartnerObj, ...prev]);
        }

        setSubmittedPartnerCode(generatedCode);
        setIsSubmittedSuccess(true);
        addAuditLog('ONBOARD_PARTNER', 'Partner', generatedCode, `Onboarded ${formData.name} as ${partnerType} Agent`);
        toast.success('Partner Successfully Registered & Onboarded!');
      }
    } catch (err) {
      toast.error(err.message || 'Submission error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmittedSuccess) {
    return (
      <div className="flex-1 p-8 bg-[#F0F2F5] flex items-center justify-center min-h-[calc(100vh-100px)]">
        <div className="bg-white border border-emerald-200 border-t-4 border-t-emerald-500 rounded-3xl p-8 max-w-lg w-full text-center shadow-xl space-y-6 animate-fade-in-up">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
              Onboarding Successful
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Partner Registered Successfully!</h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              <strong className="text-slate-800">{formData.name}</strong> has been onboarded as an active <strong className="text-slate-800">{partnerType === 'Company' ? 'Company Partner Agency' : 'Individual Recruitment Agent'}</strong> with verified compliance documents.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-semibold text-slate-400">Partner Code / Reference:</span>
              <span className="font-mono font-bold text-[#2563EB]">{submittedPartnerCode}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-semibold text-slate-400">Account Structure:</span>
              <span className="font-extrabold text-slate-800">{partnerType} Agent</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-semibold text-slate-400">Email Address:</span>
              <span className="font-bold text-slate-800">{formData.email}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-semibold text-slate-400">Compliance Documents:</span>
              <span className="font-extrabold text-emerald-600">Verified & Uploaded</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => {
                if (onBack) onBack();
              }}
              className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer"
            >
              Return to Admin Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 bg-[#F0F2F5] animate-fade-in-up">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider">
            <span>🤝 Admin Onboarding Console</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Become our Partner — Onboard New Referral Agency</h1>
          <p className="text-xs text-slate-500 font-medium">Select partner classification (Company vs Individual Agent) and upload mandatory verification proofs.</p>
        </div>

        <button
          onClick={() => onBack && onBack()}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer shrink-0"
        >
          ← Back to Dashboard
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: Select Partner Classification */}
        <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#2563EB] rounded-2xl p-6 shadow-xs space-y-5">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">SECTION 1</span>
            <h2 className="text-base font-black text-slate-900">Select Partner Entity Structure</h2>
            <p className="text-xs text-slate-500 font-medium">Choose whether this partner operates as a registered company consultancy or an independent counselor.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option A: Company Agent */}
            <div
              onClick={() => setPartnerType('Company')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                partnerType === 'Company'
                  ? 'border-[#D99A1C] bg-amber-50/50 shadow-xs ring-1 ring-[#D99A1C]'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${partnerType === 'Company' ? 'bg-[#D99A1C] text-white' : 'bg-slate-100 text-slate-600'}`}>
                🏢
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Company Agent</h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Registered Consultancy / Corporate Entity</p>
                <p className="text-[10px] text-emerald-600 font-extrabold mt-1">✓ Business License & Tax ID Verification</p>
              </div>
            </div>

            {/* Option B: Individual Agent */}
            <div
              onClick={() => setPartnerType('Individual')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                partnerType === 'Individual'
                  ? 'border-[#D99A1C] bg-amber-50/50 shadow-xs ring-1 ring-[#D99A1C]'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${partnerType === 'Individual' ? 'bg-[#D99A1C] text-white' : 'bg-slate-100 text-slate-600'}`}>
                👤
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Individual Agent</h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Freelance Counselor / Independent Advisor</p>
                <p className="text-[10px] text-emerald-600 font-extrabold mt-1">✓ Individual Photo ID Proof Clearance</p>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 2: Partner Profile Details */}
        <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl p-6 shadow-xs space-y-5">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-[#D99A1C] uppercase tracking-widest block">SECTION 2</span>
            <h2 className="text-base font-black text-slate-900">Partner Information & Credentials</h2>
            <p className="text-xs text-slate-500 font-medium">Enter primary contact details for contract execution and portal login authentication.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Full Contact Name <span className="text-rose-500">*</span></label>
              <input type="text" required name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]" placeholder="e.g. Sreelakshmi S" />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Official Email Address <span className="text-rose-500">*</span></label>
              <input type="email" required name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]" placeholder="e.g. partner@agency.com" />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Phone Number <span className="text-rose-500">*</span></label>
              <input type="tel" required name="phone" value={formData.phone} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]" placeholder="e.g. +91 9876543210" />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Operating Country</label>
              <select name="country" value={formData.country} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]">
                {countriesList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {partnerType === 'Company' && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Registered Company Name <span className="text-rose-500">*</span></label>
                  <input type="text" required name="companyName" value={formData.companyName} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]" placeholder="e.g. Apex Global Education Pvt Ltd" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Tax Registration / GST ID</label>
                  <input type="text" name="taxId" value={formData.taxId} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]" placeholder="e.g. GSTIN29ABCDE1234F" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* STEP 3: Compliance & Document Verification Upload Section */}
        <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-emerald-500 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">SECTION 3</span>
            <h2 className="text-base font-black text-slate-900">Compliance & Verification Document Proofs</h2>
            <p className="text-xs text-slate-500 font-medium">Upload mandatory verification proofs ({partnerType === 'Company' ? 'Company Incorporation Certificate, Tax ID, Signatory ID' : 'Individual ID Proof, Address Proof'}). Formats: PDF, PNG, JPG (Max 15MB).</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partnerType === 'Company' ? (
              <>
                <DocumentUploadSlot label="Company Incorporation Certificate" description="Official Business Registration License" docKey="incorporationCert" fileObj={documents.incorporationCert} required={true} onFileChange={handleFileChange} onRemoveFile={handleRemoveFile} onViewFile={(doc) => setPreviewModalDoc(doc)} />
                <DocumentUploadSlot label="Tax / GST Registration Certificate" description="Tax Identification Copy" docKey="taxCert" fileObj={documents.taxCert} required={false} onFileChange={handleFileChange} onRemoveFile={handleRemoveFile} onViewFile={(doc) => setPreviewModalDoc(doc)} />
                <DocumentUploadSlot label="Authorised Signatory ID Proof" description="Director Passport or Photo ID" docKey="signatoryIdProof" fileObj={documents.signatoryIdProof} required={false} onFileChange={handleFileChange} onRemoveFile={handleRemoveFile} onViewFile={(doc) => setPreviewModalDoc(doc)} />
              </>
            ) : (
              <>
                <DocumentUploadSlot label="Individual ID Proof (Passport / National ID)" description="Government Photo ID" docKey="idProof" fileObj={documents.idProof} required={true} onFileChange={handleFileChange} onRemoveFile={handleRemoveFile} onViewFile={(doc) => setPreviewModalDoc(doc)} />
                <DocumentUploadSlot label="Address Proof / Resume" description="Utility Bill or Professional Bio" docKey="addressProof" fileObj={documents.addressProof} required={false} onFileChange={handleFileChange} onRemoveFile={handleRemoveFile} onViewFile={(doc) => setPreviewModalDoc(doc)} />
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-xs">
          <button type="button" onClick={() => onBack && onBack()} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#D99A1C] hover:bg-[#F5B025] text-white font-black text-xs rounded-xl shadow-md cursor-pointer">
            {isSubmitting ? 'Onboarding Partner...' : 'Confirm Partner Onboarding →'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DocumentUploadSlot({ label, description, docKey, fileObj, required, onFileChange, onRemoveFile }) {
  return (
    <div className={`border-2 border-dashed rounded-xl p-4 transition-all flex flex-col justify-between min-h-[140px] ${fileObj ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50 hover:border-[#D99A1C]'}`}>
      <div>
        <div className="flex justify-between items-start">
          <label className="text-xs font-black text-slate-900">{label} {required && <span className="text-rose-500">*</span>}</label>
          {required && <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded uppercase">Required</span>}
        </div>
        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{description}</p>
      </div>

      {fileObj ? (
        <div className="bg-white border border-emerald-200 p-2.5 rounded-lg flex items-center justify-between mt-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-xs font-bold text-emerald-600">📄</span>
            <span className="text-xs font-bold text-slate-900 truncate">{fileObj.name}</span>
          </div>
          <button type="button" onClick={() => onRemoveFile(docKey)} className="text-rose-500 font-bold text-xs p-1 hover:bg-rose-50 rounded">✕</button>
        </div>
      ) : (
        <label className="cursor-pointer bg-white border border-slate-200 p-2.5 rounded-lg text-center block mt-3 hover:border-[#D99A1C]">
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => onFileChange(docKey, e)} className="hidden" />
          <p className="text-xs font-bold text-slate-700">Select File to Upload</p>
          <span className="text-[9px] text-slate-400">PDF, PNG, JPG (Max 15MB)</span>
        </label>
      )}
    </div>
  );
}
