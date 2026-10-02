import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MstLookup, TrxPersonil, TrxPelatihan, TrxSertifikasi } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import {
  Database,
  Plus,
  Edit2,
  Trash2,
  Layers,
  RotateCcw,
  Upload,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const MasterDataView: React.FC = () => {
  const {
    categories,
    lookups,
    addLookup,
    updateLookup,
    deleteLookup,
    resetToDefaultData,
    role,
    setPersonilList,
    setPelatihanList,
    setSertifikasiList,
    addAuditLog,
  } = useApp();

  const [activeCatCode, setActiveCatCode] = useState<string>('DIVDEP');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLookup, setEditingLookup] = useState<MstLookup | null>(null);

  const [formData, setFormData] = useState<{
    KATEGORI: string;
    KODE: string;
    NAMA: string;
    STATUS: 'AKTIF' | 'NONAKTIF';
  }>({
    KATEGORI: 'DIVDEP',
    KODE: '',
    NAMA: '',
    STATUS: 'AKTIF',
  });

  const activeCategory = categories.find(c => c.KODE === activeCatCode);
  const currentCategoryLookups = lookups.filter(l => l.KATEGORI === activeCatCode);

  const handleOpenAdd = () => {
    setEditingLookup(null);
    setFormData({
      KATEGORI: activeCatCode,
      KODE: '',
      NAMA: '',
      STATUS: 'AKTIF',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (l: MstLookup) => {
    setEditingLookup(l);
    setFormData({
      KATEGORI: l.KATEGORI,
      KODE: l.KODE,
      NAMA: l.NAMA,
      STATUS: l.STATUS,
    });
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.KODE.trim() || !formData.NAMA.trim()) return;

    if (editingLookup) {
      updateLookup(editingLookup.ID_LOOKUP, formData);
    } else {
      addLookup(formData);
    }
    setIsAddModalOpen(false);
  };

  // FUNGSI IMPOR EXCEL SECARA BERSIH (RESET & REPLACE TANPA DUPLIKASI)
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        if (rawData.length === 0) {
          alert('File Excel kosong!');
          return;
        }

        const newPersonil: TrxPersonil[] = [];
        const newPelatihan: TrxPelatihan[] = [];
        const newSertifikasi: TrxSertifikasi[] = [];

        rawData.forEach((row, idx) => {
          const personilId = row.ID_PERSONIL ? String(row.ID_PERSONIL).trim() : `PEG${1000 + idx}`;
          
          // 1. Ekstrak Data Personil
          newPersonil.push({
            ID_PERSONIL: personilId,
            NAMA: row.NAMA || 'Pegawai',
            JABATAN: row.JABATAN || 'Geologist',
            DIVISI_DEPARTEMEN: row.DIVISI_DEPARTEMEN || row.DIVISI || 'GGD',
            JENIS_PEGAWAI: row.JENIS_PEGAWAI || 'PEG',
            EMAIL_PERSONIL: row.EMAIL_PERSONIL || row.EMAIL || `${personilId}@antam.com`,
            FOTO_PERSONIL: row.FOTO_PERSONIL || '',
            STATUS_PERSONIL: 'AKTIF',
          });

          // 2. Parse Jenis Sertifikasi
          const certTypesRaw = row.SERT_PPP || row.JENIS_SERTIFIKASI || 'POP';
          const certTypes = String(certTypesRaw)
            .split(',')
            .map(s => s.trim().toUpperCase());

          // Parse TGL_EXPIRED
          const rawExp = row.TGL_EXPIRED_PPP || row.TGL_EXPIRED || '';

          certTypes.forEach((cType, cIdx) => {
            const pelId = `PEL_${personilId}_${cType}_${cIdx}`;
            const certId = `SERT_${personilId}_${cType}_${cIdx}`;

            newPelatihan.push({
              ID_PELATIHAN: pelId,
              ID_PERSONIL: personilId,
              JENIS_PELATIHAN: cType,
              NAMA_PELATIHAN: `Pelatihan & Sertifikasi ${cType}`,
              PENYELENGGARA: 'Pusdiklat Antam / Minerba',
              TANGGAL_MULAI: row.TANGGAL_MULAI || '',
              TANGGAL_SELESAI: row.TANGGAL_SELESAI || '',
              STATUS_PELATIHAN: 'SELESAI',
            });

            newSertifikasi.push({
              ID_SERTIFIKASI: certId,
              ID_PELATIHAN: pelId,
              JENIS_SERTIFIKASI: cType,
              NO_SERTIFIKAT: row.NO_SERTIFIKAT || `${cType}-2026-${1000 + idx}`,
              TANGGAL_MULAI: '', // Terbit kosong -> ditampilkan "-"
              TANGGAL_EXPIRED: String(rawExp).trim(),
              STATUS_SERTIFIKASI: 'LULUS',
              DOK_SERTIFIKAT: 'sertifikat.pdf',
            });
          });
        });

        // TIMPA (REPLACE) DATA LAMA SECARA BERSIH
        setPersonilList(newPersonil);
        setPelatihanList(newPelatihan);
        setSertifikasiList(newSertifikasi);

        localStorage.setItem('sertif_personil', JSON.stringify(newPersonil));
        localStorage.setItem('sertif_pelatihan', JSON.stringify(newPelatihan));
        localStorage.setItem('sertif_sertifikasi', JSON.stringify(newSertifikasi));

        addAuditLog('IMPOR_EXCEL', `Berhasil mengimpor ${rawData.length} baris data pegawai & sertifikasi dari Excel.`);
        alert(`Berhasil memperbarui data! ${newPersonil.length} data pegawai & sertifikasi telah diperbarui tanpa duplikasi.`);
      } catch (error) {
        console.error(error);
        alert('Gagal membaca file Excel. Pastikan format file sesuai.');
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input file
  };

  const columns: Column<MstLookup>[] = [
    {
      header: 'ID Lookup',
      accessorKey: 'ID_LOOKUP',
      sortable: true,
      cell: l => <span className="font-mono text-gray-500 font-semibold">{l.ID_LOOKUP}</span>,
    },
    {
      header: 'Kode Value',
      accessorKey: 'KODE',
      sortable: true,
      cell: l => <span className="font-mono font-bold text-blue-900 dark:text-blue-400">{l.KODE}</span>,
    },
    {
      header: 'Nama Label Option',
      accessorKey: 'NAMA',
      sortable: true,
      cell: l => <span className="font-bold text-gray-900 dark:text-white">{l.NAMA}</span>,
    },
    {
      header: 'Status Option',
      accessorKey: 'STATUS',
      sortable: true,
      cell: l => (
        <span
          className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg ${
            l.STATUS === 'AKTIF'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-gray-100 text-gray-500 border border-gray-300'
          }`}
        >
          {l.STATUS}
        </span>
      ),
    },
    {
      header: 'Aksi',
      cell: l => (
        <div className="flex items-center gap-1">
          {role === 'Administrator' && (
            <>
              <button
                onClick={() => handleOpenEdit(l)}
                className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-lg transition"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Hapus option ${l.NAMA} (${l.KODE})?`)) {
                    deleteLookup(l.ID_LOOKUP);
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
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Pengelolaan Master Data (MST_KATEGORI & MST_LOOKUP)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Daftar pilihan dropdown dikelola dinamis & dukungan unggah ulang database Excel (Replace Clean).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {role === 'Administrator' && (
            <>
              {/* Tombol Impor Excel */}
              <label className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-200" />
                <span>Upload Database Excel</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => {
                  if (confirm('Atur ulang seluruh data ke sampel awal? Data unggahan saat ini akan direset.')) {
                    resetToDefaultData();
                  }
                }}
                className="px-3.5 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Data Sampel</span>
              </button>
            </>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Tambah Master Option</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-slate-800">
        {categories.map(cat => {
          const count = lookups.filter(l => l.KATEGORI === cat.KODE).length;
          const isActive = activeCatCode === cat.KODE;
          return (
            <button
              key={cat.KODE}
              onClick={() => setActiveCatCode(cat.KODE)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? 'bg-blue-900 text-white shadow'
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-800'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-gray-400'}`} />
              <span>{cat.NAMA}</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${isActive ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lookup Table */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Kategori Aktif: <strong className="text-gray-900 dark:text-white font-mono">{activeCategory?.NAMA} ({activeCatCode})</strong></span>
        </div>

        <DataTable
          data={currentCategoryLookups}
          columns={columns}
          searchableKey={l => `${l.KODE} ${l.NAMA} ${l.ID_LOOKUP}`}
          searchPlaceholder="Cari Kode atau Nama Option..."
        />
      </div>

      {/* MODAL TAMBAH / EDIT LOOKUP */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingLookup ? `Edit Master ${activeCategory?.NAMA}` : `Tambah Master ${activeCategory?.NAMA}`}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Kategori Master</label>
            <input
              type="text"
              value={`${activeCategory?.NAMA} (${activeCatCode})`}
              disabled
              className="w-full px-3 py-2 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-gray-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Kode Master *</label>
              <input
                type="text"
                value={formData.KODE}
                onChange={e => setFormData({ ...formData, KODE: e.target.value })}
                required
                placeholder="Contoh: POP"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Status *</label>
              <select
                value={formData.STATUS}
                onChange={e => setFormData({ ...formData, STATUS: e.target.value as 'AKTIF' | 'NONAKTIF' })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="AKTIF">AKTIF</option>
                <option value="NONAKTIF">NONAKTIF</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nama Deskriptif Option *</label>
            <input
              type="text"
              value={formData.NAMA}
              onChange={e => setFormData({ ...formData, NAMA: e.target.value })}
              required
              placeholder="Contoh: Pengawas Operasional Pertama"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-semibold text-xs rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow"
            >
              Simpan Master Option
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
