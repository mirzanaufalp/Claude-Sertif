import { TrxPelatihan, TrxPersonil, TrxSertifikasi } from '../types';

const MONTHS: Record<string, number> = {
  JANUARI: 0, JAN: 0, JANUARY: 0,
  FEBRUARI: 1, FEB: 1, FEBRUARY: 1,
  MARET: 2, MAR: 2, MARCH: 2,
  APRIL: 3, APR: 3,
  MEI: 4, MAY: 4,
  JUNI: 5, JUN: 5, JUNE: 5,
  JULI: 6, JUL: 6, JULY: 6,
  AGUSTUS: 7, AGU: 7, AUG: 7, AUGUST: 7,
  SEPTEMBER: 8, SEP: 8, SEPT: 8,
  OKTOBER: 9, OKT: 9, OCT: 9, OCTOBER: 9,
  NOVEMBER: 10, NOV: 10,
  DESEMBER: 11, DES: 11, DEC: 11, DECEMBER: 11,
};

export const CERT_TYPES = ['POP', 'POM', 'POU', 'SMKP', 'CP'] as const;

/** Validitas sertifikat K3 (bulan) untuk menurunkan tanggal pelatihan bila Excel tidak memuatnya. */
const VALIDITY_MONTHS = 36;

function toIso(year: number, monthIndex: number, day: number): string {
  if (!year || monthIndex < 0 || monthIndex > 11 || !day) return '';
  const date = new Date(year, monthIndex, day);
  if (Number.isNaN(date.getTime())) return '';
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/** Normalisasi berbagai format tanggal Excel menjadi YYYY-MM-DD (string kosong bila gagal). */
export function parseAnyDate(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIso(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Serial date Excel (epoch 1899-12-30)
    const ms = Math.round((value - 25569) * 86400000);
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return '';
    return toIso(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  const raw = String(value).trim();
  if (!raw) return '';

  const iso = raw.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return toIso(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) return toIso(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));

  const textual = raw.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (textual) {
    const month = MONTHS[textual[2].toUpperCase()];
    if (month !== undefined) return toIso(Number(textual[3]), month, Number(textual[1]));
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return toIso(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return '';
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + days);
  return toIso(date.getFullYear(), date.getMonth(), date.getDate());
}

function subtractMonths(iso: string, months: number): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const targetMonth = date.getMonth() - months;
  const result = new Date(date.getFullYear(), targetMonth, date.getDate());
  if (result.getMonth() !== ((targetMonth % 12) + 12) % 12) result.setDate(0);
  return toIso(result.getFullYear(), result.getMonth(), result.getDate());
}

function normalizeType(value: string): string | null {
  const token = value.trim().toUpperCase();
  if (!token) return null;
  if (token === 'AUDITOR' || token === 'SMK' || token === 'SMKP/AUDITOR') return 'SMKP';
  const match = CERT_TYPES.find(type => token === type || token.startsWith(`${type} `) || token.startsWith(`${type}/`));
  return match ? match : null;
}

/** Ambil jenis sertifikasi dari sel yang bisa berisi "POP, POM, POU" atau "AUDITOR". */
export function parseCertTypes(...values: unknown[]): string[] {
  const found = new Set<string>();
  for (const value of values) {
    if (value === null || value === undefined) continue;
    String(value)
      .split(/[,;/|\n]+/)
      .forEach(part => {
        const type = normalizeType(part.replace(/\(.*?\)/g, ''));
        if (type) found.add(type);
      });
  }
  return CERT_TYPES.filter(type => found.has(type));
}

/** Baca teks seperti "Tanggal Expired POP : 30 Juli 2030\nTanggal Expired POM : 01 Januari 2031". */
export function parseExpiryText(...values: unknown[]): Record<string, string> {
  const result: Record<string, string> = {};
  const looseDates: string[] = [];

  for (const value of values) {
    if (value === null || value === undefined) continue;
    const raw = String(value);
    const matches = [...raw.matchAll(/expired\s*([A-Za-z]+)?\s*[:\-]\s*([^\n\r;]+)/gi)];
    if (matches.length > 0) {
      for (const match of matches) {
        const iso = parseAnyDate(match[2]);
        if (!iso) continue;
        const type = match[1] ? normalizeType(match[1]) : null;
        if (type && !result[type]) result[type] = iso;
        else looseDates.push(iso);
      }
    } else {
      const iso = parseAnyDate(raw);
      if (iso) looseDates.push(iso);
    }
  }

  if (looseDates.length > 0) {
    for (const type of CERT_TYPES) {
      if (!result[type]) result[type] = looseDates[0];
    }
  }
  return result;
}

export function personilKey(personil: Pick<TrxPersonil, 'ID_PERSONIL' | 'NAMA'>): string {
  const id = String(personil.ID_PERSONIL || '').trim();
  if (id) return `ID:${id.toUpperCase()}`;
  return `NAMA:${String(personil.NAMA || '').trim().toUpperCase().replace(/\s+/g, ' ')}`;
}

function slugName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 20);
}

