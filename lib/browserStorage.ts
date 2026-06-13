type BrowserStorageKind = 'local' | 'session';

function getBrowserStorage(kind: BrowserStorageKind): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getBrowserStorageItem(
  kind: BrowserStorageKind,
  key: string,
): string | null {
  const storage = getBrowserStorage(kind);
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function setBrowserStorageItem(
  kind: BrowserStorageKind,
  key: string,
  value: string,
) {
  const storage = getBrowserStorage(kind);
  if (!storage) return;

  try {
    storage.setItem(key, value);
  } catch {
    // Storage can be unavailable in restricted Safari contexts.
  }
}

export function removeBrowserStorageItem(
  kind: BrowserStorageKind,
  key: string,
) {
  const storage = getBrowserStorage(kind);
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // Storage can be unavailable in restricted Safari contexts.
  }
}

export function getBrowserStorageKeys(kind: BrowserStorageKind): string[] {
  const storage = getBrowserStorage(kind);
  if (!storage) return [];

  try {
    return Array.from({ length: storage.length }, (_, index) =>
      storage.key(index),
    ).filter((key): key is string => Boolean(key));
  } catch {
    return [];
  }
}

export const safeLocalStorage = {
  getItem: (key: string) => getBrowserStorageItem('local', key),
  setItem: (key: string, value: string) =>
    setBrowserStorageItem('local', key, value),
  removeItem: (key: string) => removeBrowserStorageItem('local', key),
  keys: () => getBrowserStorageKeys('local'),
};

export const safeSessionStorage = {
  getItem: (key: string) => getBrowserStorageItem('session', key),
  setItem: (key: string, value: string) =>
    setBrowserStorageItem('session', key, value),
  removeItem: (key: string) => removeBrowserStorageItem('session', key),
  keys: () => getBrowserStorageKeys('session'),
};
