// Pengirim reminder H-90 untuk GitHub Actions (tanpa server Express).
// Data diambil dari src/data/seedFromExcel.ts (hasil parse DB_Sertifikasi HSE.xlsx).
// Jalankan: npx tsx scripts/send-reminders-ci.mts
import 'dotenv/config';
import { SEED_PERSONIL, SEED_PELATIHAN, SEED_SERTIFIKASI } from '../src/data/seedFromExcel.ts';
import { saveStore } from '../server/store.js';
import { getDueReminders, REMINDER_DAYS } from '../server/reminders.js';
import { mailerStatus, sendReminderEmailGroup } from '../server/mailer.js';

saveStore({
  personilList: SEED_PERSONIL,
  pelatihanList: SEED_PELATIHAN,
  sertifikasiList: SEED_SERTIFIKASI,
});

const status = mailerStatus();
console.log(`[ci] mode=${status.mode} reminderDays=${REMINDER_DAYS} from=${status.from}`);

if (status.mode !== 'smtp') {
  console.error(
    '[ci] Mode email bukan SMTP. Isi repository secrets SMTP_USER dan SMTP_PASS, ' +
      'lalu set DRY_RUN=0 dan ETHEREAL=0.'
  );
  process.exit(1);
}

const pending = getDueReminders().filter(item => !item.alreadySentAt);
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
