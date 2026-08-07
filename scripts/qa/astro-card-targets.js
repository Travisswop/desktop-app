const CHAT_PATH = '/dashboard/chat';

function normalizePathname(pathname) {
  if (pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '');
}

function parseUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const parsed = new URL(url);
    return {
      origin: parsed.origin,
      pathname: normalizePathname(parsed.pathname),
    };
  } catch {
    return null;
  }
}

function matchesSwopChatUrl(url, swopUrl) {
  const candidate = parseUrl(url);
  const expected = parseUrl(swopUrl);
  return Boolean(
    candidate &&
      expected &&
      candidate.origin === expected.origin &&
      candidate.pathname === CHAT_PATH
  );
}

function isSwopChatTarget(target, swopUrl) {
  return Boolean(
    target?.type === 'page' &&
      target.webSocketDebuggerUrl &&
      matchesSwopChatUrl(String(target.url || ''), swopUrl)
  );
}

function listMatchingSwopChatTargets(targets, swopUrl) {
  return Array.isArray(targets)
    ? targets.filter((target) => isSwopChatTarget(target, swopUrl))
    : [];
}

function findFreshSwopChatTarget(targets, swopUrl, staleTargetIds = []) {
  const staleIds = new Set(staleTargetIds);
  return (
    listMatchingSwopChatTargets(targets, swopUrl).find(
      (target) => !staleIds.has(target.id)
    ) || null
  );
}

module.exports = {
  CHAT_PATH,
  findFreshSwopChatTarget,
  isSwopChatTarget,
  listMatchingSwopChatTargets,
  matchesSwopChatUrl,
};
