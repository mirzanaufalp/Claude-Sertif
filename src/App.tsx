import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { PersonilView } from './components/views/PersonilView';
import { PelatihanView } from './components/views/PelatihanView';
import { SertifikasiView } from './components/views/SertifikasiView';
import { MasterDataView } from './components/views/MasterDataView';
import { ReminderView } from './components/views/ReminderView';
import { LaporanView } from './components/views/LaporanView';
import { AuditLogView } from './components/views/AuditLogView';

const MainLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { activeTab } = useApp();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
      {/* Sidebar Component */}
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
        {/* Sticky Header */}
        <Header onMobileMenuToggle={() => setMobileMenuOpen(prev => !prev)} />

        {/* View Router Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'personil' && <PersonilView />}
          {activeTab === 'pelatihan' && <PelatihanView />}
          {activeTab === 'sertifikasi' && <SertifikasiView />}
          {activeTab === 'master' && <MasterDataView />}
          {activeTab === 'reminder' && <ReminderView />}
          {activeTab === 'laporan' && <LaporanView />}
          {activeTab === 'audit' && <AuditLogView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
