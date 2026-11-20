// Pengirim reminder H-90 untuk GitHub Actions (tanpa server Express).
// Data diambil dari src/data/seedFromExcel.ts (hasil parse DB_Sertifikasi HSE.xlsx).
// Jalankan: npx tsx scripts/send-reminders-ci.mts
import 'dotenv/config';
import { SEED_PERSONIL, SEED_PELATIHAN, SEED_SERTIFIKASI } from '../src/data/seedFromExcel.ts';
import { saveStore } from '../server/store.js';
import { getDueReminders, parseDate, daysBetween, REMINDER_DAYS } from '../server/reminders.js';
import { mailerStatus, sendReminderEmailGroup } from '../server/mailer.js';

saveStore({
  personilList: SEED_PERSONIL,
  pelatihanList: SEED_PELATIHAN,
  sertifikasiList: SEED_SERTIFIKASI,
});

const status = mailerStatus();
console.log(`[ci] event=${process.env.GITHUB_EVENT_NAME || 'lokal'} mode=${status.mode} reminderDays=${REMINDER_DAYS} from=${status.from}`);

const pending = getDueReminders().filter(item => !item.alreadySentAt);

function gagalKirim(label: string, error: any): never {
  const detail = error?.response || error?.message || String(error);
  console.error(`[ci] ${label} GAGAL: ${detail}`);
  if (String(detail).includes('535') || error?.code === 'EAUTH') {
    console.error(
      '[ci] Kredensial SMTP ditolak Gmail. Buat App Password baru di ' +
        'https://myaccount.google.com/apppasswords lalu perbarui secret SMTP_PASS.'
    );
  }
  process.exit(1);
}

// Mode uji dari tab Actions: kirim email tes ke alamat tertentu.
const testEmail = String(process.env.TEST_EMAIL || '').trim();
const isManual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
console.log(`[ci] input test_email="${testEmail}" force_cert_id="${process.env.FORCE_CERT_ID || ''}"`);

if (isManual && !testEmail && !String(process.env.FORCE_CERT_ID || '').trim() && pending.length === 0) {
  console.error(
    '[ci] Run manual tanpa input: kolom test_email dan force_cert_id kosong, ' +
      `dan tidak ada sertifikat jatuh tempo H-${REMINDER_DAYS}. Tidak ada email yang dikirim. ` +
      'Jalankan ulang dan isi kolom test_email.'
  );
  process.exit(1);
}

function buatItemUji(cert: any, keEmail: string) {
  const pelatihan = SEED_PELATIHAN.find(item => String(item.ID_PELATIHAN) === String(cert.ID_PELATIHAN));
  // Cocokkan ID personil secara persis. Jangan pakai `includes`, karena ID pendek
  // bisa ikut cocok dengan sertifikat milik orang lain.
  const idDariSertifikat = String(cert.ID_SERTIFIKASI).match(/^SERT_(.+)_(POP|POM|POU|SMKP|CP)$/)?.[1];
  const owner =
    SEED_PERSONIL.find(item => String(item.ID_PERSONIL) === String(pelatihan?.ID_PERSONIL)) ||
    SEED_PERSONIL.find(item => String(item.ID_PERSONIL) === String(idDariSertifikat || ''));
  const expiry = parseDate(cert.TANGGAL_EXPIRED);
  if (!owner || !expiry) return null;
  return {
    key: `${cert.ID_SERTIFIKASI}|${cert.TANGGAL_EXPIRED}`,
    cert,
    owner: { ...owner, EMAIL_PERSONIL: keEmail },
    pelatihan,
    daysLeft: daysBetween(new Date(), expiry),
  };
}

