const normalizeAddress = (value?: string | null) =>
  typeof value === 'string' ? value.trim() : '';

export function resolveSwapBalanceSolanaWalletAddress({
  selectedWalletAddress,
  signableWalletAddress,
}: {
  selectedWalletAddress?: string | null;
  signableWalletAddress?: string | null;
}) {
  const normalizedSelected = normalizeAddress(selectedWalletAddress);
  const normalizedSignable = normalizeAddress(signableWalletAddress);

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

export function resolveSwapModalSolanaWalletAddress({
  preferredSolanaWalletAddress,
  payTokenWalletAddress,
}: {
  preferredSolanaWalletAddress?: string | null;
  payTokenWalletAddress?: string | null;
}) {
  return (
    normalizeAddress(payTokenWalletAddress) ||
    normalizeAddress(preferredSolanaWalletAddress)
  );
}
