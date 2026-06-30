const normalizeAddress = (value?: string | null) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeSolanaComparisonAddress = (value?: string | null) =>
  normalizeAddress(value).toLowerCase();

export function resolveSwapBalanceSolanaWalletAddress({
  selectedWalletAddress,
  signableWalletAddress,
}: {
  selectedWalletAddress?: string | null;
  signableWalletAddress?: string | null;
}) {
  const normalizedSelected =
    normalizeSolanaComparisonAddress(selectedWalletAddress);
  const normalizedSignable =
    normalizeSolanaComparisonAddress(signableWalletAddress);

  if (
    normalizedSelected &&
    normalizedSignable &&
    normalizedSelected === normalizedSignable
  ) {
    return normalizeAddress(signableWalletAddress);
  }

  return (
    normalizeAddress(selectedWalletAddress) ||
    normalizeAddress(signableWalletAddress)
  );
}
