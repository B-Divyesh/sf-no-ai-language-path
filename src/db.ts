import type { AppState } from './types';

const DB_NAME = 'no-ai-language-path';
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

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadState(): Promise<AppState> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve((request.result as AppState | undefined) ?? emptyState());
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function saveState(state: AppState): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ ...state, updatedAt: new Date().toISOString() }, KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

export function validImport(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AppState>;
  const validBlocks = Array.isArray(candidate.blocks) && candidate.blocks.every((block: unknown) => {
    if (!block || typeof block !== 'object') return false;
    const item = block as Record<string, unknown>;
    return typeof item.id === 'string' && ['listen', 'read', 'speak', 'recall'].includes(String(item.type)) &&
      typeof item.title === 'string' && typeof item.instruction === 'string' &&
      typeof item.minutes === 'number' && item.minutes >= 1 && item.minutes <= 90 &&
      (item.source === undefined || (typeof item.source === 'string' && /^https?:\/\//i.test(item.source)));
  });
  const validHistory = Array.isArray(candidate.history) && candidate.history.every((item: unknown) => {
    if (!item || typeof item !== 'object') return false;
    const record = item as Record<string, unknown>;
    return typeof record.id === 'string' && typeof record.completedAt === 'string' &&
      typeof record.durationSeconds === 'number' && Array.isArray(record.blockIds) &&
      typeof record.stage === 'number';
  });
  return candidate.version === 1 && typeof candidate.language === 'string' &&
    typeof candidate.routineName === 'string' && Array.isArray(candidate.blocks) &&
    validBlocks && validHistory && typeof candidate.sessionsPerStage === 'number' &&
    candidate.sessionsPerStage >= 1 && candidate.sessionsPerStage <= 30 &&
    typeof candidate.stage === 'number' && candidate.stage >= 0 && candidate.stage <= 2;
}
