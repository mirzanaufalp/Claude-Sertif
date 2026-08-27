import pandas as pd

try:
    df = pd.read_excel('DB_Sertifikasi HSE.xlsx')
    df = df.fillna('')
    df.to_json('src/data/karyawan.json', orient='records')
    print("✅ Berhasil! File src/data/karyawan.json telah diperbarui.")
except Exception as e:
    print("❌ Terjadi kesalahan:", e)