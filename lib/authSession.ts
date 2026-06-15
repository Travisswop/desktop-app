import { safeSessionStorage } from '@/lib/browserStorage';

const EXPLICIT_LOGOUT_KEY = 'swop:explicit-logout-at';
const EXPLICIT_LOGOUT_MAX_AGE_MS = 2 * 60 * 1000;

export function markExplicitLogoutRedirect() {
  safeSessionStorage.setItem(EXPLICIT_LOGOUT_KEY, String(Date.now()));
}

export function consumeExplicitLogoutRedirect() {
  const rawTimestamp = safeSessionStorage.getItem(EXPLICIT_LOGOUT_KEY);
  safeSessionStorage.removeItem(EXPLICIT_LOGOUT_KEY);

  const timestamp = Number(rawTimestamp);
  return (
    Number.isFinite(timestamp) &&
    Date.now() - timestamp < EXPLICIT_LOGOUT_MAX_AGE_MS
  );
}
