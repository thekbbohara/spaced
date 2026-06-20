import 'expo-sqlite/localStorage/install';

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

// Cache parsed snapshots per key so reads return a stable reference until the
// stored value actually changes. useSyncExternalStore requires this — returning
// a fresh object every read causes an infinite render loop.
//
// Only values that were actually parsed from storage are cached. The "key
// absent" path returns the caller's default untouched, so callers using
// different defaults for the same key never collide (callers that need a stable
// reference must pass a stable default — see EMPTY_* constants).
const cache = new Map<string, { raw: string; value: unknown }>();

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    const raw = localStorage.getItem(key);
    if (raw == null) return defaultValue;

    const cached = cache.get(key);
    if (cached && cached.raw === raw) return cached.value as T;

    let value: T;
    try {
      value = JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
    cache.set(key, { raw, value });
    return value;
  },

  set<T>(key: string, value: T): void {
    const raw = JSON.stringify(value);
    localStorage.setItem(key, raw);
    cache.set(key, { raw, value });
    listeners.get(key)?.forEach((fn) => fn());
  },

  subscribe(key: string, listener: Listener): () => void {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(listener);
    return () => listeners.get(key)?.delete(listener);
  },
};
