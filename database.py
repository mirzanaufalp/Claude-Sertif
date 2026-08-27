"""
database.py
Modul ini menangani semua operasi database SQLite untuk aplikasi SIM-K3 MINING.
Sistem Pendataan Sertifikasi K3 & Operasional Pertambangan (POP, POM, POU, SMPKP).
"""

import sqlite3
import pandas as pd
from datetime import datetime, date
import os
import shutil

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "karyawan.db")

DEPARTEMEN_LIST = [
    "GGD",
    "GM",
    "HSSE",
    "Eksplorasi",
    "Geofisika & Pengukuran",
    "Drilling",
    "EPMD",
    "Laboratorium",
    "Operations / Mining",
    "HSE / K3LH",
    "Maintenance / Plant",
    "Management",
    "Geology & Exploration",
    "Logistics & Supply Chain"
]

SITE_LIST = [
    "Head Office",
    "Site Pit Batubara A",
    "Site Workshop B",
    "Site Processing Plant",
    "Port & Jetty Site"
]

STATUS_SERTIFIKAT_LIST = ["Belum Ada", "Dalam Proses", "Aktif", "Akan Expired", "Expired"]
TIPE_SMPKP_LIST = ["Belum Ada", "Auditor Internal", "Auditor Eksternal", "Implementator"]

MONTHS = {
    'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
    'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
    'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
}

def parse_date(date_str):
    if not isinstance(date_str, str) or not date_str.strip():
        return ''
    import re
    m = re.search(r'(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})', date_str)
    if m:
        day, month_str, year = m.groups()
        month = MONTHS.get(month_str.lower(), '01')
        return f'{year}-{month}-{int(day):02d}'
    return str(date_str).split(' ')[0]

def extract_cert_expirations(exp_text):
    res = {}
    if not isinstance(exp_text, str) or not exp_text.strip():
        return res
    import re
    lines = exp_text.split('\n')
    for line in lines:
        line = line.strip()
        m = re.search(r'Tanggal\s+Expired\s+(POP|POM|POU|SMPKP|SMKP)\s*:\s*(.*)', line, re.IGNORECASE)
        if m:
            cert_type = m.group(1).upper()
            if cert_type == 'SMKP': cert_type = 'SMPKP'
            d_str = parse_date(m.group(2))
            if d_str:
                res[cert_type] = d_str
    return res

