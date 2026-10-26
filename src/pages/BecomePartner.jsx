import { getDisplayId } from '../utils/displayId';
import PartnerDocumentRequests from '../components/PartnerDocumentRequests';
import { ActionButton, ActionForm } from '../components/ActionControls';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import API from '../api/axios';
import { resolveDocumentUrl } from '../utils/applicationDocuments';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { getPartnerReferredStudents } from '../utils/partnerReferrals';

// Helper to convert base64 string or data URL to Blob URL for clean PDF/Image rendering in iframe
const getDocumentBlobUrl = (urlOrBase64, mimeType = 'application/pdf') => {
  if (!urlOrBase64) return '';
  if (typeof urlOrBase64 !== 'string') return '';
  if (urlOrBase64.startsWith('blob:') || urlOrBase64.startsWith('http://') || urlOrBase64.startsWith('https://')) {
    return urlOrBase64;
  }

  let base64 = urlOrBase64;
  let type = mimeType;

  if (urlOrBase64.startsWith('data:')) {
    const parts = urlOrBase64.split(',');
    const match = parts[0].match(/:(.*?);/);
    if (match) type = match[1];
    base64 = parts[1] || '';
  }

  try {
    const binary = atob(base64.replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Failed to convert base64 to Blob URL:', err);
    return urlOrBase64;
  }
};

const handleDownloadDocument = (docUrl, fileName) => {
  if (!docUrl) return;
  const link = document.createElement('a');
  link.href = docUrl;
  link.download = fileName || 'verification_document.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function BecomePartner({ clients = [], setClients, applications = [], onPartnerOnboarded, onBack, initialSelectedPartnerId }) {
  const toast = useToast();
  const { addAuditLog } = useAuth();
  const dismissedTargetRef = useRef(false);
  const dismissedPartnerTargetRef = useRef(null);

  const handleBackToDirectory = () => {
    dismissedTargetRef.current = true;
    dismissedPartnerTargetRef.current = initialSelectedPartnerId;
    setSingleViewPartner(null);
    setSubView('directory');
    localStorage.removeItem('studegram_admin_single_view_partner_id');
    localStorage.removeItem('studegram_admin_single_view_partner');
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('agentId');
      url.searchParams.delete('partnerId');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    } catch (e) {}
  };

  // Sub-view mode: 'directory' | 'onboard'
  const [subView, setSubView] = useState(() => {
    return localStorage.getItem('studegram_admin_partner_subview') || 'directory';
  });

  // Single Partner Detailed View State (persists across page refresh)
  const [singleViewPartner, setSingleViewPartner] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlPartnerId = params.get('agentId') || params.get('partnerId');
      const savedPartnerId = urlPartnerId || localStorage.getItem('studegram_admin_single_view_partner_id');
      const savedPartnerJson = localStorage.getItem('studegram_admin_single_view_partner');

      let parsedPartner = null;
      if (savedPartnerJson) {
        try {
          parsedPartner = JSON.parse(savedPartnerJson);
        } catch (e) {}
      }

      const partnerList = (clients || []).filter(c => c.type === 'Agent');
      if (partnerList.length > 0) {
        const targetSearchId = savedPartnerId || parsedPartner?.id || parsedPartner?._id || parsedPartner?.partnerCode;
        if (targetSearchId) {
          const targetStr = String(targetSearchId).trim().toLowerCase();
          const found = partnerList.find(p => 
            String(p.id || p._id || '').toLowerCase() === targetStr ||
            String(p.partnerCode || '').toLowerCase() === targetStr ||
            String(p.email || '').toLowerCase() === targetStr
          );
          if (found) {
            return { ...(parsedPartner || {}), ...found };
          }
        }
      }

      if (parsedPartner && (parsedPartner.id || parsedPartner._id)) {
        return parsedPartner;
      }
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    localStorage.setItem('studegram_admin_partner_subview', subView);
  }, [subView]);

  // Auto-navigate to Partner Single View Dossier when initialSelectedPartnerId is passed from notifications or saved ID
  useEffect(() => {
    if (dismissedTargetRef.current && (!initialSelectedPartnerId || initialSelectedPartnerId === dismissedPartnerTargetRef.current)) return;
    if (initialSelectedPartnerId) {
      dismissedTargetRef.current = false;
    }

    const params = new URLSearchParams(window.location.search);
    const urlPartnerId = params.get('agentId') || params.get('partnerId');
    const savedPartnerId = urlPartnerId || localStorage.getItem('studegram_admin_single_view_partner_id');
    const effectiveTarget = initialSelectedPartnerId || (!singleViewPartner ? savedPartnerId : null);

    if (!effectiveTarget) return;

    const partnerList = (clients || []).filter(c => c.type === 'Agent');
    if (partnerList.length === 0) return;

    let targetId = effectiveTarget;
    let notifObj = null;
    if (typeof effectiveTarget === 'object' && effectiveTarget !== null) {
      targetId = effectiveTarget.targetId || effectiveTarget.relatedId || effectiveTarget.partnerId || effectiveTarget.id;
      notifObj = effectiveTarget.notification || effectiveTarget;
    }

    const targetStr = String(targetId || '').trim().toLowerCase();
    const notifText = notifObj ? `${notifObj.title || ''} ${notifObj.message || ''}`.toLowerCase() : '';

    // 1. Match by ID / Partner Code / Email
    let found = partnerList.find(p => {
      const pId = String(p.id || p._id || '').toLowerCase();
      const pCode = String(p.partnerCode || '').toLowerCase();
      const pEmail = String(p.email || '').toLowerCase();
      return (targetStr && (pId === targetStr || pCode === targetStr || pEmail === targetStr));
    });

    // 2. Match by Name / Company name if targetStr provided
    if (!found && targetStr) {
      found = partnerList.find(p => {
        const pName = (p.name || '').toLowerCase();
        const pComp = (p.companyName || '').toLowerCase();
        return (pName && (pName.includes(targetStr) || targetStr.includes(pName))) ||
               (pComp && (pComp.includes(targetStr) || targetStr.includes(pComp)));
      });
    }

    // 3. Match from notification title & message content
    if (!found && notifText) {
      found = partnerList.find(p => {
        const pName = (p.name || '').toLowerCase();
        const pComp = (p.companyName || '').toLowerCase();
        const pCode = (p.partnerCode || '').toLowerCase();
        return (
          (pName && notifText.includes(pName)) ||
          (pComp && notifText.includes(pComp)) ||
          (pCode && notifText.includes(pCode))
        );
      });
    }

    // 4. Fallback: If it's a partner notification, open the pending partner or first partner
    if (!found && notifObj) {
      found = partnerList.find(p => p.status === 'Pending') || partnerList[0];
    }

    if (found) {
      setSubView('directory');
      setSingleViewPartner(found);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.getElementById('admin-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [initialSelectedPartnerId, clients, singleViewPartner]);

  // Keep singleViewPartner in sync with live clients prop
  useEffect(() => {
    if (!singleViewPartner || !clients || clients.length === 0) return;
    const partnerList = clients.filter(c => c.type === 'Agent');
    const currentId = String(singleViewPartner.id || singleViewPartner._id || singleViewPartner.partnerCode || '').toLowerCase();
    const updated = partnerList.find(p => 
      String(p.id || p._id || '').toLowerCase() === currentId ||
      String(p.partnerCode || '').toLowerCase() === currentId ||
      String(p.email || '').toLowerCase() === currentId
    );
    if (updated) {
      setSingleViewPartner(prev => ({ ...(prev || {}), ...updated }));
    }
  }, [clients]);

  // Persist singleViewPartner to localStorage and URL search params
  useEffect(() => {
    if (singleViewPartner) {
      const partnerId = singleViewPartner.id || singleViewPartner._id || singleViewPartner.partnerCode;
      if (partnerId) {
        localStorage.setItem('studegram_admin_single_view_partner_id', String(partnerId));
      }
      try {
        localStorage.setItem('studegram_admin_single_view_partner', JSON.stringify(singleViewPartner));
      } catch (e) {
        console.warn('Could not serialize singleViewPartner:', e);
      }

      try {
        const url = new URL(window.location.href);
        if (partnerId && url.searchParams.get('agentId') !== String(partnerId)) {
          url.searchParams.set('agentId', String(partnerId));
          window.history.replaceState({}, '', url.toString());
        }
      } catch (e) {}
    } else {
      localStorage.removeItem('studegram_admin_single_view_partner_id');
      localStorage.removeItem('studegram_admin_single_view_partner');
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('agentId') || url.searchParams.has('partnerId')) {
          url.searchParams.delete('agentId');
          url.searchParams.delete('partnerId');
          window.history.replaceState({}, '', url.toString());
        }
      } catch (e) {}
    }
  }, [singleViewPartner]);

  // Listen for clear events (e.g. from sidebar clicks or navigation away)
  useEffect(() => {
    const handleClearSingleViewPartner = () => {
      dismissedTargetRef.current = true;
      setSingleViewPartner(null);
      localStorage.removeItem('studegram_admin_single_view_partner_id');
      localStorage.removeItem('studegram_admin_single_view_partner');
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('agentId');
        url.searchParams.delete('partnerId');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      } catch (e) {}
    };

    window.addEventListener('clear_single_view_partner', handleClearSingleViewPartner);
    return () => {
      window.removeEventListener('clear_single_view_partner', handleClearSingleViewPartner);
    };
  }, []);

  // Handle browser Back / Forward history navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlPartnerId = params.get('agentId') || params.get('partnerId');
      if (!urlPartnerId) {
        setSingleViewPartner(null);
      } else if (!singleViewPartner || (singleViewPartner.id !== urlPartnerId && singleViewPartner._id !== urlPartnerId && singleViewPartner.partnerCode !== urlPartnerId)) {
        const partnerList = (clients || []).filter(c => c.type === 'Agent');
        const found = partnerList.find(p => 
          String(p.id || p._id || '').toLowerCase() === urlPartnerId.toLowerCase() ||
          String(p.partnerCode || '').toLowerCase() === urlPartnerId.toLowerCase()
        );
        if (found) setSingleViewPartner(found);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [clients, singleViewPartner]);

  // Document Preview Modal State
  const [previewModalDoc, setPreviewModalDoc] = useState(null);

  // Edit Partner Modal State
  const [editingPartner, setEditingPartner] = useState(null);
  const [confirmStatusModal, setConfirmStatusModal] = useState(null);
  const [isProcessingStatus, setIsProcessingStatus] = useState(false);

  // --- DIRECTORY STATES & LOGIC ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, locationFilter]);

  // Filter partners (type === 'Agent')
  const partners = clients.filter(c => c.type === 'Agent');

  const activeCount = partners.filter(p => p.status === 'Active').length;
  const pendingCount = partners.filter(p => p.status === 'Pending').length;

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
                        (statusFilter === 'Waiting for Missing Document' && p.status === 'Waiting for Missing Document') ||
                        (statusFilter === 'Approved' && p.status === 'Active');

    const locationMatch = locationFilter === 'All' || p.country === locationFilter;

    return searchMatch && statusMatch && locationMatch;
  });

  // Pagination Math
  const totalItems = filteredPartners.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPartners = filteredPartners.slice(startIndex, startIndex + itemsPerPage);


  const handleUpdateStatus = async (partnerId, newStatus) => {
    try {
      if (partnerId) {
        let response;
        if (newStatus === 'Active') {
          response = await API.put(`/partners/${partnerId}/approve`);
        } else if (newStatus === 'Inactive') {
          response = await API.put(`/partners/${partnerId}/deactivate`).catch(() => API.put(`/partners/${partnerId}`, { status: 'Inactive' }));
        } else {
          response = await API.put(`/partners/${partnerId}`, { status: newStatus });
        }
        if (response.data?.success) {
          if (setClients) {
            setClients(prev => prev.map(c => (c.id === partnerId || c._id === partnerId) ? { ...c, status: newStatus } : c));
          }
          if (newStatus === 'Active') {
            toast.success(response.data?.message || 'Partner approved! A 6-digit login password has been sent to their email.');
          } else if (newStatus === 'Inactive') {
            toast.success(response.data?.message || 'Partner deactivated! A deactivation notice email has been dispatched.');
          } else {
            toast.success(`Partner status updated to ${newStatus}.`);
          }
          if (onPartnerOnboarded) {
            onPartnerOnboarded();
          }
          return true;
        } else {
          throw new Error(response.data?.message || 'Failed to update partner status');
        }
      } else {
        if (setClients) {
          setClients(prev => prev.map(c => (c.id === partnerId || c._id === partnerId) ? { ...c, status: newStatus } : c));
        }
        toast.success(`Partner status updated to ${newStatus}.`);
        if (onPartnerOnboarded) {
          onPartnerOnboarded();
        }
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update status');
      return false;
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!confirmStatusModal) return;
    const { partner, newStatus } = confirmStatusModal;
    const partnerId = partner.id || partner._id;
    setIsProcessingStatus(true);
    try {
      const ok = await handleUpdateStatus(partnerId, newStatus);
      if (ok) {
        setSingleViewPartner(prev => (prev && (prev.id === partnerId || prev._id === partnerId)) ? { ...prev, status: newStatus } : prev);
        setConfirmStatusModal(null);
      }
    } finally {
      setIsProcessingStatus(false);
    }
  };

  // Close confirmation modal on ESC
  useEffect(() => {
    if (!confirmStatusModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isProcessingStatus) {
        setConfirmStatusModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmStatusModal, isProcessingStatus]);

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
      country: partner.country || '',
      status: partner.status || 'Active',
      documents: partner.documents || []
    });
  };

  const handleSavePartnerEdit = async (e) => {
    e.preventDefault();
    if (!editingPartner) return;
    setIsSavingPartner(true);

    if (!editingPartner.name || !editingPartner.email || !editingPartner.phone) {
      toast.error('Please fill in required fields (Name, Email, Phone).');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      if (editingPartner && editingPartner.id) {
        const res = await API.put(`/partners/${editingPartner.id}`, {
          name: editingPartner.name,
          email: editingPartner.email,
          phone: editingPartner.phone,
          partnerType: editingPartner.partnerType,
          companyName: editingPartner.companyName,
          taxId: editingPartner.taxId,
          country: editingPartner.country,
          status: editingPartner.status,
          documents: editingPartner.documents || []
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
          status: editingPartner.status,
          documents: editingPartner.documents || []
        } : c));
      }

      toast.success(`Partner '${editingPartner.name}' profile updated successfully!`);
      setEditingPartner(null);
      if (onPartnerOnboarded) onPartnerOnboarded();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Update failed';
      toast.error(errMsg);
    } finally {
      setIsSavingPartner(false);
    }
  };

  const getReferredStudents = partner => getPartnerReferredStudents(partner, clients, applications);

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
  const [isUploadingEditDoc, setIsUploadingEditDoc] = useState(false);
  const [isSavingPartner, setIsSavingPartner] = useState(false);
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

  const handleFileChange = async (docKey, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size exceeds 15MB limit. Please select a smaller file.');
      return;
    }

    let uploadedUrl = '';
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      const uploadRes = await API.post('/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (uploadRes.data?.success && (uploadRes.data.url || uploadRes.data.fileUrl)) {
        uploadedUrl = uploadRes.data.url || uploadRes.data.fileUrl;
      }
    } catch (uploadErr) {
      toast.error(uploadErr.response?.data?.message || 'S3 upload failed. Please retry.');
      return;
    }

    if (uploadedUrl) {
      setDocuments(prev => ({
        ...prev,
        [docKey]: {
          fileObj: file,
          name: file.name,
          previewUrl: uploadedUrl,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          type: file.type.includes('pdf') ? 'pdf' : 'image',
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      }));
      toast.success(`Uploaded '${file.name}' successfully!`);
    } else {
      toast.error('File was not stored in S3. Please retry.');
    }
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



    try {
      {
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
          const newlyCreated = res.data.data;
          const newPartnerObj = {
            id: newlyCreated._id,
            name: formData.name,
            type: 'Agent',
            partnerType: partnerType,
            companyName: partnerType === 'Company' ? formData.companyName : formData.name,
            taxId: formData.taxId,
            country: formData.country,
            email: formData.email,
            phone: formData.phone,
            partnerCode: getDisplayId(newlyCreated),
            status: 'Active',
            activeApps: 0,
            documents: docsPayload,
            dateAdded: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          };

          if (setClients) {
            setClients(prev => [newPartnerObj, ...prev]);
          }

          setSubmittedPartnerCode(getDisplayId(newlyCreated));
          setIsSubmittedSuccess(true);
          addAuditLog('ONBOARD_PARTNER', 'Partner', newlyCreated._id, `Onboarded ${newlyCreated.name}`);
          if (onPartnerOnboarded) onPartnerOnboarded();
          toast.success('Partner Onboarded Successfully & Added to Directory!');
        } else {
          throw new Error(res.data?.message || 'API error');
        }
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
    setPartnerType('Company');
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

  const handleOpenOnboarding = () => {
    // Dismiss the old detail target before clearing the selection so the
    // restoration effect cannot immediately replace the onboarding form.
    handleBackToDirectory();
    resetOnboardingForm();
    setSubView('onboard');
    document.getElementById('admin-main-content')?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="flex-1 p-5 md:p-8 space-y-6 bg-[#F8FAFC] animate-fade-in-up">
      {/* Premium Header Banner with Metrics & View Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D99A1C]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-[#D99A1C]/40 rounded-full backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#D99A1C] animate-pulse"></span>
              <span className="text-[10px] font-black text-[#F5B025] uppercase tracking-widest">
                Partner Network Console
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Become Our Partner</span>
              <span className="text-xs font-bold text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-700">
                v2.4
              </span>
            </h1>
            <p className="text-xs text-slate-300 font-medium max-w-xl leading-relaxed">
              Unified directory management, referral partner onboarding, tax compliance verification, and instant document inspection.
            </p>

            {/* Quick Metrics Cards */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Partners:</span>
                <span className="text-xs font-black text-amber-400">{partners.length}</span>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Active Agencies:</span>
                <span className="text-xs font-black text-emerald-400">{activeCount}</span>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Pending Review:</span>
                <span className="text-xs font-black text-blue-400">{pendingCount}</span>
              </div>
            </div>
          </div>

          {/* Premium Sub-Tab Switcher */}
          <div className="flex items-center bg-slate-800/90 border border-slate-700/80 p-1.5 rounded-2xl gap-1.5 shrink-0 shadow-inner backdrop-blur-md">
            <ActionButton
              onClick={handleBackToDirectory}
              className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                subView === 'directory'
                  ? 'bg-gradient-to-r from-[#D99A1C] to-[#F5B025] text-slate-950 shadow-lg shadow-[#D99A1C]/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Referral Partners Directory ({partners.length})</span>
            </ActionButton>

            <ActionButton
              onClick={handleOpenOnboarding}
              className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                subView === 'onboard'
                  ? 'bg-gradient-to-r from-[#D99A1C] to-[#F5B025] text-slate-950 shadow-lg shadow-[#D99A1C]/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>Onboard New Partner</span>
            </ActionButton>
          </div>
        </div>
      </div>

      {/* VIEW 1: REFERRAL PARTNERS DIRECTORY */}
      {subView === 'directory' && !singleViewPartner && (
        <div className="space-y-6 animate-fade-in">
          {/* Directory Toolbar: Filters, Search & Action Button */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 md:p-5 shadow-xs flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Status Filter Tabs */}
            <div className="bg-slate-100/90 p-1 rounded-xl flex w-full lg:w-auto border border-slate-200/60">
              {['All', 'Pending', 'Waiting for Missing Document', 'Approved'].map((status) => (
                <ActionButton
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-1 lg:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    statusFilter === status 
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {status === 'All' ? 'All Channels' : status === 'Pending' ? 'Pending Review' : status === 'Waiting for Missing Document' ? 'Waiting for Documents' : 'Approved Active'}
                </ActionButton>
              ))}
            </div>

            {/* Location & Search */}
            <div className="flex flex-col sm:flex-row w-full lg:w-auto items-center gap-3">
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#D99A1C] focus:bg-white transition-all cursor-pointer"
              >
                <option value="All">🌐 All Operating Countries</option>
                {countriesList.map(c => <option key={c} value={c}>📍 {c}</option>)}
              </select>

              <div className="relative w-full sm:w-72">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#D99A1C] transition-all font-semibold"
                  placeholder="Search agency, code, email..."
                />
                {searchTerm && (
                  <ActionButton
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 font-bold text-xs"
                  >
                    ✕
                  </ActionButton>
                )}
              </div>

              <ActionButton
                onClick={handleOpenOnboarding}
                className="w-full sm:w-auto bg-gradient-to-r from-[#D99A1C] to-[#F5B025] hover:from-[#c28815] hover:to-[#e09e1d] text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>+ Onboard Agency</span>
              </ActionButton>
            </div>
          </div>

          {/* Directory Master Card & Table */}
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200/80 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D99A1C]"></span>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Referral Agency Directory ({filteredPartners.length})
                </h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredPartners.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200/80">
                      <th className="px-6 py-3.5 text-slate-400 text-[10px] font-black uppercase tracking-wider w-[60px]">#</th>
                      <th className="px-6 py-3.5 text-slate-400 text-[10px] font-black uppercase tracking-wider">Partner Details</th>
                      <th className="px-5 py-3.5 text-slate-400 text-[10px] font-black uppercase tracking-wider">Agency Code</th>
                      <th className="px-6 py-3.5 text-slate-400 text-[10px] font-black uppercase tracking-wider">Contact Credentials</th>
                      <th className="px-5 py-3.5 text-slate-400 text-[10px] font-black uppercase tracking-wider">Referred Students</th>
                      <th className="px-6 py-3.5 text-slate-400 text-[10px] font-black uppercase tracking-wider text-right">Actions / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {paginatedPartners.map((partner, idx) => {
                      const referredStudents = getReferredStudents(partner);

                      return (
                        <tr 
                          key={partner.id || idx}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group" 
                          onClick={() => {
                            dismissedTargetRef.current = false;
                            setSingleViewPartner(partner);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            document.getElementById('admin-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <td className="px-6 py-4 font-extrabold text-slate-400">{startIndex + idx + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-xs bg-gradient-to-tr from-slate-800 via-slate-700 to-[#D99A1C] shrink-0 shadow-md shadow-slate-900/10 group-hover:scale-105 transition-transform">
                                {partner.name ? partner.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'PR'}
                              </div>
                              <div>
                                <p className="text-slate-950 font-black text-xs tracking-tight group-hover:text-[#D99A1C] group-hover:underline transition-colors flex items-center gap-1.5">
                                  <span>{partner.name}</span>
                                  <span className="text-[10px] text-[#D99A1C] font-extrabold opacity-0 group-hover:opacity-100 transition-opacity">→ View Details</span>
                                </p>
                                <p className="text-[10px] text-slate-500 font-semibold">
                                  {(partner.partnerType && partner.partnerType.toString().toLowerCase() === 'individual') ? 'Individual Counselor / Agent' : (partner.companyName || partner.name)}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight whitespace-nowrap mt-1 ${
                                    (partner.partnerType && partner.partnerType.toString().toLowerCase() === 'individual')
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200/80'
                                      : 'bg-blue-50 text-blue-700 border border-blue-200/80'
                                  }`}>
                                    <span>{(partner.partnerType && partner.partnerType.toString().toLowerCase() === 'individual') ? '👤 Individual Agent' : '🏢 Company Agent'}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-black border bg-slate-50 text-blue-700 border-blue-200 shadow-2xs">
                              {partner.partnerCode}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-indigo-600 font-black text-xs">{partner.email}</p>
                            <p className="text-slate-500 text-[10px] font-medium flex items-center gap-1 mt-0.5">
                              <span>📞 {partner.phone}</span>
                              <span>•</span>
                              <span className="font-bold text-slate-700">{partner.country || ''}</span>
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 font-black text-[10px]">
                              <span>🎓 {referredStudents.length} Students</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <ActionButton
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dismissedTargetRef.current = false;
                                  setSingleViewPartner(partner);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                  document.getElementById('admin-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="px-3 py-1.5 bg-[#D99A1C]/10 hover:bg-[#D99A1C]/20 text-[#D99A1C] border border-[#D99A1C]/30 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="View Full Single Page Details"
                              >
                                <span>👁️ View Details</span>
                              </ActionButton>
                              <ActionButton
                                type="button"
                                onClick={(e) => handleOpenEditModal(partner, e)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Edit Partner Profile Details"
                              >
                                <span>✏️ Edit</span>
                              </ActionButton>

                              <span className={`px-2.5 py-1 border rounded-full text-[9px] font-black uppercase tracking-wider ${
                                partner.status === 'Active' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : partner.status === 'Pending'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {partner.status}
                              </span>

                              {partner.status === 'Pending' && (
                                <ActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dismissedTargetRef.current = false;
                                    setSingleViewPartner(partner);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                    document.getElementById('admin-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] px-2.5 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer uppercase"
                                >
                                  Approve
                                </ActionButton>
                              )}
                              {partner.status === 'Active' && (
                                <ActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dismissedTargetRef.current = false;
                                    setSingleViewPartner(partner);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                    document.getElementById('admin-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="bg-rose-500 hover:bg-rose-600 text-white font-black text-[9px] px-2.5 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer uppercase"
                                >
                                  Deactivate
                                </ActionButton>
                              )}
                              {partner.status === 'Inactive' && (
                                <ActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dismissedTargetRef.current = false;
                                    setSingleViewPartner(partner);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                    document.getElementById('admin-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] px-2.5 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer uppercase"
                                >
                                  Activate
                                </ActionButton>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center space-y-3">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-2xl text-slate-400">
                    🏢
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">No Partners Found</h3>
                  <p className="text-xs text-slate-400 font-semibold max-w-xs mx-auto">No referral partner entries matched your search or filter options.</p>
                </div>
              )}
            </div>

            {/* Pagination Footer */}
            {totalItems > 0 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500">Rows per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#D99A1C] cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <ActionButton
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    ◀ Prev
                  </ActionButton>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <ActionButton
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        currentPage === page
                          ? 'bg-[#D99A1C] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </ActionButton>
                  ))}

                  <ActionButton
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    Next ▶
                  </ActionButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 1.5: SINGLE PARTNER DETAILED VIEW PAGE */}
      {subView === 'directory' && singleViewPartner && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Header Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <ActionButton
                onClick={handleBackToDirectory}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-2xs"
              >
                <span>← Back to Directory</span>
              </ActionButton>
              <div>
                <span className="text-[10px] font-extrabold text-[#D99A1C] uppercase tracking-wider block">Single View Dossier</span>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>{singleViewPartner.name}</span>
                  <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-200">
                    {singleViewPartner.partnerCode}
                  </span>
                </h2>
              </div>
            </div>

            {/* Check & Approve Button Bar */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className={`px-3 py-1.5 border rounded-xl text-xs font-black uppercase tracking-wider ${
                singleViewPartner.status === 'Active' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : singleViewPartner.status === 'Pending'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {singleViewPartner.status === 'Active' ? '✓ Approved & Active' : singleViewPartner.status}
              </span>

              {singleViewPartner.status === 'Pending' && (
                <ActionButton
                  onClick={() => {
                    setConfirmStatusModal({
                      partner: singleViewPartner,
                      actionType: 'approve',
                      newStatus: 'Active'
                    });

                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 uppercase tracking-wide"
                >
                  <span>✓ Check & Approve Partner</span>
                </ActionButton>
              )}

              {singleViewPartner.status === 'Active' && (
                <ActionButton
                  onClick={() => {
                    setConfirmStatusModal({
                      partner: singleViewPartner,
                      actionType: 'deactivate',
                      newStatus: 'Inactive'
                    });

                  }}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Deactivate Partner</span>
                </ActionButton>
              )}

              {singleViewPartner.status === 'Inactive' && (
                <ActionButton
                  onClick={() => {
                    setConfirmStatusModal({
                      partner: singleViewPartner,
                      actionType: 'activate',
                      newStatus: 'Active'
                    });

                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 uppercase"
                >
                  <span>Re-Activate Partner</span>
                </ActionButton>
              )}

              <ActionButton
                onClick={(e) => handleOpenEditModal(singleViewPartner, e)}
                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-[#D99A1C] border border-amber-200/80 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>✏️ Edit Info</span>
              </ActionButton>
            </div>
          </div>

          <PartnerDocumentRequests key={singleViewPartner.id || singleViewPartner._id} partnerId={singleViewPartner.id || singleViewPartner._id} onUpdate={updated => {
            setSingleViewPartner(previous => ({ ...previous, ...updated }));
            if (setClients) setClients(previous => previous.map(client => String(client.id || client._id) === String(updated._id) ? { ...client, ...updated } : client));
          }} />

          {/* Verification Status Banner if Pending */}
          {singleViewPartner.status === 'Pending' && (
            <div className="bg-amber-50 border border-amber-200/90 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-900">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-100 text-[#D99A1C] flex items-center justify-center font-bold text-xl shrink-0">
                  ⚠️
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">Pending Partner Verification Review</h4>
                  <p className="text-[11px] font-semibold text-amber-800 mt-0.5">
                    Review attached legal documents below to verify company details. Click "Check & Approve Partner" to authorize agency access.
                  </p>
                </div>
              </div>
              <ActionButton
                onClick={() => {
                  setConfirmStatusModal({
                    partner: singleViewPartner,
                    actionType: 'approve',
                    newStatus: 'Active'
                  });

                }}
                className="px-4 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white font-black text-xs rounded-xl shadow-md cursor-pointer shrink-0 uppercase tracking-wider"
              >
                ✓ Check & Approve Now
              </ActionButton>
            </div>
          )}

          {/* Detailed Dossier Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Full Credentials */}
            <div className="space-y-6 lg:col-span-1">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-[#D99A1C] text-white flex items-center justify-center font-black text-lg shadow-lg">
                    {singleViewPartner.name ? singleViewPartner.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'PR'}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">{singleViewPartner.name}</h3>
                    <p className="text-xs text-slate-500 font-semibold">{singleViewPartner.companyName || singleViewPartner.name}</p>
                    <span className="inline-block mt-1 px-2.5 py-0.5 bg-amber-50 text-[#D99A1C] border border-amber-200 rounded text-[10px] font-black">
                      {(singleViewPartner.partnerType && singleViewPartner.partnerType.toString().toLowerCase() === 'individual') ? '👤 Individual Agent' : '🏢 Company Agency'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Partner Code:</span>
                    <span className="font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{singleViewPartner.partnerCode}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Contact Email:</span>
                    <span className="font-bold text-indigo-600">{singleViewPartner.email}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Phone Line:</span>
                    <span className="font-bold text-slate-800">{singleViewPartner.phone}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Operating Country:</span>
                    <span className="font-bold text-slate-800">📍 {singleViewPartner.country || ''}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Tax ID / GSTIN:</span>
                    <span className="font-mono font-bold text-slate-800">{singleViewPartner.taxId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400 font-bold">Registration Date:</span>
                    <span className="font-bold text-slate-800">{singleViewPartner.dateAdded || 'Recent'}</span>
                  </div>
                </div>
              </div>

              {/* Referred Students Count Card */}
              {(() => {
                const refStudents = getReferredStudents(singleViewPartner);
                return (
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md space-y-3 border border-slate-700/60">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#D99A1C]">Referred Metrics</span>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-2xl font-black text-white">{refStudents.length}</h4>
                        <p className="text-xs text-slate-400 font-semibold">Total Referred Students</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-[#D99A1C]/30 flex items-center justify-center text-xl text-[#F5B025]">
                        🎓
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right Column: Inline Document Viewer & Applications Table */}
            <div className="space-y-6 lg:col-span-2">
              {/* Uploaded Documents Gallery with Inline Page Viewer */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-extrabold text-[#D99A1C] uppercase tracking-wider block">Document Compliance Verification</span>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Uploaded Verification Proofs ({singleViewPartner.documents ? singleViewPartner.documents.length : 0})
                    </h3>
                  </div>
                  {singleViewPartner.status === 'Active' ? (
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      Uploaded Documents
                    </span>
                  ) : (
                    <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      Pending Approval
                    </span>
                  )}
                </div>

                {/* Inline Document Preview Grid */}
                {singleViewPartner.documents && singleViewPartner.documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {singleViewPartner.documents.map((doc, dIdx) => {
                      const docTitle = typeof doc === 'string' ? doc : (doc.name || doc.title || doc.fileName || `Document ${dIdx + 1}`);
                      const docFileName = typeof doc === 'string' ? doc : (doc.fileName || doc.title || 'Attached Proof');
                      const rawUrl = typeof doc === 'object' ? doc.previewUrl : null;
                      const isImg = (typeof rawUrl === 'string' && (rawUrl.startsWith('data:image/') || docFileName.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)));
                      const docBlobUrl = resolveDocumentUrl(rawUrl);
                      if (!docBlobUrl) return null;

                      return (
                        <div key={dIdx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between shadow-2xs hover:border-[#D99A1C] transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="text-xl">📄</span>
                              <div className="truncate">
                                <p className="text-xs font-black text-slate-900 truncate">{docTitle}</p>
                                <p className="text-[10px] text-slate-400 font-semibold truncate">{docFileName}</p>
                              </div>
                            </div>
                          </div>

                          {/* Inline Document Box Canvas/Iframe Viewer */}
                          <div className="h-48 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-2 shadow-inner">
                            {isImg ? (
                              <img src={docBlobUrl} alt={docTitle} className="max-h-full max-w-full object-contain rounded" />
                            ) : (
                              <iframe src={docBlobUrl} title={docTitle} className="w-full h-full rounded border-0 bg-white" />
                            )}
                          </div>

                          {/* Action Controls: Expand & Download */}
                          <div className="flex items-center gap-2 pt-1">
                            <ActionButton
                              type="button"
                              onClick={() => {
                                setPreviewModalDoc({
                                  title: docTitle,
                                  fileName: docFileName,
                                  previewUrl: docBlobUrl,
                                  rawUrl: rawUrl,
                                  type: isImg ? 'image' : 'pdf'
                                });
                              }}
                              className="flex-1 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <span>🔍 Expand</span>
                            </ActionButton>
                            <ActionButton
                              type="button"
                              onClick={() => handleDownloadDocument(docBlobUrl, `${docTitle.replace(/\s+/g, '_')}.pdf`)}
                              className="flex-1 py-2 bg-gradient-to-r from-[#D99A1C] to-[#F5B025] hover:from-[#c28815] hover:to-[#e09e1d] text-white rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <span>📥 Download</span>
                            </ActionButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
                    <div className="w-12 h-12 bg-amber-100 text-[#D99A1C] rounded-2xl flex items-center justify-center mx-auto text-xl font-bold border border-amber-200">
                      📄
                    </div>
                    <p className="text-xs font-bold text-amber-900">No proof documents attached yet to this partner profile.</p>
                    <ActionButton
                      type="button"
                      onClick={(e) => handleOpenEditModal(singleViewPartner, e)}
                      className="px-4 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white rounded-xl text-xs font-black cursor-pointer shadow-xs inline-block"
                    >
                      + Attach Proof Documents Now
                    </ActionButton>
                  </div>
                )}
              </div>

              {/* Referred Students Table in Single View */}
              {(() => {
                const refStudents = getReferredStudents(singleViewPartner);
                return (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Referred Student Records ({refStudents.length})
                      </h4>
                    </div>
                    {refStudents.length > 0 ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="px-4 py-3 text-slate-400 font-black uppercase tracking-wider">Student Name</th>
                              <th className="px-4 py-3 text-slate-400 font-black uppercase tracking-wider">Email Address</th>
                              <th className="px-4 py-3 text-slate-400 font-black uppercase tracking-wider">Phone</th>
                              <th className="px-4 py-3 text-slate-400 font-black uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                            {refStudents.map(student => (
                              <tr key={student._id || student.id || student.passportNo || student.email} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 font-bold text-slate-900">{student.name}</td>
                                <td className="px-4 py-3 text-slate-500">{student.email || 'Not provided'}</td>
                                <td className="px-4 py-3 text-slate-500">{student.phone || 'Not provided'}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[9px] font-extrabold border border-indigo-100">
                                    {student.status || 'Not provided'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 font-medium italic">No students have been referred by this partner yet.</p>
                    )}
                  </div>
                );
              })()}
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
                  <span className="font-semibold text-slate-400">Account Structure:</span>
                  <span className="font-extrabold text-slate-800">{partnerType} Agent</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-semibold text-slate-400">Email Address:</span>
                  <span className="font-bold text-slate-800">{formData.email}</span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <ActionButton
                  onClick={() => setSubView('directory')}
                  className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  View in Partners Directory →
                </ActionButton>
              </div>
            </div>
          ) : (
            <ActionForm onSubmit={handleSubmit} className="space-y-6">
              {/* STEP 1: Select Partner Classification */}
              <div className="bg-white border border-slate-200 border-t-4 border-t-[#2563EB] rounded-3xl p-6 shadow-sm space-y-5">
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
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${partnerType === 'Company' ? 'bg-[#D99A1C] text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>
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
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${partnerType === 'Individual' ? 'bg-[#D99A1C] text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>
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
              <div className="bg-white border border-slate-200 border-t-4 border-t-[#D99A1C] rounded-3xl p-6 shadow-sm space-y-5">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-[#D99A1C] uppercase tracking-widest block">SECTION 2</span>
                  <h2 className="text-base font-black text-slate-900">Partner Information & Credentials</h2>
                  <p className="text-xs text-slate-500 font-medium">Enter primary contact details for contract execution and portal login authentication.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Full Contact Name <span className="text-rose-500">*</span></label>
                    <input type="text" required name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]" placeholder="e.g. Sreelakshmi S" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Official Email Address <span className="text-rose-500">*</span></label>
                    <input type="email" required name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]" placeholder="e.g. partner@agency.com" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Phone Number <span className="text-rose-500">*</span></label>
                    <input type="tel" required name="phone" value={formData.phone} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]" placeholder="e.g. +91 9876543210" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Operating Country</label>
                    <select name="country" value={formData.country} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]">
                      {countriesList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {partnerType === 'Company' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Registered Company Name <span className="text-rose-500">*</span></label>
                        <input type="text" required name="companyName" value={formData.companyName} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]" placeholder="e.g. Apex Global Education Pvt Ltd" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Tax Registration / GST ID</label>
                        <input type="text" name="taxId" value={formData.taxId} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]" placeholder="e.g. GSTIN29ABCDE1234F" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* STEP 3: Compliance Verification Upload Section */}
              <div className="bg-white border border-slate-200 border-t-4 border-t-emerald-500 rounded-3xl p-6 shadow-sm space-y-5">
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

              <div className="flex justify-end gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                <ActionButton type="button" onClick={() => setSubView('directory')} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer">
                  Cancel
                </ActionButton>
                <ActionButton type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#D99A1C] hover:bg-[#F5B025] text-white font-black text-xs rounded-xl shadow-md cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting && (
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isSubmitting ? 'Onboarding Partner...' : 'Confirm Partner Onboarding →'}
                </ActionButton>
              </div>
            </ActionForm>
          )}
        </div>
      )}

      {/* EDIT PARTNER MODAL PORTAL */}
      {editingPartner && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs p-4 flex justify-center items-center select-none animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 border-t-4 border-t-[#D99A1C] rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[90vh] flex flex-col my-auto overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <div>
                <span className="text-[10px] font-extrabold text-[#D99A1C] uppercase tracking-wider block">Admin Management</span>
                <h3 className="text-sm font-black text-slate-900">Edit Partner Details — {editingPartner.name}</h3>
              </div>
              <ActionButton
                type="button"
                onClick={() => setEditingPartner(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </ActionButton>
            </div>

            <ActionForm onSubmit={handleSavePartnerEdit} className="space-y-4 text-xs font-semibold">
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

              {/* Uploaded Compliance Documents Manager inside Edit Modal */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3 mt-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-200/60">
                  <div>
                    <span className="text-[9px] font-extrabold text-[#D99A1C] uppercase tracking-wider block">Compliance Documents Manager</span>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Attached Proofs ({editingPartner.documents ? editingPartner.documents.length : 0})
                    </h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      id="editDocTypeSelect"
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-xl text-[11px] font-bold text-slate-800 focus:outline-none focus:border-[#D99A1C]"
                      defaultValue="Company Incorporation Certificate"
                    >
                      <option value="Company Incorporation Certificate">Company Incorporation Certificate</option>
                      <option value="Tax / GST Registration Certificate">Tax / GST Certificate</option>
                      <option value="Authorised Signatory ID Proof">Authorised Signatory ID</option>
                      <option value="Individual ID Proof (Passport / National ID)">Individual ID Proof</option>
                      <option value="Address Proof / Resume">Address Proof / Resume</option>
                      <option value="Other Compliance Proof">Other Compliance Proof</option>
                    </select>

                    <label className="px-3 py-1.5 bg-[#D99A1C] hover:bg-[#F5B025] text-white rounded-xl text-[10px] font-black cursor-pointer shadow-xs flex items-center gap-1.5 transition-all">
                      {isUploadingEditDoc ? (
                        <>
                          <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <span>+ Attach File Proof</span>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        disabled={isUploadingEditDoc}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          if (file.size > 15 * 1024 * 1024) {
                            toast.error('File size exceeds 15MB limit.');
                            return;
                          }
                          const typeSelect = document.getElementById('editDocTypeSelect');
                          const docTitle = typeSelect ? typeSelect.value : 'Compliance Proof';

                          setIsUploadingEditDoc(true);
                          let fileUrl = '';
                          try {
                            const uploadFormData = new FormData();
                            uploadFormData.append('file', file);
                            const uploadRes = await API.post('/upload', uploadFormData, {
                              headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            if (uploadRes.data?.success && (uploadRes.data.url || uploadRes.data.fileUrl)) {
                              fileUrl = uploadRes.data.url || uploadRes.data.fileUrl;
                            }
                          } catch (err) {
                            toast.error(err.response?.data?.message || 'S3 upload failed. Please retry.');
                            return;
                          } finally {
                            setIsUploadingEditDoc(false);
                          }

                          const attachDocObj = (preview) => {
                            const newDocObj = {
                              title: docTitle,
                              fileName: file.name,
                              previewUrl: preview,
                              type: file.type.includes('pdf') ? 'pdf' : 'image'
                            };
                            setEditingPartner(prev => ({
                              ...prev,
                              documents: [...(prev.documents || []), newDocObj]
                            }));
                            toast.success(`Attached '${file.name}' to profile!`);
                          };

                          if (fileUrl) {
                            attachDocObj(fileUrl);
                          } else {
                            toast.error('File was not stored in S3. Please retry.');
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {editingPartner.documents && editingPartner.documents.length > 0 ? (
                  <div className="space-y-2">
                    {editingPartner.documents.map((doc, dIdx) => {
                      const docTitle = typeof doc === 'string' ? doc : (doc.name || doc.title || doc.fileName || `Document ${dIdx + 1}`);
                      const docFileName = typeof doc === 'string' ? doc : (doc.fileName || doc.title || 'Attached Proof');
                      const docUrl = typeof doc === 'object' ? doc.previewUrl : null;
                      const docType = typeof doc === 'object' ? doc.type : 'pdf';

                      return (
                        <div key={dIdx} className="bg-white border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-xs shadow-2xs">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="text-sm">📄</span>
                            <div className="truncate">
                              <p className="font-bold text-slate-900 truncate text-[11px]">{docTitle}</p>
                              <p className="text-[9px] text-slate-400 font-semibold truncate">{docFileName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <ActionButton
                              type="button"
                              onClick={() => setPreviewModalDoc({ title: docTitle, fileName: docFileName, previewUrl: docUrl, type: docType })}
                              className="px-2.5 py-1 bg-amber-50 text-[#D99A1C] border border-amber-200 rounded-lg text-[10px] font-black hover:bg-amber-100 cursor-pointer"
                            >
                              👁️ View
                            </ActionButton>
                            <ActionButton
                              type="button"
                              onClick={() => {
                                setEditingPartner(prev => ({
                                  ...prev,
                                  documents: prev.documents.filter((_, idx) => idx !== dIdx)
                                }));
                              }}
                              className="text-rose-500 font-bold text-xs p-1 hover:bg-rose-50 rounded cursor-pointer"
                              title="Remove Document"
                            >
                              ✕
                            </ActionButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 text-center flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-amber-800">No verification documents attached yet to this partner profile.</p>
                    <span className="text-[10px] font-bold text-[#D99A1C]">Select document type and click "+ Attach File Proof" above.</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <ActionButton
                  type="button"
                  onClick={() => setEditingPartner(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  type="submit"
                  disabled={isSavingPartner}
                  className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  {isSavingPartner && (
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isSavingPartner ? 'Saving Changes...' : 'Save Partner Changes'}
                </ActionButton>
              </div>
            </ActionForm>
          </div>
        </div>,
        document.body
      )}

      {/* DOCUMENT PREVIEW MODAL PORTAL */}
      {previewModalDoc && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-center select-none animate-fade-in overflow-y-auto">
          <div className="relative bg-white border border-slate-200 border-t-4 border-t-[#D99A1C] rounded-3xl p-4 sm:p-6 w-full max-w-3xl shadow-2xl flex flex-col my-auto max-h-[85vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold text-[#D99A1C] uppercase tracking-wider block">Document Verification Preview</span>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">{previewModalDoc.title}</h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-semibold">{previewModalDoc.fileName}</p>
              </div>
              <ActionButton
                type="button"
                onClick={() => setPreviewModalDoc(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition-all cursor-pointer shrink-0"
              >
                ✕
              </ActionButton>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50 rounded-2xl border border-slate-200 p-2 sm:p-3 flex items-center justify-center my-3 min-h-[300px]">
              {previewModalDoc.previewUrl ? (
                (previewModalDoc.type === 'image' || (typeof previewModalDoc.fileName === 'string' && previewModalDoc.fileName.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i))) ? (
                  <img
                    src={previewModalDoc.previewUrl}
                    alt={previewModalDoc.title}
                    className="max-h-[350px] sm:max-h-[460px] w-auto max-w-full object-contain rounded-xl shadow-md"
                  />
                ) : (
                  <iframe
                    src={previewModalDoc.previewUrl}
                    title={previewModalDoc.title}
                    className="w-full h-[350px] sm:h-[460px] rounded-xl border border-slate-200 shadow-inner bg-white"
                  />
                )
              ) : (
                <div className="text-center space-y-3 p-6 bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-xs">
                  <div className="w-14 h-14 bg-amber-100 text-[#D99A1C] rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold border border-amber-200 shadow-xs">
                    📄
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{previewModalDoc.title}</h4>
                    <p className="text-xs font-bold text-slate-600 mt-0.5">{previewModalDoc.fileName}</p>
                    <p className="text-[11px] text-emerald-700 font-extrabold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block mt-2">
                      Uploaded Partner Document
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 shrink-0">
              {previewModalDoc.previewUrl ? (
                <div className="flex items-center gap-2">
                  <ActionButton
                    type="button"
                    onClick={() => {
                      if (previewModalDoc.previewUrl) {
                        handleDownloadDocument(previewModalDoc.previewUrl, `${(previewModalDoc.title || 'document').replace(/\s+/g, '_')}.pdf`);
                      }
                    }}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-[#D99A1C] to-[#F5B025] hover:from-[#c28815] hover:to-[#e09e1d] text-white font-black text-[11px] sm:text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>📥 Download</span>
                  </ActionButton>
                  <ActionButton
                    type="button"
                    onClick={() => {
                      if (previewModalDoc.previewUrl) {
                        window.open(previewModalDoc.previewUrl, '_blank');
                      }
                    }}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-50 hover:bg-amber-100 text-[#D99A1C] border border-amber-200 font-extrabold text-[11px] sm:text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>↗ Open in New Tab</span>
                  </ActionButton>
                </div>
              ) : <div />}
              <ActionButton
                type="button"
                onClick={() => setPreviewModalDoc(null)}
                className="px-4 py-1.5 sm:px-5 sm:py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[11px] sm:text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Close Preview
              </ActionButton>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* STATUS CHANGE CONFIRMATION MODAL (APPROVE / DEACTIVATE / ACTIVATE) */}
      {confirmStatusModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in select-none overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative space-y-4 animate-in zoom-in-95 duration-150 text-center max-h-[90vh] overflow-y-auto my-auto"
          >
            {/* Close button */}
            <ActionButton
              onClick={() => {
                if (!isProcessingStatus) setConfirmStatusModal(null);
              }}
              type="button"
              disabled={isProcessingStatus}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </ActionButton>

            {/* Icon */}
            {confirmStatusModal.actionType === 'approve' ? (
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/70 shadow-inner">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            ) : confirmStatusModal.actionType === 'deactivate' ? (
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-rose-50/70 shadow-inner">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            ) : (
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/70 shadow-inner">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            )}

            {/* Title & Badge */}
            <div className="space-y-1">
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border tracking-wider ${
                confirmStatusModal.actionType === 'approve'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : confirmStatusModal.actionType === 'deactivate'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {confirmStatusModal.actionType === 'approve' ? 'Partner Verification' : confirmStatusModal.actionType === 'deactivate' ? 'Account Deactivation' : 'Account Reactivation'}
              </span>
              <h3 className="text-base font-black text-slate-900 pt-1">
                {confirmStatusModal.actionType === 'approve'
                  ? 'Confirm Partner Approval'
                  : confirmStatusModal.actionType === 'deactivate'
                    ? 'Confirm Partner Deactivation'
                    : 'Confirm Partner Reactivation'}
              </h3>
            </div>

            {/* Partner Details Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-left text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Partner:</span>
                <span className="font-black text-slate-800">{confirmStatusModal.partner.name}</span>
              </div>
              {confirmStatusModal.partner.companyName && confirmStatusModal.partner.companyName !== confirmStatusModal.partner.name && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Agency:</span>
                  <span className="font-bold text-slate-700">{confirmStatusModal.partner.companyName}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Code:</span>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">{confirmStatusModal.partner.partnerCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Email:</span>
                <span className="font-semibold text-slate-700 truncate max-w-[200px]">{confirmStatusModal.partner.email}</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              {confirmStatusModal.actionType === 'approve' && (
                <>
                  Are you sure you want to approve this partner? An email with a 6-digit login password will be dispatched to <strong className="text-slate-700">{confirmStatusModal.partner.email}</strong>, authorizing immediate partner portal access.
                </>
              )}
              {confirmStatusModal.actionType === 'deactivate' && (
                <>
                  Are you sure you want to deactivate this partner? A formal deactivation notice email will be dispatched to <strong className="text-slate-700">{confirmStatusModal.partner.email}</strong>, and their access to the partner portal will be suspended.
                </>
              )}
              {confirmStatusModal.actionType === 'activate' && (
                <>
                  Are you sure you want to re-activate this partner? Their access to the partner portal and student submission privileges will be restored.
                </>
              )}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <ActionButton
                type="button"
                onClick={() => setConfirmStatusModal(null)}
                disabled={isProcessingStatus}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                No, Cancel
              </ActionButton>
              <ActionButton
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={isProcessingStatus}
                className={`flex-1 py-2.5 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                  confirmStatusModal.actionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : confirmStatusModal.actionType === 'deactivate'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isProcessingStatus ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{confirmStatusModal.actionType === 'approve' ? 'Yes, Approve' : confirmStatusModal.actionType === 'deactivate' ? 'Yes, Deactivate' : 'Yes, Re-Activate'}</span>
                  </>
                )}
              </ActionButton>
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
    <div className={`border-2 border-dashed rounded-2xl p-4 transition-all flex flex-col justify-between min-h-[140px] ${fileObj ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50 hover:border-[#D99A1C]'}`}>
      <div>
        <div className="flex justify-between items-start">
          <label className="text-xs font-black text-slate-900">{label} {required && <span className="text-rose-500">*</span>}</label>
          {required && <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded uppercase">Required</span>}
        </div>
        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{description}</p>
      </div>

      {fileObj ? (
        <div className="bg-white border border-emerald-200 p-2.5 rounded-xl flex items-center justify-between mt-3 gap-2">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <span className="text-xs font-bold text-emerald-600">📄</span>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 truncate">{fileObj.name}</p>
              {fileObj.size && <p className="text-[9px] text-slate-400 font-semibold">{fileObj.size}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ActionButton
              type="button" 
              onClick={() => {
                if (onViewFile && fileObj) {
                  const isImg = fileObj.type === 'image' || (fileObj.name && fileObj.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i));
                  const urlToUse = fileObj.previewUrl || (fileObj.fileObj ? URL.createObjectURL(fileObj.fileObj) : '');
                  const safeUrl = getDocumentBlobUrl(urlToUse, isImg ? 'image/png' : 'application/pdf');
                  onViewFile({ title: label, fileName: fileObj.name, previewUrl: safeUrl, type: isImg ? 'image' : 'pdf' });
                }
              }} 
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[#D99A1C] border border-amber-200 rounded-md text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
              title="Preview / View Uploaded Document"
            >
              <span>👁️ View Document</span>
            </ActionButton>
            <ActionButton type="button" onClick={() => onRemoveFile(docKey)} className="text-rose-500 font-bold text-xs p-1 hover:bg-rose-50 rounded" title="Remove Document">✕</ActionButton>
          </div>
        </div>
      ) : (
        <label className="cursor-pointer bg-white border border-slate-200 p-2.5 rounded-xl text-center block mt-3 hover:border-[#D99A1C] transition-all">
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => onFileChange(docKey, e)} className="hidden" />
          <p className="text-xs font-bold text-slate-700">Select File to Upload</p>
          <span className="text-[9px] text-slate-400">PDF, PNG, JPG (Max 15MB)</span>
        </label>
      )}
    </div>
  );
}
