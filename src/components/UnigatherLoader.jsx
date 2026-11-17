import React from 'react';
import unigatherLogo from '../assets/unigather-logo.jpg';

/**
 * UnigatherLoader
 * Centralized, brand-consistent Unigather logo-based loading component.
 *
 * @param {Object} props
 * @param {'fullscreen' | 'overlay' | 'inline' | 'compact'} [props.variant='inline'] - Visual mode.
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - Sizing.
 * @param {string} [props.text] - Loading message.
 * @param {string} [props.subtext] - Secondary description text.
 * @param {string} [props.className] - Additional classes.
 */
export default function UnigatherLoader({
  variant = 'inline',
  size = 'md',
  text = 'Loading...',
  subtext,
  className = ''
}) {
  const sizeConfig = {
    sm: {
      wrapper: 'w-10 h-10',
      logo: 'w-7 h-7 rounded-lg',
      ringInset: '-inset-1.5',
      ringBorder: 'border-[2px]',
      textSize: 'text-xs',
      barWidth: 'w-20 h-0.5'
    },
    md: {
      wrapper: 'w-14 h-14',
      logo: 'w-10 h-10 rounded-xl',
      ringInset: '-inset-2',
      ringBorder: 'border-[2.5px]',
      textSize: 'text-xs sm:text-sm',
      barWidth: 'w-28 h-1'
    },
    lg: {
      wrapper: 'w-20 h-20',
      logo: 'w-14 h-14 rounded-2xl',
      ringInset: '-inset-2.5',
      ringBorder: 'border-[3px]',
      textSize: 'text-sm sm:text-base',
      barWidth: 'w-36 h-1'
    }
  };

  const currentSize = sizeConfig[size] || sizeConfig.md;

  if (variant === 'compact') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-2 py-1 px-2.5 rounded-lg bg-amber-50/80 border border-amber-200/60 shadow-2xs select-none ${className}`}
      >
        <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
          <div className="absolute -inset-0.5 rounded-full border border-amber-200/50" />
          <div className="absolute -inset-0.5 rounded-full border-2 border-transparent border-t-[#D99A1C] border-r-[#D99A1C] ug-loader-ring" />
          <img
            src={unigatherLogo}
            alt="Unigather"
            className="w-3.5 h-3.5 rounded-xs object-cover select-none pointer-events-none"
          />
        </div>
        {text && (
          <span className="text-[11px] font-extrabold text-slate-700 tracking-tight truncate">
            {text}
          </span>
        )}
      </div>
    );
  }

  const content = (
    <div className={`flex flex-col items-center justify-center text-center p-4 select-none ${className}`}>
      {/* Animated Logo Container with orbiting ring */}
      <div className={`relative ${currentSize.wrapper} flex items-center justify-center shrink-0`}>
        {/* Subtle background track */}
        <div className={`absolute ${currentSize.ringInset} rounded-full border border-amber-200/50 pointer-events-none`} />

        {/* Glowing orbital spinner ring */}
        <div
          className={`absolute ${currentSize.ringInset} rounded-full ${currentSize.ringBorder} border-transparent border-t-[#D99A1C] border-r-[#D99A1C] border-b-[#07163B]/30 ug-loader-ring pointer-events-none shadow-xs`}
        />

        {/* Center Logo with gentle breathing pulse */}
        <div className="relative z-10 ug-loader-pulse flex items-center justify-center bg-white rounded-xl shadow-xs overflow-hidden">
          <img
            src={unigatherLogo}
            alt="Unigather"
            className={`${currentSize.logo} object-cover shadow-xs border-0 select-none pointer-events-none`}
          />
        </div>
      </div>

      {/* Text feedback */}
      {(text || subtext) && (
        <div className="mt-3.5 flex flex-col items-center gap-1 max-w-xs">
          {text && (
            <span className={`${currentSize.textSize} font-black text-slate-800 tracking-tight`}>
              {text}
            </span>
          )}
          {subtext && (
            <span className="text-[11px] font-semibold text-slate-500 leading-tight">
              {subtext}
            </span>
          )}
          {/* Unigather Gold indeterminate progress bar */}
          <div className={`${currentSize.barWidth} bg-slate-100 rounded-full overflow-hidden mt-1`}>
            <div className="h-full bg-gradient-to-r from-[#D99A1C] via-[#F5B025] to-[#D99A1C] rounded-full ug-loader-bar" />
          </div>
        </div>
      )}
    </div>
  );

  if (variant === 'fullscreen') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/25 backdrop-blur-[2.5px] transition-all duration-200"
      >
        <div className="bg-white/95 border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-900/10 flex flex-col items-center max-w-sm mx-4">
          {content}
        </div>
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/85 backdrop-blur-[1.5px] rounded-2xl transition-all duration-150"
      >
        {content}
      </div>
    );
  }

  // Default: 'inline'
  return (
    <div role="status" aria-live="polite" className="w-full py-8 flex flex-col items-center justify-center">
      {content}
    </div>
  );
}

