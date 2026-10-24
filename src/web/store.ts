// Browser-local persistence. Every access is guarded: storage can be missing or blocked,
// and the app must still render. Keys are namespaced per profile so profiles never mix.
const PREFIX = 'ezcon:v1:';

export function load<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // storage unavailable; state lives for this page only
  }
}

export function clearAll() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  } catch {
    // ignore
  }
}

export const profileKey = (profileId: string, part: string) => `profile/${profileId}/${part}`;
