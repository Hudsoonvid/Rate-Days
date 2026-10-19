/** Per-device UI conveniences (last view mode etc). Storage can be unavailable, so every access is guarded. */
export function readPref<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  try {
    const v = localStorage.getItem(`ratedays:${key}`) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(`ratedays:${key}`, value);
  } catch {
    // Not persisted; fine.
  }
}
