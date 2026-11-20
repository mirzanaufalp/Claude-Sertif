import { getStore, getSentLog } from './store.js';

export const REMINDER_DAYS = Number(process.env.REMINDER_DAYS || 90);
const MONTH_MAP = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

export function parseDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  // ISO / yyyy-mm-dd (also accepts yyyy/mm/dd)
  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // dd-mm-yyyy / dd/mm/yyyy
  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // 17 AGU 2026 / 17 AUGUST 2026
  const textual = raw.toUpperCase().match(/^(\d{1,2})\s+([A-Z]+)\s+(\d{4})/);
  if (textual) {
    const monthIdx = MONTH_MAP.indexOf(textual[2].slice(0, 3));
    const normalized = monthIdx >= 0 ? monthIdx : ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].indexOf(textual[2].slice(0, 3));
    if (normalized >= 0) {
      const d = new Date(Number(textual[3]), normalized, Number(textual[1]));
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date, days) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDate(date) {
  if (!date) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function daysBetween(from, to) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
}

export function reminderKey(cert) {
  return `${cert.ID_SERTIFIKASI}|${cert.TANGGAL_EXPIRED}`;
}

function findOwner(store, cert) {
  const pelatihan = store.pelatihanList.find(p => String(p.ID_PELATIHAN) === String(cert.ID_PELATIHAN));
  // Fallback dari ID sertifikat harus persis: SERT_<ID_PERSONIL>_<JENIS>.
  // `includes()` lama bisa menautkan sertifikat ke orang lain bila ID pendek.
  const idDariSertifikat = String(cert.ID_SERTIFIKASI || '').match(/^SERT_(.+)_(POP|POM|POU|SMKP|CP)$/)?.[1];
  const owner =
    store.personilList.find(p => String(p.ID_PERSONIL) === String(pelatihan?.ID_PERSONIL)) ||
    store.personilList.find(p => String(p.ID_PERSONIL) === String(idDariSertifikat || ''));
  return { pelatihan, owner };
}

/**
 * Sertifikat masuk status "due" ketika hari ini sudah melewati
 * tanggal H-90 hari sebelum expired, tetapi belum lewat tanggal expired
 * dan belum pernah dikirim untuk kombinasi sertifikat + tanggal expired.
 */
export function getDueReminders(now = new Date()) {
  const store = getStore();
  const sentLog = getSentLog();
  const today = startOfDay(now);
  const due = [];

  for (const cert of store.sertifikasiList) {
    const expiry = parseDate(cert.TANGGAL_EXPIRED);
    if (!expiry) continue;

    const reminderDate = addDays(expiry, -REMINDER_DAYS);
    const key = reminderKey(cert);
    const isInWindow = today >= startOfDay(reminderDate) && today <= startOfDay(expiry);
    if (!isInWindow) continue;

    const { owner, pelatihan } = findOwner(store, cert);
    if (!owner?.EMAIL_PERSONIL) continue;

    due.push({
      key,
      cert,
      owner,
      pelatihan,
      expiryDate: expiry.toISOString().slice(0, 10),
      reminderDate: reminderDate.toISOString().slice(0, 10),
      daysLeft: daysBetween(today, expiry),
      alreadySentAt: sentLog[key] || null,
    });
  }

  return due.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function getPendingReminders(now = new Date()) {
  return getDueReminders(now).filter(item => !item.alreadySentAt);
}
