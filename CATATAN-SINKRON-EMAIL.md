# Catatan: sinkron data web → email GitHub Actions

Disimpan 2026-11-20. Token TIDAK disimpan di sini.

JANGAN pernah menempelkan token ke chat, file, atau screenshot. Kalau sudah
terlanjur, langsung revoke di https://github.com/settings/tokens lalu buat baru.

## Fakta penting
- Data web ada di `localStorage` browser. GitHub Actions tidak bisa membacanya.
- Jembatan: file `email-data.json` di root repo `mirzanaufalp/Claude-Sertif`.
- Saat aplikasi dibuka, web membaca `email-data.json` dari
  `raw.githubusercontent.com` (tanpa token). Jadi semua device melihat data yang
  sama. Device tanpa token hanya bisa membaca, tidak bisa menulis.
- Sinkronisasi menunggu data repo selesai dimuat, supaya device baru yang masih
  berisi data seed tidak menimpa data bersama.
- Script CI memakai `email-data.json` kalau ada; kalau tidak, fallback ke `DB_Sertifikasi HSE.xlsx`.
- Akun GitHub `Elyazid29` sudah ber-role **write** di repo. Tidak perlu ubah permission.
- Token fine-grained tidak bisa dipakai untuk repo personal milik akun lain. Pakai **classic token** scope `repo`.
- Token disimpan di `localStorage` browser, dikirim langsung ke `api.github.com`.

## Setup sekali
1. https://github.com/settings/tokens/new → note `sertif-web-sync`, centang scope `repo`, Generate token.
2. Buka web di origin yang sama dengan tempat data web diisi:
   https://claude-sertif-mirzanaufalps-projects.vercel.app
3. Menu **Reminder** → kartu **Sinkron Data ke GitHub**.
4. Tempel token di kolom pertama. Kolom repo tetap `mirzanaufalp/Claude-Sertif`.
5. Klik **Simpan**, lalu **Sinkron Sekarang**.
6. Status harus: `Berhasil: email-data.json diperbarui di mirzanaufalp/Claude-Sertif pukul ...`.

Setelah itu perubahan data di web otomatis menulis `email-data.json` (±4 detik).
Isi yang sama tidak ditulis ulang.

Workflow juga otomatis jalan saat `email-data.json` berubah (trigger push),
jadi email jatuh tempo langsung diproses tanpa klik Run workflow. Cron harian
08:00 WIB tetap menjadi jaring pengaman.

## Error umum
- `401` token salah/kedaluwarsa.
- `403` scope `repo` belum dicentang.
- `404` nama repo salah.
- Panel tidak muncul → `Ctrl+Shift+R`.

## Debug token (jalankan di folder repo, jangan tampilkan hasilnya di chat)
```
git credential fill
```
Input:
```
protocol=https
host=github.com

```
Token sudah tersimpan di Credential Manager; scope saat ini `gist, repo, workflow`.

## Setelah sinkron berhasil
- Cek file `email-data.json` di repo.
- Jalankan ulang workflow **Tes Email SMTP** dengan `to` + `nama`.
- Cek log: `[ci] sumber data: email-data.json (unduhan web ...)`.
