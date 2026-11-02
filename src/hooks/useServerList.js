import { useEffect, useRef, useState } from 'react';
import API from '../api/axios';
export default function useServerList(endpoint, { search = '', filters = {}, page = 1, limit = 15, params = {}, enabled = true, reloadKey = '', localRecords, resource = endpoint, onPageChange } = {}) {
  const [result, setResult] = useState({ data: [], totalCount: 0, totalPages: 1, currentPage: 1, facets: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const request = useRef(0);
  const pageCallback = useRef(onPageChange); pageCallback.current = onPageChange;
  const key = JSON.stringify({ endpoint, search, filters, page, limit, params, enabled, reloadKey, revision, localRecords, resource });
  useEffect(() => {
    const version = ++request.current;
    if (!enabled || !endpoint) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError(''); setResult(prev => ({ ...prev, data: [] }));
    const timer = setTimeout(async () => {
      try {
        const query = { ...params, list: 'true', search: search.trim(), filters: JSON.stringify(filters), page, limit };
        const response = localRecords === undefined ? await API.get(endpoint, { params: query, signal: controller.signal }) : await API.post('/lists/query', { resource, records: localRecords }, { params: query, signal: controller.signal });
        if (!response.data?.success || !Array.isArray(response.data.data)) throw new Error(response.data?.message || 'Unable to load records.');
        if (request.current === version && !controller.signal.aborted) {
          setResult({ ...response.data, totalCount: response.data.totalCount ?? response.data.total ?? response.data.count ?? 0, totalPages: response.data.totalPages || 1 });
          if (response.data.currentPage && response.data.currentPage !== page) pageCallback.current?.(response.data.currentPage);
        }
      } catch (err) { if (request.current === version && !controller.signal.aborted) { setError(err.response?.data?.message || err.message || 'Unable to load records.'); setResult(prev => ({ ...prev, data: [], totalCount: 0, totalPages: 1 })); } }
      finally { if (request.current === version && !controller.signal.aborted) setLoading(false); }
    }, search ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); if (request.current === version) request.current++; };
  }, [key]);
  return { ...result, loading, error, reload: () => setRevision(value => value + 1) };
}
export { restoreListRows } from '../utils/listRows.mjs';