def parse_excel_karyawan(df: pd.DataFrame) -> list:
    cols = [str(c).upper() for c in df.columns]
    records = []
    seen_niks = set()

    if 'ID_PERSONIL' in cols or 'SERT_PPP' in cols or 'DIVISI_DEPARTEMEN' in cols:
        for idx, r in df.iterrows():
            id_personil = r.get('ID_PERSONIL')
            if pd.notna(id_personil) and str(id_personil).strip():
                try:
                    nik = str(int(float(id_personil)))
                except ValueError:
                    nik = str(id_personil).strip()
            else:
                nik = f'NIK-{idx+1:04d}'

            base_nik = nik
            counter = 1
            while nik in seen_niks:
                nik = f'{base_nik}-{counter}'
                counter += 1
            seen_niks.add(nik)

            nama = str(r.get('NAMA', '')).strip() if pd.notna(r.get('NAMA')) else ''
            jabatan = str(r.get('JABATAN', '')).strip() if pd.notna(r.get('JABATAN')) else '-'
            dept = str(r.get('DIVISI_DEPARTEMEN', '')).strip() if pd.notna(r.get('DIVISI_DEPARTEMEN')) else 'Geology & Exploration'
            email = str(r.get('EMAIL_PERSONIL', '')).strip() if pd.notna(r.get('EMAIL_PERSONIL')) else ''

            sert_ppp = str(r.get('SERT_PPP', '')).upper() if pd.notna(r.get('SERT_PPP')) else ''
            exp_ppp = extract_cert_expirations(r.get('TGL_EXPIRED_PPP'))

            pop_status = 'Aktif' if 'POP' in sert_ppp else 'Belum Ada'
            pop_exp = exp_ppp.get('POP', '')

            pom_status = 'Aktif' if 'POM' in sert_ppp else 'Belum Ada'
            pom_exp = exp_ppp.get('POM', '')

            pou_status = 'Aktif' if 'POU' in sert_ppp else 'Belum Ada'
            pou_exp = exp_ppp.get('POU', '')

            sert_smkp = str(r.get('SERT_SMKP', '')).strip() if pd.notna(r.get('SERT_SMKP')) else ''
            ket_smkp = str(r.get('KETERANGAN_SMKP', '')).strip() if pd.notna(r.get('KETERANGAN_SMKP')) else ''

            if sert_smkp:
                smpkp_status = 'Aktif'
                smpkp_tipe = f'{sert_smkp} {ket_smkp}'.strip()
            else:
                smpkp_status = 'Belum Ada'
                smpkp_tipe = 'Belum Ada'

            records.append({
                'nik': nik, 'nama': nama, 'jabatan': jabatan, 'departemen': dept,
                'site': 'Head Office', 'email': email, 'telepon': '',
                'pop_status': pop_status, 'pop_no': '', 'pop_lembaga': '', 'pop_tgl_terbit': '', 'pop_tgl_kadaluarsa': pop_exp,
                'pom_status': pom_status, 'pom_no': '', 'pom_lembaga': '', 'pom_tgl_terbit': '', 'pom_tgl_kadaluarsa': pom_exp,
                'pou_status': pou_status, 'pou_no': '', 'pou_lembaga': '', 'pou_tgl_terbit': '', 'pou_tgl_kadaluarsa': pou_exp,
                'smpkp_status': smpkp_status, 'smpkp_tipe': smpkp_tipe, 'smpkp_no': '', 'smpkp_lembaga': '', 'smpkp_tgl_terbit': '', 'smpkp_tgl_kadaluarsa': ''
            })
    else:
        for idx, r in df.iterrows():
            records.append({
                'nik': str(r.get('nik', f'NIK-{idx+1:04d}')),
                'nama': str(r.get('nama', '')),
                'jabatan': str(r.get('jabatan', '')),
                'departemen': str(r.get('departemen', '')),
                'site': str(r.get('site', 'Head Office')),
                'email': str(r.get('email', '')),
                'telepon': str(r.get('telepon', '')),
                'pop_status': str(r.get('pop_status', 'Belum Ada')),
                'pop_no': str(r.get('pop_no', '')),
                'pop_lembaga': str(r.get('pop_lembaga', '')),
                'pop_tgl_terbit': str(r.get('pop_tgl_terbit', '')),
                'pop_tgl_kadaluarsa': str(r.get('pop_tgl_kadaluarsa', '')),
                'pom_status': str(r.get('pom_status', 'Belum Ada')),
                'pom_no': str(r.get('pom_no', '')),
                'pom_lembaga': str(r.get('pom_lembaga', '')),
                'pom_tgl_terbit': str(r.get('pom_tgl_terbit', '')),
                'pom_tgl_kadaluarsa': str(r.get('pom_tgl_kadaluarsa', '')),
                'pou_status': str(r.get('pou_status', 'Belum Ada')),
                'pou_no': str(r.get('pou_no', '')),
                'pou_lembaga': str(r.get('pou_lembaga', '')),
                'pou_tgl_terbit': str(r.get('pou_tgl_terbit', '')),
                'pou_tgl_kadaluarsa': str(r.get('pou_tgl_kadaluarsa', '')),
                'smpkp_status': str(r.get('smpkp_status', 'Belum Ada')),
                'smpkp_tipe': str(r.get('smpkp_tipe', 'Belum Ada')),
                'smpkp_no': str(r.get('smpkp_no', '')),
                'smpkp_lembaga': str(r.get('smpkp_lembaga', '')),
                'smpkp_tgl_terbit': str(r.get('smpkp_tgl_terbit', '')),
                'smpkp_tgl_kadaluarsa': str(r.get('smpkp_tgl_kadaluarsa', '')),
            })
    return records