export interface ImportBundle {
  personilList: TrxPersonil[];
  pelatihanList: TrxPelatihan[];
  sertifikasiList: TrxSertifikasi[];
  stats: {
    rows: number;
    skipped: number;
    personil: number;
    pelatihan: number;
    sertifikasi: number;
    withDates: number;
  };
}

/** Ubah baris Excel (sheet_to_json) menjadi bundle data bersih tanpa duplikat. */
export function buildImportBundle(rows: any[]): ImportBundle {
  const personilMap = new Map<string, TrxPersonil>();
  const pelatihanMap = new Map<string, TrxPelatihan>();
  const sertifikasiMap = new Map<string, TrxSertifikasi>();
  let skipped = 0;
  let withDates = 0;

  for (const row of rows) {
    const name = String(row.NAMA || row['Nama'] || row['Nama Pegawai'] || '').trim();
    if (!name) {
      skipped += 1;
      continue;
    }

    const rawId = String(row.ID_PERSONIL || row['ID Personil'] || row['ID'] || '').trim();
    const personilId = rawId || `PEG${slugName(name)}`;

    const personil: TrxPersonil = {
      ID_PERSONIL: personilId,
      NAMA: name,
      JABATAN: String(row.JABATAN || row['Jabatan'] || 'Supervisor').trim(),
      DIVISI_DEPARTEMEN: String(row.DIVISI_DEPARTEMEN || row.Divisi || row['Divisi Departemen'] || 'GGD').trim(),
      JENIS_PEGAWAI: String(row.JENIS_PEGAWAI || row['Jenis Pegawai'] || 'PEG').trim(),
      EMAIL_PERSONIL: String(row.EMAIL_PERSONIL || row.Email || row['Email Personil'] || '').trim(),
      FOTO_PERSONIL: String(row.FOTO_PERSONIL || row['Foto Personil'] || '').trim(),
      STATUS_PERSONIL: 'AKTIF',
    };

    const key = personilKey(personil);
    const existingPersonil = personilMap.get(key);
    if (existingPersonil) {
      personilMap.set(key, {
        ...existingPersonil,
        ...Object.fromEntries(Object.entries(personil).filter(([, v]) => v)) as Partial<TrxPersonil>,
      } as TrxPersonil);
    } else {
      personilMap.set(key, personil);
    }

    const expiryMap = parseExpiryText(
      row.TGL_EXPIRED_PPP,
      row.TGL_EXPIRED_SMKP,
      row.TGL_EXPIRED_CP,
      row.TGL_EXPIRED,
      row.TANGGAL_EXPIRED,
      row['Tanggal Expired']
    );

    const types = parseCertTypes(
      row.SERT_PPP,
      row.SERT_SMKP,
      row.SERT_CP,
      row.JENIS_SERTIFIKASI,
      row.SERTIFIKASI,
      row['Jenis Sertifikasi'],
      ...Object.keys(expiryMap),
      ...Object.values(expiryMap)
    );

    if (types.length === 0) types.push('POP');

    const explicitStart = parseAnyDate(
      row.TANGGAL_MULAI || row.TGL_MULAI || row['Tanggal Mulai'] || row['Tgl Mulai']
    );
    const explicitEnd = parseAnyDate(
      row.TANGGAL_SELESAI || row.TGL_SELESAI || row['Tanggal Selesai'] || row['Tgl Selesai'] || row.TANGGAL_PELATIHAN
    );
    const explicitExpiry = parseAnyDate(row.TANGGAL_EXPIRED || row.TGL_EXPIRED || row['Tanggal Expired']);

    for (const type of types) {
      const expiry = expiryMap[type] || explicitExpiry;
      const start = explicitStart; // Hanya pakai jika ada di Excel
      const end = explicitEnd || (start ? addDays(start, 4) : '');
      if (start || end || expiry) withDates += 1;

      const pelatihanId = `PEL_${personilId}_${type}`;
      const sertifikasiId = `SERT_${personilId}_${type}`;

      const pelatihan: TrxPelatihan = {
        ID_PELATIHAN: pelatihanId,
        ID_PERSONIL: personilId,
        JENIS_PELATIHAN: type,
        NAMA_PELATIHAN: `Pelatihan & Sertifikasi ${type}`,
        PENYELENGGARA: 'Pusdiklat Antam / Minerba',
        TANGGAL_MULAI: start,
        TANGGAL_SELESAI: end,
        STATUS_PELATIHAN: 'SELESAI',
      };

      // Excel sumber tidak memuat kolom nomor sertifikat. Jangan mengarang nomor:
      // kosongkan agar UI/email menampilkan "belum ada data".
      const noSertifikat = String(row.NO_SERTIFIKAT || row['No Sertifikat'] || '').trim();

      const sertifikasi: TrxSertifikasi = {
        ID_SERTIFIKASI: sertifikasiId,
        ID_PELATIHAN: pelatihanId,
        JENIS_SERTIFIKASI: type,
        NO_SERTIFIKAT: noSertifikat,
        TANGGAL_MULAI: start,
        TANGGAL_EXPIRED: expiry,
        STATUS_SERTIFIKASI: 'LULUS',
        DOK_SERTIFIKAT: String(row.DOK_SERTIFIKAT || row['Dok Sertifikat'] || 'sertifikat.pdf').trim(),
      };

      const existingPelatihan = pelatihanMap.get(pelatihanId);
      pelatihanMap.set(
        pelatihanId,
        existingPelatihan
          ? {
              ...existingPelatihan,
              TANGGAL_MULAI: pelatihan.TANGGAL_MULAI || existingPelatihan.TANGGAL_MULAI,
              TANGGAL_SELESAI: pelatihan.TANGGAL_SELESAI || existingPelatihan.TANGGAL_SELESAI,
            }
          : pelatihan
      );

      const existingSertifikasi = sertifikasiMap.get(sertifikasiId);
      sertifikasiMap.set(
        sertifikasiId,
        existingSertifikasi
          ? {
              ...existingSertifikasi,
              NO_SERTIFIKAT: sertifikasi.NO_SERTIFIKAT || existingSertifikasi.NO_SERTIFIKAT,
              TANGGAL_MULAI: sertifikasi.TANGGAL_MULAI || existingSertifikasi.TANGGAL_MULAI,
              TANGGAL_EXPIRED: sertifikasi.TANGGAL_EXPIRED || existingSertifikasi.TANGGAL_EXPIRED,
            }
          : sertifikasi
      );
    }
  }

  return {
    personilList: [...personilMap.values()],
    pelatihanList: [...pelatihanMap.values()],
    sertifikasiList: [...sertifikasiMap.values()],
    stats: {
      rows: rows.length,
      skipped,
      personil: personilMap.size,
      pelatihan: pelatihanMap.size,
      sertifikasi: sertifikasiMap.size,
      withDates,
    },
  };
}

