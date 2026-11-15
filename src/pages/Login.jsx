import { ActionButton, ActionForm } from '../components/ActionControls';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import unigatherLogo from '../assets/unigather-logo.jpg';
import unigatherMascot from '../assets/unigather-mascot.png';

export default function Login({ onLoginSuccess }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleOpenForgotModal = (e) => {
    e?.preventDefault();
    setForgotEmail(email.trim() || '');
    setForgotError('');
    setForgotSuccess('');
    setShowForgotModal(true);
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmail.trim()) {
      setForgotError('Please enter your registered staff/admin email address.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(forgotEmail)) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await API.post('/auth/forgot-password', { email: forgotEmail.trim() });
      if (res.data?.success) {
        setForgotSuccess(res.data.message || 'A new 6-digit password has been sent to your registered email address.');
        setEmail(forgotEmail.trim());
      } else {
        throw new Error(res.data?.message || 'Failed to send reset password.');
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || (!err.response && err.isAxiosError ? 'Unable to reach the password recovery service. Please try again shortly.' : err.message) || 'Failed to reset password. Please check your email.');
    } finally {
      setForgotLoading(false);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        onLoginSuccess();
      } else {
        setPasswordError(res.message);
      }
    } catch (error) {
      setPasswordError(error.message || 'Unable to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-stretch select-none">
      {/* Left side (50%): Brand detail graphic panel in Mustard Yellow */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#D99A1C] text-white p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        {/* Transparent Icon Pattern Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-multiply pointer-events-none"
          style={{ backgroundImage: 'url(/assets/login_hero_pattern.png)' }}
        ></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-black/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top: Logo Brand + Badge */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <img
              src={unigatherLogo}
              alt="Unigather"
              className="w-10 h-10 rounded-xl object-cover shadow-md"
            />
            <span className="font-black text-2xl tracking-wider uppercase text-white drop-shadow-xs">UNIGATHER</span>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/15 text-white/95 border border-white/20 backdrop-blur-xs">
            Admin Console
          </span>
        </div>

        {/* Center: Hero Statement & Mascot Showcase */}
        <div className="space-y-6 max-w-lg relative z-10 my-auto py-6">
          <div className="space-y-3">
            <h2 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight text-white drop-shadow-xs">
              Unigather Admin Control Center
            </h2>
            <p className="text-xs xl:text-sm text-white/90 font-medium leading-relaxed max-w-md">
              Monitor daily application status reports, configure file requirements, verify academic course documents, and review B2B channel agent performance in one unified operations console.
            </p>
          </div>

          {/* Mascot & Highlights Showcase Box */}
          <div className="bg-black/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 flex items-center gap-5 shadow-lg">
            <div className="shrink-0 flex items-center justify-center">
              <img
                src={unigatherMascot}
                alt="Unigather Mascot"
                className="h-32 xl:h-36 w-auto object-contain drop-shadow-xl select-none pointer-events-none -my-2"
              />
            </div>
            <div className="space-y-2.5 min-w-0 flex-1">
              <div className="flex items-center gap-2.5 text-xs font-bold text-white">
                <span className="w-5 h-5 rounded-full bg-white text-[#D99A1C] flex items-center justify-center shrink-0 shadow-xs">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="truncate">Monitor B2B Agent Channels</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-white">
                <span className="w-5 h-5 rounded-full bg-white text-[#D99A1C] flex items-center justify-center shrink-0 shadow-xs">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="truncate">Configure Stage Pipelines</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-white">
                <span className="w-5 h-5 rounded-full bg-white text-[#D99A1C] flex items-center justify-center shrink-0 shadow-xs">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="truncate">Audit Document Rules</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="flex items-center justify-between text-[11px] text-white/80 font-medium relative z-10 pt-4 border-t border-white/20">
          <span>© 2026 Unigather Inc. All rights reserved.</span>
          <span className="flex items-center gap-1.5 text-white/90">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Console Live</span>
          </span>
        </div>
      </div>

      {/* Right side (50%): Form card centered */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-slate-100 relative overflow-hidden">
        <div className="absolute top-10 right-10 w-72 h-72 bg-[#D99A1C]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#07163B]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-white border border-slate-200/80 border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xl shadow-slate-200/60 p-8 md:p-10 space-y-7 relative z-10">
          
          <div className="text-left space-y-2">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#D99A1C]/20 to-[#D99A1C]/10 border border-[#D99A1C]/30 text-[#07163B] flex items-center justify-center shadow-xs">
              <svg className="w-5 h-5 text-[#D99A1C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#07163B]">Unigather Admin Portal</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Sign in with administrator credentials to continue</p>
            </div>
          </div>

          <ActionForm onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#07163B] uppercase tracking-wider">Admin Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="text"
                  autoComplete="username"
                  className={`w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border rounded-xl pl-10 pr-4 py-3 text-xs text-[#07163B] font-medium placeholder-slate-400 focus:outline-none focus:ring-4 transition-all ${
                    emailError
                      ? 'border-[#EF4444] focus:ring-[#EF4444]/15 focus:border-[#EF4444]'
                      : 'border-slate-200 focus:ring-[#D99A1C]/15 focus:border-[#D99A1C]'
                  }`}
                  placeholder="admin@unigather.com"
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
              <label className="block text-[11px] font-bold text-[#07163B] uppercase tracking-wider">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border rounded-xl pl-10 pr-10 py-3 text-xs text-[#07163B] font-medium placeholder-slate-400 focus:outline-none focus:ring-4 transition-all ${
                    passwordError
                      ? 'border-[#EF4444] focus:ring-[#EF4444]/15 focus:border-[#EF4444]'
                      : 'border-slate-200 focus:ring-[#D99A1C]/15 focus:border-[#D99A1C]'
                  }`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  disabled={isLoading}
                />
                <ActionButton
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#07163B] focus:outline-none cursor-pointer transition-colors"
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
                </ActionButton>
              </div>
              {passwordError && (
                <p className="text-[10px] text-[#EF4444] font-bold mt-0.5">{passwordError}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs select-none">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600 hover:text-[#07163B] transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-[#D99A1C] border-slate-300 focus:ring-[#D99A1C]"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                Remember me
              </label>
              <ActionButton
                type="button"
                onClick={handleOpenForgotModal}
                className="text-[#D99A1C] hover:text-[#C28410] font-bold hover:underline cursor-pointer bg-transparent border-0 p-0 text-xs focus:outline-none transition-colors"
              >
                Forgot password?
              </ActionButton>
            </div>

            <ActionButton
              type="submit"
              className="w-full bg-[#D99A1C] hover:bg-[#C28410] active:scale-[0.98] text-[#07163B] font-black py-3.5 rounded-xl text-xs transition-all duration-150 shadow-md shadow-amber-500/20 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 cursor-pointer"
              disabled={isLoading}
            >
              {isLoading && (
                <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              <span>{isLoading ? 'Authorizing...' : 'Admin Login'}</span>
            </ActionButton>

            {/* Security Badge */}
            <div className="pt-1 text-center flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium select-none">
              <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>256-bit Encrypted Session &middot; Authorized Personnel Only</span>
            </div>
          </ActionForm>
        </div>
      </div>

      {/* Reset Admin Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 border-t-4 border-t-[#D99A1C] p-6 shadow-2xl space-y-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="text-left space-y-0.5">
                <span className="text-[10px] font-black text-[#D99A1C] uppercase tracking-wider">Account Recovery</span>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Reset Admin Password</h3>
              </div>
              <ActionButton
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </ActionButton>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed text-left font-medium">
              Enter your registered staff/admin email. A new randomly generated <strong>6-digit password</strong> will be sent to your inbox immediately.
            </p>

            {/* Error Banner */}
            {forgotError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl text-left font-semibold flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{forgotError}</span>
              </div>
            )}

            {/* Success View */}
            {forgotSuccess ? (
              <div className="space-y-4 py-2 text-center animate-fade-in">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900">New Password Dispatched!</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {forgotSuccess}
                  </p>
                  <p className="text-[11px] text-amber-900 font-medium bg-amber-50 border border-amber-200/80 p-3 rounded-xl mt-3 text-left">
                    Check your email inbox or spam folder for your 6-digit login password, then sign in. You can change your password anytime in your Profile.
                  </p>
                </div>
                <ActionButton
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full bg-slate-900 hover:bg-black text-white font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  Return to Sign In
                </ActionButton>
              </div>
            ) : (
              <ActionForm onSubmit={handleForgotPasswordSubmit} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Registered Staff/Admin Email *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      autoFocus
                      disabled={forgotLoading}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#D99A1C] focus:border-[#D99A1C] transition-all"
                      placeholder="admin@unigather.com"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        if (forgotError) setForgotError('');
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <ActionButton
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    disabled={forgotLoading}
                    className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </ActionButton>
                  <ActionButton
                    type="submit"
                    disabled={forgotLoading}
                    className="w-2/3 bg-gradient-to-r from-[#D99A1C] to-[#F5B025] hover:scale-[1.01] text-white font-extrabold py-2.5 rounded-xl text-xs transition-all shadow-md uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Send New Password →</span>
                    )}
                  </ActionButton>
                </div>
              </ActionForm>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
