# SIM-K3 MINING v2.0

Sistem Pendataan Sertifikasi K3 & Operasional Pertambangan (POP â€¢ POM â€¢ POU â€¢ SMPKP).
Dibangun dengan Streamlit + CSS Custom + Plotly + SQLite.

## Fitur Utama

1. **Dashboard Analytics**
   - Ringkasan statistik 6 indikator utama (Total Pegawai, POP, POM, POU, SMPKP, Perlu Perpanjangan).
   - Grafik distribusi sertifikasi per departemen.
   - Grafik pie status keaktifan sertifikat (Aktif Normal, Akan Expired <90 hari, Sudah Expired).
   - Alert peringatan perpanjangan otomatis.

2. **Data Pegawai & Sertifikat**
   - Pencarian NIK, Nama, Jabatan.
   - Filter Departemen, Site Location, dan Jenis/Status Sertifikasi.
   - Fitur Tambah Data Pegawai dengan form lengkap 4 sertifikasi.
   - Fitur Edit, Detail, dan Hapus pegawai.
   - Export Data ke **Excel**, **CSV**, dan **PDF**.
   - Import Data dari file Excel (`.xlsx`).

3. **Matriks Kompetensi**
   - Pemetaan kompetensi seluruh pegawai untuk sertifikasi POP, POM, POU, dan SMPKP secara visual.

4. **Pusat Peringatan Kadaluarsa (Warning Center)**
   - Daftar otomatis seluruh sertifikat yang akan kadaluarsa (<90 hari) atau sudah expired.
   - Tombol perpanjangan/update cepat untuk setiap sertifikat.

5. **Pengaturan Database**
   - Backup & Restore database `.db`.
   - Reset database ke data sampel awal.

## Cara Menjalankan

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Jalankan aplikasi:
   ```bash
   streamlit run app.py
   ```

## Aplikasi React (UI utama)

```bash
npm install
npm run dev        # web: http://localhost:5173
npm run server     # API + cron email: http://localhost:4000
```

Atau jalankan keduanya sekaligus:

```bash
npm run dev:full
```

## Import Excel Data Pegawai / Pelatihan / Sertifikasi

Tombol **Import Excel** di menu *Data Personil* dan *Master Data* memakai parser
yang sama (`src/lib/excelImport.ts`):

- **Tanpa duplikat**: identitas pegawai = `ID_PERSONIL`, fallback nama (kapital,
  spasi dinormalisasi). Data yang sudah ada diperbarui, bukan ditambah ulang.
- **Multi-sertifikat**: `SERT_PPP` seperti `POP, POM, POU` dipecah menjadi tiga
  pelatihan + tiga sertifikasi.
- **Tanggal dari teks Excel**: `TGL_EXPIRED_PPP` bertipe teks
  `Tanggal Expired POP : 30 Juli 2030` (boleh multiline) dipetakan per jenis.
- **Kolom Mulai/Selesai Pelatihan**: hanya memakai `TANGGAL_MULAI`/`TANGGAL_SELESAI`
  yang benar-benar ada di Excel. Tidak ada tanggal yang dikarang: bila Excel
  kosong, kolom menampilkan `belum ada data`.
- **Data lama dirapikan**: ID acak/duplikat hasil import versi sebelumnya
  dinormalisasi ke format `PEL_<ID_PERSONIL>_<JENIS>` dan
  `SERT_<ID_PERSONIL>_<JENIS>` sebelum digabung.
- **Backfill otomatis saat aplikasi dibuka** (`migrateLegacyData`): data lama
  yang tanggal pelatihannya kosong diisi dari tanggal expired sertifikat
  tertaut, termasuk mengubah teks tanggal mentah menjadi `YYYY-MM-DD`.
  Proses idempoten (dijalankan berulang hasilnya sama).

## Reminder Email Otomatis H-90 Hari

Backend `server/` mengirim email otomatis ke `EMAIL_PERSONIL` pemilik sertifikat
saat tanggal hari ini sudah melewati **H-90 hari sebelum `TANGGAL_EXPIRED`**
dan sertifikat belum kedaluwarsa. Tidak perlu klik tombol.

