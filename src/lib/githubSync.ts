import { TrxPelatihan, TrxPersonil, TrxSertifikasi } from '../types';

/**
 * Sinkronisasi data web ke repo GitHub supaya GitHub Actions mengirim email
 * dengan data yang sama. Token disimpan hanya di localStorage browser ini dan
 * dipakai langsung ke api.github.com (tidak dikirim ke server lain).
 */
const TOKEN_KEY = 'sertif_github_token';
const REPO_KEY = 'sertif_github_repo';
const FILE_PATH = 'email-data.json';
export const DEFAULT_REPO = 'mirzanaufalp/Claude-Sertif';

export function getGithubConfig() {
  return {
    token: localStorage.getItem(TOKEN_KEY) || '',
    repo: localStorage.getItem(REPO_KEY) || DEFAULT_REPO,
  };
}

export function hasGithubToken() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

export function saveGithubConfig(token: string, repo: string) {
  localStorage.setItem(TOKEN_KEY, token.trim());
  localStorage.setItem(REPO_KEY, (repo || DEFAULT_REPO).trim());
}

export function clearGithubConfig() {
  localStorage.removeItem(TOKEN_KEY);
}

function toBase64(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export interface SyncResult {
  ok: boolean;
  repo: string;
  updatedAt: string;
  message: string;
}

export async function syncEmailDataToGithub(
  personilList: TrxPersonil[],
  pelatihanList: TrxPelatihan[],
  sertifikasiList: TrxSertifikasi[]
): Promise<SyncResult> {
  const { token, repo } = getGithubConfig();
  if (!token) throw new Error('Token GitHub belum diisi.');
  if (!/^[^/]+\/[^/]+$/.test(repo)) throw new Error('Format repo harus owner/nama-repo.');

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const api = `https://api.github.com/repos/${repo}/contents/${FILE_PATH}`;

  let sha: string | undefined;
  const existing = await fetch(api, { headers });
  if (existing.ok) {
    const data = await existing.json();
    sha = data.sha;
  } else if (existing.status !== 404) {
    const detail = await existing.text();
    throw new Error(
      existing.status === 401
        ? 'Token ditolak (401). Periksa token GitHub.'
        : existing.status === 403
          ? 'Token tidak punya izin Contents: Read and write (403).'
          : `Gagal membaca ${FILE_PATH} (${existing.status}): ${detail.slice(0, 160)}`
    );
  }

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'web-sertifikasi-hse',
    personilList,
    pelatihanList,
    sertifikasiList,
  };
  const updatedAt = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

  const response = await fetch(api, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `chore: sinkron data email dari web (${updatedAt})`,
      content: toBase64(JSON.stringify(payload, null, 2)),
      ...(sha ? { sha } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      response.status === 401
        ? 'Token ditolak (401). Periksa token GitHub.'
        : response.status === 403
          ? 'Token tidak punya izin menulis isi repo (403).'
          : `Gagal menyimpan ${FILE_PATH} (${response.status}): ${detail.slice(0, 160)}`
    );
  }

  return { ok: true, repo, updatedAt, message: `${FILE_PATH} diperbarui di ${repo}` };
}
