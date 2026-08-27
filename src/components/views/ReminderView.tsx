import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TrxSertifikasi, TrxPersonil } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import {
  Bell,
  AlertTriangle,
  XCircle,
  Mail,
  Calendar as CalendarIcon,
  UserX,
  Send,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const ReminderView: React.FC = () => {
  const {
    sertifikasiList,
    personilList,
    pelatihanList,
    getCertBadgeStatus,
    getDaysRemaining,
    getLookupName,
    addAuditLog,
  } = useApp();

  const [emailModalData, setEmailModalData] = useState<{
    isOpen: boolean;
    cert?: TrxSertifikasi;
    owner?: TrxPersonil;
    sentSuccess?: boolean;
  }>({ isOpen: false });

  // 1. Sertifikat akan habis dalam 90 hari
  const expiringSoonList = sertifikasiList.filter(c => getCertBadgeStatus(c) === 'AKAN_EXPIRED');

  // 2. Sertifikat yang sudah habis masa berlaku (Expired)
  const expiredList = sertifikasiList.filter(c => getCertBadgeStatus(c) === 'EXPIRED');

  // 3. Pegawai belum memiliki sertifikasi wajib
  const mandatoryCerts = ['PPP', 'POM', 'POU', 'SMKP', 'CP'];

  const missingCertList = personilList.map(p => {
    const pCerts = sertifikasiList.filter(
      c =>
        c.ID_SERTIFIKASI.includes(p.ID_PERSONIL) ||
        pelatihanList.find(pl => pl.ID_PELATIHAN === c.ID_PELATIHAN)?.ID_PERSONIL === p.ID_PERSONIL
    );
    const activeCertCodes = pCerts
      .filter(c => getCertBadgeStatus(c) === 'AKTIF' || getCertBadgeStatus(c) === 'AKAN_EXPIRED')
      .map(c => c.JENIS_SERTIFIKASI);

    const missing = mandatoryCerts.filter(mc => !activeCertCodes.includes(mc));
    return { owner: p, missing };
  }).filter(item => item.missing.length > 0);

  // 4. Monthly Expiration Breakdown
  const monthlyExpirationMap: Record<string, number> = {};
  sertifikasiList.forEach(c => {
    if (c.TANGGAL_EXPIRED) {
      const monthYear = c.TANGGAL_EXPIRED.substring(0, 7); // YYYY-MM
      monthlyExpirationMap[monthYear] = (monthlyExpirationMap[monthYear] || 0) + 1;
    }
  });

  const monthlyExpData = Object.keys(monthlyExpirationMap)
    .sort()
    .map(key => ({
      Bulan: key,
      JumlahExpired: monthlyExpirationMap[key],
    }));

  const handleSendEmailNotification = (cert: TrxSertifikasi) => {
    const pel = pelatihanList.find(p => p.ID_PELATIHAN === cert.ID_PELATIHAN);
    const owner = personilList.find(
      per => per.ID_PERSONIL === pel?.ID_PERSONIL || cert.ID_SERTIFIKASI.includes(per.ID_PERSONIL)
    );
    setEmailModalData({
      isOpen: true,
      cert,
      owner,
      sentSuccess: false,
    });
  };

  const handleConfirmSendEmail = () => {
    if (emailModalData.cert && emailModalData.owner) {
      addAuditLog(
        'KIRIM_EMAIL_REMINDER',
        `Notifikasi email pengingat kedaluwarsa terkirim ke ${emailModalData.owner.EMAIL_PERSONIL} untuk Sertifikat ${emailModalData.cert.NO_SERTIFIKAT}`
      );
      setEmailModalData(prev => ({ ...prev, sentSuccess: true }));
      setTimeout(() => {
        setEmailModalData({ isOpen: false });
      }, 1500);
    }
  };

  // DataTable columns for Expiring List
  const expiringColumns: Column<TrxSertifikasi>[] = [
    {
      header: 'No. Sertifikat',
      accessorKey: 'NO_SERTIFIKAT',
      sortable: true,
      cell: s => <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{s.NO_SERTIFIKAT}</span>,
    },
    {
      header: 'Pegawai',
      cell: s => {
        const pel = pelatihanList.find(p => p.ID_PELATIHAN === s.ID_PELATIHAN);
        const owner = personilList.find(per => per.ID_PERSONIL === pel?.ID_PERSONIL);
        return (
          <div>
            <div className="font-bold text-gray-900 dark:text-white">{owner?.NAMA || 'Pegawai'}</div>
            <div className="text-[10px] text-gray-400 font-mono">{owner?.EMAIL_PERSONIL}</div>
          </div>
        );
      },
    },
    {
      header: 'Jenis Sertifikasi',
      accessorKey: 'JENIS_SERTIFIKASI',
      cell: s => <span className="font-bold">{getLookupName('SRT', s.JENIS_SERTIFIKASI)} ({s.JENIS_SERTIFIKASI})</span>,
    },
    {
      header: 'Tanggal Expired',
      accessorKey: 'TANGGAL_EXPIRED',
      sortable: true,
      cell: s => {
        const days = getDaysRemaining(s.TANGGAL_EXPIRED);
        return (
          <div>
            <div className="font-bold text-amber-600 dark:text-amber-400">{s.TANGGAL_EXPIRED}</div>
            <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300">Sisa {days} hari lagi</div>
          </div>
        );
      },
    },
    {
      header: 'Kirim Reminder Email',
      cell: s => (
        <button
          onClick={() => handleSendEmailNotification(s)}
          className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-[11px] rounded-lg transition flex items-center gap-1.5 shadow"
        >
          <Mail className="w-3.5 h-3.5 text-amber-400" />
          <span>Kirim Reminder Email</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            Pusat Monitoring Reminder & Expiry Sertifikat
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Monitoring otomatis sertifikat kadaluarsa, sisa hari &lt;90 hari, dan ketiadaan sertifikat wajib pegawai.
          </p>
        </div>
      </div>

      {/* SUMMARY BANNER CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-500 text-slate-950 rounded-xl font-bold shadow">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-900 dark:text-amber-300">{expiringSoonList.length}</div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-400">Sertifikat Akan Expired (&lt;90 Hari)</p>
          </div>
        </div>

        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-rose-600 text-white rounded-xl font-bold shadow">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-900 dark:text-rose-300">{expiredList.length}</div>
            <p className="text-xs font-bold text-rose-800 dark:text-rose-400">Sertifikat Sudah Expired</p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-900 text-amber-400 rounded-xl font-bold shadow">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-blue-900 dark:text-blue-300">{missingCertList.length}</div>
            <p className="text-xs font-bold text-blue-800 dark:text-blue-400">Pegawai Belum Lengkap Sertifikat</p>
          </div>
        </div>
      </div>

      {/* 1. TABLE: SERTIFIKAT AKAN HABIS MASA BERLAKU (<90 HARI) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Sertifikat Akan Expired (&lt;90 Hari)</span>
        </div>

        <DataTable
          data={expiringSoonList}
          columns={expiringColumns}
          searchPlaceholder="Cari Sertifikat..."
          emptyMessage="Tidak ada sertifikat yang akan expired dalam 90 hari."
        />
      </div>

      {/* 2. TABLE: SERTIFIKAT SUDAH EXPIRED */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-rose-800 dark:text-rose-400">
          <XCircle className="w-4 h-4 text-rose-500" />
          <span>Sertifikat Sudah Expired</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 font-bold border-b border-gray-200 dark:border-slate-800">
                <th className="p-3">No. Sertifikat</th>
                <th className="p-3">Pegawai</th>
                <th className="p-3">Jenis Sertifikasi</th>
                <th className="p-3">Tanggal Expired</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Notifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {expiredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-400">
                    Tidak ada sertifikat yang expired.
                  </td>
                </tr>
              ) : (
                expiredList.map(s => {
                  const pel = pelatihanList.find(p => p.ID_PELATIHAN === s.ID_PELATIHAN);
                  const owner = personilList.find(per => per.ID_PERSONIL === pel?.ID_PERSONIL);
                  return (
                    <tr key={s.ID_SERTIFIKASI} className="hover:bg-rose-50/20 transition">
                      <td className="p-3 font-mono font-bold text-rose-700 dark:text-rose-400">{s.NO_SERTIFIKAT}</td>
                      <td className="p-3 font-bold text-gray-900 dark:text-white">{owner?.NAMA || 'Pegawai'}</td>
                      <td className="p-3 font-bold">{getLookupName('SRT', s.JENIS_SERTIFIKASI)} ({s.JENIS_SERTIFIKASI})</td>
                      <td className="p-3 font-mono text-rose-600 dark:text-rose-400 font-bold">{s.TANGGAL_EXPIRED}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800 border border-rose-300">
                          🔴 EXPIRED
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleSendEmailNotification(s)}
                          className="px-3 py-1 bg-rose-700 hover:bg-rose-600 text-white font-bold text-[10px] rounded-lg transition"
                        >
                          Send Alert Email
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. TABLE: PEGAWAI BELUM MEMILIKI SERTIFIKASI WAJIB */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-300">
          <UserX className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Pegawai Belum Memiliki Sertifikasi Wajib</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-slate-800">
                <th className="p-3">ID Personil</th>
                <th className="p-3">Nama Pegawai</th>
                <th className="p-3">Jabatan & Divisi</th>
                <th className="p-3">Sertifikasi Belum Dimiliki</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {missingCertList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-gray-400">
                    Seluruh pegawai telah memiliki sertifikasi lengkap.
                  </td>
                </tr>
              ) : (
                missingCertList.map(({ owner, missing }) => (
                  <tr key={owner.ID_PERSONIL}>
                    <td className="p-3 font-mono font-bold">{owner.ID_PERSONIL}</td>
                    <td className="p-3 font-bold text-gray-900 dark:text-white">{owner.NAMA}</td>
                    <td className="p-3">
                      {getLookupName('JBTN', owner.JABATAN)} - {getLookupName('DIVDEP', owner.DIVISI_DEPARTEMEN)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {missing.map(m => (
                          <span
                            key={m}
                            className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                          >
                            ⚪ {m}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. CHART: JUMLAH SERTIFIKAT EXPIRED PER BULAN */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Proyeksi Jumlah Sertifikat Expired Setiap Bulan</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyExpData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="Bulan" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
              <Bar dataKey="JumlahExpired" fill="#e11d48" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MODAL EMAIL NOTIFICATION SIMULATION */}
      <Modal
        isOpen={emailModalData.isOpen}
        onClose={() => setEmailModalData({ isOpen: false })}
        title="Simulasi Kirim Email Reminder Expiry"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Kepada:</span>
              <span className="font-mono font-bold text-blue-900 dark:text-blue-300">
                {emailModalData.owner?.EMAIL_PERSONIL}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Nama Pegawai:</span>
              <span className="font-bold text-gray-900 dark:text-white">{emailModalData.owner?.NAMA}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Sertifikat:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {emailModalData.cert?.NO_SERTIFIKAT} ({emailModalData.cert?.JENIS_SERTIFIKASI})
              </span>
            </div>
          </div>

          <div className="p-3 bg-gray-100 dark:bg-slate-800 rounded-xl font-mono text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed border">
            <p><strong>Subjek:</strong> Peringatan Masa Berlaku Sertifikat Kompetensi Pertambangan</p>
            <p className="mt-2">Yth. {emailModalData.owner?.NAMA},</p>
            <p className="mt-1">
              Sertifikat Anda ({emailModalData.cert?.NO_SERTIFIKAT}) untuk bidang {emailModalData.cert?.JENIS_SERTIFIKASI} akan berakhir pada tanggal <strong>{emailModalData.cert?.TANGGAL_EXPIRED}</strong>.
            </p>
            <p className="mt-1">Mohon segera mendaftar perpanjangan pelatihan melalui Divisi HRD / K3LH PT ANTAM Tbk.</p>
          </div>

          {emailModalData.sentSuccess && (
            <div className="p-3 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-center flex items-center justify-center gap-2 animate-bounce">
              <CheckCircle2 className="w-5 h-5" /> Notifikasi Email Berhasil Terkirim!
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setEmailModalData({ isOpen: false })}
              className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-semibold text-xs rounded-xl"
            >
              Batal
            </button>
            <button
              onClick={handleConfirmSendEmail}
              className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
            >
              <Send className="w-4 h-4 text-amber-400" />
              <span>Kirim Sekarang</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
