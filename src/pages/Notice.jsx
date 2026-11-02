import useServerList from '../hooks/useServerList';
import ListToolbar, { ListPager } from '../components/ListToolbar';
import ActionMenu from '../components/ActionMenu';
import { splitNoticeSections } from '../utils/noticeSections.mjs';
import SearchableSelect from '../components/SearchableSelect';
import { getDisplayId } from '../utils/displayId';
import API from '../api/axios';
import { ActionButton, ActionForm } from '../components/ActionControls';
import { createPortal } from 'react-dom';
import React, { useState, useEffect } from 'react';
const mapNotice = notice => ({ ...notice, id: notice._id, message: notice.content || '', type: notice.category || 'General', badge: notice.badge || notice.priority, date: notice.createdAt ? new Date(notice.createdAt).toLocaleDateString('en-GB') : '', isNew: !notice.isRead, image: notice.image || '' });
import { useToast } from '../context/ToastContext';

const CATEGORIES_LIST = [
  'Admission',
  'Urgent',
  'Policy',
  'Regulation',
  'Event',
  'Scholarship',
  'System',
  'Webinar',
  'Announcement'
];

export default function Notice({ selectedNoticeId, setSelectedNoticeId }) {
  const toast = useToast();
  const [localNotices, setLocalNotices] = useState([]);
  const [activeNoticeTab, setActiveNoticeTab] = useState('received');
  const [listSearch, setListSearch] = useState('');
  const [listPriority, setListPriority] = useState('All');
  const [listStatus, setListStatus] = useState('All');
  const [listCategory, setListCategory] = useState('All');
  const [listPage, setListPage] = useState(1);
  const [listLimit, setListLimit] = useState(15);
  const serverList = useServerList('/notices', { search: listSearch, filters: { senderPortal: activeNoticeTab === 'received' ? 'Agent' : 'Admin', priority: listPriority, status: listStatus, category: listCategory }, page: listPage, limit: listLimit, onPageChange: setListPage, reloadKey: JSON.stringify(localNotices) });
  useEffect(() => { setListPage(1); }, [activeNoticeTab, listSearch, listPriority, listStatus, listCategory]);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = () => API.get('/notices').then(response => {
      if (!response.data?.success || !Array.isArray(response.data.data)) throw new Error('Unable to load notices.');
      if (active) { setLocalNotices(response.data.data.map(mapNotice)); setLoadError(''); }
    }).catch(error => { if (active) setLoadError(error.response?.data?.message || error.message); })
      .finally(() => { if (active) setIsLoading(false); });
    load();
    const timer = setInterval(load, 60000);
    window.addEventListener('notices-updated', load);
    return () => { active = false; clearInterval(timer); window.removeEventListener('notices-updated', load); };
  }, []);

  const [editingId, setEditingId] = useState(null);
  const [formExpiresOn, setFormExpiresOn] = useState('');
  const [formStatus, setFormStatus] = useState('Active');
  const [formPriority, setFormPriority] = useState('Medium');
  const [formAudience, setFormAudience] = useState('Agents');
  const [readError, setReadError] = useState('');
  const markRead = async id => {
    try {
      const response = await API.patch('/notices/' + id + '/read');
      setLocalNotices(prev => prev.map(n => n.id === id ? mapNotice(response.data.data) : n));
      setReadError('');
      window.dispatchEvent(new Event('notices-updated'));
    } catch (error) { setReadError(error.response?.data?.message || 'Unable to mark as read. Please retry.'); }
  };
  const selected = localNotices.find(n => n.id === selectedNoticeId);
  useEffect(() => {
    if (selected?.id && !selected.isRead) markRead(selected.id);
  }, [selected?.id, selected?.isRead]);
  const editNotice = notice => {
    setFileName('');
    setEditingId(notice.id); setFormTitle(notice.title); setFormMessage(notice.content || notice.message || '');
    setFormType(notice.category); setFormBadge(notice.badge || ''); setFormPosterUrl(notice.image || '');
    setFormExpiresOn(notice.expiresOn || ''); setFormStatus(notice.status); setFormPriority(notice.priority);
    setFormAudience(notice.targetAudience); setShowUploadModal(true);
  };
  const deleteNotice = async notice => {
    if (!window.confirm('Delete this notice permanently?')) return;
    try {
      await API.delete('/notices/' + notice.id);
      setLocalNotices(prev => prev.filter(n => n.id !== notice.id));
      setSelectedNoticeId(null); window.dispatchEvent(new Event('notices-updated'));
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to delete notice.'); }
  };
  const noticeActions = (notice, showEdit = true) => <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] py-1" onClick={e => e.stopPropagation()}>
    <span>{notice.status}{notice.isExpired ? ' � Expired' : ''} � {notice.isRead ? 'Read' : 'Unread'}{notice.expiresOn ? ' � Show until ' + notice.expiresOn + ' (India time)' : ''}</span>
    {!notice.isRead && <ActionButton onClick={() => markRead(notice.id)} className="text-amber-700 font-bold">Mark as Read</ActionButton>}
    {notice.canManage && <>{showEdit && <ActionButton type="button" onClick={() => editNotice(notice)} className="text-amber-700 font-bold">Edit</ActionButton>}<ActionButton onClick={() => deleteNotice(notice)} className="text-red-700 font-bold">Delete</ActionButton></>}
  </div>;

  // Form State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState(CATEGORIES_LIST[0]);
  const [formBadge, setFormBadge] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formPosterUrl, setFormPosterUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lock background scrolling when modal is open
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (showUploadModal) {
      document.body.style.overflow = 'hidden';
      if (mainElement) mainElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (mainElement) mainElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      if (mainElement) mainElement.style.overflow = '';
    };
  }, [showUploadModal]);

  // Store poster in S3 before attaching it to the form.
  const processFile = async (file) => {
    if (file && file.type.startsWith('image/')) {
      setIsUploadingPoster(true);
      setFileName(file.name);
      setFormPosterUrl('');
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await API.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const url = response.data?.url || response.data?.fileUrl;
        if (!response.data?.success || !url) throw new Error('Poster was not stored in S3.');
        setFormPosterUrl(url);
      } catch (error) {
        setFileName('');
        toast.error(error.response?.data?.message || 'Poster upload failed. Please retry.');
      } finally {
        setIsUploadingPoster(false);
      }
    } else {
      toast.error('Please upload a valid image file (PNG/JPG).');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  // Submit Notice Form
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !formMessage.trim()) {
      toast.error('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await API[editingId ? 'put' : 'post'](editingId ? '/notices/' + editingId : '/notices', {
        title: formTitle.trim(), content: formMessage.trim(), category: formType,
        priority: formPriority, targetAudience: formAudience, status: formStatus, expiresOn: formExpiresOn, image: formPosterUrl || '', badge: formBadge.trim()
      });
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to save notice.');
      setLocalNotices(prev => editingId ? prev.map(n => n.id === editingId ? mapNotice(response.data.data) : n) : [mapNotice(response.data.data), ...prev]);
      toast.success(editingId ? 'Notice updated successfully.' : 'Notice published successfully.');
      if (!editingId) setActiveNoticeTab('sent');
      window.dispatchEvent(new Event('notices-updated'));
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
      setIsSubmitting(false);
      return;
    }

    // Reset Form & Close Modal
    setEditingId(null); setFormExpiresOn(''); setFormStatus('Active'); setFormPriority('Medium'); setFormAudience('Agents');
    setFormTitle('');
    setFormType(CATEGORIES_LIST[0]);
    setFormBadge('');
    setFormMessage('');
    setFormPosterUrl('');
    setFileName('');
    setIsSubmitting(false);
    setShowUploadModal(false);
  };

  // Single Notice Detail View Page
  if (selectedNoticeId && !showUploadModal) {
    const notice = localNotices.find((n) => n.id === selectedNoticeId);
    if (notice) {
      return (
        <div className="flex-1 p-8 space-y-6 bg-[#F0F2F5] animate-fade-in-up">
          {isLoading && <p className="text-sm text-slate-500">Loading notices...</p>}
      {loadError && <p role="alert" className="text-sm text-red-600">{loadError}</p>}
      {/* Back Button and Header */}
          <div className="flex flex-col gap-2">
            <ActionButton
              onClick={() => setSelectedNoticeId(null)}
              className="inline-flex items-center gap-1.5 text-xs text-[#D99A1C] font-bold hover:underline mb-2 self-start transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Notices
            </ActionButton>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Notice Details</h1>
            <p className="text-xs text-[#64748B] font-semibold mt-1">Detailed view of critical notification updates.</p>
          </div>

          {/* Premium Notice Detail Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 md:p-8 shadow-sm space-y-6 hover:shadow-md transition-shadow duration-200">
            {/* Badges & Date Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="bg-slate-100 text-[#64748B] border border-slate-200 text-[9px] font-extrabold px-2.5 py-1 rounded-full tracking-wider uppercase">
                  {notice.type}
                </span>
                {notice.badge && (
                  <span className="bg-indigo-50 text-[#D99A1C] border border-indigo-100 text-[9px] font-extrabold px-2.5 py-1 rounded-full tracking-wider uppercase">
                    {notice.badge}
                  </span>
                )}
                {notice.isNew && (
                  <span className="bg-indigo-50 text-[#D99A1C] border border-indigo-100 text-[9px] font-extrabold px-2.5 py-1 rounded-full tracking-wider uppercase animate-pulse">
                    New
                  </span>
                )}
              </div>
              <span className="bg-slate-100 text-[#0F172A] text-[10px] font-bold px-3 py-1 rounded-lg">
                Posted: {notice.date}
              </span>
            </div>

            {noticeActions(notice)}
            {readError && <p role="alert" className="text-red-700">{readError}</p>}
            {/* Notice Title */}
            <h2 className="text-xl font-bold text-[#0F172A] leading-snug">
              {notice.title}
            </h2>

            {/* Image Space */}
            {notice.image && (
              <div className="overflow-hidden rounded-2xl border border-slate-200/50 shadow-inner max-h-[380px] w-full bg-slate-50 flex items-center justify-center">
                <img
                  src={notice.image}
                  alt={notice.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Detailed Content */}
            <div className="space-y-4 text-sm text-[#334155] leading-relaxed font-medium">
              <p className="whitespace-pre-wrap">{notice.message}</p>
            </div>

            {/* Metadata Footer */}
            <div className="pt-6 border-t border-slate-100 text-[10px] text-[#64748B] font-semibold flex items-center justify-between">
              <span>Ref: {getDisplayId(notice)} • Posted by {notice.senderName || notice.senderPortal || 'Admin'}</span>
              <span className="flex items-center gap-1.5 text-indigo-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Published Announcement
              </span>
            </div>
          </div>
        </div>
      );
    }
  }

  const noticeSections = splitNoticeSections(localNotices, 'Admin');

  // Notices List View
  return (
    <div className="workspace-page flex-1 p-8 space-y-6 bg-[#F0F2F5] animate-fade-in-up">
      {/* Title & Action */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Notices & Announcements</h1>
          <p className="text-xs text-[#64748B] font-semibold mt-1">Stay updated with critical notifications and deadlines.</p>
        </div>

        {/* Action Button */}
        <ActionButton
          onClick={() => { setEditingId(null); setFormTitle(''); setFormMessage(''); setFormBadge(''); setFormPosterUrl(''); setFileName(''); setFormType(CATEGORIES_LIST[0]); setFormExpiresOn(''); setFormStatus('Active'); setFormPriority('Medium'); setFormAudience('Agents'); setShowUploadModal(true); }}
          className="self-start md:self-auto bg-[#D99A1C] hover:bg-[#C28410] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-150 hover:scale-[1.02] active:scale-95 shadow-md flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Post Notice / Upload Poster
        </ActionButton>
      </div>

      {readError && <p role="alert" className="text-red-700">{readError}</p>}
      {!isLoading && !loadError && localNotices.length === 0 && <p>No notices yet.</p>}
      {isLoading && <p className="text-sm text-slate-500">Loading notices...</p>}
      {loadError && <p role="alert" className="text-sm text-red-600">{loadError}</p>}
      <div className="workspace-panel workspace-list-frame bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
        {/* Scoping Tabs on top of table */}
        <div className="flex items-center gap-2 overflow-x-auto p-4 border-b border-slate-100 bg-slate-50/50">
          {noticeSections.map(section => (
            <button
              key={section.key}
              type="button"
              onClick={() => { setActiveNoticeTab(section.key); setListPage(1); }}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                activeNoticeTab === section.key ? 'bg-[#0A0A0F] text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {section.title} ({section.notices.length})
            </button>
          ))}
        </div>

        <ListToolbar search={listSearch} onSearchChange={setListSearch} filters={[{ key: 'priority', label: 'priorities', value: listPriority, onChange: setListPriority, options: ['Low','Medium','High','Urgent'] }, { key: 'status', label: 'statuses', value: listStatus, onChange: setListStatus, options: ['Active','Archived'] }, { key: 'category', label: 'categories', value: listCategory, onChange: setListCategory, options: serverList.facets.category || CATEGORIES_LIST }]} onReset={() => { setListSearch(''); setListPriority('All'); setListStatus('All'); setListCategory('All'); }} loading={serverList.loading} error={serverList.error} onRetry={serverList.reload} />

        

        <div className="overflow-x-auto">
          {serverList.data.length > 0 ? (
            <table className="workspace-table w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider pl-6">Notice Title & Details</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Published By</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {serverList.data.map(mapNotice).map((notice) => (
                  <tr tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && event.key === "Enter") { event.preventDefault(); event.currentTarget.click(); } }}
                    key={notice.id}
                    onClick={() => setSelectedNoticeId(notice.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 pl-6">
                      <div className="flex items-center gap-3">
                        {notice.image && (
                          <img src={notice.image} alt="" className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0" />
                        )}
                        <div>
                          <p className="font-black text-slate-900 group-hover:text-[#D99A1C] transition-colors line-clamp-1">{notice.title}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Ref: {getDisplayId(notice)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-[#64748B] border border-slate-200 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                        {notice.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                        notice.priority === 'Urgent' || notice.badge === 'Urgent' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {notice.badge || notice.priority || 'Normal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{notice.senderName || notice.senderPortal || 'Admin'}</td>
                    <td className="px-6 py-4 text-slate-400 font-medium">{notice.date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 border rounded-full text-[9px] font-extrabold ${notice.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {notice.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        items={[
                          { label: 'View Notice Details', onClick: () => setSelectedNoticeId(notice.id) },
                          notice.canManage && { label: 'Edit Notice', onClick: () => editNotice(notice) },
                          notice.isNew && { label: 'Mark as Read', onClick: () => markRead(notice.id) }
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">No notices found</div>
          )}
        </div>

        <ListPager list={serverList} page={listPage} onPageChange={setListPage} limit={listLimit} onLimitChange={setListLimit} />
      </div>

      {/* Add Notice Modal Sheet */}
      {showUploadModal && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="workspace-list-frame bg-white border border-slate-100 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col my-auto">
            
            {/* Modal Header */}
            <div className="bg-slate-950 p-6 text-white border-b border-slate-900 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold tracking-tight">{editingId ? 'Edit Notice' : 'Post Announcement / Upload Poster'}</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Publish critical updates and media directly to the portal feed.</p>
              </div>
              <ActionButton
                onClick={() => setShowUploadModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </ActionButton>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[calc(100vh-160px)] overflow-y-auto">
              <ActionForm onSubmit={handleUploadSubmit} className="space-y-4">
                
                {/* Notice Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#475569] uppercase tracking-wider">Announcement Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. September 2026 Intake Documents Submission Deadline Extended"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] font-semibold focus:outline-none focus:ring-1 focus:ring-[#D99A1C]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-[#475569] uppercase tracking-wider">Category / Type *</label>
                    <div className="relative">
                      <SearchableSelect
                        value={formType}
                        onChange={(e) => setFormType(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-xs text-[#0F172A] font-bold focus:outline-none focus:ring-1 focus:ring-[#D99A1C] appearance-none"
                      >
                        {CATEGORIES_LIST.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </SearchableSelect>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#475569]">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Custom Badge */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-[#475569] uppercase tracking-wider">Accent Tag / Badge (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Critical, New Intake, Speed Boost"
                      value={formBadge}
                      onChange={(e) => setFormBadge(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] font-semibold focus:outline-none focus:ring-1 focus:ring-[#D99A1C]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="text-xs font-bold">Show until (India time, inclusive)
                    <input type="date" value={formExpiresOn} onChange={e => setFormExpiresOn(e.target.value)} className="block w-full border rounded-xl p-2 mt-1" />
                    <span className="text-xs font-normal">Leave blank for no expiry.</span>
                  </label>
                  <label className="text-xs font-bold">Status
                    <select value={formStatus} onChange={e => setFormStatus(e.target.value)} className="block w-full border rounded-xl p-2 mt-1"><option>Active</option><option>Archived</option></select>
                  </label>
                  <label className="text-xs font-bold">Priority
                    <select value={formPriority} onChange={e => setFormPriority(e.target.value)} className="block w-full border rounded-xl p-2 mt-1">{['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p}>{p}</option>)}</select>
                  </label>
                  <label className="text-xs font-bold">Audience<select value={formAudience} onChange={e => setFormAudience(e.target.value)} className="block w-full border rounded-xl p-2 mt-1">{['All', 'Agents', 'Students', 'Staff', 'Admins'].map(a => <option key={a}>{a}</option>)}</select><span className="text-xs font-normal">All / Agents sends reminders to agents.</span></label>
                </div>
                {/* Announcement Message */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#475569] uppercase tracking-wider">Message Description *</label>
                  <textarea
                    rows="4"
                    required
                    placeholder="Write details about the updates, policy guidelines, schedules, or steps..."
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] font-semibold focus:outline-none focus:ring-1 focus:ring-[#D99A1C]"
                  ></textarea>
                </div>

                {/* Drag and Drop File Upload */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#475569] uppercase tracking-wider">Announcement Poster / Image</label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                      dragOver ? 'border-[#D99A1C] bg-[#D99A1C]/5' : 'border-slate-300 bg-[#F8FAFC] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <input
                      type="file"
                      id="notice-file-upload"
                      accept="image/*"
                      disabled={isUploadingPoster}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="notice-file-upload" className="flex flex-col items-center cursor-pointer space-y-2 w-full text-center">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shadow-inner text-slate-500 mx-auto">
                        {isUploadingPoster ? (
                          <svg className="animate-spin h-5 w-5 text-[#D99A1C]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0F172A]">
                          {isUploadingPoster ? 'Processing poster image...' : fileName ? `File Selected: ${fileName}` : 'Click to Upload or Drag Poster here'}
                        </p>
                        <p className="text-[10px] text-[#64748B] font-medium mt-0.5">Supports PNG, JPG, JPEG</p>
                      </div>
                    </label>
                  </div>

                  {/* Image Upload Preview */}
                  {formPosterUrl && (
                    <div className="pt-2">
                      <p className="text-[9px] font-extrabold text-[#475569] uppercase tracking-wider mb-1">Poster Preview:</p>
                      <div className="w-48 h-32 rounded-xl overflow-hidden border border-slate-200">
                        <img src={formPosterUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <ActionButton
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 text-xs font-bold text-[#475569] py-2.5 rounded-xl transition-all"
                  >
                    Cancel
                  </ActionButton>
                  <ActionButton
                    type="submit"
                    disabled={isSubmitting || isUploadingPoster}
                    className="flex-1 bg-[#D99A1C] hover:bg-[#C28410] disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md hover:scale-[1.01] flex items-center justify-center gap-2"
                  >
                    {isSubmitting && (
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {isSubmitting ? (editingId ? 'Saving Notice...' : 'Publishing Notice...') : editingId ? 'Save Notice' : 'Publish Notice Announcement'}
                  </ActionButton>
                </div>
              </ActionForm>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
