/**
 * Translates raw technical errors (viem, RPC, contract, network)
 * into short, human-readable messages for Polymarket UI surfaces.
 */

const ERROR_MAP: Array<[RegExp | string, string]> = [
  // ── viem / RPC internal errors ────────────────────────────────────────────
  [/internal error/i,                      'Something went wrong on the network. Please try again.'],
  [/request limit exceeded/i,              'Too many requests. Please wait a moment and try again.'],
  [/rate limit/i,                          'Rate limit reached. Please wait a moment and try again.'],
  [/could not coerce/i,                    'Unexpected data returned from the network. Please try again.'],
  [/failed to fetch/i,                     'Network connection failed. Check your internet and try again.'],
  [/network changed/i,                     'Network changed unexpectedly. Please refresh the page.'],
  [/chain mismatch/i,                      'Wrong network selected. Please switch to Polygon and try again.'],
  [/does not support chain/i,              'Your wallet does not support Polygon. Please switch networks.'],

  // ── User rejections ───────────────────────────────────────────────────────
  [/user rejected/i,                       'Transaction cancelled. You rejected the request in your wallet.'],
  [/user denied/i,                         'Transaction cancelled. You denied the request in your wallet.'],
  [/rejected/i,                            'Action cancelled. Please try again when ready.'],

  // ── Insufficient funds / gas ──────────────────────────────────────────────
  [/insufficient funds/i,                  'Insufficient funds to cover the transaction and gas fees.'],
  [/insufficient matic/i,                  'Not enough MATIC for gas fees. Add MATIC to your wallet.'],
  [/insufficient sol/i,                    'Not enough SOL for fees. Add SOL to your wallet.'],
  [/gas required exceeds/i,                'Gas estimation failed. You may not have enough MATIC for fees.'],

  // ── Safe / deployment ─────────────────────────────────────────────────────
  [/safe already deployed/i,               'Trading account already exists. Continuing setup…'],
  [/failed to derive safe/i,               'Could not set up your trading account. Please try again.'],
  [/safe deployment failed/i,              'Trading account setup failed. Please try again.'],

  // ── API credentials ───────────────────────────────────────────────────────
  [/401/,                                  'Session expired. Please reconnect your wallet.'],
  [/invalid authorization/i,               'Session expired. Please reconnect your wallet.'],
  [/unauthorized/i,                        'Not authorised. Please reconnect your wallet.'],
  [/failed to derive.*credentials/i,       'Could not create trading credentials. Please try again.'],

  // ── Token approvals ───────────────────────────────────────────────────────
  [/approval/i,                            'Token approval failed. Please try again.'],
  [/allowance/i,                           'Could not set token permissions. Please try again.'],

  // ── Timeouts / connectivity ───────────────────────────────────────────────
  [/timeout/i,                             'The request timed out. Please check your connection and retry.'],
  [/connection refused/i,                  'Could not connect to the trading service. Please try again.'],
  [/socket/i,                              'Connection interrupted. Please refresh and try again.'],

  // ── Wallet not connected ──────────────────────────────────────────────────
  [/wallet not connected/i,               'Wallet not connected. Please connect your wallet first.'],
  [/no provider/i,                         'Wallet provider not found. Please reconnect your wallet.'],
];

/**
 * Returns a user-friendly message for any Polymarket-related error.
 * Falls back to a generic message when no pattern matches.
 */
export function formatPolymarketError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : 'Unknown error';

  for (const [pattern, friendly] of ERROR_MAP) {
    if (typeof pattern === 'string') {
      if (raw.toLowerCase().includes(pattern.toLowerCase())) return friendly;
    } else {
      if (pattern.test(raw)) return friendly;
    }
  }

  // If it looks like a technical/library error (contains stack-trace keywords,
  // library version strings, etc.), return a generic message instead of leaking
  // internal details to the user.
  const looksLikeTechnical =
    /Version:|at\s+\w|Error:\s+\w|viem@|ethers@|\.js:\d+|\.ts:\d+/.test(raw);

  if (looksLikeTechnical) {
    return 'Something went wrong. Please try again or refresh the page.';
  }

  // Short, clean messages are safe to show as-is.
  return raw.length <= 120 ? raw : 'Something went wrong. Please try again or refresh the page.';
}
