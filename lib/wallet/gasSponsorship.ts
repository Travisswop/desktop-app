// Shared helpers for the gas-sponsorship operating model (swop-gas-sponsorship
// -operating-model.pdf): covered embedded-wallet flows run sponsored-first via
// Privy `sponsor: true`; if Privy definitively refuses to sponsor, the flow may
// fall back to user-paid gas ONLY with honest "sponsorship unavailable"
// messaging — never copy that asks the user to add ETH/POL/SOL for gas.

export const GAS_SPONSORSHIP_UNAVAILABLE_MESSAGE =
  'Gas sponsorship is unavailable for this transaction right now, and this wallet has no balance to cover the network fee itself. Try again later — no funds were moved.';

export const GAS_SPONSORSHIP_FALLBACK_NOTICE =
  'Gas sponsorship was unavailable — your wallet covered the network fee for this transaction.';

// True when Privy examined the sponsored request and REFUSED it — e.g. gas
// sponsorship not enabled for the app/chain, sponsorship policy rejection,
// the client-side sponsorship setting being off, or the sponsorship budget /
// gas credits being exhausted. These errors happen before anything is
// broadcast, so retrying the same transaction with user-paid gas is safe.
// Ambiguous failures (network drops, timeouts, RPC errors) deliberately do
// NOT match: the transaction may already be in flight and must not be
// re-sent — an unsponsored retry is a DIFFERENT transaction (different fee
// payer), so both could land.
export function isSponsorshipRejectionError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? '');
  if (!message) return false;
  if (/timed? ?out|network error|fetch failed|socket|econn/i.test(message)) {
    return false;
  }
  return (
    /sponsor/i.test(message) &&
    // Refusals: config/policy ("not enabled", "denied", …) and exhaustion
    // ("limit reached", "budget exceeded", "insufficient app balance", …).
    /not enabled|not available|unavailable|not supported|disabled|denied|reject|refus|policy|unsupported|limit|exceed|exhaust|deplet|quota|budget|insufficient|out of|no longer/i.test(
      message,
    )
  );
}

// True when an on-device / user-funded attempt failed because the wallet
// cannot pay the network fee or rent itself (as opposed to an insufficient
// token balance). Covers EVM node errors and Solana fee-payer errors.
export function isInsufficientNativeGasError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? '');
  return /insufficient funds for gas|gas \* price \+ value|intrinsic gas too low|gas required exceeds|insufficient lamports|insufficient funds for rent|found no record of a prior credit/i.test(
    message,
  );
}

// Sponsored-first runner: try the sponsored path; if Privy definitively
// rejects sponsorship, retry the exact same transaction with user-paid gas.
// `onFallback` should surface honest UI copy (toast/status) that sponsorship
// is unavailable — the fallback must never be presented as gasless.
export async function runSponsoredFirst<T>(
  run: (options: { sponsor: boolean }) => Promise<T>,
  { onFallback }: { onFallback?: () => void } = {},
): Promise<T> {
  try {
    return await run({ sponsor: true });
  } catch (error) {
    if (!isSponsorshipRejectionError(error)) throw error;
    onFallback?.();
    try {
      return await run({ sponsor: false });
    } catch (fallbackError) {
      if (isInsufficientNativeGasError(fallbackError)) {
        throw new Error(GAS_SPONSORSHIP_UNAVAILABLE_MESSAGE);
      }
      throw fallbackError;
    }
  }
}
