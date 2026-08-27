import pandas as pd
import json
import re

MONTHS = {
    'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
    'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
    'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
}

def parse_tgl_expired(text):
    if pd.isna(text) or not str(text).strip():
        return {}
    
    result = {}
    lines = str(text).split('\n')
    for line in lines:
        # Cari jenis sertifikat dan tanggal: "Tanggal Expired POM : 25 November 2029"
        match = re.search(r'(POP|POM|POU|SMKP|CP)\s*:\s*(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})', line, re.IGNORECASE)
        if match:
            cert_type = match.group(1).upper()
            day = match.group(2).zfill(2)
            month_name = match.group(3).lower()
            year = match.group(4)
            month = MONTHS.get(month_name, '01')
            result[cert_type] = f"{year}-{month}-{day}"
    return result

df = pd.read_excel('DB_Sertifikasi HSE.xlsx')

pelatihan_list = []
sertifikasi_list = []
counter = 1

for idx, row in df.iterrows():
    # Buat fallback ID jika ID_PERSONIL di excel kosong
    id_personil = str(int(row['ID_PERSONIL'])) if pd.notna(row['ID_PERSONIL']) else f"TEMP{idx+1:04d}"
    
    # 1. Sertifikasi PPP (POP, POM, POU)
    if pd.notna(row['SERT_PPP']):
        certs = [c.strip().upper() for c in str(row['SERT_PPP']).split(',') if c.strip()]
        expired_map = parse_tgl_expired(row['TGL_EXPIRED_PPP'])
        
        for cert in certs:
            id_plt = f"PLTHN{cert}{id_personil}{counter:04d}"
            id_srt = f"SERT{cert}{id_personil}{counter:04d}"
            tgl_exp = expired_map.get(cert, "")
            
            # Hitung status
            status_srt = "LULUS"
            if tgl_exp:
                # Dibandingkan dengan tahun berjalan
                if tgl_exp < "2026-08-24":
                    status_srt = "EXPIRED"
            
            pelatihan_list.append({
                "ID_PELATIHAN": id_plt,
                "ID_PERSONIL": id_personil,
                "JENIS_PELATIHAN": cert,
                "TANGGAL_MULAI": "",
                "TANGGAL_SELESAI": "",
                "STATUS_PELATIHAN": "SELESAI",
                "DOK_PELATIHAN": ""
            })
            
            sertifikasi_list.append({
                "ID_SERTIFIKASI": id_srt,
                "ID_PELATIHAN": id_plt,
                "JENIS_SERTIFIKASI": cert,
                "NO_SERTIFIKAT": "",
                "TANGGAL_MULAI": "",
                "TANGGAL_EXPIRED": tgl_exp,
                "STATUS_SERTIFIKASI": status_srt,
                "DOK_SERTIFIKAT": ""
            })
            counter += 1

# Export hasil ke initialData format JSON / TS
with open('src/data/sertifikasi_clean.json', 'w') as f:
    json.dump({"pelatihan": pelatihan_list, "sertifikasi": sertifikasi_list}, f, indent=2)

print(f"Berhasil memproses {len(sertifikasi_list)} data sertifikasi.")