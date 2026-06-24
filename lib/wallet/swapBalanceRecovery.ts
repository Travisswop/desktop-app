export type SwapBalanceRecoveryState = {
  reasonCode: 'balance_changed';
  availableAmount: string;
  tokenSymbol: string;
};

const BALANCE_CHANGED_ERROR_RE =
  /^Your\s+(?<requestedToken>.+?)\s+balance changed\.\s+Available now:\s+(?<availableAmount>[0-9.,]+)\s+(?<availableToken>[A-Za-z0-9._-]+)\.\s+Try the swap again with the updated amount\.?$/i;

export function parseSwapBalanceRecoveryState(message: unknown) {
  if (typeof message !== 'string') return null;
  const trimmed = message.trim();
  if (!trimmed) return null;

  const match = trimmed.match(BALANCE_CHANGED_ERROR_RE);
  const groups = match?.groups;
  const availableAmount = groups?.availableAmount?.trim();
  const tokenSymbol =
    groups?.availableToken?.trim() || groups?.requestedToken?.trim();

  if (!availableAmount || !tokenSymbol) {
    return null;
  }

  return {
    reasonCode: 'balance_changed' as const,
    availableAmount,
    tokenSymbol,
  };
}
