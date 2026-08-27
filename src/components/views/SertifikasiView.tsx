import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TrxSertifikasi } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { PdfPreviewModal } from '../common/PdfPreviewModal';
import { QrCodeModal } from '../common/QrCodeModal';
import {
  Award,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Upload,
  QrCode,
  Filter,
} from 'lucide-react';

export const SertifikasiView: React.FC = () => {
  const appContext = useApp() || {};
  const sertifikasiList = appContext.sertifikasiList || [];
  const pelatihanList = appContext.pelatihanList || [];
  const personilList = appContext.personilList || [];
  const lookups = appContext.lookups || [];
  const role = appContext.role || 'Administrator';

  const addSertifikasi = appContext.addSertifikasi || (() => { });
  const updateSertifikasi = appContext.updateSertifikasi || (() => { });
  const deleteSertifikasi = appContext.deleteSertifikasi || (() => { });
  const getLookupName = appContext.getLookupName || ((_cat: string, code: string) => code);

  // Helper mandiri yang aman agar tidak crash jika context helper error/undefined
  const calculateDaysRemaining = (dateStr?: string): number | null => {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return null;
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const calculateBadgeStatus = (s: TrxSertifikasi): 'AKTIF' | 'AKAN_EXPIRED' | 'EXPIRED' => {
    if (!s.TANGGAL_EXPIRED || s.TANGGAL_EXPIRED.trim() === '') {
      return 'AKTIF';
    }
    const days = calculateDaysRemaining(s.TANGGAL_EXPIRED);
    if (days === null) return 'AKTIF';
    if (days < 0) return 'EXPIRED';
    if (days <= 90) return 'AKAN_EXPIRED';
    return 'AKTIF';
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<TrxSertifikasi | null>(null);

  const [pdfModalData, setPdfModalData] = useState<{
    isOpen: boolean;
    title: string;
    docName: string;
    noSertifikat?: string;
    personilName?: string;
    jenisSertifikasi?: string;
    tglMulai?: string;
    tglExp?: string;
  }>({ isOpen: false, title: '', docName: '' });

  const [qrModalData, setQrModalData] = useState<{
    isOpen: boolean;
    noCert: string;
    name: string;
    jenis: string;
    tglExp: string;
  }>({ isOpen: false, noCert: '', name: '', jenis: '', tglExp: '' });

  // Filter States
  const [filterJenis, setFilterJenis] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterExpired, setFilterExpired] = useState<string>('ALL');
  const [filterDivisi, setFilterDivisi] = useState<string>('ALL');

  const srtLookups = lookups.filter(l => l && l.KATEGORI === 'SRT');
  const divLookups = lookups.filter(l => l && l.KATEGORI === 'DIVDEP');

  const [formData, setFormData] = useState<Omit<TrxSertifikasi, 'ID_SERTIFIKASI'> & { ID_SERTIFIKASI?: string }>({
    ID_SERTIFIKASI: '',
    ID_PELATIHAN: pelatihanList[0]?.ID_PELATIHAN || '',
    JENIS_SERTIFIKASI: 'POP',
    NO_SERTIFIKAT: 'POP-2026-0001',
    TANGGAL_MULAI: new Date().toISOString().split('T')[0],
    TANGGAL_EXPIRED: new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    STATUS_SERTIFIKASI: 'LULUS',
    DOK_SERTIFIKAT: 'sertifikat_pop.pdf',
  });

  const getOwnerByCert = (s: TrxSertifikasi) => {
    if (!s) return null;
    const pel = pelatihanList.find(p => p && p.ID_PELATIHAN === s.ID_PELATIHAN);
    if (pel && pel.ID_PERSONIL && String(pel.ID_PERSONIL).trim() !== '') {
      return personilList.find(per => per && String(per.ID_PERSONIL) === String(pel.ID_PERSONIL));
    }
    return null;
  };

  const filteredSertifikasi = sertifikasiList.filter(s => {
    if (!s) return false;
    const matchJenis = filterJenis === 'ALL' || s.JENIS_SERTIFIKASI === filterJenis;
    const matchStatus = filterStatus === 'ALL' || s.STATUS_SERTIFIKASI === filterStatus;
    const badgeSt = calculateBadgeStatus(s);
    const matchExp = filterExpired === 'ALL' || badgeSt === filterExpired;

    const owner = getOwnerByCert(s);
    const matchDiv = filterDivisi === 'ALL' || (owner && owner.DIVISI_DEPARTEMEN === filterDivisi);

    return matchJenis && matchStatus && matchExp && matchDiv;
  });

  const handleOpenAdd = () => {
    setEditingCert(null);
    setFormData({
      ID_SERTIFIKASI: `SERT${srtLookups[0]?.KODE || 'POP'}${Date.now().toString().slice(-6)}`,
      ID_PELATIHAN: pelatihanList[0]?.ID_PELATIHAN || '',
      JENIS_SERTIFIKASI: srtLookups[0]?.KODE || 'POP',
      NO_SERTIFIKAT: `POP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      TANGGAL_MULAI: new Date().toISOString().split('T')[0],
      TANGGAL_EXPIRED: new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      STATUS_SERTIFIKASI: 'LULUS',
      DOK_SERTIFIKAT: 'sertifikat_pop.pdf',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (s: TrxSertifikasi) => {
    setEditingCert(s);
    setFormData({ ...s });
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCert) {
      updateSertifikasi(editingCert.ID_SERTIFIKASI, formData as TrxSertifikasi);
    } else {
      addSertifikasi(formData as TrxSertifikasi);
    }
    setIsAddModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, DOK_SERTIFIKAT: file.name }));
    }
  };

  const columns: Column<TrxSertifikasi>[] = [
    {
      header: 'No. Sertifikat',
      accessorKey: 'NO_SERTIFIKAT',
      sortable: true,
      cell: s => (
        <div>
          <div className="font-mono font-bold text-blue-900 dark:text-blue-400">
            {s.NO_SERTIFIKAT || '-'}
          </div>
          <div className="text-[10px] text-gray-400 font-mono">ID: {s.ID_SERTIFIKASI}</div>
        </div>
      ),
    },
    {
      header: 'Pegawai & Divisi',
      cell: s => {
        const owner = getOwnerByCert(s);
        return (
          <div>
            <div className="font-bold text-gray-900 dark:text-white">{owner?.NAMA || 'Belum Terhubung'}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">
              {owner?.DIVISI_DEPARTEMEN ? getLookupName('DIVDEP', owner.DIVISI_DEPARTEMEN) : '-'}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Jenis Sertifikasi',
      accessorKey: 'JENIS_SERTIFIKASI',
      sortable: true,
      cell: s => (
        <span className="font-bold text-gray-900 dark:text-white">
          {getLookupName('SRT', s.JENIS_SERTIFIKASI)} ({s.JENIS_SERTIFIKASI})
        </span>
      ),
    },
    {
      header: 'Masa Berlaku',
      accessorKey: 'TANGGAL_EXPIRED',
      sortable: true,
      cell: s => {
        const days = calculateDaysRemaining(s.TANGGAL_EXPIRED);
        return (
          <div className="text-[11px] space-y-0.5">
            <div>
              Terbit: <span className="font-semibold text-gray-700 dark:text-gray-300">{s.TANGGAL_MULAI || '-'}</span>
            </div>
            <div>
              Expired:{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {s.TANGGAL_EXPIRED ? s.TANGGAL_EXPIRED : 'Seumur Hidup'}
              </span>
            </div>
            {days !== null && days >= 0 && days <= 90 && (
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                ⚠️ Sisa {days} hari lagi
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Status Expiry Badge',
      cell: s => {
        const badgeSt = calculateBadgeStatus(s);
        if (badgeSt === 'AKTIF') {
          return (
            <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1 w-fit">
              🟢 Aktif
            </span>
          );
        }
        if (badgeSt === 'AKAN_EXPIRED') {
          return (
            <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 flex items-center gap-1 w-fit">
              🟡 Akan Expired (&lt;90 hr)
            </span>
          );
        }
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 flex items-center gap-1 w-fit">
            🔴 Expired
          </span>
        );
      },
    },
    {
      header: 'Dokumen & QR',
      cell: s => {
        const owner = getOwnerByCert(s);
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                setPdfModalData({
                  isOpen: true,
                  title: 'Preview Sertifikat Resmi',
                  docName: s.DOK_SERTIFIKAT || `${s.NO_SERTIFIKAT || 'sertifikat'}.pdf`,
                  noSertifikat: s.NO_SERTIFIKAT,
                  personilName: owner?.NAMA || 'Pegawai',
                  jenisSertifikasi: getLookupName('SRT', s.JENIS_SERTIFIKASI),
                  tglMulai: s.TANGGAL_MULAI,
                  tglExp: s.TANGGAL_EXPIRED,
                })
              }
              className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 transition"
              title="Preview & Download PDF"
            >
              <FileText className="w-4 h-4" />
            </button>

            <button
              onClick={() =>
                setQrModalData({
                  isOpen: true,
                  noCert: s.NO_SERTIFIKAT || '-',
                  name: owner?.NAMA || 'Pegawai',
                  jenis: getLookupName('SRT', s.JENIS_SERTIFIKASI),
                  tglExp: s.TANGGAL_EXPIRED || 'Seumur Hidup',
                })
              }
              className="p-1 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-400 transition"
              title="QR Code Verifikasi"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
    {
      header: 'Aksi',
      cell: s => (
        <div className="flex items-center gap-1">
          {(role === 'Administrator' || role === 'HRD') && (
            <>
              <button
                onClick={() => handleOpenEdit(s)}
                className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-lg transition"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Apakah Anda yakin ingin menghapus sertifikat ${s.NO_SERTIFIKAT}?`)) {
                    deleteSertifikasi(s.ID_SERTIFIKASI);
                  }
                }}
                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Pengelolaan Sertifikasi Pertambangan (TRX_SERTIFIKASI)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Kelola data sertifikat resmi, QR Code verifikasi, dokumen PDF, dan pemantauan expiry date.
          </p>
        </div>

        {(role === 'Administrator' || role === 'HRD') && (
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Tambah Sertifikasi Baru</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Multi Filter:</span>
          </div>

          <select
            value={filterJenis}
            onChange={e => setFilterJenis(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-medium"
          >
            <option value="ALL">Jenis: Semua</option>
            {srtLookups.map(s => (
              <option key={s.KODE} value={s.KODE}>
                {s.KODE} - {s.NAMA}
              </option>
            ))}
          </select>

          <select
            value={filterExpired}
            onChange={e => setFilterExpired(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-bold"
          >
            <option value="ALL">Status Expiry: Semua</option>
            <option value="AKTIF">🟢 Aktif Normal</option>
            <option value="AKAN_EXPIRED">🟡 Akan Expired (&lt;90 hr)</option>
            <option value="EXPIRED">🔴 Expired</option>
          </select>

          <select
            value={filterDivisi}
            onChange={e => setFilterDivisi(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-medium"
          >
            <option value="ALL">Divisi: Semua</option>
            {divLookups.map(d => (
              <option key={d.KODE} value={d.KODE}>
                {d.KODE} - {d.NAMA}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sertifikasi DataTable */}
      <DataTable
        data={filteredSertifikasi}
        columns={columns}
        searchableKey={s => `${s?.NO_SERTIFIKAT || ''} ${s?.ID_SERTIFIKASI || ''} ${s?.JENIS_SERTIFIKASI || ''}`}
        searchPlaceholder="Cari Nomor Sertifikat, ID Sertifikasi, Jenis..."
      />

      {/* MODAL TAMBAH / EDIT SERTIFIKASI */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingCert ? 'Edit Data Sertifikasi' : 'Tambah Sertifikasi Baru'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Pelatihan Acuan *</label>
            <select
              value={formData.ID_PELATIHAN}
              onChange={e => setFormData({ ...formData, ID_PELATIHAN: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
            >
              {pelatihanList.map(p => {
                const owner = personilList.find(per => per && String(per.ID_PERSONIL) === String(p.ID_PERSONIL));
                return (
                  <option key={p.ID_PELATIHAN} value={p.ID_PELATIHAN}>
                    {p.ID_PELATIHAN} - {owner?.NAMA || 'Pegawai'} ({p.JENIS_PELATIHAN})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Jenis Sertifikasi *</label>
              <select
                value={formData.JENIS_SERTIFIKASI}
                onChange={e => setFormData({ ...formData, JENIS_SERTIFIKASI: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold"
              >
                {srtLookups.map(s => (
                  <option key={s.KODE} value={s.KODE}>
                    {s.NAMA} ({s.KODE})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">No. Sertifikat Resmi *</label>
              <input
                type="text"
                value={formData.NO_SERTIFIKAT}
                onChange={e => setFormData({ ...formData, NO_SERTIFIKAT: e.target.value })}
                required
                placeholder="PPP-2026-0001"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Tanggal Terbit *</label>
              <input
                type="date"
                value={formData.TANGGAL_MULAI}
                onChange={e => setFormData({ ...formData, TANGGAL_MULAI: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Tanggal Expired</label>
              <input
                type="date"
                value={formData.TANGGAL_EXPIRED}
                onChange={e => setFormData({ ...formData, TANGGAL_EXPIRED: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Upload Dokumen Sertifikat (PDF)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.DOK_SERTIFIKAT || ''}
                readOnly
                placeholder="sertifikat.pdf"
                className="flex-1 px-3 py-2 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-mono"
              />
              <label className="px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl cursor-pointer transition flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
                <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-semibold text-xs rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow"
            >
              Simpan Data Sertifikasi
            </button>
          </div>
        </form>
      </Modal>

      {/* PDF PREVIEW MODAL */}
      <PdfPreviewModal
        isOpen={pdfModalData.isOpen}
        onClose={() => setPdfModalData({ ...pdfModalData, isOpen: false })}
        title={pdfModalData.title}
        documentName={pdfModalData.docName}
        noSertifikat={pdfModalData.noSertifikat}
        personilName={pdfModalData.personilName}
        jenisSertifikasi={pdfModalData.jenisSertifikasi}
        tanggalMulai={pdfModalData.tglMulai}
        tanggalExpired={pdfModalData.tglExp}
      />

      {/* QR CODE MODAL */}
      <QrCodeModal
        isOpen={qrModalData.isOpen}
        onClose={() => setQrModalData({ ...qrModalData, isOpen: false })}
        noSertifikat={qrModalData.noCert}
        personilName={qrModalData.name}
        jenisSertifikasi={qrModalData.jenis}
        tanggalExpired={qrModalData.tglExp}
      />
    </div>
  );
};