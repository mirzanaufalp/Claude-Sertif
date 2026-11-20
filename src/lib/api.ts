const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];
const configuredBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const isLocalHost =
  typeof window !== 'undefined' && LOCAL_HOSTS.includes(window.location.hostname);

/**
 * Backend email (Express) hanya ada saat dev lokal atau saat VITE_API_BASE_URL diisi.
 * Di Vercel statis, panggilan /api akan 405, jadi fitur server harus dinonaktifkan.
 */
export const API_ENABLED = Boolean(configuredBase) || isLocalHost;

export interface MailerStatus {
  mode: 'smtp' | 'ethereal' | 'dry-run';
  dryRun: boolean;
  ethereal: boolean;
  host: string | null;
  from: string;
  reminderDays: number;
}

export interface ServerHealth {
  ok: boolean;
  mailer: MailerStatus;
  reminderDays: number;
  cron: { schedule: string; timezone: string };
  auto?: { enabled: boolean; intervalMinutes: number; sending: boolean };
  data: { syncedAt: string | null; personil: number; sertifikasi: number };
  lastRun: { at: string | null; sent: number; failed: number; error: string | null };
}

export interface ReminderPreviewItem {
  key: string;
  certId: string;
  noSertifikat: string;
  jenis: string;
  tanggalExpired: string;
  reminderDate: string;
  daysLeft: number;
  email: string;
  nama: string;
  personilId: string;
  alreadySentAt: string | null;
}

export interface ReminderPreview {
  ok: boolean;
  simulatedDate: string;
  reminderDays: number;
  total: number;
  pending: ReminderPreviewItem[];
  sent: ReminderPreviewItem[];
}

export interface SendResult {
  ok: boolean;
  dryRun?: boolean;
  sent: number;
  failed: number;
  results: Array<{
    ok: boolean;
    mode?: string;
    to?: string;
    subject?: string;
    certId?: string;
    certIds?: string[];
    count?: number;
    nama?: string;
    file?: string;
    messageId?: string;
    previewUrl?: string;
    error?: string;
  }>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.message || payload?.error || `Permintaan gagal (${response.status})`);
  }
  return payload as T;
}

export const reminderApi = {
  health: () => request<ServerHealth>('/api/health'),

  sync: (data: { personilList: unknown[]; pelatihanList: unknown[]; sertifikasiList: unknown[] }) =>
    request<{ ok: boolean; syncedAt: string }>('/api/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listReminders: () =>
    request<{ ok: boolean; total: number; pending: unknown[]; sent: unknown[] }>('/api/reminders'),

  preview: (date: string) =>
    request<ReminderPreview>(`/api/reminders/preview?date=${encodeURIComponent(date)}`),

  send: (payload: { certIds?: string[]; keys?: string[]; date?: string }) =>
    request<SendResult>('/api/reminders/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  testEmail: (to: string) =>
    request<{ ok: boolean; mode: string; file?: string; messageId?: string }>('/api/email/test', {
      method: 'POST',
      body: JSON.stringify({ to }),
    }),
};

