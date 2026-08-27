export type UserRole = 'Administrator' | 'HRD' | 'Supervisor' | 'Pegawai';

export interface MstKategori {
  KODE: string;
  NAMA: string;
}

export interface MstLookup {
  ID_LOOKUP: string;
  KATEGORI: string; // 'SRT' | 'PLTHN' | 'STSPLTHN' | 'STSSRT' | 'DIVDEP' | 'JBTN' | 'JNSPEG'
  KODE: string;
  NAMA: string;
  STATUS: 'AKTIF' | 'NONAKTIF';
}

export interface TrxPersonil {
  ID_PERSONIL: string;
  NAMA: string;
  JABATAN: string; // Lookup Code
  DIVISI_DEPARTEMEN: string; // Lookup Code
  JENIS_PEGAWAI: string; // Lookup Code
  EMAIL_PERSONIL: string;
  FOTO_PERSONIL: string;
}

export interface TrxPelatihan {
  ID_PELATIHAN: string;
  ID_PERSONIL: string;
  JENIS_PELATIHAN: string; // Lookup Code (POP, POM, POU, SMKP, CP)
  TANGGAL_MULAI: string;
  TANGGAL_SELESAI: string;
  STATUS_PELATIHAN: 'BELUM' | 'BERJALAN' | 'SELESAI';
  DOK_PELATIHAN?: string;
}

export interface TrxSertifikasi {
  ID_SERTIFIKASI: string;
  ID_PELATIHAN: string;
  JENIS_SERTIFIKASI: string; // Lookup Code (POP, POM, POU, SMKP, CP)
  NO_SERTIFIKAT: string;
  TANGGAL_MULAI: string;
  TANGGAL_EXPIRED: string;
  STATUS_SERTIFIKASI: 'LULUS' | 'PROSES' | 'EXPIRED';
  DOK_SERTIFIKAT?: string;
}

export type CertBadgeStatus = 'AKTIF' | 'AKAN_EXPIRED' | 'EXPIRED' | 'BELUM_ADA';

export interface PersonilDetailWithCert extends TrxPersonil {
  certifications: TrxSertifikasi[];
  trainings: TrxPelatihan[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userRole: UserRole;
  action: string;
  details: string;
}
