import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';

const ENV_PATH = path.resolve(process.cwd(), '.env');

function upsert(lines, key, value) {
  const idx = lines.findIndex(line => new RegExp(`^${key}=`).test(line));
  const entry = `${key}=${value}`;
  if (idx >= 0) lines[idx] = entry;
  else lines.push(entry);
}

async function main() {
  let email = process.argv[2];
  let appPassword = process.argv[3];

  if (!email) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    email = (await rl.question('Alamat Gmail pengirim: ')).trim();
    appPassword = (await rl.question('App Password 16 digit (tanpa spasi): ')).trim();
    rl.close();
  } else if (!appPassword) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    appPassword = (await rl.question('App Password 16 digit (tanpa spasi): ')).trim();
    rl.close();
  }

  if (!email.includes('@') || !appPassword) {
    console.error('Email atau App Password tidak valid.');
    process.exit(1);
  }

  const normalized = appPassword.replace(/\s+/g, '');
  if (normalized.length !== 16) {
    console.warn(`Peringatan: App Password Gmail biasanya 16 karakter, saat ini ${normalized.length}. Lanjut tetap dicoba.`);
  }

  const lines = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/) : [];
  upsert(lines, 'DRY_RUN', '0');
  upsert(lines, 'ETHEREAL', '0');
  upsert(lines, 'SMTP_HOST', 'smtp.gmail.com');
  upsert(lines, 'SMTP_PORT', '587');
  upsert(lines, 'SMTP_SECURE', 'false');
  upsert(lines, 'SMTP_USER', email);
  upsert(lines, 'SMTP_PASS', normalized);
  upsert(lines, 'MAIL_FROM', `SIM-K3 Mining <${email}>`);
  fs.writeFileSync(ENV_PATH, lines.filter((line, i, arr) => !(line === '' && i === arr.length - 1)).join('\n') + '\n', 'utf8');

  console.log(`.env diperbarui: SMTP Gmail untuk ${email}`);

  process.env.DRY_RUN = '0';
  process.env.ETHEREAL = '0';
  process.env.SMTP_HOST = 'smtp.gmail.com';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_SECURE = 'false';
  process.env.SMTP_USER = email;
  process.env.SMTP_PASS = normalized;
  process.env.MAIL_FROM = `SIM-K3 Mining <${email}>`;

  const { mailerStatus, sendTestEmail } = await import('./mailer.js');
  console.log('Mode email:', mailerStatus());

  try {
    const result = await sendTestEmail(email);
    console.log('Email tes terkirim ke', result.to, '| messageId:', result.messageId);
    console.log('Cek Inbox/Spam. Restart server (npm run server) agar cron memakai konfigurasi baru.');
  } catch (error) {
    console.error('Gagal kirim tes:', error.message);
    console.error('Periksa: App Password benar, 2FA aktif, tidak ada blokir jaringan ke smtp.gmail.com:587.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