/** Turunkan tanggal pelatihan dari tanggal expired sertifikat (validitas 36 bulan, durasi 4 hari). */
export function deriveTrainingDates(expiry: string): { start: string; end: string } {
  const start = expiry ? subtractMonths(expiry, VALIDITY_MONTHS) : '';
  const end = start ? addDays(start, 4) : '';
  return { start, end };
}

export interface MigrationResult {
  personilList: TrxPersonil[];
  pelatihanList: TrxPelatihan[];
  sertifikasiList: TrxSertifikasi[];
  changed: boolean;
}

/**
 * Rapikan data lama (seed `PLTHN…`, ID hasil import sebelumnya) ke format kanonik dan
 * isi tanggal pelatihan dari tanggal expired sertifikat yang tertaut.
 * Idempoten: dipanggil berulang tidak mengubah hasil.
 */
export function migrateLegacyData(
  rawPersonil: TrxPersonil[],
  rawPelatihan: TrxPelatihan[],
  rawSertifikasi: TrxSertifikasi[]
): MigrationResult {
  // 1. Personil unik
  const personilMap = new Map<string, TrxPersonil>();
  for (const item of rawPersonil) {
    const key = personilKey(item);
    const existing = personilMap.get(key);
    personilMap.set(
      key,
      existing
        ? ({ ...existing, ...Object.fromEntries(Object.entries(item).filter(([, v]) => v)) } as TrxPersonil)
        : item
    );
  }

  // 2. Pelatihan: ID kanonik + gabung duplikat
  const pelatihanIdMap = new Map<string, string>();
  const pelatihanMap = new Map<string, TrxPelatihan>();
  for (const item of rawPelatihan) {
    const canonicalId = item.ID_PERSONIL
      ? `PEL_${item.ID_PERSONIL}_${item.JENIS_PELATIHAN}`
      : item.ID_PELATIHAN;
    pelatihanIdMap.set(item.ID_PELATIHAN, canonicalId);
    const existing = pelatihanMap.get(canonicalId);
    pelatihanMap.set(
      canonicalId,
      existing
        ? {
            ...existing,
            ...item,
            ID_PELATIHAN: canonicalId,
            TANGGAL_MULAI: item.TANGGAL_MULAI || existing.TANGGAL_MULAI,
            TANGGAL_SELESAI: item.TANGGAL_SELESAI || existing.TANGGAL_SELESAI,
          }
        : { ...item, ID_PELATIHAN: canonicalId }
    );
  }

  // 3. Sertifikasi: ID kanonik + tautan pelatihan
  const sertifikasiMap = new Map<string, TrxSertifikasi>();
  for (const item of rawSertifikasi) {
    const pelatihanId = pelatihanIdMap.get(item.ID_PELATIHAN) || item.ID_PELATIHAN;
    const pelatihan = pelatihanMap.get(pelatihanId);
    const canonicalId =
      pelatihan && pelatihan.ID_PERSONIL
        ? `SERT_${pelatihan.ID_PERSONIL}_${item.JENIS_SERTIFIKASI}`
        : item.ID_SERTIFIKASI;
    const existing = sertifikasiMap.get(canonicalId);
    sertifikasiMap.set(
      canonicalId,
      existing
        ? {
            ...existing,
            ...item,
            ID_SERTIFIKASI: canonicalId,
            ID_PELATIHAN: pelatihanId,
            NO_SERTIFIKAT: item.NO_SERTIFIKAT || existing.NO_SERTIFIKAT,
            TANGGAL_MULAI: item.TANGGAL_MULAI || existing.TANGGAL_MULAI,
            TANGGAL_EXPIRED: item.TANGGAL_EXPIRED || existing.TANGGAL_EXPIRED,
          }
        : { ...item, ID_SERTIFIKASI: canonicalId, ID_PELATIHAN: pelatihanId }
    );
  }

  const pelatihanList = [...pelatihanMap.values()];
  const sertifikasiList = [...sertifikasiMap.values()];

  // 4a. Rapikan tanggal yang masih berupa teks mentah hasil import lama
  for (const pel of pelatihanList) {
    if (pel.TANGGAL_MULAI) pel.TANGGAL_MULAI = parseAnyDate(pel.TANGGAL_MULAI) || pel.TANGGAL_MULAI;
    if (pel.TANGGAL_SELESAI) pel.TANGGAL_SELESAI = parseAnyDate(pel.TANGGAL_SELESAI) || pel.TANGGAL_SELESAI;
  }
  for (const cert of sertifikasiList) {
    if (cert.TANGGAL_MULAI) cert.TANGGAL_MULAI = parseAnyDate(cert.TANGGAL_MULAI) || cert.TANGGAL_MULAI;
    if (!cert.TANGGAL_EXPIRED) continue;
    const parsed = parseExpiryText(cert.TANGGAL_EXPIRED)[cert.JENIS_SERTIFIKASI] || parseAnyDate(cert.TANGGAL_EXPIRED);
    if (parsed && parsed !== cert.TANGGAL_EXPIRED) cert.TANGGAL_EXPIRED = parsed;
  }

  // 4. Peta tanggal expired: per pelatihan dan per pegawai+jenis
  const expiryByPelatihan = new Map<string, string>();
  const expiryByPersonilJenis = new Map<string, string>();
  for (const cert of sertifikasiList) {
    if (!cert.TANGGAL_EXPIRED) continue;
    expiryByPelatihan.set(cert.ID_PELATIHAN, cert.TANGGAL_EXPIRED);
  }
  for (const pel of pelatihanList) {
    const expiry = expiryByPelatihan.get(pel.ID_PELATIHAN);
    if (expiry) expiryByPersonilJenis.set(`${pel.ID_PERSONIL}|${pel.JENIS_PELATIHAN}`, expiry);
  }

  // 5. Isi tanggal pelatihan yang kosong (HANYA jika ada data di Excel/sebelumnya)
  for (const pel of pelatihanList) {
    if (pel.TANGGAL_MULAI && pel.TANGGAL_SELESAI) continue;
    // Berhenti mengisi otomatis dari expiry (subtractMonths)
  }

  // 6. Isi tanggal mulai sertifikasi dari pelatihan tertaut (selalu overwrite)
  const pelatihanById = new Map(pelatihanList.map(p => [p.ID_PELATIHAN, p]));
  for (const cert of sertifikasiList) {
    const pel = pelatihanById.get(cert.ID_PELATIHAN);
    if (pel?.TANGGAL_MULAI) cert.TANGGAL_MULAI = pel.TANGGAL_MULAI;
  }

  const personilList = [...personilMap.values()];
  const changed =
    JSON.stringify(personilList) !== JSON.stringify(rawPersonil) ||
    JSON.stringify(pelatihanList) !== JSON.stringify(rawPelatihan) ||
    JSON.stringify(sertifikasiList) !== JSON.stringify(rawSertifikasi);

  return { personilList, pelatihanList, sertifikasiList, changed };
}

