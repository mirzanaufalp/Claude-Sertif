import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchableKey?: keyof T | ((row: T) => string);
  searchPlaceholder?: string;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  emptyMessage?: string;
  extraHeaderActions?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchableKey,
  searchPlaceholder = 'Cari data...',
  pageSizeOptions = [5, 10, 25, 50],
  defaultPageSize = 10,
  emptyMessage = 'Tidak ada data ditemukan.',
  extraHeaderActions,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Filter
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();

    return data.filter(row => {
      if (typeof searchableKey === 'function') {
        return searchableKey(row).toLowerCase().includes(term);
      }
      if (searchableKey) {
        const val = row[searchableKey];
        return String(val ?? '').toLowerCase().includes(term);
      }
      // Global search across all string values
      return Object.values(row).some(val =>
        String(val ?? '').toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm, searchableKey]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    const { key, direction } = sortConfig;
    return [...filteredData].sort((a, b) => {
      const aVal = a[key] ?? '';
      const bVal = b[key] ?? '';
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  return (
    <div className="space-y-3">
      {/* Search & Actions Header */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        {searchableKey !== undefined && (
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-3 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>
        )}

        {extraHeaderActions && (
          <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
            {extraHeaderActions}
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100/70 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-slate-800 font-bold uppercase tracking-wider">
              {columns.map((col, idx) => {
                const key = col.accessorKey as string;
                const isSorted = sortConfig?.key === key;
                return (
                  <th
                    key={idx}
                    className={`p-3 select-none ${col.className || ''} ${
                      col.sortable && key ? 'cursor-pointer hover:bg-gray-200/50 dark:hover:bg-slate-700/50 transition' : ''
                    }`}
                    onClick={() => col.sortable && key && handleSort(key)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable && key && (
                        <span className="text-gray-400">
                          {isSorted ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-10 text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className={`p-3 ${col.className || ''}`}>
                      {col.cell ? col.cell(row) : col.accessorKey ? String(row[col.accessorKey] ?? '') : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Info Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400 pt-1">
        <div>
          Menampilkan <span className="font-bold text-gray-800 dark:text-gray-200">{paginatedData.length}</span> dari{' '}
          <span className="font-bold text-gray-800 dark:text-gray-200">{sortedData.length}</span> data
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span>Baris per halaman:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-gray-800 dark:text-gray-200"
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-800 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-800 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-semibold">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-800 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-800 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
