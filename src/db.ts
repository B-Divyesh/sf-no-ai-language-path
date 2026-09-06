import type { AppState } from './types';

const DB_NAME = 'no-ai-language-path';
const DEMO_DB_NAME = 'demo:no-ai-language-path';
const STORE = 'state';
const KEY = 'primary';

export function emptyState(): AppState {
  const now = new Date().toISOString();
  return {
    version: 1,
    language: '',
    routineName: 'My language path',
    blocks: [],
    history: [],
    sessionsPerStage: 3,
    stage: 0,
    createdAt: now,
    updatedAt: now
  };
}

function openDb(demo = false): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(demo ? DEMO_DB_NAME : DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadState(demo = false): Promise<AppState> {
  const db = await openDb(demo);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve((request.result as AppState | undefined) ?? emptyState());
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function saveState(state: AppState, demo = false): Promise<void> {
  const db = await openDb(demo);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ ...state, updatedAt: new Date().toISOString() }, KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

export function deleteDemoState(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(DEMO_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2_048) return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function validImport(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AppState>;
  const validBlocks = Array.isArray(candidate.blocks) && candidate.blocks.every((block: unknown) => {
    if (!block || typeof block !== 'object') return false;
    const item = block as Record<string, unknown>;
    return typeof item.id === 'string' && ['listen', 'read', 'speak', 'recall'].includes(String(item.type)) &&
      typeof item.title === 'string' && item.title.trim().length > 0 && item.title.length <= 60 &&
      typeof item.instruction === 'string' && item.instruction.trim().length > 0 && item.instruction.length <= 180 &&
      isIntegerInRange(item.minutes, 1, 90) &&
      (item.source === undefined || isHttpUrl(item.source));
  });
  const validHistory = Array.isArray(candidate.history) && candidate.history.every((item: unknown) => {
    if (!item || typeof item !== 'object') return false;
    const record = item as Record<string, unknown>;
    return typeof record.id === 'string' && record.id.length > 0 && isIsoDate(record.completedAt) &&
      isIntegerInRange(record.durationSeconds, 0, 31_536_000) &&
      Array.isArray(record.blockIds) && record.blockIds.every((id) => typeof id === 'string' && id.length > 0) &&
      isIntegerInRange(record.stage, 0, 2);
  });
  return candidate.version === 1 && typeof candidate.language === 'string' && candidate.language.length <= 40 &&
    typeof candidate.routineName === 'string' && candidate.routineName.trim().length > 0 && candidate.routineName.length <= 60 &&
    validBlocks && validHistory && isIntegerInRange(candidate.sessionsPerStage, 1, 30) &&
    isIntegerInRange(candidate.stage, 0, 2) && isIsoDate(candidate.createdAt) && isIsoDate(candidate.updatedAt);
}