export interface MergeResult {
  personilList: TrxPersonil[];
  pelatihanList: TrxPelatihan[];
  sertifikasiList: TrxSertifikasi[];
  added: number;
  updated: number;
}

/** Rapikan data lama (ID acak / duplikat akibat import sebelumnya) ke format kanonik PEL_/SERT_. */
function normalizeExisting(
  currentPersonil: TrxPersonil[],
  currentPelatihan: TrxPelatihan[],
  currentSertifikasi: TrxSertifikasi[]
) {
  const { personilList, pelatihanList, sertifikasiList } = migrateLegacyData(
    currentPersonil,
    currentPelatihan,
    currentSertifikasi
  );
  return { personilList, pelatihanList, sertifikasiList };
}

/** Gabungkan hasil import ke data yang sudah ada tanpa membuat duplikat. */
export function mergeImportBundle(
  currentPersonil: TrxPersonil[],
  currentPelatihan: TrxPelatihan[],
  currentSertifikasi: TrxSertifikasi[],
  bundle: ImportBundle
): MergeResult {
  const normalized = normalizeExisting(currentPersonil, currentPelatihan, currentSertifikasi);
  let added = 0;
  let updated = 0;

  const personilList = [...normalized.personilList];
  const personilIndex = new Map<string, number>();
  personilList.forEach((item, index) => personilIndex.set(personilKey(item), index));

  for (const incoming of bundle.personilList) {
    const key = personilKey(incoming);
    const index = personilIndex.get(key);
    if (index === undefined) {
      personilIndex.set(key, personilList.length);
      personilList.push(incoming);
      added += 1;
      continue;
    }
    const existing = personilList[index];
    personilList[index] = {
      ...existing,
      ...Object.fromEntries(Object.entries(incoming).filter(([, value]) => value)) as Partial<TrxPersonil>,
    } as TrxPersonil;
    updated += 1;
  }

  const pelatihanList = [...normalized.pelatihanList];
  const pelatihanIndex = new Map(pelatihanList.map((item, index) => [item.ID_PELATIHAN, index]));
  for (const incoming of bundle.pelatihanList) {
    const index = pelatihanIndex.get(incoming.ID_PELATIHAN);
    if (index === undefined) {
      pelatihanIndex.set(incoming.ID_PELATIHAN, pelatihanList.length);
      pelatihanList.push(incoming);
      continue;
    }
    const existing = pelatihanList[index];
    pelatihanList[index] = {
      ...existing,
      ...incoming,
      TANGGAL_MULAI: incoming.TANGGAL_MULAI || existing.TANGGAL_MULAI,
      TANGGAL_SELESAI: incoming.TANGGAL_SELESAI || existing.TANGGAL_SELESAI,
    };
  }

  const sertifikasiList = [...normalized.sertifikasiList];
  const sertifikasiIndex = new Map(sertifikasiList.map((item, index) => [item.ID_SERTIFIKASI, index]));
  for (const incoming of bundle.sertifikasiList) {
    const index = sertifikasiIndex.get(incoming.ID_SERTIFIKASI);
    if (index === undefined) {
      sertifikasiIndex.set(incoming.ID_SERTIFIKASI, sertifikasiList.length);
      sertifikasiList.push(incoming);
      continue;
    }
    const existing = sertifikasiList[index];
    sertifikasiList[index] = {
      ...existing,
      ...incoming,
      TANGGAL_MULAI: incoming.TANGGAL_MULAI || existing.TANGGAL_MULAI,
      TANGGAL_EXPIRED: incoming.TANGGAL_EXPIRED || existing.TANGGAL_EXPIRED,
      NO_SERTIFIKAT: incoming.NO_SERTIFIKAT || existing.NO_SERTIFIKAT,
    };
  }

  return { personilList, pelatihanList, sertifikasiList, added, updated };
}
