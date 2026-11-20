import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { getOutboxDir, markSent } from './store.js';
import { formatDate, parseDate, REMINDER_DAYS } from './reminders.js';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false') === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const MAIL_FROM = process.env.MAIL_FROM || 'SIM-K3 Mining <no-reply@antam.local>';
const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO || '';
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';

const ETHEREAL = process.env.ETHEREAL === '1';
const HAS_SMTP = Boolean(
  SMTP_HOST && SMTP_USER && SMTP_PASS && !SMTP_USER.startsWith('ISI_') && SMTP_PASS !== 'ISI_APP_PASSWORD_16_DIGIT'
);

function computeMode() {
  if (process.env.DRY_RUN === '1') return 'dry-run';
  if (ETHEREAL) return 'ethereal';
  if (HAS_SMTP) return 'smtp';
  return 'dry-run';
}

export const isDryRun = computeMode() === 'dry-run';

export function sendMode() {
  return computeMode();
}

let realTransporter = null;
let etherealAccount = null;
let etherealTransporter = null;

async function getEtherealTransporter() {
  if (!etherealTransporter) {
    etherealAccount = await nodemailer.createTestAccount();
    etherealTransporter = nodemailer.createTransport({
      host: etherealAccount.smtp.host,
      port: etherealAccount.smtp.port,
      secure: etherealAccount.smtp.secure,
      auth: { user: etherealAccount.user, pass: etherealAccount.pass },
    });
    console.log(`[mail] akun Ethereal: ${etherealAccount.user}`);
  }
  return etherealTransporter;
}

async function getTransporter() {
  const mode = computeMode();
  if (mode === 'dry-run') {
    return {
      transporter: nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true }),
      mode,
    };
  }
  if (mode === 'ethereal') {
    return { transporter: await getEtherealTransporter(), mode };
  }
  if (!realTransporter) {
    realTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return { transporter: realTransporter, mode };
}

export function mailerStatus() {
  const mode = sendMode();
  return {
    mode,
    dryRun: mode === 'dry-run',
    ethereal: mode === 'ethereal',
    host: mode === 'smtp' ? SMTP_HOST : mode === 'ethereal' ? etherealAccount?.smtp.host || 'smtp.ethereal.email' : null,
    from: MAIL_FROM,
    reminderDays: REMINDER_DAYS,
  };
}

const TANPA_DATA = 'belum ada data';

