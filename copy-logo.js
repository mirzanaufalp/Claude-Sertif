import fs from 'fs';

const srcPath = 'C:\\Users\\BIG STAR COMPUTER\\.gemini\\antigravity-ide\\brain\\25e5fd05-f4b8-45d8-85e6-546a01fcdd72\\media__1785478367363.png';
const destPath = 'd:\\Projek pak fiandri\\SERTIFIKASI KARYAWAN\\Claude Sertif\\public\\antam-logo.png';

try {
  fs.copyFileSync(srcPath, destPath);
  console.log('Successfully copied exact ANTAM logo image to public/antam-logo.png');
} catch (err) {
  console.error('Error copying file:', err);
}
