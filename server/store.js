import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const SENT_FILE = path.join(DATA_DIR, 'sent-log.json');
const OUTBOX_DIR = path.join(DATA_DIR, 'outbox');

const EMPTY_STORE = {
  syncedAt: null,
  personilList: [],
  pelatihanList: [],
  sertifikasiList: [],
};

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(OUTBOX_DIR, { recursive: true });
}

export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(file, data) {
  ensureDirs();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

export function getStore() {
  return readJson(STORE_FILE, EMPTY_STORE);
}

export function saveStore(payload) {
  const store = {
    syncedAt: new Date().toISOString(),
    personilList: Array.isArray(payload.personilList) ? payload.personilList : [],
    pelatihanList: Array.isArray(payload.pelatihanList) ? payload.pelatihanList : [],
    sertifikasiList: Array.isArray(payload.sertifikasiList) ? payload.sertifikasiList : [],
  };
  writeJson(STORE_FILE, store);
  return store;
}

export function getSentLog() {
  return readJson(SENT_FILE, {});
}

export function markSent(entries) {
  const log = getSentLog();
  const now = new Date().toISOString();
  for (const key of entries) log[key] = now;
  writeJson(SENT_FILE, log);
  return log;
}

export function getOutboxDir() {
  ensureDirs();
  return OUTBOX_DIR;
}

export { DATA_DIR, SENT_FILE };
