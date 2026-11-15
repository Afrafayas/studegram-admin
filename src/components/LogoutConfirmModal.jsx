import { ActionButton } from './ActionControls';
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import unigatherMascot from '../assets/unigather-mascot.png';

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200 select-none overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-logout-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 border-t-4 border-t-[#D99A1C] rounded-2xl p-6 max-w-sm w-full shadow-2xl relative space-y-4 text-center animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto my-auto"
      >
        {/* Close "X" Button */}
        <ActionButton
          onClick={onClose}
          type="button"
          aria-label="Close"
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </ActionButton>

        {/* Mascot */}
        <div className="flex justify-center pt-2">
          <img
            src={unigatherMascot}
            alt="Unigather Mascot"
            className="h-24 sm:h-28 w-auto object-contain drop-shadow-md select-none pointer-events-none"
          />
        </div>

        {/* Badge & Title */}
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-amber-50 text-[#07163B] border-amber-200/80 tracking-wider">
            Admin Session
          </span>
          <h3 id="admin-logout-modal-title" className="text-lg font-bold text-[#07163B] pt-1">
            Confirm Logout
          </h3>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          Are you sure you want to log out of the Admin Portal? You will need to sign in again to manage partners and applications.
        </p>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <ActionButton
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
          >
            Cancel
          </ActionButton>
          <ActionButton
            type="button"
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-[#D99A1C] hover:bg-[#C28410] text-[#07163B] text-xs font-black transition-all shadow-md shadow-amber-500/20 active:scale-[0.98] flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Log Out</span>
          </ActionButton>
        </div>
      </div>
    </div>,
    document.body
  );
}
