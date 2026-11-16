import fs from 'node:fs';
import * as XLSX from 'xlsx';
import { buildImportBundle, migrateLegacyData } from './src/lib/excelImport.ts';

const buf = fs.readFileSync('./DB_Sertifikasi HSE.xlsx');
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }) as any[];
const bundle = buildImportBundle(rows);
const data = migrateLegacyData(bundle.personilList, bundle.pelatihanList, bundle.sertifikasiList);

const json = (value: unknown) => JSON.stringify(value, null, 2);

const content = `import { TrxPersonil, TrxPelatihan, TrxSertifikasi } from '../types';

// AUTO-GENERATED dari DB_Sertifikasi HSE.xlsx via script generate_seed_excel.mts
// Jangan edit manual; jalankan ulang script bila Excel berubah.
export const SEED_PERSONIL: TrxPersonil[] = ${json(data.personilList)};

export const SEED_PELATIHAN: TrxPelatihan[] = ${json(data.pelatihanList)};

export const SEED_SERTIFIKASI: TrxSertifikasi[] = ${json(data.sertifikasiList)};
`;

fs.writeFileSync('./src/data/seedFromExcel.ts', content, 'utf8');
console.log(`personil=${data.personilList.length} pelatihan=${data.pelatihanList.length} sertifikasi=${data.sertifikasiList.length}`);
