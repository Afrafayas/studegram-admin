import React from 'react';
import SearchableSelect from './SearchableSelect';
export default function ListToolbar({ search, onSearchChange, filters = [], onReset, loading, error, onRetry, label = 'records' }) {
  const active = Boolean(search || filters.some(filter => filter.value && filter.value !== 'All'));
  return <div className="w-full min-w-0 border-b border-slate-200 bg-white px-4 py-3">
    <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
      <label className="min-w-[180px] flex-1"><span className="sr-only">Search all {label} fields</span><input type="search" value={search} onChange={event => onSearchChange(event.target.value)} placeholder="Search all fields" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" /></label>
      {filters.filter(filter => (filter.options || []).length > 0 || (filter.value && filter.value !== 'All')).map(filter => {
        const options = [...new Map((filter.options || []).filter(Boolean).map(option => { const value = typeof option === 'object' ? option.value : option; return [String(value), { value, label: typeof option === 'object' ? option.label : option }]; })).values()].filter(option => option.value !== 'All');
        return <label key={filter.key} className="w-[145px] min-w-[125px] shrink-0"><span className="sr-only">{filter.label}</span><SearchableSelect aria-label={filter.label} value={filter.value || 'All'} onChange={event => filter.onChange(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-800"><option value="All">All {filter.label}</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</SearchableSelect></label>;
      })}
      <button type="button" onClick={onReset} disabled={!active} className="ml-auto h-9 shrink-0 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-default disabled:opacity-40">Reset</button>
      {loading && <span role="status" className="shrink-0 text-xs text-slate-500">Loading...</span>}
    </div>
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error} <button type="button" onClick={onRetry} className="font-bold underline">Retry</button></p>}
  </div>;
}
export function ListPager({ list, page, onPageChange, limit, onLimitChange }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-slate-600"><span>{list.totalCount} result{list.totalCount === 1 ? '' : 's'}</span><div className="flex items-center gap-2"><select aria-label="Results per page" value={limit} onChange={event => { onLimitChange(Number(event.target.value)); onPageChange(1); }} className="rounded-lg border border-slate-200 p-1.5">{[5, 10, 15, 25, 50].map(value => <option key={value} value={value}>{value} / page</option>)}</select><button type="button" disabled={page <= 1 || list.loading} onClick={() => onPageChange(page - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><span>{page} / {list.totalPages}</span><button type="button" disabled={page >= list.totalPages || list.loading} onClick={() => onPageChange(page + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>;
}
