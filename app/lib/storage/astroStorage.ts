export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export interface AstroRecord<T extends JsonValue = JsonValue> {
  id: string;
  namespace: string;
  payload: T;
  createdAt: string;
  updatedAt: string;
}

interface AstroDatabaseSchema {
  records: AstroRecord;
}

const DB_NAME = 'AstroLocalVault';
const DB_VERSION = 1;
const RECORDS_STORE = 'records';

function sanitizeValue<T extends JsonValue>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item)) as T;
  }

  if (value && typeof value === 'object') {
    const clean: JsonObject = {};

    for (const [key, raw] of Object.entries(value)) {
      // Mongo-style sanitization: drop risky operator-like keys.
      if (key.startsWith('$') || key.includes('.')) {
        continue;
      }

      clean[key] = sanitizeValue(raw as JsonValue);
    }

    return clean as T;
  }

  return value;
}

async function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this environment.');
  }

  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(RECORDS_STORE)) {
        const store = db.createObjectStore(RECORDS_STORE, { keyPath: 'id' });
        store.createIndex('namespace', 'namespace', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await openDatabase();

  try {
    const tx = db.transaction(RECORDS_STORE, mode);
    const store = tx.objectStore(RECORDS_STORE);
    const result = await run(store);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    return result;
  } finally {
    db.close();
  }
}

export async function putAstroRecord<T extends JsonValue>(
  namespace: string,
  id: string,
  payload: T,
): Promise<AstroRecord<T>> {
  const now = new Date().toISOString();
  const sanitizedPayload = sanitizeValue(payload);

  const nextRecord: AstroRecord<T> = {
    id,
    namespace,
    payload: sanitizedPayload,
    createdAt: now,
    updatedAt: now,
  };

  await withStore('readwrite', async (store) => {
    const existing = await new Promise<AstroRecord<T> | undefined>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as AstroRecord<T> | undefined);
      request.onerror = () => reject(request.error);
    });

    if (existing) {
      nextRecord.createdAt = existing.createdAt;
    }

    await new Promise<void>((resolve, reject) => {
      const request = store.put(nextRecord as AstroDatabaseSchema['records']);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    return undefined;
  });

  return nextRecord;
}

export async function getAstroRecord<T extends JsonValue>(id: string): Promise<AstroRecord<T> | undefined> {
  return await withStore('readonly', async (store) => {
    return await new Promise<AstroRecord<T> | undefined>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as AstroRecord<T> | undefined);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function listAstroRecords(namespace?: string): Promise<AstroRecord[]> {
  return await withStore('readonly', async (store) => {
    if (!namespace) {
      return await new Promise<AstroRecord[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve((request.result as AstroRecord[]) || []);
        request.onerror = () => reject(request.error);
      });
    }

    const index = store.index('namespace');

    return await new Promise<AstroRecord[]>((resolve, reject) => {
      const request = index.getAll(IDBKeyRange.only(namespace));
      request.onsuccess = () => resolve((request.result as AstroRecord[]) || []);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function deleteAstroRecord(id: string): Promise<void> {
  await withStore('readwrite', async (store) => {
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    return undefined;
  });
}

export async function isOpfsAvailable(): Promise<boolean> {
  return typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory;
}

async function getOrCreateOpfsDirectory(path: string[]): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  let current = root;

  for (const segment of path) {
    current = await current.getDirectoryHandle(segment, { create: true });
  }

  return current;
}

export async function writeOpfsBinary(path: string, data: Uint8Array): Promise<void> {
  if (!(await isOpfsAvailable())) {
    throw new Error('OPFS is not available in this browser.');
  }

  const normalized = path.replace(/^\/+|\/+$/g, '');
  const parts = normalized.split('/').filter(Boolean);

  if (!parts.length) {
    throw new Error('Invalid OPFS path.');
  }

  const fileName = parts.pop() as string;
  const dir = await getOrCreateOpfsDirectory(parts);
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();

  await writable.write(data);
  await writable.close();
}

export async function readOpfsBinary(path: string): Promise<Uint8Array> {
  if (!(await isOpfsAvailable())) {
    throw new Error('OPFS is not available in this browser.');
  }

  const normalized = path.replace(/^\/+|\/+$/g, '');
  const parts = normalized.split('/').filter(Boolean);

  if (!parts.length) {
    throw new Error('Invalid OPFS path.');
  }

  const fileName = parts.pop() as string;
  let dir = await navigator.storage.getDirectory();

  for (const segment of parts) {
    dir = await dir.getDirectoryHandle(segment);
  }

  const fileHandle = await dir.getFileHandle(fileName);
  const file = await fileHandle.getFile();

  return new Uint8Array(await file.arrayBuffer());
}

export async function initializeAstroStorage(): Promise<void> {
  await openDatabase();

  if (await isOpfsAvailable()) {
    await getOrCreateOpfsDirectory(['astro']);
  }
}