INITIAL_EMPLOYEES = [
    {
        "nik": "317101001290001",
        "nama": "Budi Santoso",
        "jabatan": "Superintendent Mining",
        "departemen": "Operations / Mining",
        "site": "Site Pit Batubara A",
        "email": "budi.santoso@mining.co.id",
        "telepon": "081234567890",
        "pop_status": "Aktif", "pop_no": "5420.POP/LSP-PERTABIT/2021", "pop_lembaga": "LSP Pertabit", "pop_tgl_terbit": "2021-03-15", "pop_tgl_kadaluarsa": "2026-03-15",
        "pom_status": "Aktif", "pom_no": "8112.POM/LSP-ESDM/2023", "pom_lembaga": "PPSDM Minerba ESDM", "pom_tgl_terbit": "2023-08-10", "pom_tgl_kadaluarsa": "2028-08-10",
        "pou_status": "Belum Ada", "pou_no": "", "pou_lembaga": "", "pou_tgl_terbit": "", "pou_tgl_kadaluarsa": "",
        "smpkp_status": "Aktif", "smpkp_tipe": "Auditor Internal", "smpkp_no": "SMPKP-AUD/2022/089", "smpkp_lembaga": "Direktorat Teknik Pertambangan ESDM", "smpkp_tgl_terbit": "2022-05-20", "smpkp_tgl_kadaluarsa": "2027-05-20"
    },
    {
        "nik": "317101001290002",
        "nama": "Ahmad Dahlan",
        "jabatan": "Manager HSE & K3LH",
        "departemen": "HSE / K3LH",
        "site": "Head Office",
        "email": "ahmad.dahlan@mining.co.id",
        "telepon": "081398765432",
        "pop_status": "Expired", "pop_no": "2210.POP/LSP-ESDM/2018", "pop_lembaga": "PPSDM Minerba ESDM", "pop_tgl_terbit": "2018-01-10", "pop_tgl_kadaluarsa": "2023-01-10",
        "pom_status": "Aktif", "pom_no": "4412.POM/LSP-PERTABIT/2020", "pom_lembaga": "LSP Pertabit", "pom_tgl_terbit": "2020-04-12", "pom_tgl_kadaluarsa": "2025-04-12",
        "pou_status": "Akan Expired", "pou_no": "1099.POU/LSP-ESDM/2021", "pou_lembaga": "PPSDM Minerba ESDM", "pou_tgl_terbit": "2021-09-01", "pou_tgl_kadaluarsa": "2026-09-01",
        "smpkp_status": "Akan Expired", "smpkp_tipe": "Auditor Eksternal", "smpkp_no": "SMPKP-AUD/2021/012", "smpkp_lembaga": "PPSDM Minerba ESDM", "smpkp_tgl_terbit": "2021-08-25", "smpkp_tgl_kadaluarsa": "2026-08-25"
    },
    {
        "nik": "320102004890005",
        "nama": "Rina Wijaya",
        "jabatan": "Supervisor Plant & Maintenance",
        "departemen": "Maintenance / Plant",
        "site": "Site Workshop B",
        "email": "rina.wijaya@mining.co.id",
        "telepon": "081122334455",
        "pop_status": "Akan Expired", "pop_no": "9921.POP/LSP-PERTABIT/2021", "pop_lembaga": "LSP Pertabit", "pop_tgl_terbit": "2021-09-15", "pop_tgl_kadaluarsa": "2026-09-15",
        "pom_status": "Dalam Proses", "pom_no": "DAFTAR-POM-2026-04", "pom_lembaga": "LSP ESDM", "pom_tgl_terbit": "", "pom_tgl_kadaluarsa": "",
        "pou_status": "Belum Ada", "pou_no": "", "pou_lembaga": "", "pou_tgl_terbit": "", "pou_tgl_kadaluarsa": "",
        "smpkp_status": "Belum Ada", "smpkp_tipe": "Belum Ada", "smpkp_no": "", "smpkp_lembaga": "", "smpkp_tgl_terbit": "", "smpkp_tgl_kadaluarsa": ""
    },
    {
        "nik": "330205007910008",
        "nama": "Dedi Kurniawan",
        "jabatan": "Foreman Mining Operations",
        "departemen": "Operations / Mining",
        "site": "Site Pit Batubara A",
        "email": "dedi.kurniawan@mining.co.id",
        "telepon": "085678901234",
        "pop_status": "Expired", "pop_no": "1102.POP/LSP-PERTABIT/2019", "pop_lembaga": "LSP Pertabit", "pop_tgl_terbit": "2019-02-10", "pop_tgl_kadaluarsa": "2024-02-10",
        "pom_status": "Belum Ada", "pom_no": "", "pom_lembaga": "", "pom_tgl_terbit": "", "pom_tgl_kadaluarsa": "",
        "pou_status": "Belum Ada", "pou_no": "", "pou_lembaga": "", "pou_tgl_terbit": "", "pou_tgl_kadaluarsa": "",
        "smpkp_status": "Aktif", "smpkp_tipe": "Implementator", "smpkp_no": "SMPKP-IMP/2023/112", "smpkp_lembaga": "Internal Mining Corp", "smpkp_tgl_terbit": "2023-01-15", "smpkp_tgl_kadaluarsa": "2028-01-15"
    },
    {
        "nik": "350412009880003",
        "nama": "Hendra Saputra",
        "jabatan": "General Manager Operations",
        "departemen": "Management",
        "site": "Head Office",
        "email": "hendra.s@mining.co.id",
        "telepon": "081299887766",
        "pop_status": "Expired", "pop_no": "0012.POP/LSP-ESDM/2015", "pop_lembaga": "PPSDM Minerba ESDM", "pop_tgl_terbit": "2015-05-10", "pop_tgl_kadaluarsa": "2020-05-10",
        "pom_status": "Expired", "pom_no": "0045.POM/LSP-ESDM/2018", "pom_lembaga": "PPSDM Minerba ESDM", "pom_tgl_terbit": "2018-06-20", "pom_tgl_kadaluarsa": "2023-06-20",
        "pou_status": "Aktif", "pou_no": "0088.POU/LSP-ESDM/2022", "pou_lembaga": "PPSDM Minerba ESDM", "pou_tgl_terbit": "2022-11-10", "pou_tgl_kadaluarsa": "2027-11-10",
        "smpkp_status": "Aktif", "smpkp_tipe": "Auditor Eksternal", "smpkp_no": "SMPKP-AUD/2022/001", "smpkp_lembaga": "ESDM", "smpkp_tgl_terbit": "2022-12-01", "smpkp_tgl_kadaluarsa": "2027-12-01"
    },
    {
        "nik": "360105003920002",
        "nama": "Siti Rahmawati",
        "jabatan": "Safety Officer / K3",
        "departemen": "HSE / K3LH",
        "site": "Site Pit Batubara A",
        "email": "siti.rahma@mining.co.id",
        "telepon": "082144556677",
        "pop_status": "Aktif", "pop_no": "6021.POP/LSP-PERTABIT/2022", "pop_lembaga": "LSP Pertabit", "pop_tgl_terbit": "2022-07-14", "pop_tgl_kadaluarsa": "2027-07-14",
        "pom_status": "Belum Ada", "pom_no": "", "pom_lembaga": "", "pom_tgl_terbit": "", "pom_tgl_kadaluarsa": "",
        "pou_status": "Belum Ada", "pou_no": "", "pou_lembaga": "", "pou_tgl_terbit": "", "pou_tgl_kadaluarsa": "",
        "smpkp_status": "Aktif", "smpkp_tipe": "Auditor Internal", "smpkp_no": "SMPKP-AUD/2023/301", "smpkp_lembaga": "PPSDM Minerba", "smpkp_tgl_terbit": "2023-03-20", "smpkp_tgl_kadaluarsa": "2028-03-20"
    }
]
def get_all_karyawan():
    df = pd.read_excel('DB_Sertifikasi HSE.xlsx')
    df = df.fillna('')
    return df

