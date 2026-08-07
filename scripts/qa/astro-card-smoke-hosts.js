function normalizeUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isPrivyPreviewHost(hostname) {
  return /\.vercel\.app$/i.test(String(hostname || ''));
}

function includesLoginScreen(pageText) {
  return /sign in|log in|login/i.test(pageText || '');
}

function hasAllowedOriginSignal(pageText, consoleErrors) {
  const text = String(pageText || '');
  if (/allowed origins/i.test(text)) return true;

  return (consoleErrors || []).some((entry) => {
    const source = `${entry?.text || ''} ${entry?.url || ''}`;
    return /frame-ancestors|privy|allowed origins/i.test(source);
  });
}

function classifyAuthHostBlocker({
  requestedUrl,
  currentUrl,
  pageText,
  consoleErrors = [],
}) {
  const requested = normalizeUrl(requestedUrl);
  const current = normalizeUrl(currentUrl);
  const host = current?.host || requested?.host || 'the current host';

  const allowedOriginSignal = hasAllowedOriginSignal(pageText, consoleErrors);
  if (!includesLoginScreen(pageText) && !allowedOriginSignal) return null;
  if (!allowedOriginSignal) return null;

  if (current && isPrivyPreviewHost(current.hostname)) {
    return {
      kind: 'privy-preview-host-blocked',
      message:
        `Redirected to /login on ${host}, but Privy auth is blocked for this preview host. ` +
        'Use an allowed signed-in review host such as localhost, or add this host to the Privy app and web client allowed origins before rerunning page-auth.',
    };
  }

  return {
    kind: 'privy-auth-origin-blocked',
    message:
      `Redirected to /login on ${host}, and Privy rejected this origin. ` +
      'Add the host to the Privy app and web client allowed origins, or rerun against an already-allowed signed-in review host such as localhost.',
  };
}

module.exports = {
  classifyAuthHostBlocker,
  isPrivyPreviewHost,
};