Pemicu otomatis:
1. **Cron harian** pukul 08:00 (`Asia/Jakarta`), diatur `CRON_SCHEDULE`.
2. **Saat server dinyalakan** (5 detik setelah start) — mengejar jadwal yang
   terlewat bila komputer/server baru hidup siang hari.
3. **Berkala setiap `CHECK_INTERVAL_MINUTES`** (default 60 menit) selama server
   hidup. Berguna bila laptop sempat sleep/suspend.

Matikan otomatis dengan `AUTO_SEND=0` (mis. saat ingin kirim manual saja).
Pengunci internal mencegah email dobel bila cron, interval, dan klik admin
berjalan bersamaan.

- **Satu email per pegawai per proses kirim**: semua sertifikat milik pegawai
  yang jatuh tempo digabung dalam satu email (bukan satu email per sertifikat).
- Setiap sertifikat hanya dikirimi sekali per tanggal expired, dicatat di
  `server/data/sent-log.json` (hanya mode SMTP nyata; mode uji tidak dicatat).
- **Uji jendela H-90 tanpa menunggu 3 bulan**: pakai panel *Uji Jendela H-90*
  di menu Reminder, atau endpoint `preview`/`send` dengan `date`.

### Simulasi tanggal H-90

```bash
# lihat sertifikat yang masuk jendela H-90 pada tanggal tertentu
curl "http://localhost:4000/api/reminders/preview?date=2027-09-01"

# kirim simulasi pada tanggal tersebut (hanya saat mode dry-run/Ethereal)
curl -X POST http://localhost:4000/api/reminders/send \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"2027-09-01\"}"
```

Parameter `date` ditolak saat mode SMTP nyata agar tidak salah kirim massal.

### Setup

1. Salin konfigurasi:
   ```bash
   copy .env.example .env
   ```
2. Isi SMTP di `.env`. Contoh Gmail (butuh **App Password**, bukan password akun):
   ```env
   DRY_RUN=0
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=akun@gmail.com
   SMTP_PASS=app-password-16-digit
   MAIL_FROM=SIM-K3 Mining <akun@gmail.com>
   ```
3. Jalankan `npm run server` (atau `npm run dev:full`).

4. Tes kirim email (setelah `.env` diisi):
   ```bash
   npm run email:test -- email-tujuan@gmail.com
   ```

### Setup Gmail otomatis (satu perintah)

```bash
npm run email:gmail -- alamat@gmail.com apppassword16digit
```

Perintah ini menulis `SMTP_*` ke `.env`, mematikan `ETHEREAL`/`DRY_RUN`, lalu
mengirim email tes. Restart `npm run server` setelah berhasil.

### Mode Ethereal (uji tanpa kredensial)

Set `ETHEREAL=1` di `.env`: email dikirim lewat SMTP uji Nodemailer, tidak masuk
inbox asli, tetapi punya link preview (`https://ethereal.email/message/...`)
yang muncul di UI setelah kirim. Mode uji tidak mencatat `sent-log`, jadi tidak
memblokir pengiriman produksi.

**Gmail App Password:** aktifkan 2-Step Verification, buka
https://myaccount.google.com/apppasswords, buat App Password, lalu isi 16 digit
itu ke `SMTP_PASS` (bukan password akun). Cek juga folder Spam/Promotions.

**Mode DRY RUN** (default, `DRY_RUN=1` atau `SMTP_HOST` kosong): email tidak
dikirim sungguhan, hasilnya disimpan sebagai file `.eml` di
`server/data/outbox/` untuk diperiksa.

### Produksi di Vercel (email lewat GitHub Actions)

Vercel hanya menjalankan frontend statis (`vercel.json`: `npm run build` → `dist`).
Express + cron di `server/` **tidak** ikut ter-deploy, jadi pengiriman email
production dijalankan oleh workflow GitHub Actions:

