import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    let isValid = true;
    
    if (!email.trim()) {
      setEmailError('Email address is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 4) {
      setPasswordError('Password must be at least 4 characters long');
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-stretch select-none">
      {/* Left side (50%): Brand detail gradient panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-[#6366F1] to-[#06B6D4] text-white p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl -translate-y-1/3 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>

        {/* Top: Logo Brand */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white text-[#6366F1] flex items-center justify-center font-extrabold text-xl shadow-lg">
            S
          </div>
          <span className="font-extrabold text-2xl tracking-wider uppercase">STUDEGRAM</span>
        </div>

        {/* Center: Hero Statement */}
        <div className="space-y-6 max-w-md relative z-10 my-auto">
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
            Studegram Admin Control Center
          </h2>
          <p className="text-xs text-white/80 font-medium leading-relaxed">
            Monitor daily application status reports, configure file requirements, verify academic course documents, and review B2B channel agent performance in one unified operations console.
          </p>

          <div className="space-y-3.5 pt-6 text-xs font-semibold">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 bg-white/10 border border-white/20 rounded-full flex items-center justify-center shadow-inner">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span>Monitor B2B Agent Channels</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 bg-white/10 border border-white/20 rounded-full flex items-center justify-center shadow-inner">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span>Configure Stage Pipelines</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 bg-white/10 border border-white/20 rounded-full flex items-center justify-center shadow-inner">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span>Audit Document Rules</span>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-white/60 font-semibold relative z-10">
          © 2026 Studegram Inc. All rights reserved.
        </div>
      </div>

      {/* Right side (50%): Form card centered */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl shadow-xl p-8 md:p-10 space-y-8">
          
          <div className="text-left space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Studegram Admin Portal</h1>
            <p className="text-xs text-[#64748B] font-semibold">Sign in with administrator credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Admin Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#64748B]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="text"
                  autoComplete="username"
                  className={`w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:bg-white focus:ring-1 transition-all ${
                    emailError
                      ? 'border-[#EF4444] focus:ring-[#EF4444] focus:border-[#EF4444]'
                      : 'border-slate-200 focus:ring-[#6366F1] focus:border-[#6366F1]'
                  }`}
                  placeholder="admin@studegram.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  disabled={isLoading}
                />
              </div>
              {emailError && (
                <p className="text-[10px] text-[#EF4444] font-bold mt-0.5">{emailError}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#64748B]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`w-full bg-slate-50 border rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:bg-white focus:ring-1 transition-all ${
                    passwordError
                      ? 'border-[#EF4444] focus:ring-[#EF4444] focus:border-[#EF4444]'
                      : 'border-slate-200 focus:ring-[#6366F1] focus:border-[#6366F1]'
                  }`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#0F172A] focus:outline-none"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="text-[10px] text-[#EF4444] font-bold mt-0.5">{passwordError}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs select-none">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-[#6366F1] border-slate-300 focus:ring-[#6366F1]"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                Remember me
              </label>
              <a href="#" className="text-[#6366F1] font-bold hover:underline">Forgot password?</a>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#6366F1] to-[#06B6D4] hover:scale-[1.02] text-white font-bold py-3 rounded-xl text-xs transition-all duration-150 shadow-md uppercase tracking-wider disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Authorizing...
                </>
              ) : (
                'Admin Login'
              )}
            </button>
          </form>
          
          <div className="text-center text-xs font-semibold text-[#64748B] pt-2">
            Looking for candidate access?{' '}
            <a
              href="http://localhost:5173/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#6366F1] font-bold hover:underline"
            >
              Go to Student Portal
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
