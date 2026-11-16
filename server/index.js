import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { saveStore, getStore, getSentLog } from './store.js';
import { getDueReminders, REMINDER_DAYS } from './reminders.js';
import { isDryRun, mailerStatus, sendMode, sendReminderEmailGroup, sendTestEmail } from './mailer.js';

const PORT = Number(process.env.PORT || 4000);
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 8 * * *';
const CRON_TIMEZONE = process.env.CRON_TIMEZONE || 'Asia/Jakarta';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
// Kirim otomatis: saat server start + setiap CHECK_INTERVAL_MINUTES.
// Set AUTO_SEND=0 untuk mematikan (mis. saat uji manual).
const AUTO_SEND = String(process.env.AUTO_SEND ?? '1') !== '0';
const CHECK_INTERVAL_MINUTES = Number(process.env.CHECK_INTERVAL_MINUTES || 60);

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '25mb' }));

let lastRun = { at: null, sent: 0, failed: 0, error: null };
let sendInProgress = false;

function publicReminder(item) {
  return {
    key: item.key,
    certId: item.cert.ID_SERTIFIKASI,
    noSertifikat: item.cert.NO_SERTIFIKAT,
    jenis: item.cert.JENIS_SERTIFIKASI,
    tanggalExpired: item.cert.TANGGAL_EXPIRED,
    reminderDate: item.reminderDate,
    daysLeft: item.daysLeft,
    email: item.owner.EMAIL_PERSONIL,
    nama: item.owner.NAMA,
    personilId: item.owner.ID_PERSONIL,
    alreadySentAt: item.alreadySentAt,
  };
}

app.get('/api/health', (req, res) => {
  const store = getStore();
  res.json({
    ok: true,
    mailer: mailerStatus(),
    reminderDays: REMINDER_DAYS,
    cron: { schedule: CRON_SCHEDULE, timezone: CRON_TIMEZONE },
    auto: {
      enabled: AUTO_SEND,
      intervalMinutes: CHECK_INTERVAL_MINUTES,
      sending: sendInProgress,
    },
    data: {
      syncedAt: store.syncedAt,
      personil: store.personilList.length,
      sertifikasi: store.sertifikasiList.length,
    },
    lastRun,
  });
});

app.post('/api/sync', (req, res) => {
  const { personilList, pelatihanList, sertifikasiList } = req.body || {};
  if (!Array.isArray(sertifikasiList) || !Array.isArray(personilList)) {
    return res.status(400).json({ ok: false, message: 'Payload harus berisi personilList dan sertifikasiList.' });
  }
  const store = saveStore({ personilList, pelatihanList, sertifikasiList });
  res.json({
    ok: true,
    syncedAt: store.syncedAt,
    counts: {
      personil: store.personilList.length,
      pelatihan: store.pelatihanList.length,
      sertifikasi: store.sertifikasiList.length,
    },
  });
});

app.get('/api/reminders', (req, res) => {
  const due = getDueReminders();
  res.json({
    ok: true,
    reminderDays: REMINDER_DAYS,
    total: due.length,
    pending: due.filter(item => !item.alreadySentAt).map(publicReminder),
    sent: due.filter(item => item.alreadySentAt).map(publicReminder),
  });
});

// Uji jendela H-90 tanpa mengirim email: /api/reminders/preview?date=2027-09-01
app.get('/api/reminders/preview', (req, res) => {
  const raw = req.query.date || req.query.now;
  const now = raw ? new Date(String(raw)) : new Date();
  if (Number.isNaN(now.getTime())) {
    return res.status(400).json({ ok: false, message: 'Format tanggal tidak valid. Gunakan YYYY-MM-DD.' });
  }
  const due = getDueReminders(now);
  res.json({
    ok: true,
    simulatedDate: now.toISOString().slice(0, 10),
    reminderDays: REMINDER_DAYS,
    total: due.length,
    pending: due.filter(item => !item.alreadySentAt).map(publicReminder),
    sent: due.filter(item => item.alreadySentAt).map(publicReminder),
  });
});

async function runSend(predicate, now = new Date()) {
  const pending = getDueReminders(now).filter(item => !item.alreadySentAt).filter(predicate);

  // Satu email per pegawai: kumpulkan semua sertifikat yang jatuh tempo
  const groups = new Map();
  for (const reminder of pending) {
    const email = String(reminder.owner.EMAIL_PERSONIL || '').trim().toLowerCase();
    if (!email) continue;
    if (!groups.has(email)) groups.set(email, { owner: reminder.owner, items: [] });
    groups.get(email).items.push(reminder);
  }

  const results = [];
  for (const group of groups.values()) {
    try {
      const result = await sendReminderEmailGroup(group.items);
      results.push({ ...result, nama: group.owner.NAMA });
    } catch (error) {
      results.push({
        ok: false,
        certId: group.items[0].cert.ID_SERTIFIKASI,
        certIds: group.items.map(item => item.cert.ID_SERTIFIKASI),
        count: group.items.length,
        nama: group.owner.NAMA,
        to: group.owner.EMAIL_PERSONIL,
        error: error.message,
      });
    }
  }
  return results;
}