`.github/workflows/email-reminder.yml`
- Jadwal `0 1 * * *` UTC = **08:00 WIB** setiap hari.
- Bisa dijalankan manual: tab **Actions** → **Email Reminder H-90** → **Run workflow**.
- Membaca `DB_Sertifikasi HSE.xlsx` dari repo, regenerate `seedFromExcel.ts`,
  lalu mengirim satu email per pegawai untuk sertifikat dalam jendela H-90.
- `sent-log.json` disimpan sebagai cache Actions agar sertifikat yang sama tidak
  dikirim ulang.

Setup sekali:

1. Repo → **Settings** → **Secrets and variables** → **Actions** → **Secrets**:
   - `SMTP_USER` = alamat Gmail pengirim
   - `SMTP_PASS` = Gmail App Password 16 digit
2. Opsional, tab **Variables**:
   - `APP_BASE_URL` = URL production, mis. `https://claude-sertif.vercel.app`
3. Buka tab **Actions** → **Email Reminder H-90** → **Run workflow** untuk tes.
4. Untuk memastikan SMTP benar-benar terkirim, **Run workflow** dengan input
   `test_email` = alamat tujuan. Untuk melihat template reminder tanpa menunggu
   H-90, isi `force_cert_id`, mis. `SERT_9217_POP`, dan `test_reminder_email`
   = alamat tujuan uji (tidak menandai sent-log, tidak mengubah Excel).
5. Kalau log workflow muncul `535 BadCredentials`, App Password sudah salah atau
   di-revoke. Buat yang baru di https://myaccount.google.com/apppasswords lalu
   perbarui secret `SMTP_PASS`. Cek kredensial lokal tanpa mengirim email:
   ```
   npm run email:verify
   ```
   Hasil `OK` berarti kredensial `.env` valid; hasil `GAGAL` berarti App Password
   harus diganti.

Cara paling pasti untuk uji kirim: workflow **Tes Email SMTP** di
`.github/workflows/email-test.yml`. Kolom `to` wajib diisi, jadi tidak mungkin
jalankan tanpa alamat tujuan:
https://github.com/mirzanaufalp/Claude-Sertif/actions/workflows/email-test.yml

Run manual pada **Email Reminder H-90** tanpa input sekarang akan gagal dengan
pesan `Run manual tanpa input` — sebelumnya terlihat sukses padahal tidak ada
email yang dikirim.

Reminder production hanya membaca sertifikasi dari Excel di repo. Perubahan yang
dilakukan lewat UI di browser tersimpan di `localStorage` masing-masing dan
**tidak** sampai ke GitHub Actions.

Catatan:
- Kalau cache Actions kedaluwarsa/dibersihkan, `sent-log.json` hilang dan
  reminder yang masih di jendela H-90 bisa terkirim ulang. Jalankan manual
  setelah mengubah data untuk memastikan.
- Di domain Vercel, panel status menampilkan info GitHub Actions dan tombol kirim
  manual disembunyikan (tidak ada backend yang bisa dipanggil dari browser).
  Pengiriman tetap berjalan dari GitHub Actions.

### Endpoint

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/health` | Status server, mode email, jadwal cron |
| POST | `/api/sync` | Sinkronisasi data personil/pelatihan/sertifikasi dari web |
| GET | `/api/reminders` | Daftar reminder jatuh tempo (pending & terkirim) |
| GET | `/api/reminders/preview` | Preview jendela H-90 untuk tanggal simulasi (`?date=YYYY-MM-DD`) |
| POST | `/api/reminders/send` | Kirim reminder (`{ certIds }`, `{ keys }`, `{ date }` untuk simulasi, atau `{}` = semua) |
| POST | `/api/email/test` | Tes koneksi email (`{ "to": "email@domain.com" }`) |

Konfigurasi lain: `REMINDER_DAYS` (default `90`), `CRON_SCHEDULE`,
`CRON_TIMEZONE`, `AUTO_SEND` (default `1`), `CHECK_INTERVAL_MINUTES`
(default `60`), `APP_BASE_URL`, `PORT`.


