import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import API from '../api/axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function BecomePartner({ clients = [], setClients, applications = [], onPartnerOnboarded, onBack }) {
  const toast = useToast();
  const { addAuditLog } = useAuth();

  // Sub-view mode: 'directory' | 'onboard'
  const [subView, setSubView] = useState('directory');

  // Document Preview Modal State
  const [previewModalDoc, setPreviewModalDoc] = useState(null);

  // Edit Partner Modal State
  const [editingPartner, setEditingPartner] = useState(null);

  // --- DIRECTORY STATES & LOGIC ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [partnerSubTabs, setPartnerSubTabs] = useState({});

  // Filter partners (type === 'Agent')
  const partners = clients.filter(c => c.type === 'Agent');

  const filteredPartners = partners.filter(p => {
    const codeStr = p.partnerCode || '';
    const nameStr = p.name || '';
    const emailStr = p.email || '';
    const phoneStr = p.phone || '';
    const companyStr = p.companyName || '';

    const searchMatch = nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        codeStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        emailStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        phoneStr.includes(searchTerm) ||
                        companyStr.toLowerCase().includes(searchTerm.toLowerCase());

    const statusMatch = statusFilter === 'All' || 
                        (statusFilter === 'Pending' && p.status === 'Pending') ||
                        (statusFilter === 'Approved' && p.status === 'Active');

    const locationMatch = locationFilter === 'All' || p.country === locationFilter;

    return searchMatch && statusMatch && locationMatch;
  });

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleUpdateStatus = async (partnerId, newStatus) => {
    const token = localStorage.getItem('admin_token');
    try {
      if (token && token !== 'mock-admin-token-12345') {
        const response = await API.put(`/partners/${partnerId}`, { status: newStatus });
        if (response.data?.success) {
          if (setClients) {
            setClients(prev => prev.map(c => c.id === partnerId ? { ...c, status: newStatus } : c));
          }
          toast.success(`Partner status updated to ${newStatus}.`);
        } else {
          throw new Error(response.data?.message || 'Failed to update partner status');
        }
      } else {
        if (setClients) {
          setClients(prev => prev.map(c => c.id === partnerId ? { ...c, status: newStatus } : c));
        }
        toast.success(`Partner status updated to ${newStatus}.`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleOpenEditModal = (partner, e) => {
    if (e) e.stopPropagation();
    setEditingPartner({
      id: partner.id,
      name: partner.name || '',
      email: partner.email || '',
      phone: partner.phone || '',
      partnerType: partner.partnerType || 'Company',
      companyName: partner.companyName || partner.name || '',
      taxId: partner.taxId || '',
      country: partner.country || 'India',
      status: partner.status || 'Active',
      documents: partner.documents || []
    });
  };

  const handleSavePartnerEdit = async (e) => {
    e.preventDefault();
    if (!editingPartner) return;

    if (!editingPartner.name || !editingPartner.email || !editingPartner.phone) {
      toast.error('Please fill in required fields (Name, Email, Phone).');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      if (token && token !== 'mock-admin-token-12345' && editingPartner.id) {
        const res = await API.put(`/partners/${editingPartner.id}`, {
          name: editingPartner.name,
          email: editingPartner.email,
          phone: editingPartner.phone,
          partnerType: editingPartner.partnerType,
          companyName: editingPartner.companyName,
          taxId: editingPartner.taxId,
          country: editingPartner.country,
          status: editingPartner.status
        });

        if (!res.data?.success) {
          throw new Error(res.data?.message || 'Failed to update partner details');
        }
      }

      if (setClients) {
        setClients(prev => prev.map(c => c.id === editingPartner.id ? {
          ...c,
          name: editingPartner.name,
          email: editingPartner.email,
          phone: editingPartner.phone,
          partnerType: editingPartner.partnerType,
          companyName: editingPartner.companyName,
          taxId: editingPartner.taxId,
          country: editingPartner.country,
          status: editingPartner.status
        } : c));
      }

      toast.success(`Partner '${editingPartner.name}' details updated successfully!`);
      setEditingPartner(null);
      if (onPartnerOnboarded) onPartnerOnboarded();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Update failed';
      toast.error(errMsg);
    }
  };

  const getReferredStudents = (partnerName) => {
    return clients.filter(c => c.type === 'Student' && c.referredBy === partnerName);
  };

  // --- ONBOARDING FORM STATES & LOGIC ---
  const [partnerType, setPartnerType] = useState('Company'); // 'Company' | 'Individual'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    taxId: '',
    country: 'India'
  });

  const [documents, setDocuments] = useState({
    incorporationCert: null,
    taxCert: null,
    signatoryIdProof: null,
    idProof: null,
    addressProof: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [submittedPartnerCode, setSubmittedPartnerCode] = useState('');

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

    const previewUrl = URL.createObjectURL(file);

    setDocuments(prev => ({
      ...prev,
      [docKey]: {
        fileObj: file,
        name: file.name,
        previewUrl: previewUrl,
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
      if (documents.incorporationCert) docsPayload.push({ title: 'Company Incorporation Certificate', fileName: documents.incorporationCert.name, previewUrl: documents.incorporationCert.previewUrl, type: documents.incorporationCert.type });
      if (documents.taxCert) docsPayload.push({ title: 'Tax / GST Registration Certificate', fileName: documents.taxCert.name, previewUrl: documents.taxCert.previewUrl, type: documents.taxCert.type });
      if (documents.signatoryIdProof) docsPayload.push({ title: 'Authorised Signatory ID Proof', fileName: documents.signatoryIdProof.name, previewUrl: documents.signatoryIdProof.previewUrl, type: documents.signatoryIdProof.type });
    } else {
      if (documents.idProof) docsPayload.push({ title: 'Individual ID Proof (Passport/National ID)', fileName: documents.idProof.name, previewUrl: documents.idProof.previewUrl, type: documents.idProof.type });
      if (documents.addressProof) docsPayload.push({ title: 'Address Proof / Resume', fileName: documents.addressProof.name, previewUrl: documents.addressProof.previewUrl, type: documents.addressProof.type });
    }

    const generatedCode = `PRT-${Math.floor(10000 + Math.random() * 90000)}`;

    try {
      const token = localStorage.getItem('admin_token');
      if (token && token !== 'mock-admin-token-12345') {
        const res = await API.post('/partners', {
          password: 'Partner@123',
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
          const newlyCreated = res.data.data;
          const newPartnerObj = {
            id: newlyCreated._id || Date.now(),
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

          setSubmittedPartnerCode(newlyCreated._id || generatedCode);
          setIsSubmittedSuccess(true);
          if (onPartnerOnboarded) onPartnerOnboarded();
          toast.success('Partner Onboarded Successfully & Added to Directory!');
        } else {
          throw new Error(res.data?.message || 'API error');
        }
      } else {
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
      const errMsg = err.response?.data?.message || err.message || 'Submission error';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetOnboardingForm = () => {
    setIsSubmittedSuccess(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      companyName: '',
      taxId: '',
      country: 'India'
    });
    setDocuments({
      incorporationCert: null,
      taxCert: null,
      signatoryIdProof: null,
      idProof: null,
      addressProof: null
    });
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 bg-[#F0F2F5] animate-fade-in-up">
      {/* Header Banner with Sub-tab Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider">
            <span>🤝 Partner Management Portal</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Become our Partner — Directory & Onboarding</h1>
          <p className="text-xs text-slate-500 font-medium">Manage registered agency partners, edit profile details, view uploaded compliance proofs, and onboard new referral agents.</p>
        </div>

        {/* View Switcher Toggle */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl gap-1 shrink-0">
          <button
            onClick={() => setSubView('directory')}
            className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              subView === 'directory'
                ? 'bg-white text-[#D99A1C] shadow-sm font-black'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>👥 Referral Partners Directory ({partners.length})</span>
          </button>
          <button
            onClick={() => {
              setSubView('onboard');
              resetOnboardingForm();
            }}
            className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              subView === 'onboard'
                ? 'bg-[#D99A1C] text-white shadow-md font-black'
                : 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20'
            }`}
          >
            <span>➕ Onboard New Partner</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: REFERRAL PARTNERS DIRECTORY */}
      {subView === 'directory' && (
        <div className="space-y-6 animate-fade-in">
          {/* Directory Filters & Search */}
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#2563EB] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="bg-slate-100 p-1 rounded-xl flex w-full sm:w-auto">
              {['All', 'Pending', 'Approved'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === status 
                      ? 'bg-white text-[#D99A1C] shadow-sm font-black' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex w-full sm:w-auto items-center gap-3">
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#D99A1C] font-semibold cursor-pointer"
              >
                <option value="All">All Locations</option>
                {countriesList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <div className="relative w-full sm:max-w-xs">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#D99A1C] transition-all font-medium"
                  placeholder="Search by name, company, code, email, phone..."
                />
              </div>
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Registered Referral Partners & Agencies ({filteredPartners.length})</h2>
              <button
                onClick={() => {
                  setSubView('onboard');
                  resetOnboardingForm();
                }}
                className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
              >
                <span>+ Onboard New Referral Agency</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              {filteredPartners.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                      <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider w-[50px]"></th>
                      <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider w-[60px]">SI.NO.</th>
                      <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Partner details</th>
                      <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Partner Code</th>
                      <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Contact Info</th>
                      <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Referred Students</th>
                      <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Actions / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {filteredPartners.map((partner, idx) => {
                      const isExpanded = expandedId === partner.id;
                      const referredStudents = getReferredStudents(partner.name);

                      return (
                        <React.Fragment key={partner.id || idx}>
                          <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => toggleExpand(partner.id)}>
                            <td className="pl-6 py-4 w-[40px]">
                              <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90 text-indigo-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                              </svg>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                            <td className="px-6 py-4 flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs bg-gradient-to-tr from-amber-500 to-indigo-500 shrink-0 shadow-xs">
                                {partner.name ? partner.name.split(' ').map(n => n[0]).join('') : 'P'}
                              </div>
                              <div>
                                <p className="text-slate-950 font-black text-xs">{partner.name}</p>
                                <p className="text-[10px] text-slate-500 font-semibold">{partner.companyName || partner.name}</p>
                                <span className="inline-block text-[9px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded mt-0.5 border border-amber-200">
                                  {partner.partnerType || 'Company'} Agent
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black border bg-blue-50 text-blue-700 border-blue-200">
                                {partner.partnerCode}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-indigo-600 font-bold text-xs">{partner.email}</p>
                              <p className="text-slate-500 text-[10px] font-medium">{partner.phone} ({partner.country || 'India'})</p>
                            </td>
                            <td className="px-6 py-4 font-black text-indigo-600">{referredStudents.length} Students</td>
                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={(e) => handleOpenEditModal(partner, e)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Edit Partner Details"
                              >
                                <span>✏️ Edit</span>
                              </button>

                              <span className={`px-2 py-0.5 border rounded-full text-[9px] font-extrabold ${
                                partner.status === 'Active' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                  : partner.status === 'Pending'
                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                    : 'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {partner.status}
                              </span>
                              {partner.status === 'Pending' && (
                                <button
                                  onClick={() => handleUpdateStatus(partner.id, 'Active')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] px-2 py-1 rounded-md transition-all shadow-3xs cursor-pointer uppercase tracking-wider"
                                >
                                  Approve
                                </button>
                              )}
                              {partner.status === 'Active' && (
                                <button
                                  onClick={() => handleUpdateStatus(partner.id, 'Inactive')}
                                  className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[9px] px-2 py-1 rounded-md transition-all shadow-3xs cursor-pointer uppercase tracking-wider"
                                >
                                  Deactivate
                                </button>
                              )}
                              {partner.status === 'Inactive' && (
                                <button
                                  onClick={() => handleUpdateStatus(partner.id, 'Active')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] px-2 py-1 rounded-md transition-all shadow-3xs cursor-pointer uppercase tracking-wider"
                                >
                                  Activate
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Partner Details View */}
                          {isExpanded && (() => {
                            const currentSubTab = partnerSubTabs[partner.id] || 'overview';
                            const setSubTab = (tab) => {
                              setPartnerSubTabs(prev => ({ ...prev, [partner.id]: tab }));
                            };

                            return (
                              <tr>
                                <td colSpan="8" className="bg-slate-50/50 p-6 border-t border-b border-slate-100">
                                  <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#2563EB] rounded-xl p-5 shadow-xs space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                                      <div className="flex gap-4">
                                        <button 
                                          onClick={() => setSubTab('overview')}
                                          className={`pb-1 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                                            currentSubTab === 'overview' 
                                              ? 'border-[#D99A1C] text-[#D99A1C]' 
                                              : 'border-transparent text-slate-400 hover:text-slate-700'
                                          }`}
                                        >
                                          Overview & Onboarding Proofs
                                        </button>
                                        <button 
                                          onClick={() => setSubTab('applications')}
                                          className={`pb-1 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                                            currentSubTab === 'applications' 
                                              ? 'border-[#D99A1C] text-[#D99A1C]' 
                                              : 'border-transparent text-slate-400 hover:text-slate-700'
                                          }`}
                                        >
                                          Referred Applications ({referredStudents.length})
                                        </button>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={(e) => handleOpenEditModal(partner, e)}
                                          className="px-2.5 py-1 bg-amber-50 text-[#D99A1C] border border-amber-200 rounded-md text-[10px] font-black hover:bg-amber-100 cursor-pointer"
                                        >
                                          ✏️ Edit Partner Profile
                                        </button>
                                        <span className="text-[10px] text-slate-400 font-semibold">
                                          Onboarded Date: {partner.dateAdded || 'N/A'}
                                        </span>
                                      </div>
                                    </div>

                                    {currentSubTab === 'overview' && (
                                      <div className="space-y-4 animate-fade-in">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                            Partner Complete Onboarding Sheet — {partner.name}
                                          </h3>
                                          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-black uppercase">
                                            {partner.partnerType || 'Company'} Agent
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-[11px] font-semibold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                          <div>
                                            <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Partner Code</span>
                                            <span className="text-slate-900 font-bold text-xs font-mono text-blue-600">{partner.partnerCode}</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Company / Entity Name</span>
                                            <span className="text-slate-900 font-bold text-xs">{partner.companyName || partner.name}</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Tax Registration / GST ID</span>
                                            <span className="text-slate-900 font-medium text-xs">{partner.taxId || 'N/A'}</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Operating Country</span>
                                            <span className="text-slate-900 font-bold text-xs">{partner.country || 'India'}</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Contact Person Name</span>
                                            <span className="text-slate-900 font-bold text-xs">{partner.name}</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Contact Email Address</span>
                                            <span className="text-indigo-600 font-bold text-xs">{partner.email}</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Direct Phone Line</span>
                                            <span className="text-slate-900 font-medium text-xs">{partner.phone}</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Account Status</span>
                                            <span className="text-emerald-600 font-extrabold text-xs">{partner.status || 'Active'}</span>
                                          </div>
                                        </div>

                                        {/* Uploaded Compliance Documents */}
                                        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                                          <div className="flex justify-between items-center">
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                              Saved Compliance & Verification Documents ({partner.documents ? partner.documents.length : 0})
                                            </h4>
                                            {partner.documents && partner.documents.length > 0 && (
                                              <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase">
                                                ✓ Verification Documents Onboarded
                                              </span>
                                            )}
                                          </div>

                                          {partner.documents && partner.documents.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                              {partner.documents.map((doc, dIdx) => {
                                                const docTitle = typeof doc === 'string' ? doc : (doc.title || doc.fileName || `Document ${dIdx + 1}`);
                                                const docFileName = typeof doc === 'string' ? doc : (doc.fileName || doc.title || 'Attached Proof');
                                                const docUrl = typeof doc === 'object' ? doc.previewUrl : null;
                                                const docType = typeof doc === 'object' ? doc.type : 'pdf';

                                                return (
                                                  <div key={dIdx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs shadow-2xs hover:border-amber-300 transition-all">
                                                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                                                      <span className="text-lg">📄</span>
                                                      <div className="truncate">
                                                        <p className="text-[11px] font-bold text-slate-900 truncate">{docTitle}</p>
                                                        <p className="text-[9px] text-slate-400 font-semibold truncate">{docFileName}</p>
                                                      </div>
                                                    </div>
                                                    <button
                                                      type="button"
                                                      onClick={() => setPreviewModalDoc({ title: docTitle, fileName: docFileName, previewUrl: docUrl, type: docType })}
                                                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[#D99A1C] border border-amber-200 rounded-lg text-[10px] font-black shrink-0 cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                                                    >
                                                      <span>👁️ View</span>
                                                    </button>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-center">
                                              <p className="text-[11px] font-semibold text-amber-800">No verification documents attached to this partner profile yet.</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {currentSubTab === 'applications' && (
                                      <div className="space-y-2 animate-fade-in">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Referred Students ({referredStudents.length})</h4>
                                        {referredStudents.length > 0 ? (
                                          <div className="border border-slate-150 rounded-xl overflow-hidden">
                                            <table className="w-full text-left border-collapse text-[11px]">
                                              <thead>
                                                <tr className="bg-slate-50 border-b border-slate-150">
                                                  <th className="px-4 py-2 text-slate-400 font-extrabold uppercase tracking-wider">Student Name</th>
                                                  <th className="px-4 py-2 text-slate-400 font-extrabold uppercase tracking-wider">Email Address</th>
                                                  <th className="px-4 py-2 text-slate-400 font-extrabold uppercase tracking-wider">Phone</th>
                                                  <th className="px-4 py-2 text-slate-400 font-extrabold uppercase tracking-wider">Status</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                                {referredStudents.map(student => (
                                                  <tr key={student.id} className="hover:bg-slate-50/30">
                                                    <td className="px-4 py-2.5 font-bold text-slate-900">{student.name}</td>
                                                    <td className="px-4 py-2.5 text-slate-500">{student.email}</td>
                                                    <td className="px-4 py-2.5 text-slate-500">{student.phone}</td>
                                                    <td className="px-4 py-2.5">
                                                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[9px] font-extrabold border border-indigo-100">
                                                        Active Student
                                                      </span>
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        ) : (
                                          <p className="text-[10px] text-slate-400 font-medium italic">No students have been referred by this partner yet.</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })()}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center space-y-2">
                  <svg className="w-12 h-12 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <h3 className="text-xs font-black text-slate-900 uppercase">No Partners Found</h3>
                  <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto">No partner directory entries matched your filter criteria.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ONBOARD NEW PARTNER FORM */}
      {subView === 'onboard' && (
        <div className="space-y-6 animate-fade-in">
          {isSubmittedSuccess ? (
            <div className="bg-white border border-emerald-200 border-t-4 border-t-emerald-500 rounded-3xl p-8 max-w-lg mx-auto text-center shadow-xl space-y-6 animate-fade-in-up my-6">
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
                  <strong className="text-slate-800">{formData.name}</strong> has been onboarded as an active <strong className="text-slate-800">{partnerType === 'Company' ? 'Company Partner Agency' : 'Individual Recruitment Agent'}</strong> and added to the Directory.
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
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setSubView('directory')}
                  className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  View in Partners Directory →
                </button>
              </div>
            </div>
          ) : (
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

              {/* STEP 3: Compliance Upload Section */}
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
                <button type="button" onClick={() => setSubView('directory')} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#D99A1C] hover:bg-[#F5B025] text-white font-black text-xs rounded-xl shadow-md cursor-pointer">
                  {isSubmitting ? 'Onboarding Partner...' : 'Confirm Partner Onboarding →'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* EDIT PARTNER MODAL PORTAL */}
      {editingPartner && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs p-4 flex justify-center items-center select-none animate-fade-in">
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[90vh] flex flex-col my-auto overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <div>
                <span className="text-[10px] font-extrabold text-[#D99A1C] uppercase tracking-wider block">Admin Management</span>
                <h3 className="text-sm font-black text-slate-900">Edit Partner Details — {editingPartner.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPartner(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePartnerEdit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Contact Person Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={editingPartner.name}
                    onChange={(e) => setEditingPartner(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#D99A1C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Email Address <span className="text-rose-500">*</span></label>
                  <input
                    type="email"
                    required
                    value={editingPartner.email}
                    onChange={(e) => setEditingPartner(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#D99A1C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Phone Number <span className="text-rose-500">*</span></label>
                  <input
                    type="tel"
                    required
                    value={editingPartner.phone}
                    onChange={(e) => setEditingPartner(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#D99A1C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Partner Entity Structure</label>
                  <select
                    value={editingPartner.partnerType}
                    onChange={(e) => setEditingPartner(prev => ({ ...prev, partnerType: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#D99A1C]"
                  >
                    <option value="Company">Company Agent</option>
                    <option value="Individual">Individual Agent</option>
                  </select>
                </div>

                {editingPartner.partnerType === 'Company' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Company Name</label>
                      <input
                        type="text"
                        value={editingPartner.companyName}
                        onChange={(e) => setEditingPartner(prev => ({ ...prev, companyName: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#D99A1C]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Tax Registration / GST ID</label>
                      <input
                        type="text"
                        value={editingPartner.taxId}
                        onChange={(e) => setEditingPartner(prev => ({ ...prev, taxId: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#D99A1C]"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Operating Country</label>
                  <select
                    value={editingPartner.country}
                    onChange={(e) => setEditingPartner(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#D99A1C]"
                  >
                    {countriesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Account Status</label>
                  <select
                    value={editingPartner.status}
                    onChange={(e) => setEditingPartner(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#D99A1C]"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Uploaded Documents List inside Edit Modal */}
              {editingPartner.documents && editingPartner.documents.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 mt-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Attached Onboarding Proofs ({editingPartner.documents.length})</span>
                  <div className="space-y-1.5">
                    {editingPartner.documents.map((doc, dIdx) => (
                      <div key={dIdx} className="bg-white border border-slate-200 p-2 rounded-lg flex items-center justify-between text-xs">
                        <span className="truncate text-slate-800 font-bold">{doc.title || doc.fileName}</span>
                        <button
                          type="button"
                          onClick={() => setPreviewModalDoc({ title: doc.title || doc.fileName, fileName: doc.fileName, previewUrl: doc.previewUrl })}
                          className="px-2 py-0.5 bg-amber-50 text-[#D99A1C] border border-amber-200 rounded text-[9px] font-black hover:bg-amber-100 cursor-pointer"
                        >
                          👁️ View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPartner(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Save Partner Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Document Preview Modal Portal */}
      {previewModalDoc && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-center select-none animate-fade-in">
          <div className="relative bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl p-4 sm:p-6 w-full max-w-3xl shadow-2xl flex flex-col my-auto max-h-[85vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold text-[#D99A1C] uppercase tracking-wider block">Document Verification Preview</span>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">{previewModalDoc.title}</h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-semibold">{previewModalDoc.fileName}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalDoc(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition-all cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50 rounded-xl border border-slate-200 p-2 sm:p-3 flex items-center justify-center my-3 min-h-[220px]">
              {previewModalDoc.previewUrl ? (
                previewModalDoc.type === 'pdf' ? (
                  <iframe
                    src={previewModalDoc.previewUrl}
                    title={previewModalDoc.title}
                    className="w-full h-[260px] sm:h-[320px] rounded-lg border border-slate-200 shadow-inner bg-white"
                  />
                ) : (
                  <img
                    src={previewModalDoc.previewUrl}
                    alt={previewModalDoc.title}
                    className="max-h-[260px] sm:max-h-[320px] w-auto max-w-full object-contain rounded-lg shadow-md"
                  />
                )
              ) : (
                <div className="text-center space-y-2 p-6">
                  <div className="w-12 h-12 bg-amber-100 text-[#D99A1C] rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                    📄
                  </div>
                  <p className="text-xs font-bold text-slate-800">{previewModalDoc.fileName}</p>
                  <p className="text-[11px] text-slate-400 font-semibold">Document verified and attached for partner account.</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 shrink-0">
              {previewModalDoc.previewUrl ? (
                <a
                  href={previewModalDoc.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-50 hover:bg-amber-100 text-[#D99A1C] border border-amber-200 font-extrabold text-[11px] sm:text-xs rounded-xl transition-all flex items-center gap-1.5"
                >
                  <span>↗ Open in New Tab</span>
                </a>
              ) : <div />}
              <button
                type="button"
                onClick={() => setPreviewModalDoc(null)}
                className="px-4 py-1.5 sm:px-5 sm:py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[11px] sm:text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function DocumentUploadSlot({ label, description, docKey, fileObj, required, onFileChange, onRemoveFile, onViewFile }) {
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
        <div className="bg-white border border-emerald-200 p-2.5 rounded-lg flex items-center justify-between mt-3 gap-2">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <span className="text-xs font-bold text-emerald-600">📄</span>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 truncate">{fileObj.name}</p>
              {fileObj.size && <p className="text-[9px] text-slate-400 font-semibold">{fileObj.size}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              type="button" 
              onClick={() => onViewFile && onViewFile({ title: label, fileName: fileObj.name, previewUrl: fileObj.previewUrl, type: fileObj.type })} 
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[#D99A1C] border border-amber-200 rounded-md text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
              title="Preview / View Uploaded Document"
            >
              <span>👁️ View Document</span>
            </button>
            <button type="button" onClick={() => onRemoveFile(docKey)} className="text-rose-500 font-bold text-xs p-1 hover:bg-rose-50 rounded" title="Remove Document">✕</button>
          </div>
        </div>
      ) : (
        <label className="cursor-pointer bg-white border border-slate-200 p-2.5 rounded-lg text-center block mt-3 hover:border-[#D99A1C] transition-all">
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => onFileChange(docKey, e)} className="hidden" />
          <p className="text-xs font-bold text-slate-700">Select File to Upload</p>
          <span className="text-[9px] text-slate-400">PDF, PNG, JPG (Max 15MB)</span>
        </label>
      )}
    </div>
  );
}
