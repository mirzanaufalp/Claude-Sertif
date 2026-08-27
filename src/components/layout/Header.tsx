import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  Search,
  Moon,
  Sun,
  Bell,
  UserCheck,
  ShieldAlert,
  Menu,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle }) => {
  const {
    role,
    setRole,
    darkMode,
    setDarkMode,
    searchQuery,
    setSearchQuery,
    sertifikasiList,
    personilList,
    getCertBadgeStatus,
    getDaysRemaining,
    setActiveTab,
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  // Compute notification alerts (Expiring & Expired certs)
  const alertCerts = sertifikasiList
    .map(cert => {
      const status = getCertBadgeStatus(cert);
      const days = getDaysRemaining(cert.TANGGAL_EXPIRED);
      const pel = cert.ID_PELATIHAN;
      const owner = personilList.find(p => p.ID_PERSONIL === cert.ID_SERTIFIKASI.slice(7, 11) || cert.ID_SERTIFIKASI.includes(p.ID_PERSONIL));
      return { cert, status, days, ownerName: owner ? owner.NAMA : 'Pegawai' };
    })
    .filter(item => item.status === 'AKAN_EXPIRED' || item.status === 'EXPIRED');

  const roles: UserRole[] = ['Administrator', 'HRD', 'Supervisor', 'Pegawai'];

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-gray-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button & Search */}
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Global Quick Search */}
          <div className="relative w-full max-w-md hidden sm:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari ID Personil, Nama, No. Sertifikat, Jabatan, Divisi..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-gray-100 dark:bg-slate-800/80 border border-transparent focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Role Selector, Dark Mode, Notifications, User Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden md:inline">{role}</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 py-1 z-50 animate-fade-in">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 border-b border-gray-100 dark:border-slate-800">
                  Simulasi Hak Akses
                </div>
                {roles.map(r => (
                  <button
                    key={r}
                    onClick={() => {
                      setRole(r);
                      setShowRoleDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 transition ${
                      role === r ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/30' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>{r}</span>
                    {role === r && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(prev => !prev)}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition relative"
              title="Notifikasi Expiry Sertifikat"
            >
              <Bell className="w-4 h-4" />
              {alertCerts.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {alertCerts.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-800 p-3 z-50 animate-fade-in">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-gray-200">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    Peringatan Masa Berlaku ({alertCerts.length})
                  </div>
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      setActiveTab('reminder');
                    }}
                    className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Lihat Semua &rarr;
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 py-1 space-y-1">
                  {alertCerts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1 opacity-75" />
                      Semua sertifikat dalam kondisi aman.
                    </div>
                  ) : (
                    alertCerts.map(({ cert, status, days }, idx) => (
                      <div key={idx} className="py-2 text-xs flex items-start gap-2">
                        {status === 'EXPIRED' ? (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white flex justify-between">
                            <span>Sertifikat {cert.JENIS_SERTIFIKASI}</span>
                            <span className="font-mono text-[10px] text-gray-400">{cert.NO_SERTIFIKAT}</span>
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5">
                            {status === 'EXPIRED'
                              ? `Telah expired sejak ${cert.TANGGAL_EXPIRED}`
                              : `Akan expired dalam ${days} hari (${cert.TANGGAL_EXPIRED})`}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="hidden lg:flex items-center gap-2.5 pl-3 border-l border-gray-200 dark:border-slate-800">
            <img
              src="/Logo%20Antam%20SVG.svg"
              alt="PT ANTAM Tbk"
              className="h-8 w-auto object-contain shrink-0"
            />
            <div className="text-left leading-tight">
              <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-400">Status Akses</p>
              <p className="text-xs font-bold text-blue-900 dark:text-blue-300">{role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
