import React from 'react';
import { useApp } from '../../context/AppContext';
import { DataTable, Column } from '../common/DataTable';
import { AuditLog } from '../../types';
import { History, Shield, Clock } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useApp();

  const columns: Column<AuditLog>[] = [
    {
      header: 'Waktu & Log ID',
      accessorKey: 'timestamp',
      sortable: true,
      cell: l => (
        <div>
          <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>{l.timestamp}</span>
          </div>
          <div className="text-[10px] font-mono text-gray-400">{l.id}</div>
        </div>
      ),
    },
    {
      header: 'Hak Akses Role',
      accessorKey: 'userRole',
      sortable: true,
      cell: l => (
        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          {l.userRole}
        </span>
      ),
    },
    {
      header: 'Tindakan (Action)',
      accessorKey: 'action',
      sortable: true,
      cell: l => <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{l.action}</span>,
    },
    {
      header: 'Rincian Perubahan (Details)',
      accessorKey: 'details',
      cell: l => <span className="text-gray-700 dark:text-gray-300">{l.details}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Audit Log Aktivitas Pengguna (Keamanan & Trailitas)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Pencatatan riwayat seluruh aksi perubahan data, penambahan, penghapusan, dan pengiriman notifikasi.
          </p>
        </div>
      </div>

      <DataTable
        data={auditLogs}
        columns={columns}
        searchableKey={l => `${l.action} ${l.details} ${l.userRole}`}
        searchPlaceholder="Cari Log Aktivitas..."
      />
    </div>
  );
};
