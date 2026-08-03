import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 3.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error'),
    info: (msg) => showToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      
      {/* Toast Portal Container */}
      <div className="fixed top-6 right-6 z-[9999] space-y-3.5 w-full max-w-sm pointer-events-none select-none">
        {toasts.map((t) => {
          let bgClass = 'bg-[#161622] border-slate-800 text-slate-100';
          let title = 'Success';
          let titleColor = 'text-emerald-500';
          let icon = (
            <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          );

          if (t.type === 'error') {
            bgClass = 'bg-[#161622] border-slate-800 text-slate-100';
            title = 'Error';
            titleColor = 'text-rose-500';
            icon = (
              <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            );
          } else if (t.type === 'info') {
            bgClass = 'bg-[#161622] border-slate-800 text-slate-100';
            title = 'Alert';
            titleColor = 'text-amber-500';
            icon = (
              <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            );
          }

          return (
            <div
              key={t.id}
              className={`border p-4 rounded-2xl flex gap-3 text-xs shadow-xl backdrop-blur-md transition-all duration-300 pointer-events-auto cursor-pointer animate-fadeInRight ${bgClass}`}
              onClick={() => removeToast(t.id)}
              style={{
                animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            >
              {icon}
              <div className="space-y-1 text-left flex-1">
                <p className={`font-extrabold text-[10px] uppercase tracking-wider ${titleColor}`}>{title}</p>
                <p className="leading-relaxed font-semibold">{t.message}</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(t.id);
                }} 
                className="text-slate-400 hover:text-slate-200 font-bold self-start pl-1 text-[11px]"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
      
      {/* Dynamic Slide In Animation injected once */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(110%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
