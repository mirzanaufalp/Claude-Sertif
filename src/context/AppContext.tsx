import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  MstKategori,
  MstLookup,
  TrxPersonil,
  TrxPelatihan,
  TrxSertifikasi,
  CertBadgeStatus,
  UserRole,
  AuditLog,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_LOOKUPS,
  INITIAL_PERSONIL,
  INITIAL_PELATIHAN,
  INITIAL_SERTIFIKASI,
} from '../data/initialData';

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  categories: MstKategori[];
  lookups: MstLookup[];
  personilList: TrxPersonil[];
  pelatihanList: TrxPelatihan[];
  sertifikasiList: TrxSertifikasi[];
  auditLogs: AuditLog[];

  // CRUD Operations
  addPersonil: (item: Omit<TrxPersonil, 'ID_PERSONIL'> & { ID_PERSONIL?: string }) => void;
  updatePersonil: (id: string, item: Partial<TrxPersonil>) => void;
  deletePersonil: (id: string) => void;

  addPelatihan: (item: Omit<TrxPelatihan, 'ID_PELATIHAN'> & { ID_PELATIHAN?: string }) => void;
  updatePelatihan: (id: string, item: Partial<TrxPelatihan>) => void;
  deletePelatihan: (id: string) => void;

  addSertifikasi: (item: Omit<TrxSertifikasi, 'ID_SERTIFIKASI'> & { ID_SERTIFIKASI?: string }) => void;
  updateSertifikasi: (id: string, item: Partial<TrxSertifikasi>) => void;
  deleteSertifikasi: (id: string) => void;

  generateSertifikasiFromPelatihan: (idPelatihan: string) => void;

  addLookup: (lookup: Omit<MstLookup, 'ID_LOOKUP'>) => void;
  updateLookup: (id: string, lookup: Partial<MstLookup>) => void;
  deleteLookup: (id: string) => void;

  resetToDefaultData: () => void;
  addAuditLog: (action: string, details: string) => void;

  // Utility helpers
  getCertBadgeStatus: (cert: TrxSertifikasi | undefined) => CertBadgeStatus;
  getDaysRemaining: (expiryDateStr: string) => number | null;
  getLookupName: (kategori: string, kode: string) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('Administrator');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sertif_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Persisted state with auto-migration from PPP to POP
  const [categories] = useState<MstKategori[]>(INITIAL_CATEGORIES);
  
  const [lookups, setLookups] = useState<MstLookup[]>(() => {
    const saved = localStorage.getItem('sertif_lookups');
    const data: MstLookup[] = saved ? JSON.parse(saved) : INITIAL_LOOKUPS;
    return data.map(l => (l.KODE === 'PPP' ? { ...l, KODE: 'POP' } : l));
  });

  const [personilList, setPersonilList] = useState<TrxPersonil[]>(() => {
    const saved = localStorage.getItem('sertif_personil');
    return saved ? JSON.parse(saved) : INITIAL_PERSONIL;
  });

  const [pelatihanList, setPelatihanList] = useState<TrxPelatihan[]>(() => {
    const saved = localStorage.getItem('sertif_pelatihan');
    return saved ? JSON.parse(saved) : INITIAL_PELATIHAN;
  });

  const [sertifikasiList, setSertifikasiList] = useState<TrxSertifikasi[]>(() => {
    const saved = localStorage.getItem('sertif_sertifikasi');
    const data: TrxSertifikasi[] = saved ? JSON.parse(saved) : INITIAL_SERTIFIKASI;
    return data.map(s => ({
      ...s,
      JENIS_SERTIFIKASI: s.JENIS_SERTIFIKASI === 'PPP' ? 'POP' : s.JENIS_SERTIFIKASI,
      NO_SERTIFIKAT: s.NO_SERTIFIKAT ? s.NO_SERTIFIKAT.replace(/PPP/g, 'POP') : s.NO_SERTIFIKAT,
      DOK_SERTIFIKAT: s.DOK_SERTIFIKAT ? s.DOK_SERTIFIKAT.replace(/ppp/g, 'pop') : s.DOK_SERTIFIKAT,
    }));
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('sertif_audit_logs');
    return saved ? JSON.parse(saved) : [
      {
        id: 'LOG-001',
        timestamp: new Date().toLocaleString('id-ID'),
        userRole: 'Administrator',
        action: 'INITIALIZE_SYSTEM',
        details: 'Sistem Pendataan Pelatihan & Sertifikasi Karyawan Tambang berhasil diinisialisasi.'
      }
    ];
  });

  // Sync dark mode class with <html>
  useEffect(() => {
    localStorage.setItem('sertif_dark_mode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('sertif_lookups', JSON.stringify(lookups));
  }, [lookups]);

  useEffect(() => {
    localStorage.setItem('sertif_personil', JSON.stringify(personilList));
  }, [personilList]);

  useEffect(() => {
    localStorage.setItem('sertif_pelatihan', JSON.stringify(pelatihanList));
  }, [pelatihanList]);

  useEffect(() => {
    localStorage.setItem('sertif_sertifikasi', JSON.stringify(sertifikasiList));
  }, [sertifikasiList]);

  useEffect(() => {
    localStorage.setItem('sertif_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const addAuditLog = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userRole: role,
      action,
      details,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const getDaysRemaining = (expiryDateStr: string): number | null => {
    if (!expiryDateStr) return null;
    const today = new Date();
    const expiry = new Date(expiryDateStr);
    const diff = expiry.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getCertBadgeStatus = (cert: TrxSertifikasi | undefined): CertBadgeStatus => {
    if (!cert) return 'BELUM_ADA';
    if (cert.STATUS_SERTIFIKASI === 'EXPIRED') return 'EXPIRED';
    
    const days = getDaysRemaining(cert.TANGGAL_EXPIRED);
    if (days === null) return 'BELUM_ADA';
    if (days < 0) return 'EXPIRED';
    if (days <= 90) return 'AKAN_EXPIRED';
    return 'AKTIF';
  };

  const getLookupName = (kategori: string, kode: string): string => {
    const match = lookups.find(l => l.KATEGORI === kategori && l.KODE === kode);
    return match ? match.NAMA : kode;
  };

  // Personil CRUD
  const addPersonil = (item: Omit<TrxPersonil, 'ID_PERSONIL'> & { ID_PERSONIL?: string }) => {
    const id = item.ID_PERSONIL || Math.floor(1000 + Math.random() * 9000).toString();
    const newItem: TrxPersonil = { ...item, ID_PERSONIL: id };
    setPersonilList(prev => [newItem, ...prev]);
    addAuditLog('TAMBAH_PERSONIL', `Menambahkan pegawai baru: ${newItem.NAMA} (ID: ${newItem.ID_PERSONIL})`);
  };

  const updatePersonil = (id: string, item: Partial<TrxPersonil>) => {
    setPersonilList(prev => prev.map(p => p.ID_PERSONIL === id ? { ...p, ...item } : p));
    addAuditLog('EDIT_PERSONIL', `Mengubah data pegawai ID: ${id}`);
  };

  const deletePersonil = (id: string) => {
    const target = personilList.find(p => p.ID_PERSONIL === id);
    setPersonilList(prev => prev.filter(p => p.ID_PERSONIL !== id));
    // Also delete linked training & certs
    const linkedTrainings = pelatihanList.filter(t => t.ID_PERSONIL === id).map(t => t.ID_PELATIHAN);
    setPelatihanList(prev => prev.filter(t => t.ID_PERSONIL !== id));
    setSertifikasiList(prev => prev.filter(s => !linkedTrainings.includes(s.ID_PELATIHAN)));
    addAuditLog('HAPUS_PERSONIL', `Menghapus pegawai ${target?.NAMA || id}`);
  };

  // Pelatihan CRUD
  const addPelatihan = (item: Omit<TrxPelatihan, 'ID_PELATIHAN'> & { ID_PELATIHAN?: string }) => {
    const id = item.ID_PELATIHAN || `PLTHN${item.JENIS_PELATIHAN}${item.ID_PERSONIL}${Math.floor(1000 + Math.random() * 9000)}`;
    const newItem: TrxPelatihan = { ...item, ID_PELATIHAN: id };
    setPelatihanList(prev => [newItem, ...prev]);
    addAuditLog('TAMBAH_PELATIHAN', `Menambahkan pelatihan ${newItem.JENIS_PELATIHAN} untuk Pegawai ID: ${newItem.ID_PERSONIL}`);
  };

  const updatePelatihan = (id: string, item: Partial<TrxPelatihan>) => {
    setPelatihanList(prev => prev.map(p => p.ID_PELATIHAN === id ? { ...p, ...item } : p));
    addAuditLog('EDIT_PELATIHAN', `Mengubah data pelatihan ID: ${id}`);
  };

  const deletePelatihan = (id: string) => {
    setPelatihanList(prev => prev.filter(p => p.ID_PELATIHAN !== id));
    setSertifikasiList(prev => prev.filter(s => s.ID_PELATIHAN !== id));
    addAuditLog('HAPUS_PELATIHAN', `Menghapus pelatihan ID: ${id}`);
  };

  // Sertifikasi CRUD
  const addSertifikasi = (item: Omit<TrxSertifikasi, 'ID_SERTIFIKASI'> & { ID_SERTIFIKASI?: string }) => {
    const id = item.ID_SERTIFIKASI || `SERT${item.JENIS_SERTIFIKASI}${Date.now().toString().slice(-6)}`;
    const newItem: TrxSertifikasi = { ...item, ID_SERTIFIKASI: id };
    setSertifikasiList(prev => [newItem, ...prev]);
    addAuditLog('TAMBAH_SERTIFIKASI', `Menambahkan sertifikasi ${newItem.NO_SERTIFIKAT} (${newItem.JENIS_SERTIFIKASI})`);
  };

  const updateSertifikasi = (id: string, item: Partial<TrxSertifikasi>) => {
    setSertifikasiList(prev => prev.map(s => s.ID_SERTIFIKASI === id ? { ...s, ...item } : s));
    addAuditLog('EDIT_SERTIFIKASI', `Mengubah sertifikasi ID: ${id}`);
  };

  const deleteSertifikasi = (id: string) => {
    setSertifikasiList(prev => prev.filter(s => s.ID_SERTIFIKASI !== id));
    addAuditLog('HAPUS_SERTIFIKASI', `Menghapus sertifikasi ID: ${id}`);
  };

  // Auto Generate Sertifikasi
  const generateSertifikasiFromPelatihan = (idPelatihan: string) => {
    const pel = pelatihanList.find(p => p.ID_PELATIHAN === idPelatihan);
    if (!pel) return;

    // Map Jenis Pelatihan to Sertifikasi Kode
    let jenisSert = 'POP';
    if (pel.JENIS_PELATIHAN === 'POP') jenisSert = 'POP';
    else if (pel.JENIS_PELATIHAN === 'POM') jenisSert = 'POM';
    else if (pel.JENIS_PELATIHAN === 'POU') jenisSert = 'POU';
    else if (pel.JENIS_PELATIHAN === 'SMKP') jenisSert = 'SMKP';
    else if (pel.JENIS_PELATIHAN === 'CP') jenisSert = 'CP';

    const startDate = pel.TANGGAL_SELESAI || new Date().toISOString().split('T')[0];
    const expDateObj = new Date(startDate);
    expDateObj.setFullYear(expDateObj.getFullYear() + 5); // 5 Years validity
    const expDate = expDateObj.toISOString().split('T')[0];

    const newSert: TrxSertifikasi = {
      ID_SERTIFIKASI: `SERT${jenisSert}${pel.ID_PERSONIL}${Math.floor(100 + Math.random() * 900)}`,
      ID_PELATIHAN: pel.ID_PELATIHAN,
      JENIS_SERTIFIKASI: jenisSert,
      NO_SERTIFIKAT: `${jenisSert}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      TANGGAL_MULAI: startDate,
      TANGGAL_EXPIRED: expDate,
      STATUS_SERTIFIKASI: 'LULUS',
      DOK_SERTIFIKAT: pel.DOK_PELATIHAN || 'sertifikat_generated.pdf',
    };

    setSertifikasiList(prev => [newSert, ...prev]);
    addAuditLog('GENERATE_SERTIFIKASI', `Otomatis generate sertifikasi ${newSert.NO_SERTIFIKAT} dari Pelatihan ID: ${idPelatihan}`);
  };

  // Master Lookup CRUD
  const addLookup = (lookup: Omit<MstLookup, 'ID_LOOKUP'>) => {
    const id = `LKP-${lookup.KATEGORI}-${Date.now().toString().slice(-4)}`;
    const newLookup: MstLookup = { ...lookup, ID_LOOKUP: id };
    setLookups(prev => [...prev, newLookup]);
    addAuditLog('TAMBAH_MASTER_LOOKUP', `Menambahkan master lookup: ${newLookup.NAMA} (${newLookup.KATEGORI})`);
  };

  const updateLookup = (id: string, lookup: Partial<MstLookup>) => {
    setLookups(prev => prev.map(l => l.ID_LOOKUP === id ? { ...l, ...lookup } : l));
    addAuditLog('EDIT_MASTER_LOOKUP', `Mengubah master lookup ID: ${id}`);
  };

  const deleteLookup = (id: string) => {
    setLookups(prev => prev.filter(l => l.ID_LOOKUP !== id));
    addAuditLog('HAPUS_MASTER_LOOKUP', `Menghapus master lookup ID: ${id}`);
  };

  const resetToDefaultData = () => {
    setLookups(INITIAL_LOOKUPS);
    setPersonilList(INITIAL_PERSONIL);
    setPelatihanList(INITIAL_PELATIHAN);
    setSertifikasiList(INITIAL_SERTIFIKASI);
    localStorage.removeItem('sertif_lookups');
    localStorage.removeItem('sertif_personil');
    localStorage.removeItem('sertif_pelatihan');
    localStorage.removeItem('sertif_sertifikasi');
    addAuditLog('RESET_DATABASE', 'Mereset seluruh data ke data sampel bawaan.');
  };

  return (
    <AppContext.Provider
      value={{
        role, setRole,
        darkMode, setDarkMode,
        activeTab, setActiveTab,
        searchQuery, setSearchQuery,
        categories,
        lookups,
        personilList,
        pelatihanList,
        sertifikasiList,
        auditLogs,
        addPersonil, updatePersonil, deletePersonil,
        addPelatihan, updatePelatihan, deletePelatihan,
        addSertifikasi, updateSertifikasi, deleteSertifikasi,
        generateSertifikasiFromPelatihan,
        addLookup, updateLookup, deleteLookup,
        resetToDefaultData, addAuditLog,
        getCertBadgeStatus, getDaysRemaining, getLookupName
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
