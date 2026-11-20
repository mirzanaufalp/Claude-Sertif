import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TrxSertifikasi, TrxPersonil } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import {
  Bell,
  AlertTriangle,
  XCircle,
  Mail,
  UserX,
  Send,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ServerOff,
  CalendarDays,
  Download,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_ENABLED, reminderApi, ServerHealth, ReminderPreviewItem } from '../../lib/api';
import { downloadEmailData } from '../../lib/emailDataExport';
import { clearGithubConfig, getGithubConfig, saveGithubConfig, syncEmailDataToGithub } from '../../lib/githubSync';

function formatTanggal(iso?: string) {
  if (!iso) return 'belum ada data';
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'belum ada data';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

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
    previewUrl?: string;
  }>({ isOpen: false });

  const [serverHealth, setServerHealth] = useState<ServerHealth | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [bulkInfo, setBulkInfo] = useState<string | null>(null);
  const [bulkPreview, setBulkPreview] = useState<string | null>(null);
  const [simDate, setSimDate] = useState('2027-09-01');
  const [simLoading, setSimLoading] = useState(false);
  const [simInfo, setSimInfo] = useState<string | null>(null);
  const [simPreviewUrl, setSimPreviewUrl] = useState<string | null>(null);
  const [simPreviewList, setSimPreviewList] = useState<ReminderPreviewItem[]>([]);
  const [githubToken, setGithubToken] = useState(() => getGithubConfig().token);
  const [githubRepo, setGithubRepo] = useState(() => getGithubConfig().repo);
  const [syncStatus, setSyncStatus] = useState('');
  const [syncing, setSyncing] = useState(false);

  const refreshServerStatus = () => {
    if (!API_ENABLED) return;
    reminderApi
      .health()
      .then(health => {
        setServerHealth(health);
        setServerOnline(true);
      })
      .catch(() => {
        setServerHealth(null);
        setServerOnline(false);
      });
  };

  useEffect(() => {
    refreshServerStatus();
  }, []);

  // 1. Sertifikat akan habis dalam 90 hari
  const expiringSoonList = sertifikasiList.filter(c => getCertBadgeStatus(c) === 'AKAN_EXPIRED');

  // 2. Sertifikat yang sudah habis masa berlaku (Expired)
  const expiredList = sertifikasiList.filter(c => getCertBadgeStatus(c) === 'EXPIRED');

  // 3. Sertifikasi Wajib Pertambangan (Hapus PPP, murni: POP, POM, POU, SMKP, CP)
  const mandatoryCerts = ['POP', 'POM', 'POU', 'SMKP', 'CP'];

  // Helper pencocokan sertifikasi ke personil
  const getEmployeeCerts = (personil: TrxPersonil) => {
    return sertifikasiList
      .filter(s => {
        const pel = pelatihanList.find(p => p.ID_PELATIHAN === s.ID_PELATIHAN);
        const matchById =
          (pel && pel.ID_PERSONIL && String(pel.ID_PERSONIL) === String(personil.ID_PERSONIL)) ||
          (personil.ID_PERSONIL && s.ID_SERTIFIKASI.includes(String(personil.ID_PERSONIL)));

        // Fallback pencocokan jika personil belum memiliki ID unik
        const matchByName =
          !personil.ID_PERSONIL &&
          personil.NAMA &&
          personil.NAMA.toUpperCase().includes('AGUS KURNIAWAN') &&
          pel &&
          !pel.ID_PERSONIL;

        return matchById || matchByName;
      })
      .map(s => s.JENIS_SERTIFIKASI.toUpperCase());
  };

  // Analisis kepemilikan sertifikat per personil
  const certAnalysisList = personilList.map(p => {
    const ownedRaw = getEmployeeCerts(p);
    const owned = mandatoryCerts.filter(mc => ownedRaw.includes(mc));
    const missing = mandatoryCerts.filter(mc => !ownedRaw.includes(mc));

    return { owner: p, owned, missing };
  });

  // Filter pegawai yang belum memiliki sertifikasi lengkap
  const missingCertList = certAnalysisList.filter(item => item.missing.length > 0);

  // 4. Monthly Expiration Breakdown
  const monthlyExpirationMap: Record<string, number> = {};
  sertifikasiList.forEach(c => {
    if (c.TANGGAL_EXPIRED && c.TANGGAL_EXPIRED.trim() !== '') {
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

  const handleConfirmSendEmail = async () => {
    const cert = emailModalData.cert;
    const owner = emailModalData.owner;
    if (!cert) return;

    setSending(true);
    setSendError(null);
    try {
      const result = await reminderApi.send({ certIds: [cert.ID_SERTIFIKASI] });
      if (result.sent === 0) {
        const detail = result.results[0]?.error;
        throw new Error(
          detail ||
            'Sertifikat ini belum masuk periode reminder H-90 hari, sudah pernah dikirim, atau email pegawai kosong.'
        );
      }
      addAuditLog(
        'KIRIM_EMAIL_REMINDER',
        `Notifikasi email pengingat kedaluwarsa terkirim ke ${owner?.EMAIL_PERSONIL || '-'} untuk Sertifikat ${cert.NO_SERTIFIKAT || 'tanpa nomor'}${
          result.dryRun ? ' (dry-run)' : ''
        }`
      );
      setEmailModalData(prev => ({ ...prev, sentSuccess: true, previewUrl: result.results[0]?.previewUrl }));
      setTimeout(() => {
        setEmailModalData({ isOpen: false });
      }, 1500);
      refreshServerStatus();
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Gagal mengirim email.');
    } finally {
      setSending(false);
    }
  };

  const handleSendAllDue = async () => {
    setSending(true);
    setSendError(null);
    setBulkInfo(null);
    setBulkPreview(null);
    try {
      const result = await reminderApi.send({});
      const failed = result.failed > 0 ? `, ${result.failed} gagal` : '';
      const preview = result.results.find(r => r.previewUrl)?.previewUrl || null;
      setBulkPreview(preview);
      setBulkInfo(
        result.sent > 0
          ? `${result.sent} email reminder terkirim${failed}${result.dryRun ? ' (mode dry-run: file .eml disimpan di server/data/outbox)' : result.results[0]?.mode === 'ethereal' ? ' (mode Ethereal: buka link preview)' : ''}.`
          : 'Tidak ada sertifikat yang masuk periode reminder H-90 hari saat ini.'
      );
      addAuditLog('KIRIM_EMAIL_REMINDER_MASSAL', `Kirim reminder otomatis: ${result.sent} terkirim${failed}`);
      refreshServerStatus();
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Gagal mengirim email massal.');
    } finally {
      setSending(false);
    }
  };

  const handlePreviewH90 = async () => {
    setSending(true);
    setSendError(null);
    setSimInfo(null);
    setSimPreviewUrl(null);
    setSimPreviewList([]);
    try {
      const result = await reminderApi.preview(simDate);
      setSimPreviewList(result.pending);
      setSimInfo(
        result.total > 0
          ? `Simulasi ${result.simulatedDate}: ${result.total} sertifikat masuk jendela H-${result.reminderDays} hari.`
          : `Simulasi ${result.simulatedDate}: tidak ada sertifikat yang masuk jendela H-${result.reminderDays} hari.`
      );
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Gagal memuat preview H-90.');
    } finally {
      setSending(false);
    }
  };

  const handleSendH90 = async () => {
    setSending(true);
    setSendError(null);
    setSimInfo(null);
    setSimPreviewUrl(null);
    setSimPreviewList([]);
    try {
      const result = await reminderApi.send({ date: simDate });
      const failed = result.failed > 0 ? `, ${result.failed} gagal` : '';
      setSimInfo(
        result.sent > 0
          ? `Simulasi ${simDate}: ${result.sent} email terkirim${failed}${
              result.results[0]?.mode === 'ethereal' ? ' (Ethereal, buka link preview)' : ''
            }.`
          : `Simulasi ${simDate}: tidak ada sertifikat yang masuk jendela H-90 hari.`
      );
      setSimPreviewUrl(result.results.find(r => r.previewUrl)?.previewUrl || null);
      addAuditLog('UJI_REMINDER_H90', `Simulasi H-90 tanggal ${simDate}: ${result.sent} email terkirim${failed}`);
      refreshServerStatus();
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Gagal mengirim simulasi H-90.');
    } finally {
      setSending(false);
    }
  };

  // DataTable columns for Expiring List
  const expiringColumns: Column<TrxSertifikasi>[] = [
    {
      header: 'No. Sertifikat',
      accessorKey: 'NO_SERTIFIKAT',
      sortable: true,
      cell: s =>
        s.NO_SERTIFIKAT ? (
          <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{s.NO_SERTIFIKAT}</span>
        ) : (
          <span className="text-gray-400 italic">belum ada data</span>
        ),
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
      cell: s =>
        API_ENABLED ? (
          <button
            onClick={() => handleSendEmailNotification(s)}
            className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-[11px] rounded-lg transition flex items-center gap-1.5 shadow"
          >
            <Mail className="w-3.5 h-3.5 text-amber-400" />
            <span>Kirim Reminder Email</span>
          </button>
        ) : (
          <span className="text-[10px] text-gray-400">Otomatis via GitHub Actions</span>
        ),
    },
  ];

  const simpanKonfigurasiGithub = () => {
    if (!githubToken.trim()) {
      setSyncStatus('Token GitHub masih kosong.');
      return;
    }
    saveGithubConfig(githubToken, githubRepo);
    setSyncStatus('Token tersimpan di browser ini. Klik Sinkron Sekarang.');
  };

  const sinkronSekarang = async () => {
    setSyncing(true);
    try {
      saveGithubConfig(githubToken, githubRepo);
      const result = await syncEmailDataToGithub(personilList, pelatihanList, sertifikasiList);
      setSyncStatus(`Berhasil: ${result.message} pukul ${result.updatedAt}.`);
    } catch (error: any) {
      setSyncStatus(`Gagal: ${error?.message || String(error)}`);
    } finally {
      setSyncing(false);
    }
  };

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
            Monitoring otomatis sertifikat kedaluwarsa, sisa hari &lt;90 hari, dan analisis sertifikasi wajib pegawai.
          </p>
        </div>
        <button
          onClick={() => downloadEmailData(personilList, pelatihanList, sertifikasiList)}
          title="Simpan ke root repo sebagai email-data.json, lalu commit+push agar email memakai data web ini"
          className="shrink-0 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] rounded-xl flex items-center gap-2 shadow"
        >
          <Download className="w-4 h-4 text-amber-400" />
          Unduh Data Email
        </button>
      </div>

      {/* SINKRON DATA WEB -> GITHUB (sumber email produksi) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Sinkron Data ke GitHub
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 max-w-2xl leading-relaxed">
              Email dikirim GitHub Actions dari <code>email-data.json</code> di repo. Isi token GitHub di sini —
              data web akan otomatis tersimpan ke repo setiap kali berubah, tanpa unduh manual. Token hanya
              disimpan di browser ini, bukan di server kami.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <input
              type="password"
              value={githubToken}
              onChange={e => setGithubToken(e.target.value)}
              placeholder="GitHub token (Contents: read & write)"
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white min-w-[240px]"
            />
            <input
              value={githubRepo}
              onChange={e => setGithubRepo(e.target.value)}
              placeholder="owner/nama-repo"
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white min-w-[200px]"
            />
            <button
              onClick={simpanKonfigurasiGithub}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] rounded-xl"
            >
              Simpan
            </button>
            <button
              onClick={sinkronSekarang}
              disabled={syncing}
              className="px-3 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white font-bold text-[11px] rounded-xl flex items-center gap-2"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sinkron Sekarang
            </button>
            {githubToken && (
              <button
                onClick={() => {
                  clearGithubConfig();
                  setGithubToken('');
                  setSyncStatus('Token dihapus dari browser ini.');
                }}
                className="px-3 py-2 border border-rose-300 text-rose-600 font-bold text-[11px] rounded-xl"
              >
                Hapus
              </button>
            )}
          </div>
        </div>
        {syncStatus && (
          <div className="mt-3 text-[11px] text-gray-600 dark:text-gray-300 border-t border-slate-100 dark:border-slate-800 pt-2">
            {syncStatus}
          </div>
        )}
      </div>

      {!API_ENABLED && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                Reminder Email Otomatis H-90 Hari
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                Pengiriman dijalankan GitHub Actions setiap hari pukul 08:00 WIB. Tombol kirim manual
                tidak tersedia di domain Vercel karena backend Express tidak di-deploy di sana.
                Isi panel <strong>Sinkron Data ke GitHub</strong> dengan token GitHub agar data web
                otomatis masuk ke <code>email-data.json</code>. <strong>Unduh Data Email</strong>
                hanya cadangan bila akan commit manual.
              </p>
            </div>
          </div>
          <a
            href="https://github.com/mirzanaufalp/Claude-Sertif/actions/workflows/email-reminder.yml"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] rounded-xl text-center"
          >
            Buka GitHub Actions
          </a>
        </div>
      )}

      {/* STATUS LAYANAN EMAIL OTOMATIS H-90 HARI */}
      {API_ENABLED && (
      <div
        className={`p-4 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
          serverOnline === false
            ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
            : serverHealth?.mailer.mode === 'smtp'
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'
              : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl font-bold shadow ${
              serverOnline === false
                ? 'bg-rose-600 text-white'
                : serverHealth?.mailer.mode === 'smtp'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 text-slate-950'
            }`}
          >
            {serverOnline === false ? <ServerOff className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              Reminder Email Otomatis H-{serverHealth?.reminderDays ?? 90} Hari
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
              {serverOnline === false
                ? 'Server email belum aktif. Jalankan "npm run server" (atau "npm run dev:full") agar pengiriman otomatis berjalan.'
                : serverHealth?.mailer.mode === 'dry-run'
                  ? 'Mode DRY RUN: email tidak dikirim sungguhan, hasilnya disimpan sebagai file .eml di server/data/outbox. Isi SMTP di .env untuk kirim nyata.'
                  : serverHealth?.mailer.mode === 'ethereal'
                    ? `Mode ETHEREAL: email dikirim lewat SMTP uji (${serverHealth.mailer.host}). Buka link preview untuk melihat isi email yang terkirim.`
                    : `SMTP aktif melalui ${serverHealth?.mailer.host}. Cron harian ${serverHealth?.cron.schedule} (${serverHealth?.cron.timezone})${
                        serverHealth?.auto?.enabled
                          ? `, plus cek otomatis tiap ${serverHealth.auto.intervalMinutes} menit dan saat server start`
                          : ''
                      }.`}
              {serverOnline !== false && serverHealth
                ? ` Terakhir kirim: ${serverHealth.lastRun.at ? `${serverHealth.lastRun.sent} email` : 'belum ada'}.`
                : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshServerStatus}
            disabled={sending}
            className="p-2 rounded-xl bg-white/70 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-white transition disabled:opacity-50"
            title="Segarkan status server email"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleSendAllDue}
            disabled={sending || serverOnline === false}
            className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-[11px] rounded-xl shadow flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Send className="w-3.5 h-3.5 text-amber-400" />}
            <span>{sending ? 'Mengirim...' : 'Kirim Semua Reminder Jatuh Tempo'}</span>
          </button>
        </div>
      </div>
      )}

      {serverHealth && serverHealth.mailer.mode !== 'smtp' && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Uji Jendela H-90 (Simulasi Tanggal)</h3>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Pilih tanggal untuk melihat sertifikat mana yang akan masuk periode reminder H-90 pada tanggal tersebut.
            Tombol kirim hanya tersedia saat mode dry-run/Ethereal.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={simDate}
              onChange={event => setSimDate(event.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-800 dark:text-gray-100"
            />
            <button
              onClick={handlePreviewH90}
              disabled={sending || !simDate}
              className="px-3 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-100 font-bold text-[11px] rounded-xl border border-gray-200 dark:border-slate-700 transition disabled:opacity-50"
            >
              Lihat Preview
            </button>
            <button
              onClick={handleSendH90}
              disabled={sending || !simDate || serverOnline === false}
              className="px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-[11px] rounded-xl shadow flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Send className="w-3.5 h-3.5 text-amber-400" />}
              <span>Kirim Simulasi</span>
            </button>
          </div>
          {simInfo && <div className="text-[11px] font-bold text-blue-800 dark:text-blue-300">{simInfo}</div>}
          {simPreviewUrl && (
            <a
              href={simPreviewUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold underline text-blue-800 dark:text-blue-300"
            >
              Buka preview email simulasi
            </a>
          )}
          {simPreviewList.length > 0 && (
            <div className="max-h-52 overflow-auto rounded-xl border border-gray-200 dark:border-slate-800">
              <table className="w-full text-[11px]">
                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="text-left px-2 py-1.5">Nama</th>
                    <th className="text-left px-2 py-1.5">Jenis</th>
                    <th className="text-left px-2 py-1.5">Kedaluwarsa</th>
                    <th className="text-right px-2 py-1.5">Sisa</th>
                  </tr>
                </thead>
                <tbody>
                  {simPreviewList.map(item => (
                    <tr key={item.key} className="border-t border-gray-100 dark:border-slate-800 text-gray-700 dark:text-gray-200">
                      <td className="px-2 py-1.5 font-semibold">{item.nama}</td>
                      <td className="px-2 py-1.5">{item.jenis}</td>
                      <td className="px-2 py-1.5">{item.tanggalExpired}</td>
                      <td className="px-2 py-1.5 text-right font-bold text-amber-700 dark:text-amber-400">{item.daysLeft} hari</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {bulkInfo && (
        <div className="p-3 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold rounded-xl text-center text-xs flex flex-col items-center justify-center gap-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> {bulkInfo}
          </span>
          {bulkPreview && (
            <a
              href={bulkPreview}
              target="_blank"
              rel="noreferrer"
              className="underline font-bold text-blue-800 dark:text-blue-300"
            >
              Buka preview email terkirim
            </a>
          )}
        </div>
      )}

      {sendError && (
        <div className="p-3 bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-300 font-bold rounded-xl text-center text-xs flex items-center justify-center gap-2">
          <XCircle className="w-5 h-5" /> {sendError}
        </div>
      )}

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
                      <td className="p-3 font-mono font-bold text-rose-700 dark:text-rose-400">
                        {s.NO_SERTIFIKAT || <span className="text-gray-400 italic">belum ada data</span>}
                      </td>
                      <td className="p-3 font-bold text-gray-900 dark:text-white">{owner?.NAMA || 'Pegawai'}</td>
                      <td className="p-3 font-bold">{getLookupName('SRT', s.JENIS_SERTIFIKASI)} ({s.JENIS_SERTIFIKASI})</td>
                      <td className="p-3 font-mono text-rose-600 dark:text-rose-400 font-bold">{s.TANGGAL_EXPIRED}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800 border border-rose-300">
                          ðŸ”´ EXPIRED
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

      {/* 3. TABLE: PEGAWAI BELUM MEMILIKI SERTIFIKASI WAJIB (DENGAN ANALISIS LENGKAP) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-300">
            <UserX className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Pegawai Belum Memiliki Sertifikasi Wajib</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Sudah Dimiliki
            </span>
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Belum Dimiliki
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-slate-800">
                <th className="p-3">ID Personil</th>
                <th className="p-3">Nama Pegawai</th>
                <th className="p-3">Jabatan & Divisi</th>
                <th className="p-3">Analisis Kepemilikan Sertifikasi Wajib</th>
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
                missingCertList.map(({ owner, owned, missing }) => (
                  <tr key={owner.ID_PERSONIL || owner.NAMA} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-gray-600 dark:text-gray-400">
                      {owner.ID_PERSONIL || '-'}
                    </td>
                    <td className="p-3 font-bold text-gray-900 dark:text-white">{owner.NAMA}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-300">
                      {owner.JABATAN || '-'} {owner.DIVISI_DEPARTEMEN ? `- ${getLookupName('DIVDEP', owner.DIVISI_DEPARTEMEN)}` : ''}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Sertifikat yang SUDAH Dimiliki */}
                        {owned.map(cert => (
                          <span
                            key={`owned-${cert}`}
                            className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shadow-sm"
                            title="Sudah Memiliki Sertifikat"
                          >
                            âœ“ {cert}
                          </span>
                        ))}

                        {/* Sertifikat yang BELUM Dimiliki */}
                        {missing.map(cert => (
                          <span
                            key={`missing-${cert}`}
                            className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 flex items-center gap-1"
                            title="Belum Memiliki Sertifikat"
                          >
                            âšª {cert}
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
        title="Kirim Email Reminder Expiry"
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
                {emailModalData.cert?.NO_SERTIFIKAT || 'belum ada data'} ({emailModalData.cert?.JENIS_SERTIFIKASI})
              </span>
            </div>
          </div>

          <div className="p-3 bg-gray-100 dark:bg-slate-800 rounded-xl font-mono text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed border">
            <p>
              <strong>Subjek:</strong> [Reminder H-90 Hari] Sertifikat {emailModalData.cert?.JENIS_SERTIFIKASI} berakhir{' '}
              {formatTanggal(emailModalData.cert?.TANGGAL_EXPIRED)}
            </p>
            <p className="mt-2">Yth. {emailModalData.owner?.NAMA},</p>
            <p className="mt-1">
              Sertifikat Anda ({emailModalData.cert?.NO_SERTIFIKAT}) untuk bidang {emailModalData.cert?.JENIS_SERTIFIKASI} akan berakhir pada tanggal <strong>{emailModalData.cert?.TANGGAL_EXPIRED}</strong>.
            </p>
            <p className="mt-1">Mohon segera mendaftar perpanjangan pelatihan melalui Divisi HRD / K3LH PT ANTAM Tbk.</p>
          </div>

          {serverHealth?.mailer.dryRun && (
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-[11px] font-semibold text-amber-800 dark:text-amber-300 text-center">
              Mode DRY RUN aktif: email disimpan sebagai file .eml, belum dikirim lewat SMTP.
            </div>
          )}

          {emailModalData.sentSuccess && (
            <div className="p-3 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-center flex flex-col items-center justify-center gap-1 animate-bounce">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Email Reminder Berhasil Diproses!
              </span>
              {emailModalData.previewUrl && (
                <a
                  href={emailModalData.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-[11px] text-blue-800"
                >
                  Buka preview email
                </a>
              )}
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
              disabled={sending || emailModalData.sentSuccess}
              className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="w-4 h-4 text-amber-400 animate-spin" /> : <Send className="w-4 h-4 text-amber-400" />}
              <span>{sending ? 'Mengirim...' : 'Kirim Sekarang'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

