import React from 'react';
import { useApp } from '../../context/AppContext';
import { AntamLogo } from '../common/AntamLogo';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Award,
  Database,
  Bell,
  FileSpreadsheet,
  History,
  ShieldCheck,
  X,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
  const { activeTab, setActiveTab, role, sertifikasiList, getCertBadgeStatus } = useApp();

  // Expiry alert count badge for Reminder item
  const alertCount = sertifikasiList.filter(c => {
    const st = getCertBadgeStatus(c);
    return st === 'AKAN_EXPIRED' || st === 'EXPIRED';
  }).length;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Analytics', icon: LayoutDashboard, roleAccess: ['Administrator', 'HRD', 'Supervisor', 'Pegawai'] },
    { id: 'personil', label: 'Data Personil', icon: Users, roleAccess: ['Administrator', 'HRD', 'Supervisor', 'Pegawai'] },
    { id: 'pelatihan', label: 'Pelatihan', icon: GraduationCap, roleAccess: ['Administrator', 'HRD', 'Supervisor', 'Pegawai'] },
    { id: 'sertifikasi', label: 'Sertifikasi', icon: Award, roleAccess: ['Administrator', 'HRD', 'Supervisor', 'Pegawai'] },
    { id: 'master', label: 'Master Data', icon: Database, roleAccess: ['Administrator', 'HRD'] },
    { id: 'reminder', label: 'Reminder & Expiry', icon: Bell, badge: alertCount > 0 ? alertCount : null, roleAccess: ['Administrator', 'HRD', 'Supervisor'] },
    { id: 'laporan', label: 'Laporan & Export', icon: FileSpreadsheet, roleAccess: ['Administrator', 'HRD', 'Supervisor'] },
    { id: 'audit', label: 'Audit Log', icon: History, roleAccess: ['Administrator'] },
  ];

  const allowedItems = menuItems.filter(item => item.roleAccess.includes(role));

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    onMobileClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header with PT ANTAM Tbk Logo */}
        <div className="h-16 px-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-emerald-50/40 dark:bg-slate-900">
          <AntamLogo size="md" showText={true} />
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Role Banner */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-800/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-400 tracking-wider">
              Akses Mode
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {role}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {allowedItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition group ${
                  isActive
                    ? 'bg-blue-900 text-white shadow-lg shadow-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800/70 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition ${
                      isActive ? 'text-amber-400' : 'text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-600 text-white animate-pulse">
                    {item.badge}
                  </span>
                ) : (
                  isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 text-[10px] text-center text-gray-400 dark:text-slate-500">
          <p className="font-bold text-gray-600 dark:text-gray-400">PT ANTAM Tbk Enterprise v2.0</p>
          <p className="mt-0.5">MIND ID Mining Industry</p>
        </div>
      </aside>
    </>
  );
};
