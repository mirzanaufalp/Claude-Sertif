import shutil
import os

src = r"d:\Projek pak fiandri\SERTIFIKASI KARYAWAN\Claude Sertif\public\Logo Antam SVG.svg"
dst1 = r"d:\Projek pak fiandri\SERTIFIKASI KARYAWAN\Claude Sertif\public\antam-logo.svg"
dst2 = r"d:\Projek pak fiandri\SERTIFIKASI KARYAWAN\Claude Sertif\src\assets\antam-logo.svg"

os.makedirs(os.path.dirname(dst2), exist_ok=True)
shutil.copyfile(src, dst1)
shutil.copyfile(src, dst2)
print("Successfully copied Logo Antam SVG.svg to public/antam-logo.svg!")
