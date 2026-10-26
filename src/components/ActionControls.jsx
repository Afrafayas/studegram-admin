import { createContext, useContext, useRef, useState } from 'react';

const SubmissionContext = createContext(false);

// A ref closes the gap before React renders the disabled state.
function usePendingAction() {
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  function run(handler, event) {
    if (locked.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    locked.current = true;
    try {
      const result = handler?.(event);
      if (result && typeof result.then === 'function') {
        setPending(true);
        return Promise.resolve(result).finally(() => {
          locked.current = false;
          setPending(false);
        });
      }
      locked.current = false;
      return result;
    } catch (error) {
      locked.current = false;
      throw error;
    }
  }
  return [pending, run];
}

export function ActionButton({ onClick, disabled, loading = false, children, type, ...props }) {
  const [pending, run] = usePendingAction();
  const submitting = useContext(SubmissionContext);
  const busy = loading || pending || (submitting && (!type || type === 'submit'));
  return (
    <button {...props} type={type} disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={(event) => run(onClick, event)}>
      {busy && <span className="action-spinner" aria-hidden="true" />}
      {children}
      {busy && <span className="sr-only">Loading, please wait</span>}
    </button>
  );
}

export function ActionForm({ onSubmit, children, ...props }) {
  const [pending, run] = usePendingAction();
  return (
    <SubmissionContext.Provider value={pending}>
      <form {...props} aria-busy={pending || undefined}
        onSubmit={(event) => run(onSubmit, event)}>
        {children}
      </form>
    </SubmissionContext.Provider>
  );
}
