import { useId, useLayoutEffect, useRef } from 'react';

const limits = {
  phone: { max: 15, label: 'Phone number', digits: true },
  passport: { max: 20, label: 'Passport number' },
  aadhaar: { max: 12, label: 'Aadhaar number', digits: true },
  tax: { max: 32, label: 'Tax / business registration ID' },
  gst: { max: 15, label: 'GSTIN' },
};

export function getLengthError(value, kind) {
  const rule = limits[kind];
  const text = String(value ?? '');
  const length = rule.digits ? text.replace(/\D/g, '').length : text.trim().length;
  return length > rule.max
    ? rule.label + ' must not exceed ' + rule.max + (rule.digits ? ' digits.' : ' characters.')
    : '';
}

// Keep the original value and change handler; never truncate pasted or typed IDs.
export default function ValidatedInput({ validationKind, value, onChange, ...props }) {
  const inputRef = useRef(null);
  const errorId = useId();
  const error = getLengthError(value, validationKind);
  useLayoutEffect(() => {
    inputRef.current?.setCustomValidity(error);
  }, [error]);
  return <>
    <input {...props} ref={inputRef} value={value} onChange={onChange}
      aria-invalid={error ? true : props['aria-invalid']}
      aria-describedby={[props['aria-describedby'], error ? errorId : null].filter(Boolean).join(' ') || undefined}
      style={error ? { ...props.style, borderColor: '#e11d48' } : props.style} />
    {error && <p id={errorId} role="alert" className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
  </>;
}