def calculate_days_remaining(tgl_kadaluarsa_str: str):
    """Menghitung sisa hari sebelum kadaluarsa."""
    if not tgl_kadaluarsa_str:
        return None
    try:
        exp_date = datetime.strptime(str(tgl_kadaluarsa_str).split(" ")[0], "%Y-%m-%d").date()
        today = date.today()
        return (exp_date - today).days
    except Exception:
        return None


def get_auto_cert_status(input_status: str, tgl_kadaluarsa_str: str) -> str:
    """Otomatis menentukan status keaktifan sertifikat berdasarkan tanggal kadaluarsa."""
    if input_status in ("Belum Ada", "Dalam Proses"):
        return input_status
    days = calculate_days_remaining(tgl_kadaluarsa_str)
    if days is None:
        return input_status or "Aktif"
    if days < 0:
        return "Expired"
    if days <= 90:
        return "Akan Expired"
    return "Aktif"


class DatabaseManager:
    """Mengelola operasi SQLite database untuk SIM-K3 MINING."""

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Membuat tabel employees baru jika belum ada dan seed data awal."""
        conn = self._get_connection()
        cur = conn.cursor()
        
        # Cek apakah tabel employees lama ada tapi belum punya kolom 'site'
        cur.execute("PRAGMA table_info(employees)")
        existing_cols = [row[1] for row in cur.fetchall()]
        if existing_cols and "site" not in existing_cols:
            cur.execute("DROP TABLE employees")
            conn.commit()

        # Buat tabel employees dengan skema SIM-K3 Pertambangan
        cur.execute("""
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nik TEXT UNIQUE NOT NULL,
                nama TEXT NOT NULL,
                jabatan TEXT,
                departemen TEXT,
                site TEXT,
                email TEXT,
                telepon TEXT,
                pop_status TEXT,
                pop_no TEXT,
                pop_lembaga TEXT,
                pop_tgl_terbit TEXT,
                pop_tgl_kadaluarsa TEXT,
                pom_status TEXT,
                pom_no TEXT,
                pom_lembaga TEXT,
                pom_tgl_terbit TEXT,
                pom_tgl_kadaluarsa TEXT,
                pou_status TEXT,
                pou_no TEXT,
                pou_lembaga TEXT,
                pou_tgl_terbit TEXT,
                pou_tgl_kadaluarsa TEXT,
                smpkp_status TEXT,
                smpkp_tipe TEXT,
                smpkp_no TEXT,
                smpkp_lembaga TEXT,
                smpkp_tgl_terbit TEXT,
                smpkp_tgl_kadaluarsa TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        """)
        conn.commit()

        # Cek jika tabel masih kosong atau hanya berisi data awal 6 baris, seed data dari Excel
        cur.execute("SELECT COUNT(*) FROM employees")
        count = cur.fetchone()[0]
        if count < 10:
            cur.execute("DELETE FROM employees")
            conn.commit()
            self._seed_initial_data(conn)

        conn.close()

    def _seed_initial_data(self, conn):
        """Mengisi data awal ke database dari Excel DB_Sertifikasi HSE.xlsx jika ada, atau INITIAL_EMPLOYEES."""
        cur = conn.cursor()
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        excel_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "DB_Sertifikasi HSE.xlsx")
        items_to_insert = []
        if os.path.exists(excel_file):
            try:
                df_excel = pd.read_excel(excel_file)
                items_to_insert = parse_excel_karyawan(df_excel)
            except Exception as e:
                items_to_insert = INITIAL_EMPLOYEES
        else:
            items_to_insert = INITIAL_EMPLOYEES

        for item in items_to_insert:
            pop_st = get_auto_cert_status(item.get("pop_status", "Belum Ada"), item.get("pop_tgl_kadaluarsa", ""))
            pom_st = get_auto_cert_status(item.get("pom_status", "Belum Ada"), item.get("pom_tgl_kadaluarsa", ""))
            pou_st = get_auto_cert_status(item.get("pou_status", "Belum Ada"), item.get("pou_tgl_kadaluarsa", ""))
            smpkp_st = get_auto_cert_status(item.get("smpkp_status", "Belum Ada"), item.get("smpkp_tgl_kadaluarsa", ""))

            cur.execute("""
                INSERT OR REPLACE INTO employees (
                    nik, nama, jabatan, departemen, site, email, telepon,
                    pop_status, pop_no, pop_lembaga, pop_tgl_terbit, pop_tgl_kadaluarsa,
                    pom_status, pom_no, pom_lembaga, pom_tgl_terbit, pom_tgl_kadaluarsa,
                    pou_status, pou_no, pou_lembaga, pou_tgl_terbit, pou_tgl_kadaluarsa,
                    smpkp_status, smpkp_tipe, smpkp_no, smpkp_lembaga, smpkp_tgl_terbit, smpkp_tgl_kadaluarsa,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item.get("nik"), item.get("nama"), item.get("jabatan"), item.get("departemen"), item.get("site", "Head Office"), item.get("email"), item.get("telepon", ""),
                pop_st, item.get("pop_no", ""), item.get("pop_lembaga", ""), item.get("pop_tgl_terbit", ""), item.get("pop_tgl_kadaluarsa", ""),
                pom_st, item.get("pom_no", ""), item.get("pom_lembaga", ""), item.get("pom_tgl_terbit", ""), item.get("pom_tgl_kadaluarsa", ""),
                pou_st, item.get("pou_no", ""), item.get("pou_lembaga", ""), item.get("pou_tgl_terbit", ""), item.get("pou_tgl_kadaluarsa", ""),
                smpkp_st, item.get("smpkp_tipe", "Belum Ada"), item.get("smpkp_no", ""), item.get("smpkp_lembaga", ""), item.get("smpkp_tgl_terbit", ""), item.get("smpkp_tgl_kadaluarsa", ""),
                now, now
            ))
        conn.commit()

    def tambah_karyawan(self, data: dict) -> tuple:
        """Menambahkan data pegawai baru."""
        try:
            conn = self._get_connection()
            cur = conn.cursor()
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            pop_stat = get_auto_cert_status(data.get("pop_status", "Belum Ada"), data.get("pop_tgl_kadaluarsa"))
            pom_stat = get_auto_cert_status(data.get("pom_status", "Belum Ada"), data.get("pom_tgl_kadaluarsa"))
            pou_stat = get_auto_cert_status(data.get("pou_status", "Belum Ada"), data.get("pou_tgl_kadaluarsa"))
            smpkp_stat = get_auto_cert_status(data.get("smpkp_status", "Belum Ada"), data.get("smpkp_tgl_kadaluarsa"))

            cur.execute("""
                INSERT INTO employees (
                    nik, nama, jabatan, departemen, site, email, telepon,
                    pop_status, pop_no, pop_lembaga, pop_tgl_terbit, pop_tgl_kadaluarsa,
                    pom_status, pom_no, pom_lembaga, pom_tgl_terbit, pom_tgl_kadaluarsa,
                    pou_status, pou_no, pou_lembaga, pou_tgl_terbit, pou_tgl_kadaluarsa,
                    smpkp_status, smpkp_tipe, smpkp_no, smpkp_lembaga, smpkp_tgl_terbit, smpkp_tgl_kadaluarsa,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data.get("nik"), data.get("nama"), data.get("jabatan"), data.get("departemen"),
                data.get("site"), data.get("email"), data.get("telepon"),
                pop_stat, data.get("pop_no"), data.get("pop_lembaga"), data.get("pop_tgl_terbit"), data.get("pop_tgl_kadaluarsa"),
                pom_stat, data.get("pom_no"), data.get("pom_lembaga"), data.get("pom_tgl_terbit"), data.get("pom_tgl_kadaluarsa"),
                pou_stat, data.get("pou_no"), data.get("pou_lembaga"), data.get("pou_tgl_terbit"), data.get("pou_tgl_kadaluarsa"),
                smpkp_stat, data.get("smpkp_tipe", "Belum Ada"), data.get("smpkp_no"), data.get("smpkp_lembaga"), data.get("smpkp_tgl_terbit"), data.get("smpkp_tgl_kadaluarsa"),
                now, now
            ))
            conn.commit()
            conn.close()
            return True, "Data pegawai berhasil disimpan."
        except sqlite3.IntegrityError:
            return False, f"NIK '{data.get('nik')}' sudah terdaftar. Gunakan NIK lain."
        except Exception as e:
            return False, f"Terjadi kesalahan: {e}"

    def get_all_karyawan(self) -> pd.DataFrame:
        """Mengambil seluruh data pegawai sebagai DataFrame."""
        conn = self._get_connection()
        df = pd.read_sql_query("SELECT * FROM employees ORDER BY id DESC", conn)
        conn.close()
        
        # Recalculate dynamic statuses
        if not df.empty:
            for key in ["pop", "pom", "pou", "smpkp"]:
                status_col = f"{key}_status"
                exp_col = f"{key}_tgl_kadaluarsa"
                if status_col in df.columns and exp_col in df.columns:
                    df[status_col] = df.apply(
                        lambda r: get_auto_cert_status(r[status_col], r[exp_col]), axis=1
                    )
        return df

    def get_karyawan_by_id(self, emp_id: int) -> dict:
        """Mengambil satu data pegawai berdasarkan id."""
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM employees WHERE id = ?", (emp_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        for key in ["pop", "pom", "pou", "smpkp"]:
            d[f"{key}_status"] = get_auto_cert_status(d.get(f"{key}_status"), d.get(f"{key}_tgl_kadaluarsa"))
        return d

    def cari_filter_karyawan(self, keyword="", departemen="Semua", site="Semua", cert_filter="Semua") -> pd.DataFrame:
        """Mencari dan memfilter data pegawai."""
        df = self.get_all_karyawan()
        if df.empty:
            return df

        if keyword:
            kw = keyword.lower()
            df = df[
                df["nama"].str.lower().str.contains(kw, na=False) |
                df["nik"].astype(str).str.lower().str.contains(kw, na=False) |
                df["jabatan"].str.lower().str.contains(kw, na=False)
            ]

        if departemen and departemen != "Semua":
            df = df[df["departemen"] == departemen]

        if site and site != "Semua":
            df = df[df["site"] == site]

        if cert_filter and cert_filter != "Semua":
            if cert_filter == "POP":
                df = df[df["pop_status"].isin(["Aktif", "Akan Expired"])]
            elif cert_filter == "POM":
                df = df[df["pom_status"].isin(["Aktif", "Akan Expired"])]
            elif cert_filter == "POU":
                df = df[df["pou_status"].isin(["Aktif", "Akan Expired"])]
            elif cert_filter == "SMPKP":
                df = df[df["smpkp_status"].isin(["Aktif", "Akan Expired"])]
            elif cert_filter == "ExpiringSoon":
                df = df[
                    (df["pop_status"] == "Akan Expired") |
                    (df["pom_status"] == "Akan Expired") |
                    (df["pou_status"] == "Akan Expired") |
                    (df["smpkp_status"] == "Akan Expired")
                ]
            elif cert_filter == "Expired":
                df = df[
                    (df["pop_status"] == "Expired") |
                    (df["pom_status"] == "Expired") |
                    (df["pou_status"] == "Expired") |
                    (df["smpkp_status"] == "Expired")
                ]

        return df

    def update_karyawan(self, emp_id: int, data: dict) -> tuple:
        """Memperbarui data pegawai."""
        try:
            conn = self._get_connection()
            cur = conn.cursor()
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            pop_stat = get_auto_cert_status(data.get("pop_status", "Belum Ada"), data.get("pop_tgl_kadaluarsa"))
            pom_stat = get_auto_cert_status(data.get("pom_status", "Belum Ada"), data.get("pom_tgl_kadaluarsa"))
            pou_stat = get_auto_cert_status(data.get("pou_status", "Belum Ada"), data.get("pou_tgl_kadaluarsa"))
            smpkp_stat = get_auto_cert_status(data.get("smpkp_status", "Belum Ada"), data.get("smpkp_tgl_kadaluarsa"))

            cur.execute("""
                UPDATE employees SET
                    nik=?, nama=?, jabatan=?, departemen=?, site=?, email=?, telepon=?,
                    pop_status=?, pop_no=?, pop_lembaga=?, pop_tgl_terbit=?, pop_tgl_kadaluarsa=?,
                    pom_status=?, pom_no=?, pom_lembaga=?, pom_tgl_terbit=?, pom_tgl_kadaluarsa=?,
                    pou_status=?, pou_no=?, pou_lembaga=?, pou_tgl_terbit=?, pou_tgl_kadaluarsa=?,
                    smpkp_status=?, smpkp_tipe=?, smpkp_no=?, smpkp_lembaga=?, smpkp_tgl_terbit=?, smpkp_tgl_kadaluarsa=?,
                    updated_at=?
                WHERE id=?
            """, (
                data.get("nik"), data.get("nama"), data.get("jabatan"), data.get("departemen"),
                data.get("site"), data.get("email"), data.get("telepon"),
                pop_stat, data.get("pop_no"), data.get("pop_lembaga"), data.get("pop_tgl_terbit"), data.get("pop_tgl_kadaluarsa"),
                pom_stat, data.get("pom_no"), data.get("pom_lembaga"), data.get("pom_tgl_terbit"), data.get("pom_tgl_kadaluarsa"),
                pou_stat, data.get("pou_no"), data.get("pou_lembaga"), data.get("pou_tgl_terbit"), data.get("pou_tgl_kadaluarsa"),
                smpkp_stat, data.get("smpkp_tipe", "Belum Ada"), data.get("smpkp_no"), data.get("smpkp_lembaga"), data.get("smpkp_tgl_terbit"), data.get("smpkp_tgl_kadaluarsa"),
                now, emp_id
            ))
            conn.commit()
            conn.close()
            return True, "Data pegawai berhasil diperbarui."
        except sqlite3.IntegrityError:
            return False, "NIK sudah digunakan oleh pegawai lain."
        except Exception as e:
            return False, f"Terjadi kesalahan: {e}"

    def hapus_karyawan(self, emp_id: int) -> tuple:
        """Menghapus data pegawai."""
        try:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("DELETE FROM employees WHERE id = ?", (emp_id,))
            conn.commit()
            conn.close()
            return True, "Data pegawai berhasil dihapus."
        except Exception as e:
            return False, f"Gagal menghapus data: {e}"

    def get_statistik(self) -> dict:
        """Menghitung data statistik sertifikasi untuk dashboard."""
        df = self.get_all_karyawan()
        total_emp = len(df)

        if df.empty:
            return {
                "total_employees": 0, "pop_count": 0, "pom_count": 0,
                "pou_count": 0, "smpkp_count": 0, "expiring_count": 0,
                "expired_count": 0, "dept_data": [], "pie_data": []
            }

        pop_count = len(df[df["pop_status"].isin(["Aktif", "Akan Expired"])])
        pom_count = len(df[df["pom_status"].isin(["Aktif", "Akan Expired"])])
        pou_count = len(df[df["pou_status"].isin(["Aktif", "Akan Expired"])])
        smpkp_count = len(df[df["smpkp_status"].isin(["Aktif", "Akan Expired"])])

        expiring_count = 0
        expired_count = 0

        cert_keys = ["pop", "pom", "pou", "smpkp"]
        for _, row in df.iterrows():
            for key in cert_keys:
                exp_date = row.get(f"{key}_tgl_kadaluarsa")
                status = row.get(f"{key}_status")
                if status in ("Belum Ada", "Dalam Proses") or not exp_date:
                    continue
                days = calculate_days_remaining(exp_date)
                if days is not None:
                    if days < 0:
                        expired_count += 1
                    elif days <= 90:
                        expiring_count += 1

        active_normal = (pop_count + pom_count + pou_count + smpkp_count) - expiring_count

        return {
            "total_employees": total_emp,
            "pop_count": pop_count,
            "pom_count": pom_count,
            "pou_count": pou_count,
            "smpkp_count": smpkp_count,
            "expiring_count": expiring_count,
            "expired_count": expired_count,
            "active_normal": max(0, active_normal)
        }

    def get_warning_items(self) -> list:
        """Mengambil seluruh daftar sertifikat yang akan/sudah kadaluarsa."""
        df = self.get_all_karyawan()
        items = []
        if df.empty:
            return items

        cert_names = {
            "pop": "POP (Pengawas Operasional Pertama)",
            "pom": "POM (Pengawas Operasional Madya)",
            "pou": "POU (Pengawas Operasional Utama)",
            "smpkp": "SMPKP (Auditor Keselamatan Mining)"
        }

        for _, emp in df.iterrows():
            for key, label in cert_names.items():
                status = emp.get(f"{key}_status")
                exp_date = emp.get(f"{key}_tgl_kadaluarsa")
                no_cert = emp.get(f"{key}_no")
                lembaga = emp.get(f"{key}_lembaga")

                if status in ("Belum Ada", "Dalam Proses") or not exp_date:
                    continue

                days = calculate_days_remaining(exp_date)
                if days is not None and days <= 90:
                    items.append({
                        "emp_id": emp["id"],
                        "nik": emp["nik"],
                        "nama": emp["nama"],
                        "jabatan": emp["jabatan"],
                        "departemen": emp["departemen"],
                        "site": emp["site"],
                        "cert_type": key.upper(),
                        "cert_label": label,
                        "cert_no": no_cert or "-",
                        "lembaga": lembaga or "-",
                        "tgl_kadaluarsa": exp_date,
                        "days": days,
                        "is_expired": days < 0
                    })
        
        # Sort items: expired first, then ascending days remaining
        items.sort(key=lambda x: x["days"])
        return items

    def backup_database(self, backup_path: str = "backup_karyawan.db") -> tuple:
        """Cadangkan database SQLite."""
        try:
            shutil.copyfile(self.db_path, backup_path)
            return True, f"Backup berhasil disimpan di '{backup_path}'."
        except Exception as e:
            return False, f"Gagal membuat backup: {e}"

    def restore_database(self, restore_path: str) -> tuple:
        """Pulihkan database dari file .db."""
        try:
            if not os.path.exists(restore_path):
                return False, "File restore tidak ditemukan."
            shutil.copyfile(restore_path, self.db_path)
            return True, "Database berhasil dipulihkan."
        except Exception as e:
            return False, f"Gagal memulihkan database: {e}"

    def reset_database(self) -> tuple:
        """Kosongkan seluruh tabel pegawai dan isi ulang data awal."""
        try:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("DELETE FROM employees")
            conn.commit()
            self._seed_initial_data(conn)
            conn.close()
            return True, "Database berhasil direset dan diisi ulang data awal."
        except Exception as e:
            return False, f"Gagal mereset database: {e}"
