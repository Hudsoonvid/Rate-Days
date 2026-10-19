import type { AppData, Day } from "./types";

/**
 * Persistence: one IndexedDB database with a `days` store (keyed by date, so
 * photo-heavy days are written individually) and a `meta` key/value store for
 * everything else. Falls back to memory when IndexedDB is unavailable
 * (e.g. some private-browsing modes) so the app still runs.
 */

const DB_NAME = "ratedays";
const DB_VERSION = 1;
const META_KEYS = ["people", "tags", "places", "profile", "goals", "settings", "recaps", "onboarded"] as const;
type MetaKey = (typeof META_KEYS)[number];

let dbPromise: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("days")) db.createObjectStore("days", { keyPath: "date" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function isPersistent(): Promise<boolean> {
  return (await open()) !== null;
}

export async function loadAll(): Promise<Partial<AppData>> {
  const db = await open();
  if (!db) return {};
  const tx = db.transaction(["days", "meta"], "readonly");
  const days = await request(tx.objectStore("days").getAll() as IDBRequest<Day[]>);
  const meta: Partial<Record<MetaKey, unknown>> = {};
  for (const key of META_KEYS) {
    const value = await request(tx.objectStore("meta").get(key));
    if (value !== undefined) meta[key] = value;
  }
  return {
    ...(meta as Partial<AppData>),
    days: Object.fromEntries(days.map((d) => [d.date, d])),
  };
}

export async function putDay(day: Day): Promise<void> {
  const db = await open();
  if (!db) return;
  const tx = db.transaction("days", "readwrite");
  tx.objectStore("days").put(day);
  await done(tx);
}

export async function deleteDay(date: string): Promise<void> {
  const db = await open();
  if (!db) return;
  const tx = db.transaction("days", "readwrite");
  tx.objectStore("days").delete(date);
  await done(tx);
}

export async function putMeta<K extends MetaKey>(key: K, value: AppData[K]): Promise<void> {
  const db = await open();
  if (!db) return;
  const tx = db.transaction("meta", "readwrite");
  tx.objectStore("meta").put(value, key);
  await done(tx);
}

/** Replace everything in one transaction (import, demo data, reset). */
export async function replaceAll(data: AppData): Promise<void> {
  const db = await open();
  if (!db) return;
  const tx = db.transaction(["days", "meta"], "readwrite");
  const days = tx.objectStore("days");
  const meta = tx.objectStore("meta");
  days.clear();
  meta.clear();
  for (const day of Object.values(data.days)) days.put(day);
  for (const key of META_KEYS) meta.put(data[key], key);
  await done(tx);
}