function tampil(value) {
  const text = String(value ?? '').trim();
  return text || TANPA_DATA;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PORTAL_URL = /^https?:\/\//i.test(APP_BASE_URL) && !APP_BASE_URL.includes('localhost')
  ? APP_BASE_URL
  : '';

export function buildReminderMail(reminders, options = {}) {
  const first = reminders[0];
  const { owner } = first;
  const count = reminders.length;
  const testTo = String(options.testTo || '').trim();
  const sapaan = testTo || owner.NAMA;

  const certRows = reminders
    .map(r => {
      const jenis = r.cert.JENIS_SERTIFIKASI || 'Kompetensi';
      return {
        jenis,
        no: tampil(r.cert.NO_SERTIFIKAT),
        expiry: formatDate(parseDate(r.cert.TANGGAL_EXPIRED)),
        daysLeft: r.daysLeft,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const baseSubject =
    count === 1
      ? `[Reminder H-${REMINDER_DAYS} Hari] Sertifikat ${certRows[0].jenis} berakhir ${certRows[0].expiry}`
      : `[Reminder H-${REMINDER_DAYS} Hari] ${count} sertifikat Anda segera berakhir`;
  const subject = testTo ? `[UJI] ${baseSubject}` : baseSubject;

  const nearest = certRows[0];
  const intro =
    count === 1
      ? `Sertifikat berikut akan berakhir dalam waktu kurang dari ${REMINDER_DAYS} hari.`
      : `${count} sertifikat berikut akan berakhir dalam waktu kurang dari ${REMINDER_DAYS} hari.`;

  const textLines = [
    `Yth. ${sapaan},`,
    '',
    ...(testTo
      ? [
          'INI ADALAH EMAIL UJI. Sertifikat di bawah adalah contoh dari data Excel, bukan data Anda.',
          '',
        ]
      : []),
    intro,
    '',
    ...certRows.flatMap((row, index) => [
      `${index + 1}. ${row.jenis}`,
      `   Nomor sertifikat : ${row.no}`,
      `   Berlaku sampai   : ${row.expiry}`,
      `   Sisa waktu       : ${row.daysLeft} hari`,
      '',
    ]),
    'Langkah selanjutnya:',
    '1. Ajukan perpanjangan sertifikat ke Divisi HRD / K3LH PT ANTAM Tbk.',
    '2. Siapkan dokumen pendukung dan jadwal asesmen ulang bila diperlukan.',
    ...(PORTAL_URL ? ['', `Portal sertifikasi: ${PORTAL_URL}`] : []),
    '',
    'Email ini dikirim otomatis oleh SIM-K3 Mining. Mohon tidak membalas email ini.',
  ];

  const certCards = certRows
    .map(
      (row, index) => `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #e2e8f0;border-left:4px solid #f59e0b;border-radius:10px;margin:0 0 12px;border-collapse:separate">
          <tr>
            <td style="padding:12px 14px;font-family:Arial,Helvetica,sans-serif">
              <div style="font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:8px">${index + 1}. ${escapeHtml(row.jenis)}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-size:13px;line-height:1.7;color:#334155">
                <tr>
                  <td style="padding:1px 0;color:#64748b;width:38%">Nomor sertifikat</td>
                  <td style="padding:1px 0;color:#0f172a;font-weight:700;word-break:break-all">${escapeHtml(row.no)}</td>
                </tr>
                <tr>
                  <td style="padding:1px 0;color:#64748b">Berlaku sampai</td>
                  <td style="padding:1px 0;color:#be123c;font-weight:700">${escapeHtml(row.expiry)}</td>
                </tr>
                <tr>
                  <td style="padding:1px 0;color:#64748b">Sisa waktu</td>
                  <td style="padding:1px 0;color:#b45309;font-weight:700">${row.daysLeft} hari lagi</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pengingat Masa Berlaku Sertifikat</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7">
  <div style="margin:0;padding:0;background:#eef2f7">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#eef2f7;border-collapse:collapse">
      <tr>
        <td align="center" style="padding:16px 12px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;table-layout:fixed;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;font-family:Arial,Helvetica,sans-serif">
            <tr>
              <td style="background:#1e3a8a;padding:18px 20px">
                <div style="font-size:11px;letter-spacing:2px;color:#fbbf24;font-weight:700">SIM-K3 MINING</div>
                <div style="font-size:17px;line-height:1.35;font-weight:700;color:#ffffff;margin-top:4px">Pengingat Masa Berlaku Sertifikat</div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 18px">
                <p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#0f172a">Yth. <strong>${escapeHtml(sapaan)}</strong>,</p>
                ${
                  testTo
                    ? `<div style="margin:10px 0 14px;padding:10px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;font-size:12px;line-height:1.6;color:#1e40af">
                  <strong>Email uji.</strong> Sertifikat di bawah adalah contoh dari data Excel, bukan data Anda.
                </div>`
                    : ''
                }
                <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155">${escapeHtml(intro)}</p>
                <div style="margin:0 0 14px;padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;font-size:12px;line-height:1.6;color:#92400e">
                  Sertifikat terdekat berakhir <strong>${escapeHtml(nearest.expiry)}</strong>
                  &mdash; sisa <strong>${nearest.daysLeft} hari</strong>.
                </div>
                ${certCards}
                <div style="margin:16px 0 0;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">
                  <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:6px">Langkah selanjutnya</div>
                  <ol style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#334155">
                    <li>Ajukan perpanjangan sertifikat ke Divisi HRD / K3LH PT ANTAM Tbk.</li>
                    <li>Siapkan dokumen pendukung dan jadwal asesmen ulang bila diperlukan.</li>
                  </ol>
                </div>
                ${
                  PORTAL_URL
                    ? `<div style="margin-top:14px">
                  <a href="${escapeHtml(PORTAL_URL)}" style="display:inline-block;padding:10px 16px;background:#1e3a8a;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;border-radius:8px">Buka Portal Sertifikasi</a>
                </div>`
                    : ''
                }
                <div style="margin-top:16px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:11px;line-height:1.6;color:#64748b">
                  Email ini dikirim otomatis oleh SIM-K3 Mining. Mohon tidak membalas email ini.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;


  return { subject, text: textLines.join('\n'), html };
}

function safeFileName(value) {
  return String(value || 'reminder').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

export async function sendReminderEmailGroup(reminders, options = {}) {
  const list = Array.isArray(reminders) ? reminders.filter(Boolean) : [];
  if (list.length === 0) throw new Error('Tidak ada reminder untuk dikirim.');

  const { owner } = list[0];
  const { subject, text, html } = buildReminderMail(list, options);
  const mail = {
    from: MAIL_FROM,
    to: owner.EMAIL_PERSONIL,
    replyTo: MAIL_REPLY_TO || undefined,
    subject,
    text,
    html,
  };

  const { transporter, mode } = await getTransporter();
  const info = await transporter.sendMail(mail);
  // Hanya mode SMTP nyata yang dicatat, agar uji dry-run/Ethereal tidak memblokir reminder produksi.
  // options.markSent=false dipakai untuk uji kirim dari workflow tanpa mengunci reminder asli.
  if (mode === 'smtp' && options.markSent !== false) markSent(list.map(item => item.key));

  const certIds = list.map(item => item.cert.ID_SERTIFIKASI);

  if (mode === 'dry-run') {
    const file = path.join(
      getOutboxDir(),
      `${safeFileName(certIds[0])}_${safeFileName(owner.EMAIL_PERSONIL)}_${Date.now()}.eml`
    );
    fs.writeFileSync(file, info.message);
    return { ok: true, mode, to: mail.to, subject, certIds, count: list.length, file };
  }

  const previewUrl = mode === 'ethereal' ? nodemailer.getTestMessageUrl(info) || null : null;
  return {
    ok: true,
    mode,
    to: mail.to,
    subject,
    certIds,
    count: list.length,
    messageId: info.messageId,
    previewUrl,
  };
}

export async function sendReminderEmail(reminder) {
  return sendReminderEmailGroup([reminder]);
}

export async function sendTestEmail(to) {
  const { transporter, mode } = await getTransporter();
  const kode = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const waktu = new Date().toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  });
  const text =
    `Tes pengiriman email SIM-K3 Mining BERHASIL.\n\n` +
    `Kode uji     : ${kode}\n` +
    `Waktu kirim  : ${waktu} WIB\n` +
    `Dikirim ke   : ${to}\n` +
    `Dari         : ${MAIL_FROM}\n` +
    `Mode         : ${mode}\n\n` +
    `Ini hanya email tes. Email reminder produksi berisi daftar sertifikat yang\n` +
    `akan berakhir dalam ${REMINDER_DAYS} hari, lengkap dengan nomor sertifikat,\n` +
    `tanggal berakhir, dan sisa waktu.\n\n` +
    `Kalau email ini tidak masuk Inbox, cek folder Spam, Promotions, dan All Mail.`;
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tes Email SIM-K3 Mining</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#eef2f7;border-collapse:collapse">
    <tr>
      <td align="center" style="padding:16px 12px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;table-layout:fixed;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;font-family:Arial,Helvetica,sans-serif">
          <tr>
            <td style="background:#1e3a8a;padding:18px 20px">
              <div style="font-size:11px;letter-spacing:2px;color:#fbbf24;font-weight:700">SIM-K3 MINING</div>
              <div style="font-size:17px;line-height:1.35;font-weight:700;color:#ffffff;margin-top:4px">Tes Pengiriman Email</div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 18px">
              <div style="margin:0 0 14px;padding:10px 12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;font-size:13px;line-height:1.6;color:#065f46">
                <strong>Koneksi email berhasil.</strong> Email tes ini sampai ke tujuan.
              </div>
              <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155">
                Ini hanya email tes. Email reminder produksi berisi daftar sertifikat yang akan berakhir dalam
                <strong>${REMINDER_DAYS} hari</strong>, lengkap dengan nomor sertifikat, tanggal berakhir, dan sisa waktu.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #e2e8f0;border-radius:10px;border-collapse:collapse;font-size:13px;line-height:1.8;color:#334155">
                <tr><td style="padding:8px 12px;color:#64748b;width:35%">Kode uji</td><td style="padding:8px 12px;font-weight:700;color:#0f172a">${escapeHtml(kode)}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b">Waktu kirim</td><td style="padding:8px 12px;color:#0f172a">${escapeHtml(waktu)} WIB</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b">Dikirim ke</td><td style="padding:8px 12px;color:#0f172a;word-break:break-all">${escapeHtml(to)}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b">Dari</td><td style="padding:8px 12px;color:#0f172a;word-break:break-all">${escapeHtml(MAIL_FROM)}</td></tr>
              </table>
              <div style="margin-top:16px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:11px;line-height:1.6;color:#64748b">
                Kalau email ini tidak masuk Inbox, cek folder Spam, Promotions, dan All Mail.<br>
                Dikirim otomatis oleh SIM-K3 Mining. Mohon tidak membalas email ini.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  const info = await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject: `[SIM-K3 Mining] Tes email reminder ${kode}`,
    text,
    html,
  });
  console.log(`[mail] kode uji: ${kode}`);

  if (mode === 'dry-run') {
    const file = path.join(getOutboxDir(), `test_${Date.now()}.eml`);
    fs.writeFileSync(file, info.message);
    return { ok: true, mode, to, file };
  }

  const previewUrl = mode === 'ethereal' ? nodemailer.getTestMessageUrl(info) || null : null;
  return { ok: true, mode, to, messageId: info.messageId, previewUrl };
}
