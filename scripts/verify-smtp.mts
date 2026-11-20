// Cek kredensial SMTP tanpa mengirim email. Jalankan: npm run email:verify
import 'dotenv/config';
import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = Number(process.env.SMTP_PORT || 587);
const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
const user = process.env.SMTP_USER || '';
const pass = process.env.SMTP_PASS || '';

console.log(`[verify] host=${host} port=${port} user=${user} passLen=${pass.length}`);

if (!user || !pass) {
  console.error('[verify] SMTP_USER / SMTP_PASS belum diisi di .env');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
});

try {
  await transporter.verify();
  console.log('[verify] OK: kredensial diterima server SMTP');
} catch (error: any) {
  const detail = error?.response || error?.message || String(error);
  console.error(`[verify] GAGAL: ${detail}`);
  if (String(detail).includes('535') || error?.code === 'EAUTH') {
    console.error(
      '[verify] App Password salah / sudah di-revoke. Buat yang baru di ' +
        'https://myaccount.google.com/apppasswords lalu update .env dan GitHub Secret SMTP_PASS.'
    );
  }
  process.exit(1);
}
