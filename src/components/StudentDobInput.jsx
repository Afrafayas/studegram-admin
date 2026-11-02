import { useId, useLayoutEffect, useRef } from 'react';
import { getStudentDobError, getStudentDobMax } from '../utils/studentAge.mjs';

export default function StudentDobInput({ value, onChange, ...props }) {
  const inputRef = useRef(null);
  const hintId = useId();
  const error = getStudentDobError(value);
  useLayoutEffect(() => {
    inputRef.current?.setCustomValidity(error);
  }, [error]);
  return <>
    <input {...props} ref={inputRef} type="date" min="0001-01-01" max={getStudentDobMax()}
      value={value} onChange={onChange}
      aria-invalid={error ? true : undefined} aria-describedby={hintId} />
    <p id={hintId} role={error ? 'alert' : undefined}
      className={`mt-1 text-[10px] font-semibold ${error ? 'text-rose-600' : 'text-slate-500'}`}>
      {error || 'Student must be at least 17 years old.'}
    </p>
  </>;
}
