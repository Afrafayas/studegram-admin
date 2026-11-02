import { ActionButton } from './ActionControls';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import API from '../api/axios';
import { useToast } from '../context/ToastContext';
import { reminderDue, snoozeKey } from '../utils/noticeReminder.mjs';
const mapNotice = notice => ({ ...notice, id: notice._id, message: notice.content || '', type: notice.category || 'General', badge: notice.badge || notice.priority, image: notice.image || '' });
export default function NotificationPopup({ onViewNotice }) {
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [closed, setClosed] = useState({});
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [imageLayout, setImageLayout] = useState(null);
  const generation = useRef(0);
  const storageKey = snoozeKey(localStorage);
  useEffect(() => {
    let active = true;
    const readClosed = () => { try { setClosed(JSON.parse(localStorage.getItem(storageKey) || '{}')); } catch { setClosed({}); } };
    readClosed();
    const load = async () => {
      const version = ++generation.current;
      try {
        const response = await API.get('/notices?reminders=true');
        if (active && version === generation.current && response.data?.success) setNotifications(response.data.data.map(mapNotice));
      } catch { /* Keep current reminders on transient network failures. */ }
    };
    const changed = () => { setNotifications([]); load(); };
    const storageChanged = event => { if (event.key === storageKey) readClosed(); if (event.key === storageKey + ':read') changed(); };
    load();
    const poll = setInterval(load, 15000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener('notices-updated', changed);
    window.addEventListener('storage', storageChanged);
    window.addEventListener('focus', load);
    return () => { active = false; clearInterval(poll); clearInterval(clock); window.removeEventListener('notices-updated', changed); window.removeEventListener('storage', storageChanged); window.removeEventListener('focus', load); };
  }, [storageKey]);
  const activeNotification = notifications.find(n => reminderDue(n, closed, now)) || null;
  const isClosing = false;
  const handleClose = () => {
    if (busy) return;
    const next = { ...closed, [activeNotification.id]: Date.now() };
    setClosed(next); setNow(Date.now());
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Session snooze still works. */ }
  };
  const handleMarkAsRead = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await API.patch('/notices/' + activeNotification.id + '/read');
      generation.current++;
      setNotifications(prev => prev.filter(n => n.id !== activeNotification.id));
      window.dispatchEvent(new Event('notices-updated'));
      try { localStorage.setItem(storageKey + ':read', String(Date.now())); } catch { /* Polling also synchronizes receipts. */ }
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to mark notice as read. Please retry.'); }
    finally { setBusy(false); }
  };
  const handleView = () => {
    if (busy) return;
    handleClose();
    onViewNotice?.(activeNotification.id);
  };
  useEffect(() => {
    if (!activeNotification) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [Boolean(activeNotification)]);
  if (!activeNotification) return null;
  const isImportant = activeNotification.type === 'important';
  const isPortrait = imageLayout?.src === activeNotification.image && imageLayout.portrait;

  return createPortal(
    <>
      <div aria-hidden="true" className="fixed inset-0 z-[9999] bg-slate-900/20 backdrop-blur-sm" />
    <div
      role="dialog" aria-modal="true" aria-label="Notice reminder"
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-[10000] ${isPortrait ? 'max-w-xl' : 'max-w-3xl'} w-[calc(100%-2rem)] p-6 rounded-2xl border border-slate-200/50 transition-all duration-300
        backdrop-blur-md bg-white/95 shadow-[0_32px_64px_-16px_rgba(15,23,42,0.15)]
        overflow-y-auto max-h-[calc(100vh-6rem)]
        ${isClosing ? 'animate-slide-out-top' : 'animate-slide-in-top'}
      `}
    >
      {/* Type-based Top Glow/Gradients */}
      <div
        className={`absolute inset-x-0 top-0 h-1 rounded-t-3xl ${
          isImportant ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'
        }`}
      />

      {/* Floating Highlighted Close Button */}
      <ActionButton
        disabled={busy} onClick={handleClose}
        className="absolute top-5 right-5 z-50 w-8 h-8 rounded-full bg-white/90 hover:bg-rose-50 text-slate-700 hover:text-rose-600 shadow-sm border border-slate-200/60 flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 group"
        aria-label="Close notification"
      >
        <svg className="w-3.5 h-3.5 transform group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </ActionButton>

      {/* Keep uploaded artwork fully visible in its original orientation. */}
      <div className={`mb-3 overflow-hidden rounded-xl border border-slate-100 shadow-inner relative bg-slate-50 ${activeNotification.image ? 'flex items-center justify-center' : 'h-40'}`}>
        {activeNotification.image ? (
          <img
            src={activeNotification.image}
            alt={activeNotification.title}
            onLoad={(event) => {
              const image = event.currentTarget;
              setImageLayout({ src: activeNotification.image, portrait: image.naturalHeight > image.naturalWidth });
            }}
            className="block w-full h-auto max-h-[35vh] sm:max-h-[280px] object-contain"
          />
        ) : (
          /* Premium fallback gradient banner with abstract icon */
          <div className={`w-full h-full bg-gradient-to-tr flex flex-col items-center justify-center relative overflow-hidden
            ${isImportant ? 'from-rose-500 via-rose-600 to-amber-500' : 'from-indigo-500 via-purple-500 to-violet-600'}
          `}>
            {/* Abstract decorative pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
            
            {/* Glowing orb */}
            <div className={`absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-2xl animate-pulse
              ${isImportant ? 'bg-amber-400/30' : 'bg-violet-400/30'}
            `}></div>
            
            <div className={`z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md border
              ${isImportant 
                ? 'bg-rose-500/20 border-rose-400/30 text-rose-200 shadow-rose-950/20' 
                : 'bg-indigo-500/20 border-indigo-400/30 text-indigo-200 shadow-indigo-950/20'}
            `}>
              {isImportant ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              )}
            </div>
            <span className="z-10 mt-3 text-[10px] text-white/80 font-bold uppercase tracking-wider">
              {isImportant ? 'Important Alert' : 'System Update'}
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-start gap-4">
        {/* Badge & Type Icon */}
        <span
          className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
            isImportant
              ? 'bg-rose-50 text-rose-600 border border-rose-100'
              : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
          }`}
        >
          {activeNotification.badge || (isImportant ? 'Important' : 'Update')}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <h4 className="text-base md:text-lg font-extrabold text-slate-900 leading-snug tracking-tight">
          {activeNotification.title}
        </h4>
        <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-semibold line-clamp-3">
          {activeNotification.message}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2 items-center justify-between">
        <ActionButton
          disabled={busy} onClick={handleClose}
          className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-slate-600 text-xs font-bold transition-all duration-150 hover:bg-slate-50"
        >
          Remind Me Later
        </ActionButton>
        <div className="flex items-center gap-2.5">
          <ActionButton
            disabled={busy} onClick={handleMarkAsRead}
            className="px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-bold transition-all duration-150 border border-slate-200/50"
          >
            Mark as Read
          </ActionButton>
          <ActionButton
            disabled={busy} onClick={handleView}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all duration-150 hover:scale-[1.02] active:scale-95 shadow-md flex items-center gap-1.5
              ${isImportant ? 'bg-gradient-to-r from-rose-500 to-amber-500 shadow-rose-200/50' : 'bg-gradient-to-r from-indigo-500 to-violet-500 shadow-indigo-200/50'}
            `}
          >
            <span>View Details</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7-7" />
            </svg>
          </ActionButton>
        </div>
      </div>
    </div>
    </>, document.body
  );
}
