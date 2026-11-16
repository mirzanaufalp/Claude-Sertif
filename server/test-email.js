import 'dotenv/config';
import { isDryRun, sendTestEmail } from './mailer.js';

const to = process.argv[2];
if (!to) {
  console.error('Pakai: node server/test-email.js tujuan@email.com');
  process.exit(1);
}

if (isDryRun) {
  console.error('DRY_RUN aktif atau SMTP_HOST kosong. Set DRY_RUN=0 dan isi SMTP di .env.');
  process.exit(1);
}

try {
  const result = await sendTestEmail(to);
  console.log('Terkirim:', result);
} catch (error) {
  console.error('Gagal:', error.message);
  process.exit(1);
}
