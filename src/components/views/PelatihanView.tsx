import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TrxPelatihan } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { PdfPreviewModal } from '../common/PdfPreviewModal';
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Award,
  Sparkles,
} from 'lucide-react';

export const PelatihanView: React.FC = () => {
  const {
    pelatihanList,
    personilList,
    lookups,
    role,
    addPelatihan,
    updatePelatihan,
    deletePelatihan,
    generateSertifikasiFromPelatihan,
    getLookupName,
    sertifikasiList,
  } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPelatihan, setEditingPelatihan] = useState<TrxPelatihan | null>(null);

  const [pdfModalData, setPdfModalData] = useState<{
    isOpen: boolean;
    title: string;
    docName: string;
  }>({ isOpen: false, title: '', docName: '' });

  const [formData, setFormData] = useState<Omit<TrxPelatihan, 'ID_PELATIHAN'> & { ID_PELATIHAN?: string }>({
    ID_PELATIHAN: '',
    ID_PERSONIL: personilList[0]?.ID_PERSONIL || '8632',
    JENIS_PELATIHAN: 'POP',
    TANGGAL_MULAI: new Date().toISOString().split('T')[0],
    TANGGAL_SELESAI: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().split('T')[0],
    STATUS_PELATIHAN: 'BERJALAN',
    DOK_PELATIHAN: 'sertifikat_pelatihan.pdf',
  });

  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const pltLookups = lookups.filter(l => l.KATEGORI === 'PLTHN');
  const stsLookups = lookups.filter(l => l.KATEGORI === 'STSPLTHN');

  const filteredPelatihan = pelatihanList.filter(p => {
    return filterStatus === 'ALL' || p.STATUS_PELATIHAN === filterStatus;
  });

  const handleOpenAdd = () => {
    setEditingPelatihan(null);
    setFormData({
      ID_PELATIHAN: `PLTHNPOP${personilList[0]?.ID_PERSONIL || '8632'}${Math.floor(100 + Math.random() * 900)}`,
      ID_PERSONIL: personilList[0]?.ID_PERSONIL || '8632',
      JENIS_PELATIHAN: pltLookups[0]?.KODE || 'POP',
      TANGGAL_MULAI: new Date().toISOString().split('T')[0],
      TANGGAL_SELESAI: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().split('T')[0],
      STATUS_PELATIHAN: 'BERJALAN',
      DOK_PELATIHAN: 'sertifikat_pelatihan.pdf',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: TrxPelatihan) => {
    setEditingPelatihan(p);
    setFormData({ ...p });
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPelatihan) {
      updatePelatihan(editingPelatihan.ID_PELATIHAN, formData);
    } else {
      addPelatihan(formData);
    }
    setIsAddModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, DOK_PELATIHAN: file.name }));
    }
  };

  const columns: Column<TrxPelatihan>[] = [
    {
      header: 'ID Pelatihan',
      accessorKey: 'ID_PELATIHAN',
      sortable: true,
      cell: p => <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{p.ID_PELATIHAN}</span>,
    },
    {
      header: 'Personil Pegawai',
      accessorKey: 'ID_PERSONIL',
      sortable: true,
      cell: p => {
        const owner = personilList.find(per => per.ID_PERSONIL === p.ID_PERSONIL);
        return (
          <div>
            <div className="font-bold text-gray-900 dark:text-white">{owner?.NAMA || 'Pegawai'}</div>
            <div className="text-[10px] text-gray-400 font-mono">ID: {p.ID_PERSONIL}</div>
          </div>
        );
      },
    },
    {
      header: 'Jenis Pelatihan',
      accessorKey: 'JENIS_PELATIHAN',
      sortable: true,
      cell: p => (
        <span className="font-bold text-blue-900 dark:text-blue-300">
          {getLookupName('PLTHN', p.JENIS_PELATIHAN)} ({p.JENIS_PELATIHAN})
        </span>
      ),
    },
    {
      header: 'Periode Pelatihan',
      cell: p => (
        <div className="text-[11px]">
          <div>Mulai: <span className="font-semibold text-gray-800 dark:text-gray-200">{p.TANGGAL_MULAI}</span></div>
          <div>Selesai: <span className="font-semibold text-gray-800 dark:text-gray-200">{p.TANGGAL_SELESAI}</span></div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'STATUS_PELATIHAN',
      sortable: true,
      cell: p => (
        <span
          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${
            p.STATUS_PELATIHAN === 'SELESAI'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
              : p.STATUS_PELATIHAN === 'BERJALAN'
              ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300'
              : 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-slate-800 dark:text-gray-400'
          }`}
        >
          {p.STATUS_PELATIHAN}
        </span>
      ),
    },
    {
      header: 'Dokumen',
      cell: p => (
        <button
          onClick={() =>
            setPdfModalData({
              isOpen: true,
              title: 'Dokumen Pelatihan',
              docName: p.DOK_PELATIHAN || 'pelatihan.pdf',
            })
          }
          className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Preview</span>
        </button>
      ),
    },
    {
      header: 'Aksi & Generate',
      cell: p => {
        const hasCert = sertifikasiList.some(s => s.ID_PELATIHAN === p.ID_PELATIHAN);
        return (
          <div className="flex items-center gap-1">
            {/* Generate Sertifikasi Button if STATUS === SELESAI */}
            {p.STATUS_PELATIHAN === 'SELESAI' && !hasCert && (role === 'Administrator' || role === 'HRD') && (
              <button
                onClick={() => generateSertifikasiFromPelatihan(p.ID_PELATIHAN)}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[10px] rounded-lg transition shadow flex items-center gap-1"
                title="Generate data sertifikasi resmi"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Sertifikat</span>
              </button>
            )}

            {hasCert && (
              <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300">
                ✓ Sertifikat Generated
              </span>
            )}

            {(role === 'Administrator' || role === 'HRD') && (
              <>
                <button
                  onClick={() => handleOpenEdit(p)}
                  className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Apakah Anda yakin ingin menghapus pelatihan ${p.ID_PELATIHAN}?`)) {
                      deletePelatihan(p.ID_PELATIHAN);
                    }
                  }}
                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Pengelolaan Pelatihan Pegawai Tambang
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Kelola jadwal, pelaksanaan pelatihan, dan generate sertifikasi otomatis saat status selesai.
          </p>
        </div>

        {(role === 'Administrator' || role === 'HRD') && (
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Tambah Pelatihan Baru</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <span className="text-xs font-semibold text-gray-500">Filter Status Pelatihan:</span>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none"
        >
          <option value="ALL">Semua Status</option>
          <option value="BELUM">BELUM</option>
          <option value="BERJALAN">BERJALAN</option>
          <option value="SELESAI">SELESAI</option>
        </select>
      </div>

      {/* Pelatihan DataTable */}
      <DataTable
        data={filteredPelatihan}
        columns={columns}
        searchableKey={p => `${p.ID_PELATIHAN} ${p.ID_PERSONIL} ${p.JENIS_PELATIHAN} ${p.STATUS_PELATIHAN}`}
        searchPlaceholder="Cari ID Pelatihan, ID Personil, Jenis Pelatihan..."
      />

      {/* MODAL TAMBAH / EDIT PELATIHAN */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingPelatihan ? 'Edit Data Pelatihan' : 'Tambah Pelatihan Baru'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Pegawai *</label>
            <select
              value={formData.ID_PERSONIL}
              onChange={e => setFormData({ ...formData, ID_PERSONIL: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
            >
              {personilList.map(p => (
                <option key={p.ID_PERSONIL} value={p.ID_PERSONIL}>
                  {p.NAMA} (ID: {p.ID_PERSONIL}) - {getLookupName('DIVDEP', p.DIVISI_DEPARTEMEN)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Jenis Pelatihan *</label>
              <select
                value={formData.JENIS_PELATIHAN}
                onChange={e => setFormData({ ...formData, JENIS_PELATIHAN: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
              >
                {pltLookups.map(pl => (
                  <option key={pl.KODE} value={pl.KODE}>
                    {pl.NAMA} ({pl.KODE})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Status Pelatihan *</label>
              <select
                value={formData.STATUS_PELATIHAN}
                onChange={e =>
                  setFormData({
                    ...formData,
                    STATUS_PELATIHAN: e.target.value as 'BELUM' | 'BERJALAN' | 'SELESAI',
                  })
                }
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="BELUM">BELUM</option>
                <option value="BERJALAN">BERJALAN</option>
                <option value="SELESAI">SELESAI</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Tanggal Mulai *</label>
              <input
                type="date"
                value={formData.TANGGAL_MULAI}
                onChange={e => setFormData({ ...formData, TANGGAL_MULAI: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Tanggal Selesai *</label>
              <input
                type="date"
                value={formData.TANGGAL_SELESAI}
                onChange={e => setFormData({ ...formData, TANGGAL_SELESAI: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Upload Dokumen (PDF)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.DOK_PELATIHAN || ''}
                readOnly
                placeholder="nama_file.pdf"
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
              Simpan Data Pelatihan
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
      />
    </div>
  );
};
