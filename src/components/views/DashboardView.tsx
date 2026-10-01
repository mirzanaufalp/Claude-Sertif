import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AntamLogo } from '../common/AntamLogo';
import {
  Users,
  GraduationCap,
  Award,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

export const DashboardView: React.FC = () => {
  const {
    personilList,
    pelatihanList,
    sertifikasiList,
    getCertBadgeStatus,
    getDaysRemaining,
    getLookupName,
    setActiveTab,
    lookups,
  } = useApp();

  const [selectedTimelineEmpId, setSelectedTimelineEmpId] = useState<string>(
    personilList[0]?.ID_PERSONIL || '8632'
  );

  // 1. Calculate Stat Cards Metrics
  const totalPegawai = personilList.length;
  const totalPelatihanBerjalan = pelatihanList.filter(p => p.STATUS_PELATIHAN === 'BERJALAN').length;
  const totalPelatihanSelesai = pelatihanList.filter(p => p.STATUS_PELATIHAN === 'SELESAI').length;
  const totalSertifikasiAktif = sertifikasiList.filter(c => getCertBadgeStatus(c) === 'AKTIF').length;
  const totalAkanExpired = sertifikasiList.filter(c => getCertBadgeStatus(c) === 'AKAN_EXPIRED').length;
  const totalExpired = sertifikasiList.filter(c => getCertBadgeStatus(c) === 'EXPIRED').length;

  // Function to count personil missing a specific cert type
  const countMissingCert = (certCode: string) => {
    return personilList.filter(p => {
      const pCerts = sertifikasiList.filter(
        c =>
          (c.ID_SERTIFIKASI.includes(p.ID_PERSONIL) ||
            pelatihanList.find(pl => pl.ID_PELATIHAN === c.ID_PELATIHAN)?.ID_PERSONIL === p.ID_PERSONIL) &&
          c.JENIS_SERTIFIKASI === certCode
      );
      return !pCerts.some(c => getCertBadgeStatus(c) === 'AKTIF' || getCertBadgeStatus(c) === 'AKAN_EXPIRED');
    }).length;
  };

  const missingPOP = countMissingCert('POP');
  const missingPOM = countMissingCert('POM');
  const missingPOU = countMissingCert('POU');
  const missingSMKP = countMissingCert('SMKP');
  const missingCP = countMissingCert('CP');

  // 2. Pie Chart Data: Palet warna harmonis & kontras
  const pieData = [
    { name: 'POP (Pertama)', value: sertifikasiList.filter(c => c.JENIS_SERTIFIKASI === 'POP').length, color: '#2563eb' }, // Royal Blue
    { name: 'POM (Madya)', value: sertifikasiList.filter(c => c.JENIS_SERTIFIKASI === 'POM').length, color: '#0d9488' },   // Teal
    { name: 'POU (Utama)', value: sertifikasiList.filter(c => c.JENIS_SERTIFIKASI === 'POU').length, color: '#7c3aed' },   // Deep Violet
    { name: 'SMKP', value: sertifikasiList.filter(c => c.JENIS_SERTIFIKASI === 'SMKP').length, color: '#f59e0b' },          // Amber
    { name: 'CP (Competent Person)', value: sertifikasiList.filter(c => c.JENIS_SERTIFIKASI === 'CP').length, color: '#10b981' }, // Emerald
  ];

  // 3. Bar Chart Data: Jumlah Pegawai per Divisi
  const divLookups = lookups.filter(l => l.KATEGORI === 'DIVDEP');
  const barData = divLookups.map(d => {
    const count = personilList.filter(p => p.DIVISI_DEPARTEMEN === d.KODE).length;
    return {
      division: d.KODE,
      fullName: d.NAMA,
      JumlahPegawai: count,
    };
  });

  // 4. Line Chart Data: Tren Pelatihan Bulanan
  const lineData = [
    { month: 'Jan', Pelatihan: 2 },
    { month: 'Feb', Pelatihan: 3 },
    { month: 'Mar', Pelatihan: 1 },
    { month: 'Apr', Pelatihan: 4 },
    { month: 'Mei', Pelatihan: 2 },
    { month: 'Jun', Pelatihan: 5 },
    { month: 'Jul', Pelatihan: pelatihanList.length },
    { month: 'Agu', Pelatihan: 3 },
  ];

  // Timeline computation for selected employee
  const selectedEmp = personilList.find(p => p.ID_PERSONIL === selectedTimelineEmpId);
  const getEmpCertStatus = (certCode: string) => {
    if (!selectedEmp) return 'BELUM_ADA';
    const c = sertifikasiList.find(
      s =>
        (s.ID_SERTIFIKASI.includes(selectedEmp.ID_PERSONIL) ||
          pelatihanList.find(pl => pl.ID_PELATIHAN === s.ID_PELATIHAN)?.ID_PERSONIL === selectedEmp.ID_PERSONIL) &&
        s.JENIS_SERTIFIKASI === certCode
    );
    return getCertBadgeStatus(c);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-3">
            <AntamLogo size="sm" showText={false} className="bg-white/95 px-2 py-1 rounded-lg shadow" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-800/80 text-amber-400 font-extrabold text-xs border border-blue-700/50">
              <ShieldCheck className="w-4 h-4" /> PT ANTAM TBK
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight pt-1">
            Sistem Pendataan Pelatihan & Sertifikasi Pegawai Tambang
          </h2>
          <p className="text-xs text-blue-200/90 max-w-xl">
            Monitoring masa berlaku sertifikat operasional pertambangan PT ANTAM Tbk (POP, POM, POU, SMKP, CP) secara terpusat & real-time.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('reminder')}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg flex items-center gap-2 shrink-0 z-10"
        >
          <span>Pusat Reminder Expiry</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 11 STAT CARDS GRID */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-3">
          11 Indikator Utama (Stat Cards)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Total Pegawai */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-500 dark:text-gray-400">
              <span>Total Pegawai</span>
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-black text-gray-900 dark:text-white mt-2">{totalPegawai}</div>
            <p className="text-[10px] text-gray-400 mt-1">Pegawai terdata</p>
          </div>

          {/* Card 2: Pelatihan Berjalan */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-500 dark:text-gray-400">
              <span>Pelatihan Berjalan</span>
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{totalPelatihanBerjalan}</div>
            <p className="text-[10px] text-gray-400 mt-1">Status BERJALAN</p>
          </div>

          {/* Card 3: Pelatihan Selesai */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-500 dark:text-gray-400">
              <span>Pelatihan Selesai</span>
              <GraduationCap className="w-4 h-4 text-teal-500" />
            </div>
            <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-2">{totalPelatihanSelesai}</div>
            <p className="text-[10px] text-gray-400 mt-1">Siap generate sertifikat</p>
          </div>

          {/* Card 4: Sertifikasi Aktif */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <span>Sertifikasi Aktif</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{totalSertifikasiAktif}</div>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">🟢 Masa berlaku normal</p>
          </div>

          {/* Card 5: Akan Expired (<90 hari) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200 dark:border-amber-950 bg-amber-50/20 dark:bg-amber-950/10 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs font-semibold text-amber-700 dark:text-amber-400">
              <span>Akan Expired</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{totalAkanExpired}</div>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-1">🟡 Kurang dari 90 hari</p>
          </div>

          {/* Card 6: Expired */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-200 dark:border-rose-950 bg-rose-50/20 dark:bg-rose-950/10 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs font-semibold text-rose-700 dark:text-rose-400">
              <span>Expired</span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">{totalExpired}</div>
            <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-1">🔴 Habis masa berlaku</p>
          </div>
        </div>

        {/* Missing Mandatory Certificates Stat Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm text-center">
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Belum Memiliki POP</div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-200 mt-0.5">{missingPOP} orang</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm text-center">
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Belum Memiliki POM</div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-200 mt-0.5">{missingPOM} orang</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm text-center">
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Belum Memiliki POU</div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-200 mt-0.5">{missingPOU} orang</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm text-center">
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Belum Memiliki SMKP</div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-200 mt-0.5">{missingSMKP} orang</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm text-center col-span-2 sm:col-span-1">
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Belum Memiliki CP</div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-200 mt-0.5">{missingCP} orang</div>
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart: Sertifikasi per Jenis */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Proporsi Jenis Sertifikasi</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">POP, POM, POU, SMKP, Competent Person</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    boxShadow: '0 8px 16px -2px rgba(0, 0, 0, 0.3)',
                    color: '#ffffff',
                  }}
                  itemStyle={{
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                  formatter={(value: any, name: any) => [`${value} orang`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 text-xs">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-slate-800 last:border-none">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600 dark:text-gray-300 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart: Jumlah Pegawai per Divisi */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Jumlah Pegawai per Divisi</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">GGD, MINE, HSE, HRD, ENG</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="division" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    boxShadow: '0 8px 16px -2px rgba(0, 0, 0, 0.3)',
                  }}
                  labelStyle={{
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    marginBottom: '4px',
                  }}
                  itemStyle={{
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${value} orang`, 'Jumlah Pegawai']}
                />
                <Bar dataKey="JumlahPegawai" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Chart: Tren Pelatihan Bulanan */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Tren Pelatihan per Bulan</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Jumlah pelatihan yang diselenggarakan</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    color: '#ffffff',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Line type="monotone" dataKey="Pelatihan" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TIMELINE PROGRESS PPP -> POM -> POU WIDGET */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Timeline Progres Jenjang Sertifikasi (POP → POM → POU)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Pilih pegawai untuk memantau jenjang pengawas operasional pertambangan secara bertahap.
            </p>
          </div>

          <select
            value={selectedTimelineEmpId}
            onChange={e => setSelectedTimelineEmpId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-gray-800 dark:text-gray-200 focus:outline-none"
          >
            {personilList.map((p, idx) => (
              <option
                key={p.ID_PERSONIL ? `${p.ID_PERSONIL}-${idx}` : `emp-${idx}`}
                value={p.ID_PERSONIL || ''}
              >
                {p.NAMA} ({p.ID_PERSONIL || 'Tanpa ID'}) - {getLookupName('DIVDEP', p.DIVISI_DEPARTEMEN)}
              </option>
            ))}
          </select>
        </div>

        {/* Timeline Visualizer */}
        <div className="py-4">
          <div className="grid grid-cols-3 gap-4 relative">
            {/* Step 1: POP */}
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 p-4 rounded-2xl relative text-center">
              <div className="w-8 h-8 rounded-full bg-blue-900 text-amber-400 font-black text-xs flex items-center justify-center mx-auto mb-2 shadow">
                1
              </div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">POP (Pertama)</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Pengawas Operasional Pertama</p>
              <div className="mt-3">
                {getEmpCertStatus('POP') === 'AKTIF' && (
                  <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold rounded-lg text-[10px] border border-emerald-300 dark:border-emerald-800">
                    🟢 LULUS / AKTIF
                  </span>
                )}
                {getEmpCertStatus('POP') === 'AKAN_EXPIRED' && (
                  <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold rounded-lg text-[10px] border border-amber-300 dark:border-amber-800">
                    🟡 AKAN EXPIRED
                  </span>
                )}
                {getEmpCertStatus('POP') === 'EXPIRED' && (
                  <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold rounded-lg text-[10px] border border-rose-300 dark:border-rose-800">
                    🔴 EXPIRED
                  </span>
                )}
                {getEmpCertStatus('POP') === 'BELUM_ADA' && (
                  <span className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-500 font-bold rounded-lg text-[10px] border border-gray-300 dark:border-slate-700">
                    ⚪ BELUM ADA
                  </span>
                )}
              </div>
            </div>

            {/* Step 2: POM */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 p-4 rounded-2xl relative text-center">
              <div className="w-8 h-8 rounded-full bg-indigo-900 text-amber-400 font-black text-xs flex items-center justify-center mx-auto mb-2 shadow">
                2
              </div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">POM (Madya)</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Pengawas Operasional Madya</p>
              <div className="mt-3">
                {getEmpCertStatus('POM') === 'AKTIF' && (
                  <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold rounded-lg text-[10px] border border-emerald-300 dark:border-emerald-800">
                    🟢 LULUS / AKTIF
                  </span>
                )}
                {getEmpCertStatus('POM') === 'AKAN_EXPIRED' && (
                  <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold rounded-lg text-[10px] border border-amber-300 dark:border-amber-800">
                    🟡 AKAN EXPIRED
                  </span>
                )}
                {getEmpCertStatus('POM') === 'EXPIRED' && (
                  <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold rounded-lg text-[10px] border border-rose-300 dark:border-rose-800">
                    🔴 EXPIRED
                  </span>
                )}
                {getEmpCertStatus('POM') === 'BELUM_ADA' && (
                  <span className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-500 font-bold rounded-lg text-[10px] border border-gray-300 dark:border-slate-700">
                    ⚪ BELUM ADA
                  </span>
                )}
              </div>
            </div>

            {/* Step 3: POU */}
            <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 p-4 rounded-2xl relative text-center">
              <div className="w-8 h-8 rounded-full bg-purple-900 text-amber-400 font-black text-xs flex items-center justify-center mx-auto mb-2 shadow">
                3
              </div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">POU (Utama)</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Pengawas Operasional Utama</p>
              <div className="mt-3">
                {getEmpCertStatus('POU') === 'AKTIF' && (
                  <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold rounded-lg text-[10px] border border-emerald-300 dark:border-emerald-800">
                    🟢 LULUS / AKTIF
                  </span>
                )}
                {getEmpCertStatus('POU') === 'AKAN_EXPIRED' && (
                  <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold rounded-lg text-[10px] border border-amber-300 dark:border-amber-800">
                    🟡 AKAN EXPIRED
                  </span>
                )}
                {getEmpCertStatus('POU') === 'EXPIRED' && (
                  <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold rounded-lg text-[10px] border border-rose-300 dark:border-rose-800">
                    🔴 EXPIRED
                  </span>
                )}
                {getEmpCertStatus('POU') === 'BELUM_ADA' && (
                  <span className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-500 font-bold rounded-lg text-[10px] border border-gray-300 dark:border-slate-700">
                    ⚪ BELUM ADA
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
