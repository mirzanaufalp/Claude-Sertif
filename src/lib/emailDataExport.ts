import { TrxPelatihan, TrxPersonil, TrxSertifikasi } from '../types';

export interface EmailDataFile {
  version: number;
  generatedAt: string;
  source: string;
  personilList: TrxPersonil[];
  pelatihanList: TrxPelatihan[];
  sertifikasiList: TrxSertifikasi[];
}

/**
 * Unduh data yang sedang dipakai web ke `email-data.json`.
 * Taruh file ini di root repo lalu commit+push agar GitHub Actions mengirim email
 * dengan data yang sama persis seperti yang terlihat di web.
 */
export function downloadEmailData(
  personilList: TrxPersonil[],
  pelatihanList: TrxPelatihan[],
  sertifikasiList: TrxSertifikasi[]
) {
  const payload: EmailDataFile = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'web-sertifikasi-hse',
    personilList,
    pelatihanList,
    sertifikasiList,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'email-data.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
