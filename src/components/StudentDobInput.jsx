import { useId, useState } from 'react';
import { getStudentDobError, getStudentDobYears, STUDENT_AGE_ERROR } from '../utils/studentAge.mjs';

export default function StudentDobInput({ value, onChange, ...props }) {
  const hintId = useId();
  const [draft, setDraft] = useState({ source: value, parts: (value || '').slice(0, 10).split('-') });
  const parts = draft.source === value ? draft.parts : (value || '').slice(0, 10).split('-');
  const [year = '', month = '', day = ''] = parts;
  const error = getStudentDobError(value);
  const update = (index, next) => {
    const updated = [year, month, day];
    updated[index] = next;
    const nextValue = updated.every(Boolean) ? updated.join('-') : '';
    setDraft({ source: nextValue, parts: updated });
    onChange({ target: { value: nextValue } });
  };
  return <>
    <div className="flex gap-2">
      {[
        { label: 'Day', index: 2, value: day, options: Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')) },
        { label: 'Month', index: 1, value: month, options: Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')) },
        { label: 'Year', index: 0, value: year, options: getStudentDobYears() },
      ].map(field => <select {...props} key={field.index} required
        aria-label={`Date of birth ${field.label.toLowerCase()}`}
        value={field.value} onChange={e => update(field.index, e.target.value)}
        aria-invalid={error ? true : undefined} aria-describedby={hintId}>
        <option value="">{field.label}</option>
        {field.options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>)}
    </div>
    <p id={hintId} role={error ? 'alert' : undefined}
      className={`mt-1 text-[10px] font-semibold ${error ? 'text-rose-600' : 'text-slate-500'}`}>
      {error || STUDENT_AGE_ERROR}
    </p>
  </>;
}
