import React, { useEffect } from 'react';
import { ActionButton } from './ActionControls';

/**
 * Helper to calculate visible page numbers with ellipsis windowing
 */
function getPageWindow(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

export default function Pagination({
  totalItems = 0,
  currentPage = 1,
  setCurrentPage,
  itemsPerPage = 10,
  setItemsPerPage,
  pageSizeOptions = [5, 10, 20, 50, 100],
  totalPages: propTotalPages,
  itemName = 'results',
  className = '',
}) {
  const totalPages = propTotalPages !== undefined 
    ? propTotalPages 
    : (Math.ceil(totalItems / itemsPerPage) || 1);

  // Auto-clamp currentPage if it exceeds totalPages
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, setCurrentPage]);

  if (totalItems <= 0) return null;

  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);
  const visiblePages = getPageWindow(currentPage, totalPages);

  return (
    <div className={`px-6 py-4 bg-slate-50 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4 select-none ${className}`}>
      {/* Left side: Results Count & Rows Per Page */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="font-semibold text-slate-500">
          Showing <span className="font-bold text-slate-800">{startIndex}</span>–<span className="font-bold text-slate-800">{endIndex}</span> of <span className="font-bold text-slate-800">{totalItems}</span> {itemName}
        </span>
        <div className="flex items-center gap-2">
          <label htmlFor="pagination-rows-select" className="font-semibold text-slate-500 whitespace-nowrap">
            Rows per page:
          </label>
          <select
            id="pagination-rows-select"
            aria-label="Rows per page"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] cursor-pointer shadow-2xs transition-colors"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right side: Prev, Page Numbers, Next */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <ActionButton
          type="button"
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
          aria-label="Previous page"
        >
          ◀ Prev
        </ActionButton>

        {visiblePages.map((page, idx) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 py-1 text-xs font-extrabold text-slate-400 select-none"
              >
                ...
              </span>
            );
          }

          const isCurrent = currentPage === page;
          return (
            <ActionButton
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              aria-current={isCurrent ? 'page' : undefined}
              className={`min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer shadow-2xs ${
                isCurrent
                  ? 'bg-[#D99A1C] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {page}
            </ActionButton>
          );
        })}

        <ActionButton
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
          aria-label="Next page"
        >
          Next ▶
        </ActionButton>
      </div>
    </div>
  );
}

export { Pagination };

