import React, { useEffect, useState } from 'react';
import API from '../api/axios';

// Counts use the same scoped list endpoint as the table, without pagination.
export default function ListFilterTabs({ value, onChange, options, query, label = 'Filter records' }) {
  const [counts, setCounts] = useState({});
  const key = JSON.stringify({ options, query });
  useEffect(() => {
    const controller = new AbortController();
    setCounts({});
    const timer = setTimeout(() => {
      Promise.all(options.map(async option => {
        const params = { ...query.params, ...option.params, list:'true', page:1, limit:1, search:query.search || '', filters:JSON.stringify({...query.filters,...option.filters}) };
        try {
          const response = query.localRecords === undefined ? await API.get(option.endpoint || query.endpoint,{params,signal:controller.signal}) : await API.post('/lists/query',{resource:query.resource,records:query.localRecords},{params,signal:controller.signal});
          if (!response.data?.success) throw new Error('Count unavailable');
          return [option.value,response.data.totalCount ?? response.data.total ?? response.data.count ?? null];
        } catch { return [option.value,null]; }
      })).then(entries => { if (!controller.signal.aborted) setCounts(Object.fromEntries(entries)); });
    }, query.search ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key]);
  return <div role="tablist" aria-label={label} className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">{options.map(option => <button key={option.value} type="button" role="tab" aria-selected={value === option.value} onClick={() => onChange(option.value)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${value===option.value?'bg-amber-400 text-slate-950':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
    {option.label}<span className="rounded bg-white/60 px-1.5 py-0.5 tabular-nums">{counts[option.value] === undefined ? '�' : counts[option.value] ?? '�'}</span>
  </button>)}</div>;
}
