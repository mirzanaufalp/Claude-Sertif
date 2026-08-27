# SIM-K3 MINING v2.0

Sistem Pendataan Sertifikasi K3 & Operasional Pertambangan (POP • POM • POU • SMPKP).
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
