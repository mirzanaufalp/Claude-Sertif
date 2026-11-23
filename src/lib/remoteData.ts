import { TrxPelatihan, TrxPersonil, TrxSertifikasi } from '../types';

/**
 * Sumber data bersama untuk semua device: file email-data.json di repo.
 * Dibaca tanpa token lewat raw.githubusercontent.com, jadi device yang tidak
 * punya token tetap menampilkan data yang sama dengan email produksi.
 */
const RAW_URL =
  'https://raw.githubusercontent.com/mirzanaufalp/Claude-Sertif/main/email-data.json';

export interface RemoteEmailData {
  version?: number;
  generatedAt?: string;
  source?: string;
  personilList: TrxPersonil[];
  pelatihanList: TrxPelatihan[];
  sertifikasiList: TrxSertifikasi[];
}

export async function fetchRemoteEmailData(): Promise<RemoteEmailData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${RAW_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (
      !Array.isArray(data?.personilList) ||
      !Array.isArray(data?.pelatihanList) ||
      !Array.isArray(data?.sertifikasiList)
    ) {
      return null;
    }
    return data as RemoteEmailData;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
