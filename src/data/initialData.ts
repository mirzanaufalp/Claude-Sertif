import { MstKategori, MstLookup, TrxPersonil, TrxPelatihan, TrxSertifikasi } from '../types';
import { SEED_PERSONIL, SEED_PELATIHAN, SEED_SERTIFIKASI } from './seedFromExcel';

export const INITIAL_CATEGORIES: MstKategori[] = [
  { KODE: 'SRT', NAMA: 'SERTIFIKASI' },
  { KODE: 'DIVDEP', NAMA: 'DIVISI_DEPARTEMEN' },
  { KODE: 'JNSPEG', NAMA: 'JENIS_PEGAWAI' },
  { KODE: 'JBTN', NAMA: 'JABATAN' },
  { KODE: 'PLTHN', NAMA: 'PELATIHAN' },
  { KODE: 'STSPLTHN', NAMA: 'STATUS_PELATIHAN' },
  { KODE: 'STSSRT', NAMA: 'STATUS_SERTIFIKASI' },
];

export const INITIAL_LOOKUPS: MstLookup[] = [
  // Kategori SRT (Sertifikasi)
  { ID_LOOKUP: 'LKP-SRT-01', KATEGORI: 'SRT', KODE: 'POP', NAMA: 'Pengawas Operasional Pertama', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-SRT-02', KATEGORI: 'SRT', KODE: 'POM', NAMA: 'Pengawas Operasional Madya', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-SRT-03', KATEGORI: 'SRT', KODE: 'POU', NAMA: 'Pengawas Operasional Utama', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-SRT-04', KATEGORI: 'SRT', KODE: 'SMKP', NAMA: 'Sistem Manajemen Keselamatan Pertambangan', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-SRT-05', KATEGORI: 'SRT', KODE: 'CP', NAMA: 'Competent Person', STATUS: 'AKTIF' },

  // Kategori PLTHN (Pelatihan)
  { ID_LOOKUP: 'LKP-PLT-01', KATEGORI: 'PLTHN', KODE: 'POP', NAMA: 'Pelatihan POP', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-PLT-02', KATEGORI: 'PLTHN', KODE: 'POM', NAMA: 'Pelatihan POM', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-PLT-03', KATEGORI: 'PLTHN', KODE: 'POU', NAMA: 'Pelatihan POU', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-PLT-04', KATEGORI: 'PLTHN', KODE: 'SMKP', NAMA: 'Pelatihan SMKP', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-PLT-05', KATEGORI: 'PLTHN', KODE: 'CP', NAMA: 'Pelatihan Competent Person', STATUS: 'AKTIF' },

  // Kategori STSPLTHN (Status Pelatihan)
  { ID_LOOKUP: 'LKP-STP-01', KATEGORI: 'STSPLTHN', KODE: 'BELUM', NAMA: 'BELUM', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-STP-02', KATEGORI: 'STSPLTHN', KODE: 'BERJALAN', NAMA: 'BERJALAN', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-STP-03', KATEGORI: 'STSPLTHN', KODE: 'SELESAI', NAMA: 'SELESAI', STATUS: 'AKTIF' },

  // Kategori STSSRT (Status Sertifikasi)
  { ID_LOOKUP: 'LKP-STS-01', KATEGORI: 'STSSRT', KODE: 'LULUS', NAMA: 'LULUS', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-STS-02', KATEGORI: 'STSSRT', KODE: 'PROSES', NAMA: 'PROSES', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-STS-03', KATEGORI: 'STSSRT', KODE: 'EXPIRED', NAMA: 'EXPIRED', STATUS: 'AKTIF' },

  // Kategori DIVDEP (Divisi / Departemen)
  { ID_LOOKUP: 'LKP-DIV-01', KATEGORI: 'DIVDEP', KODE: 'GGD', NAMA: 'Geologi & Geoteknik', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-DIV-02', KATEGORI: 'DIVDEP', KODE: 'MINE', NAMA: 'Operasional Tambang (Mining)', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-DIV-03', KATEGORI: 'DIVDEP', KODE: 'HSE', NAMA: 'Health, Safety & Environment', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-DIV-04', KATEGORI: 'DIVDEP', KODE: 'HRD', NAMA: 'Human Resource Development', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-DIV-05', KATEGORI: 'DIVDEP', KODE: 'ENG', NAMA: 'Engineering & Planning', STATUS: 'AKTIF' },

  // Kategori JBTN (Jabatan)
  { ID_LOOKUP: 'LKP-JBT-01', KATEGORI: 'JBTN', KODE: 'Supervisor', NAMA: 'Supervisor Operasional', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-JBT-02', KATEGORI: 'JBTN', KODE: 'Engineer', NAMA: 'Mining Engineer', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-JBT-03', KATEGORI: 'JBTN', KODE: 'Surveyor', NAMA: 'Mine Surveyor', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-JBT-04', KATEGORI: 'JBTN', KODE: 'Geologist', NAMA: 'Exploration Geologist', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-JBT-05', KATEGORI: 'JBTN', KODE: 'GIS', NAMA: 'GIS Specialist', STATUS: 'AKTIF' },

  // Kategori JNSPEG (Jenis Pegawai)
  { ID_LOOKUP: 'LKP-PEG-01', KATEGORI: 'JNSPEG', KODE: 'Pegawai Tetap', NAMA: 'Pegawai Tetap', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-PEG-02', KATEGORI: 'JNSPEG', KODE: 'Kontrak', NAMA: 'Pegawai Kontrak', STATUS: 'AKTIF' },
  { ID_LOOKUP: 'LKP-PEG-03', KATEGORI: 'JNSPEG', KODE: 'Outsourcing', NAMA: 'Tenaga Outsourcing', STATUS: 'AKTIF' },
];

export const INITIAL_PERSONIL: TrxPersonil[] = SEED_PERSONIL;

export const INITIAL_PELATIHAN: TrxPelatihan[] = SEED_PELATIHAN;

export const INITIAL_SERTIFIKASI: TrxSertifikasi[] = SEED_SERTIFIKASI;
