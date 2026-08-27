import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DataTable, Column } from '../common/DataTable';
import { FileSpreadsheet, FileText, Filter, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

export const LaporanView: React.FC = () => {
  const { personilList, pelatihanList, sertifikasiList, lookups, getCertBadgeStatus, getLookupName } = useApp();

  // Filters
  const [filterDivisi, setFilterDivisi] = useState<string>('ALL');
  const [filterJabatan, setFilterJabatan] = useState<string>('ALL');
  const [filterJenisSert, setFilterJenisSert] = useState<string>('ALL');
  const [filterStatusSert, setFilterStatusSert] = useState<string>('ALL');

  const divLookups = lookups.filter(l => l.KATEGORI === 'DIVDEP');
  const jbtLookups = lookups.filter(l => l.KATEGORI === 'JBTN');
  const srtLookups = lookups.filter(l => l.KATEGORI === 'SRT');

  // Combined Report Records
  const reportData = sertifikasiList.map(s => {
    const pel = pelatihanList.find(p => p.ID_PELATIHAN === s.ID_PELATIHAN);
    const owner = personilList.find(
      per => per.ID_PERSONIL === pel?.ID_PERSONIL || s.ID_SERTIFIKASI.includes(per.ID_PERSONIL)
    );
    const badgeSt = getCertBadgeStatus(s);

    return {
      ID_SERTIFIKASI: s.ID_SERTIFIKASI,
      NO_SERTIFIKAT: s.NO_SERTIFIKAT,
      NAMA_PEGAWAI: owner?.NAMA || 'Pegawai',
      ID_PERSONIL: owner?.ID_PERSONIL || '-',
      JABATAN: owner?.JABATAN || '-',
      DIVISI: owner?.DIVISI_DEPARTEMEN || '-',
      JENIS_PEGAWAI: owner?.JENIS_PEGAWAI || '-',
      JENIS_SERTIFIKASI: s.JENIS_SERTIFIKASI,
      TANGGAL_MULAI: s.TANGGAL_MULAI,
      TANGGAL_EXPIRED: s.TANGGAL_EXPIRED,
      STATUS_RAW: s.STATUS_SERTIFIKASI,
      BADGE_STATUS: badgeSt,
    };
  });

  const filteredReport = reportData.filter(item => {
    const matchDiv = filterDivisi === 'ALL' || item.DIVISI === filterDivisi;
    const matchJbt = filterJabatan === 'ALL' || item.JABATAN === filterJabatan;
    const matchJenis = filterJenisSert === 'ALL' || item.JENIS_SERTIFIKASI === filterJenisSert;
    const matchStatus = filterStatusSert === 'ALL' || item.BADGE_STATUS === filterStatusSert;
    return matchDiv && matchJbt && matchJenis && matchStatus;
  });

  const handleExportExcel = () => {
    const dataToExport = filteredReport.map(r => ({
      'No. Sertifikat': r.NO_SERTIFIKAT,
      'ID Personil': r.ID_PERSONIL,
      'Nama Pegawai': r.NAMA_PEGAWAI,
      Jabatan: getLookupName('JBTN', r.JABATAN),
      Divisi: getLookupName('DIVDEP', r.DIVISI),
      'Jenis Sertifikasi': getLookupName('SRT', r.JENIS_SERTIFIKASI),
      'Tanggal Terbit': r.TANGGAL_MULAI,
      'Tanggal Expired': r.TANGGAL_EXPIRED,
      'Status Masa Berlaku': r.BADGE_STATUS,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Sertifikasi');
    XLSX.writeFile(workbook, `Laporan_Sertifikasi_Pegawai_Tambang_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const columns: Column<any>[] = [
    {
      header: 'No. Sertifikat',
      accessorKey: 'NO_SERTIFIKAT',
      sortable: true,
      cell: r => <span className="font-mono font-bold text-blue-900 dark:text-blue-400">{r.NO_SERTIFIKAT}</span>,
    },
    {
      header: 'Nama Pegawai',
      accessorKey: 'NAMA_PEGAWAI',
      sortable: true,
      cell: r => (
        <div>
          <div className="font-bold text-gray-900 dark:text-white">{r.NAMA_PEGAWAI}</div>
          <div className="text-[10px] text-gray-400 font-mono">ID: {r.ID_PERSONIL}</div>
        </div>
      ),
    },
    {
      header: 'Jabatan & Divisi',
      cell: r => (
        <div>
          <div className="font-semibold text-gray-800 dark:text-gray-200">{getLookupName('JBTN', r.JABATAN)}</div>
          <div className="text-[10px] text-gray-400">{getLookupName('DIVDEP', r.DIVISI)}</div>
        </div>
      ),
    },
    {
      header: 'Jenis Sertifikasi',
      cell: r => <span className="font-bold text-gray-900 dark:text-white">{getLookupName('SRT', r.JENIS_SERTIFIKASI)} ({r.JENIS_SERTIFIKASI})</span>,
    },
    {
      header: 'Masa Berlaku',
      cell: r => (
        <div className="text-[11px]">
          <div>Terbit: <span className="font-semibold">{r.TANGGAL_MULAI}</span></div>
          <div>Expired: <span className="font-semibold">{r.TANGGAL_EXPIRED}</span></div>
        </div>
      ),
    },
    {
      header: 'Status Expiry',
      cell: r => {
        if (r.BADGE_STATUS === 'AKTIF') {
          return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-300">🟢 Aktif</span>;
        }
        if (r.BADGE_STATUS === 'AKAN_EXPIRED') {
          return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-300">🟡 Akan Expired</span>;
        }
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800 border border-rose-300">🔴 Expired</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Laporan Rekapitulasi Pelatihan & Sertifikasi
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Generate dan ekspor laporan rekap sertifikasi pegawai berdasarkan filter komprehensif.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintPDF}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>Cetak / PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
          <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Kriteria Filter Laporan:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Divisi / Departemen</label>
            <select
              value={filterDivisi}
              onChange={e => setFilterDivisi(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl"
            >
              <option value="ALL">Semua Divisi</option>
              {divLookups.map(d => (
                <option key={d.KODE} value={d.KODE}>
                  {d.KODE} - {d.NAMA}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Jabatan Pegawai</label>
            <select
              value={filterJabatan}
              onChange={e => setFilterJabatan(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl"
            >
              <option value="ALL">Semua Jabatan</option>
              {jbtLookups.map(j => (
                <option key={j.KODE} value={j.KODE}>
                  {j.NAMA}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Jenis Sertifikasi</label>
            <select
              value={filterJenisSert}
              onChange={e => setFilterJenisSert(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl"
            >
              <option value="ALL">Semua Jenis</option>
              {srtLookups.map(s => (
                <option key={s.KODE} value={s.KODE}>
                  {s.KODE} - {s.NAMA}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Status Expiry Date</label>
            <select
              value={filterStatusSert}
              onChange={e => setFilterStatusSert(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-bold"
            >
              <option value="ALL">Semua Status Expiry</option>
              <option value="AKTIF">🟢 Aktif Normal</option>
              <option value="AKAN_EXPIRED">🟡 Akan Expired (&lt;90 hr)</option>
              <option value="EXPIRED">🔴 Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Printable Report DataTable */}
      <DataTable
        data={filteredReport}
        columns={columns}
        searchableKey={r => `${r.NO_SERTIFIKAT} ${r.NAMA_PEGAWAI} ${r.ID_PERSONIL}`}
        searchPlaceholder="Cari Laporan..."
      />
    </div>
  );
};