app.post('/api/reminders/send', async (req, res) => {
  const { keys, certIds, date } = req.body || {};
  const keySet = Array.isArray(keys) ? new Set(keys) : null;
  const certIdSet = Array.isArray(certIds) ? new Set(certIds) : null;

  let now = new Date();
  if (date) {
    if (sendMode() === 'smtp') {
      return res.status(400).json({
        ok: false,
        message: 'Tanggal simulasi hanya boleh saat mode dry-run/Ethereal, bukan SMTP nyata.',
      });
    }
    const parsed = new Date(String(date));
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ ok: false, message: 'Format tanggal simulasi tidak valid.' });
    }
    now = parsed;
  }

  const results = await runSendLocked(item => {
    if (keySet && !keySet.has(item.key)) return false;
    if (certIdSet && !certIdSet.has(item.cert.ID_SERTIFIKASI)) return false;
    return true;
  }, now);

  if (!results) {
    return res.status(409).json({ ok: false, message: 'Proses pengiriman lain sedang berjalan. Coba lagi sesaat.' });
  }

  const sent = results.filter(r => r.ok).length;
  lastRun = { at: new Date().toISOString(), sent, failed: results.length - sent, error: null };
  res.json({ ok: results.every(r => r.ok), dryRun: isDryRun, sent, failed: results.length - sent, results });
});

app.post('/api/email/test', async (req, res) => {
  const to = req.body?.to;
  if (!to) return res.status(400).json({ ok: false, message: 'Field "to" wajib diisi.' });
  try {
    res.json({ ok: true, ...(await sendTestEmail(to)) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/** Jalankan pengiriman dengan pengunci agar auto-send, cron, dan klik admin tidak dobel. */
async function runSendLocked(predicate, now = new Date()) {
  if (sendInProgress) return null;
  sendInProgress = true;
  try {
    return await runSend(predicate, now);
  } finally {
    sendInProgress = false;
  }
}

async function runCronJob(source = 'cron') {
  let results;
  try {
    results = await runSendLocked(() => true);
  } catch (error) {
    lastRun = { at: new Date().toISOString(), sent: 0, failed: 0, error: error.message };
    console.error(`[auto] ${source} gagal:`, error);
    return;
  }
  if (!results) {
    console.log(`[auto] ${source}: dilewati, proses kirim lain masih berjalan`);
    return;
  }

  const sent = results.filter(r => r.ok).length;
  const failed = results.length - sent;
  lastRun = { at: new Date().toISOString(), sent, failed, error: null };
  if (sent || failed) {
    console.log(
      `[auto] ${source} ${new Date().toISOString()} reminder H-${REMINDER_DAYS} hari: ${sent} email terkirim, ${failed} gagal (${mailerStatus().mode})`
    );
  } else {
    console.log(`[auto] ${source}: tidak ada sertifikat yang masuk jendela H-${REMINDER_DAYS} hari`);
  }
}

if (cron.validate(CRON_SCHEDULE)) {
  cron.schedule(CRON_SCHEDULE, () => {
    runCronJob('cron harian');
  }, { timezone: CRON_TIMEZONE });
  console.log(`[cron] aktif: "${CRON_SCHEDULE}" (${CRON_TIMEZONE})`);
} else {
  console.warn(`[cron] jadwal tidak valid: ${CRON_SCHEDULE}`);
}

// Pemeriksaan otomatis tambahan: saat server hidup dan berkala,
// supaya reminder tetap terkirim walau server baru dinyalakan setelah jadwal cron.
if (AUTO_SEND) {
  setTimeout(() => runCronJob('startup'), 5000);
  if (Number.isFinite(CHECK_INTERVAL_MINUTES) && CHECK_INTERVAL_MINUTES > 0) {
    setInterval(() => runCronJob('interval'), CHECK_INTERVAL_MINUTES * 60 * 1000);
    console.log(`[auto] cek otomatis setiap ${CHECK_INTERVAL_MINUTES} menit + saat server start`);
  }
} else {
  console.log('[auto] pengiriman otomatis dimatikan (AUTO_SEND=0)');
}

// Sajikan hasil build Vite bila tersedia (deploy produksi satu port)
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  const status = mailerStatus();
  const modeLabel =
    status.mode === 'dry-run'
      ? 'DRY RUN (file .eml ke server/data/outbox)'
      : status.mode === 'ethereal'
        ? 'ETHEREAL (SMTP uji, buka link preview)'
        : `SMTP ${status.host}`;
  console.log(`[server] http://localhost:${PORT}`);
  console.log(`[server] mode email: ${modeLabel}`);
  console.log(`[server] data tersinkron: ${getStore().sertifikasiList.length} sertifikasi`);
  console.log(`[server] log terkirim: ${Object.keys(getSentLog()).length} entri`);
});