// Pilih contoh sertifikat: force_cert_id bila diisi, kalau tidak yang tanggalnya
// paling dekat dengan hari ini.
function pilihContoh() {
  const forceCertId = String(process.env.FORCE_CERT_ID || '').trim();
  if (forceCertId) {
    const cert = SEED_SERTIFIKASI.find(item => item.ID_SERTIFIKASI === forceCertId);
    if (!cert) {
      console.error(`[ci] sertifikat "${forceCertId}" tidak ditemukan di seedFromExcel.ts`);
      process.exit(1);
    }
    return cert;
  }
  const kandidat = SEED_SERTIFIKASI.map(cert => ({ cert, expiry: parseDate(cert.TANGGAL_EXPIRED) }))
    .filter(item => item.expiry)
    .sort(
      (a, b) =>
        Math.abs(daysBetween(new Date(), a.expiry as Date)) - Math.abs(daysBetween(new Date(), b.expiry as Date))
    );
  if (kandidat.length > 0) return kandidat[0].cert;
  // Tidak ada tanggal sama sekali: pakai contoh sintetis H+65.
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 65);
  return {
    ID_SERTIFIKASI: 'SERT_UJI_POP',
    ID_PELATIHAN: 'PEL_UJI_POP',
    JENIS_SERTIFIKASI: 'POP',
    NO_SERTIFIKAT: '',
    TANGGAL_EXPIRED: expiry.toISOString().slice(0, 10),
  };
}

// Mode uji: kirim template reminder yang sama persis seperti produksi.
const contoh = pilihContoh();
const itemUji = buatItemUji(contoh, testEmail || String(process.env.TEST_REMINDER_EMAIL || '').trim());
if (!itemUji) {
  console.error('[ci] tidak ada sertifikat contoh yang punya tanggal expired valid');
  process.exit(1);
}

if (testEmail || String(process.env.TEST_REMINDER_EMAIL || '').trim()) {
  try {
    const result = await sendReminderEmailGroup([itemUji], {
      markSent: false,
      testTo: itemUji.owner.EMAIL_PERSONIL,
      sapaanUji: String(process.env.TEST_REMINDER_NAMA || '').trim(),
    });
    console.log(`[ci] uji reminder ${contoh.ID_SERTIFIKASI} -> ${result.to}: ${result.subject}`);
    console.log('[ci] sent-log tidak diubah, jadi reminder asli tetap akan terkirim saat waktunya tiba');
  } catch (error) {
    gagalKirim('uji reminder', error);
  }
  process.exit(0);
}

if (status.mode !== 'smtp') {
  console.error(
    '[ci] Mode email bukan SMTP. Isi repository secrets SMTP_USER dan SMTP_PASS, ' +
      'lalu set DRY_RUN=0 dan ETHEREAL=0.'
  );
  process.exit(1);
}

console.log(`[ci] sertifikat jatuh tempo H-${REMINDER_DAYS}: ${pending.length}`);

if (pending.length === 0) {
  console.log('[ci] tidak ada email yang perlu dikirim');
  process.exit(0);
}

// Satu email per pegawai: gabungkan semua sertifikat milik email yang sama.
const groups = new Map();
for (const reminder of pending) {
  const email = String(reminder.owner.EMAIL_PERSONIL || '').trim().toLowerCase();
  if (!email) {
    console.warn(`[ci] lewati ${reminder.cert.ID_SERTIFIKASI}: email pegawai kosong`);
    continue;
  }
  if (!groups.has(email)) groups.set(email, { owner: reminder.owner, items: [] });
  groups.get(email).items.push(reminder);
}

let sent = 0;
let failed = 0;

for (const group of groups.values()) {
  try {
    const result = await sendReminderEmailGroup(group.items);
    sent += 1;
    console.log(
      `[ci] terkirim -> ${result.to} (${result.count} sertifikat: ${result.certIds.join(', ')})`
    );
  } catch (error) {
    failed += 1;
    console.error(`[ci] gagal -> ${group.owner.EMAIL_PERSONIL}:`, error.message);
  }
}

console.log(`[ci] selesai: ${sent} email terkirim, ${failed} gagal`);
if (failed > 0) process.exit(1);
