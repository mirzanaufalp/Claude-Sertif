import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TrxPersonil, TrxPelatihan, TrxSertifikasi } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { PdfPreviewModal } from '../common/PdfPreviewModal';
import { QrCodeModal } from '../common/QrCodeModal';
import {
  UserPlus,
  Edit2,
  Trash2,
  Eye,
  FileSpreadsheet,
  FileText,
  Upload,
  QrCode,
  Download,
  GraduationCap,
  Award,
  Calendar,
  Mail,
  Briefcase,
  Building2,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const PersonilView: React.FC = () => {
  const {
    personilList,
    pelatihanList,
    sertifikasiList,
    lookups,
    role,
    addPersonil,
    updatePersonil,
    deletePersonil,
    getLookupName,
    getCertBadgeStatus,
  } = useApp();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPersonil, setEditingPersonil] = useState<TrxPersonil | null>(null);
  const [detailPersonil, setDetailPersonil] = useState<TrxPersonil | null>(null);

  // Document & QR code modal preview state
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

  // Form State
  const [formData, setFormData] = useState<{
    ID_PERSONIL: string;
    NAMA: string;
    JABATAN: string;
    DIVISI_DEPARTEMEN: string;
    JENIS_PEGAWAI: string;
    EMAIL_PERSONIL: string;
    FOTO_PERSONIL: string;
  }>({
    ID_PERSONIL: '',
    NAMA: '',
    JABATAN: 'Supervisor',
    DIVISI_DEPARTEMEN: 'GGD',
    JENIS_PEGAWAI: 'Pegawai Tetap',
    EMAIL_PERSONIL: '',
    FOTO_PERSONIL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  });

  // Filter States
  const [filterDivisi, setFilterDivisi] = useState<string>('ALL');
  const [filterJenisPegawai, setFilterJenisPegawai] = useState<string>('ALL');

  const divLookups = lookups.filter(l => l.KATEGORI === 'DIVDEP');
  const jbtLookups = lookups.filter(l => l.KATEGORI === 'JBTN');
  const pegLookups = lookups.filter(l => l.KATEGORI === 'JNSPEG');

  // Filtered Personil Data
  const filteredPersonil = personilList.filter(p => {
    const matchDiv = filterDivisi === 'ALL' || p.DIVISI_DEPARTEMEN === filterDivisi;
    const matchPeg = filterJenisPegawai === 'ALL' || p.JENIS_PEGAWAI === filterJenisPegawai;
    return matchDiv && matchPeg;
  });

  // Form Handlers
  const handleOpenAdd = () => {
    setEditingPersonil(null);
    setFormData({
      ID_PERSONIL: Math.floor(1000 + Math.random() * 9000).toString(),
      NAMA: '',
      JABATAN: jbtLookups[0]?.KODE || 'Supervisor',
      DIVISI_DEPARTEMEN: divLookups[0]?.KODE || 'GGD',
      JENIS_PEGAWAI: pegLookups[0]?.KODE || 'Pegawai Tetap',
      EMAIL_PERSONIL: '',
      FOTO_PERSONIL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: TrxPersonil) => {
    setEditingPersonil(p);
    setFormData({
      ID_PERSONIL: p.ID_PERSONIL,
      NAMA: p.NAMA,
      JABATAN: p.JABATAN,
      DIVISI_DEPARTEMEN: p.DIVISI_DEPARTEMEN,
      JENIS_PEGAWAI: p.JENIS_PEGAWAI,
      EMAIL_PERSONIL: p.EMAIL_PERSONIL,
      FOTO_PERSONIL: p.FOTO_PERSONIL,
    });
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.NAMA.trim()) return;

    if (editingPersonil) {
      updatePersonil(editingPersonil.ID_PERSONIL, formData);
    } else {
      addPersonil(formData);
    }
    setIsAddModalOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, FOTO_PERSONIL: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Export & Import
  const handleExportExcel = () => {
    const exportData = filteredPersonil.map(p => {
      const pCerts = sertifikasiList.filter(
        c =>
          c.ID_SERTIFIKASI.includes(p.ID_PERSONIL) ||
          pelatihanList.find(pl => pl.ID_PELATIHAN === c.ID_PELATIHAN)?.ID_PERSONIL === p.ID_PERSONIL
      );
      const activeCerts = pCerts.filter(c => getCertBadgeStatus(c) === 'AKTIF').length;
      return {
        'ID Personil': p.ID_PERSONIL,
        Nama: p.NAMA,
        Jabatan: getLookupName('JBTN', p.JABATAN),
        Divisi: getLookupName('DIVDEP', p.DIVISI_DEPARTEMEN),
        'Jenis Pegawai': getLookupName('JNSPEG', p.JENIS_PEGAWAI),
        Email: p.EMAIL_PERSONIL,
        'Jumlah Sertifikasi': pCerts.length,
        'Sertifikasi Aktif': activeCerts,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Personil');
    XLSX.writeFile(workbook, `Data_Personil_Tambang_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt: ProgressEvent<FileReader>) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        data.forEach(row => {
          if (row['Nama'] || row['NAMA']) {
            addPersonil({
              ID_PERSONIL: String(row['ID Personil'] || row['ID_PERSONIL'] || Math.floor(1000 + Math.random() * 9000)),
              NAMA: String(row['Nama'] || row['NAMA']),
              JABATAN: String(row['Jabatan'] || row['JABATAN'] || 'Supervisor'),
              DIVISI_DEPARTEMEN: String(row['Divisi'] || row['DIVISI_DEPARTEMEN'] || 'GGD'),
              JENIS_PEGAWAI: String(row['Jenis Pegawai'] || row['JENIS_PEGAWAI'] || 'Pegawai Tetap'),
              EMAIL_PERSONIL: String(row['Email'] || row['EMAIL_PERSONIL'] || 'email@mining.co.id'),
              FOTO_PERSONIL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
            });
          }
        });
      };
      reader.readAsBinaryString(file);
    }
  };

  // Helper Badge for Table Rows
  const renderCertBadgesForPersonil = (personilId: string) => {
    const pCerts = sertifikasiList.filter(
      c =>
        c.ID_SERTIFIKASI.includes(personilId) ||
        pelatihanList.find(pl => pl.ID_PELATIHAN === c.ID_PELATIHAN)?.ID_PERSONIL === personilId
    );

    if (pCerts.length === 0) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 dark:bg-slate-800 text-gray-500 border border-gray-200 dark:border-slate-700">
          ⚪ Belum Ada
        </span>
      );
    }

    const hasExpired = pCerts.some(c => getCertBadgeStatus(c) === 'EXPIRED');
    const hasExpiring = pCerts.some(c => getCertBadgeStatus(c) === 'AKAN_EXPIRED');

    if (hasExpired) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          🔴 Ada Expired ({pCerts.length})
        </span>
      );
    }
    if (hasExpiring) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          🟡 Akan Expired ({pCerts.length})
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
        🟢 Aktif ({pCerts.length})
      </span>
    );
  };

  // DataTable Columns
  const columns: Column<TrxPersonil>[] = [
    {
      header: 'Personil',
      accessorKey: 'NAMA',
      sortable: true,
      cell: p => (
        <div className="flex items-center gap-3">
          <img
            src={p.FOTO_PERSONIL}
            alt={p.NAMA}
            className="w-9 h-9 rounded-full object-cover border-2 border-blue-900 shadow-sm shrink-0"
          />
          <div>
            <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <span>{p.NAMA}</span>
            </div>
            <div className="text-[10px] font-mono text-gray-400">ID: {p.ID_PERSONIL}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Jabatan & Divisi',
      accessorKey: 'JABATAN',
      sortable: true,
      cell: p => (
        <div>
          <div className="font-semibold text-gray-800 dark:text-gray-200">{getLookupName('JBTN', p.JABATAN)}</div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">{getLookupName('DIVDEP', p.DIVISI_DEPARTEMEN)}</div>
        </div>
      ),
    },
    {
      header: 'Jenis Pegawai',
      accessorKey: 'JENIS_PEGAWAI',
      sortable: true,
      cell: p => (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          {getLookupName('JNSPEG', p.JENIS_PEGAWAI)}
        </span>
      ),
    },
    {
      header: 'Email',
      accessorKey: 'EMAIL_PERSONIL',
      sortable: true,
      cell: p => <span className="font-mono text-gray-600 dark:text-gray-300">{p.EMAIL_PERSONIL}</span>,
    },
    {
      header: 'Status Sertifikasi',
      cell: p => renderCertBadgesForPersonil(p.ID_PERSONIL),
    },
    {
      header: 'Aksi',
      cell: p => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDetailPersonil(p)}
            className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg transition"
            title="Lihat Detail & Riwayat"
          >
            <Eye className="w-4 h-4" />
          </button>
          {(role === 'Administrator' || role === 'HRD') && (
            <>
              <button
                onClick={() => handleOpenEdit(p)}
                className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-lg transition"
                title="Edit Personil"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Apakah Anda yakin ingin menghapus data personil ${p.NAMA}?`)) {
                    deletePersonil(p.ID_PERSONIL);
                  }
                }}
                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-lg transition"
                title="Hapus Personil"
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
            <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Pengelolaan Data Personil Tambang
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Kelola data biodata, riwayat pelatihan, dan sertifikasi pegawai secara terpusat.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(role === 'Administrator' || role === 'HRD') && (
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>Tambah Personil</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar & Export Actions */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Filter Divisi:</span>
            <select
              value={filterDivisi}
              onChange={e => setFilterDivisi(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none"
            >
              <option value="ALL">Semua Divisi</option>
              {divLookups.map(d => (
                <option key={d.KODE} value={d.KODE}>
                  {d.KODE} - {d.NAMA}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Jenis Pegawai:</span>
            <select
              value={filterJenisPegawai}
              onChange={e => setFilterJenisPegawai(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none"
            >
              <option value="ALL">Semua Jenis Pegawai</option>
              {pegLookups.map(p => (
                <option key={p.KODE} value={p.KODE}>
                  {p.NAMA}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:ml-auto flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
            </button>

            <label className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-semibold text-xs rounded-xl cursor-pointer transition flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Import Excel
              <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Main Personil DataTable */}
      <DataTable
        data={filteredPersonil}
        columns={columns}
        searchableKey={p => `${p.ID_PERSONIL} ${p.NAMA} ${p.EMAIL_PERSONIL} ${p.JABATAN} ${p.DIVISI_DEPARTEMEN}`}
        searchPlaceholder="Cari ID, Nama, Email, Jabatan, Divisi..."
      />

      {/* MODAL TAMBAH / EDIT PERSONIL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingPersonil ? 'Edit Data Personil' : 'Tambah Personil Baru'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
            <img
              src={formData.FOTO_PERSONIL}
              alt="Preview"
              className="w-16 h-16 rounded-full object-cover border-2 border-blue-900 shadow-sm"
            />
            <div className="space-y-1">
              <label className="px-3 py-1.5 bg-blue-900 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-blue-800 transition inline-block">
                Upload Foto Personil
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Format: JPG, PNG (Maks 2MB)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">ID Personil *</label>
              <input
                type="text"
                value={formData.ID_PERSONIL}
                onChange={e => setFormData({ ...formData, ID_PERSONIL: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap *</label>
              <input
                type="text"
                value={formData.NAMA}
                onChange={e => setFormData({ ...formData, NAMA: e.target.value })}
                required
                placeholder="Contoh: FIANDRI"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Jabatan *</label>
              <select
                value={formData.JABATAN}
                onChange={e => setFormData({ ...formData, JABATAN: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
              >
                {jbtLookups.map(j => (
                  <option key={j.KODE} value={j.KODE}>
                    {j.NAMA} ({j.KODE})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Divisi / Departemen *</label>
              <select
                value={formData.DIVISI_DEPARTEMEN}
                onChange={e => setFormData({ ...formData, DIVISI_DEPARTEMEN: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
              >
                {divLookups.map(d => (
                  <option key={d.KODE} value={d.KODE}>
                    {d.NAMA} ({d.KODE})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Jenis Pegawai *</label>
              <select
                value={formData.JENIS_PEGAWAI}
                onChange={e => setFormData({ ...formData, JENIS_PEGAWAI: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
              >
                {pegLookups.map(p => (
                  <option key={p.KODE} value={p.KODE}>
                    {p.NAMA}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Email Personil *</label>
              <input
                type="email"
                value={formData.EMAIL_PERSONIL}
                onChange={e => setFormData({ ...formData, EMAIL_PERSONIL: e.target.value })}
                required
                placeholder="nama@email.com"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
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
              Simpan Data Personil
            </button>
          </div>
        </form>
      </Modal>

      {/* DETAIL PERSONIL MODAL DRAWER */}
      {detailPersonil && (
        <Modal
          isOpen={!!detailPersonil}
          onClose={() => setDetailPersonil(null)}
          maxWidth="4xl"
          title={`Detail Profil Personil - ${detailPersonil.NAMA} (ID: ${detailPersonil.ID_PERSONIL})`}
        >
          <div className="space-y-6">
            {/* BIODATA CARD */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-5 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white rounded-2xl shadow-lg relative overflow-hidden">
              <img
                src={detailPersonil.FOTO_PERSONIL}
                alt={detailPersonil.NAMA}
                className="w-24 h-24 rounded-full object-cover border-4 border-white/20 shadow-xl shrink-0"
              />
              <div className="space-y-2 text-center sm:text-left flex-1">
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400 text-blue-950 font-extrabold text-[10px] uppercase tracking-wider">
                  ID: {detailPersonil.ID_PERSONIL}
                </div>
                <h3 className="text-2xl font-black">{detailPersonil.NAMA}</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-blue-100">
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                    <Briefcase className="w-4 h-4 text-amber-400" />
                    <span>Jabatan: <strong>{getLookupName('JBTN', detailPersonil.JABATAN)}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <span>Divisi: <strong>{getLookupName('DIVDEP', detailPersonil.DIVISI_DEPARTEMEN)}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                    <UserCheck className="w-4 h-4 text-amber-400" />
                    <span>Status: <strong>{getLookupName('JNSPEG', detailPersonil.JENIS_PEGAWAI)}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                    <Mail className="w-4 h-4 text-amber-400" />
                    <span>Email: <strong className="font-mono">{detailPersonil.EMAIL_PERSONIL}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIWAYAT PELATIHAN */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-500" />
                Riwayat Pelatihan ({pelatihanList.filter(p => p.ID_PERSONIL === detailPersonil.ID_PERSONIL).length})
              </h4>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-slate-800">
                      <th className="p-2.5">ID Pelatihan</th>
                      <th className="p-2.5">Jenis Pelatihan</th>
                      <th className="p-2.5">Tanggal Mulai</th>
                      <th className="p-2.5">Tanggal Selesai</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-center">Dokumen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {pelatihanList.filter(p => p.ID_PERSONIL === detailPersonil.ID_PERSONIL).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-gray-400">
                          Belum ada riwayat pelatihan.
                        </td>
                      </tr>
                    ) : (
                      pelatihanList
                        .filter(p => p.ID_PERSONIL === detailPersonil.ID_PERSONIL)
                        .map(p => (
                          <tr key={p.ID_PELATIHAN}>
                            <td className="p-2.5 font-mono text-gray-500">{p.ID_PELATIHAN}</td>
                            <td className="p-2.5 font-bold text-gray-900 dark:text-white">
                              {getLookupName('PLTHN', p.JENIS_PELATIHAN)}
                            </td>
                            <td className="p-2.5">{p.TANGGAL_MULAI}</td>
                            <td className="p-2.5">{p.TANGGAL_SELESAI}</td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  p.STATUS_PELATIHAN === 'SELESAI'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : p.STATUS_PELATIHAN === 'BERJALAN'
                                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                    : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
                                }`}
                              >
                                {p.STATUS_PELATIHAN}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              {p.DOK_PELATIHAN ? (
                                <button
                                  onClick={() =>
                                    setPdfModalData({
                                      isOpen: true,
                                      title: 'Dokumen Pelatihan',
                                      docName: p.DOK_PELATIHAN || 'pelatihan.pdf',
                                      personilName: detailPersonil.NAMA,
                                      jenisSertifikasi: p.JENIS_PELATIHAN,
                                    })
                                  }
                                  className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center justify-center gap-1 mx-auto"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Preview</span>
                                </button>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIWAYAT SERTIFIKASI */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Riwayat Sertifikasi ({sertifikasiList.filter(s => s.ID_SERTIFIKASI.includes(detailPersonil.ID_PERSONIL) || pelatihanList.find(pl => pl.ID_PELATIHAN === s.ID_PELATIHAN)?.ID_PERSONIL === detailPersonil.ID_PERSONIL).length})
              </h4>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-slate-800">
                      <th className="p-2.5">Jenis Sertifikasi</th>
                      <th className="p-2.5">No. Sertifikat</th>
                      <th className="p-2.5">Tanggal Terbit</th>
                      <th className="p-2.5">Tanggal Expired</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-center">Aksi Dokumen & QR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {sertifikasiList.filter(
                      s =>
                        s.ID_SERTIFIKASI.includes(detailPersonil.ID_PERSONIL) ||
                        pelatihanList.find(pl => pl.ID_PELATIHAN === s.ID_PELATIHAN)?.ID_PERSONIL === detailPersonil.ID_PERSONIL
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-gray-400">
                          Belum ada riwayat sertifikasi resmi.
                        </td>
                      </tr>
                    ) : (
                      sertifikasiList
                        .filter(
                          s =>
                            s.ID_SERTIFIKASI.includes(detailPersonil.ID_PERSONIL) ||
                            pelatihanList.find(pl => pl.ID_PELATIHAN === s.ID_PELATIHAN)?.ID_PERSONIL === detailPersonil.ID_PERSONIL
                        )
                        .map(s => {
                          const badgeSt = getCertBadgeStatus(s);
                          return (
                            <tr key={s.ID_SERTIFIKASI}>
                              <td className="p-2.5 font-bold text-gray-900 dark:text-white">
                                {getLookupName('SRT', s.JENIS_SERTIFIKASI)} ({s.JENIS_SERTIFIKASI})
                              </td>
                              <td className="p-2.5 font-mono text-blue-600 dark:text-blue-400 font-bold">
                                {s.NO_SERTIFIKAT}
                              </td>
                              <td className="p-2.5">{s.TANGGAL_MULAI}</td>
                              <td className="p-2.5">{s.TANGGAL_EXPIRED}</td>
                              <td className="p-2.5">
                                {badgeSt === 'AKTIF' && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    🟢 Aktif
                                  </span>
                                )}
                                {badgeSt === 'AKAN_EXPIRED' && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-300">
                                    🟡 Akan Expired (&lt;90 hr)
                                  </span>
                                )}
                                {badgeSt === 'EXPIRED' && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800 border border-rose-300">
                                    🔴 Expired
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() =>
                                      setPdfModalData({
                                        isOpen: true,
                                        title: 'Preview Sertifikat',
                                        docName: s.DOK_SERTIFIKAT || `${s.NO_SERTIFIKAT}.pdf`,
                                        noSertifikat: s.NO_SERTIFIKAT,
                                        personilName: detailPersonil.NAMA,
                                        jenisSertifikasi: getLookupName('SRT', s.JENIS_SERTIFIKASI),
                                        tglMulai: s.TANGGAL_MULAI,
                                        tglExp: s.TANGGAL_EXPIRED,
                                      })
                                    }
                                    className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                                    title="Preview PDF"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() =>
                                      setQrModalData({
                                        isOpen: true,
                                        noCert: s.NO_SERTIFIKAT,
                                        name: detailPersonil.NAMA,
                                        jenis: getLookupName('SRT', s.JENIS_SERTIFIKASI),
                                        tglExp: s.TANGGAL_EXPIRED,
                                      })
                                    }
                                    className="p-1 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition"
                                    title="Tampilkan QR Code"
                                  >
                                    <QrCode className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

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
