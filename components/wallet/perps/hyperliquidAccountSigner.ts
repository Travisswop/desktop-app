const normalizeAddress = (address?: string | null) =>
  address?.trim().toLowerCase() ?? '';

export function hasHyperliquidAccountSignerMismatch(
  accountAddress?: string | null,
  signerAddress?: string | null,
) {
  const account = normalizeAddress(accountAddress);
  const signer = normalizeAddress(signerAddress);
  return Boolean(account && signer && account !== signer);
}

export function formatHyperliquidAddress(address?: string | null) {
  const trimmed = address?.trim();
  if (!trimmed) return 'unknown wallet';
  return trimmed.length > 12
    ? `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`
    : trimmed;
}

export function getHyperliquidSignerMismatchMessage(
  accountAddress?: string | null,
  signerAddress?: string | null,
) {
  return `Connected signer ${formatHyperliquidAddress(
    signerAddress,
  )} does not match Hyperliquid account ${formatHyperliquidAddress(
    accountAddress,
  )}. Connect ${formatHyperliquidAddress(
    accountAddress,
  )} before moving or withdrawing perps collateral.`;
}
