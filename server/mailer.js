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

export function buildReminderMail(reminders) {
  const first = reminders[0];
  const { owner, daysLeft } = first;
  const count = reminders.length;

  const certRows = reminders
    .map(r => {
      const jenis = r.cert.JENIS_SERTIFIKASI || 'Kompetensi';
      return {
        jenis,
        no: r.cert.NO_SERTIFIKAT || '-',
        expiry: formatDate(parseDate(r.cert.TANGGAL_EXPIRED)),
        daysLeft: r.daysLeft,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const subject =
    count === 1
      ? `[Reminder H-${REMINDER_DAYS} Hari] Sertifikat ${certRows[0].jenis} ${owner.NAMA} berakhir ${certRows[0].expiry}`
      : `[Reminder H-${REMINDER_DAYS} Hari] ${count} sertifikat ${owner.NAMA} mendekati kedaluwarsa`;

  const textLines = [
    `Yth. ${owner.NAMA},`,
    '',
    count === 1
      ? `Sertifikat ${certRows[0].jenis} Anda akan berakhir dalam periode H-${REMINDER_DAYS} hari.`
      : `Ada ${count} sertifikat Anda yang akan berakhir dalam periode H-${REMINDER_DAYS} hari.`,
    '',
    ...certRows.flatMap(row => [
      `- ${row.jenis}`,
      `  No. Sertifikat : ${row.no}`,
      `  Kedaluwarsa    : ${row.expiry}`,
      `  Sisa waktu     : ${row.daysLeft} hari`,
      '',
    ]),
    'Mohon segera mengajukan perpanjangan melalui Divisi HRD / K3LH PT ANTAM Tbk.',
    `Portal: ${APP_BASE_URL}`,
    '',
    'Email ini dikirim otomatis oleh SIM-K3 Mining. Mohon tidak membalas email ini.',
  ];

  const certCards = certRows
    .map(
      row => `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-left:4px solid #f59e0b;border-radius:10px;margin:0 0 12px">
          <tr>
            <td style="padding:12px 14px;font-family:Arial,Helvetica,sans-serif">
              <div style="font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:8px">${row.jenis}</div>
              <div style="font-size:13px;line-height:1.8;color:#334155">
                <span style="color:#64748b">No. Sertifikat:</span>
                <strong style="color:#0f172a;word-break:break-all">${row.no}</strong>
              </div>
              <div style="font-size:13px;line-height:1.8;color:#334155">
                <span style="color:#64748b">Kedaluwarsa:</span>
                <strong style="color:#be123c">${row.expiry}</strong>
              </div>
              <div style="font-size:13px;line-height:1.8;color:#334155">
                <span style="color:#64748b">Sisa waktu:</span>
                <strong style="color:#b45309">${row.daysLeft} hari lagi</strong>
              </div>
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
                <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#0f172a">Yth. <strong>${owner.NAMA}</strong>,</p>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155">
                  ${
                    count === 1
                      ? `Sertifikat <strong>${certRows[0].jenis}</strong> Anda akan berakhir dalam`
                      : `<strong>${count} sertifikat</strong> Anda akan berakhir dalam periode`
                  }
                  <strong style="color:#b45309">H-${REMINDER_DAYS} hari</strong>. Berikut rinciannya:
                </p>
                ${certCards}
                <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#334155">
                  Mohon segera mengajukan perpanjangan melalui Divisi HRD / K3LH PT ANTAM Tbk.
                </p>
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
  const { subject, text, html } = buildReminderMail(list);
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
  const info = await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject: `[SIM-K3 Mining] Tes email reminder ${kode}`,
    text:
      `Konfigurasi email reminder berhasil.\n\n` +
      `Kode uji : ${kode}\n` +
      `Mode     : ${mode}\n` +
      `Pengirim : ${MAIL_FROM}\n\n` +
      `Kalau email ini tidak masuk Inbox, cek folder Spam, Promotions, dan All Mail.`,
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
