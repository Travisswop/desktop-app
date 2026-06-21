const normalizeAddress = (value?: string | null) =>
  typeof value === 'string' ? value.trim() : '';

export function resolveSwapBalanceSolanaWalletAddress({
  selectedWalletAddress,
  signableWalletAddress,
}: {
  selectedWalletAddress?: string | null;
  signableWalletAddress?: string | null;
}) {
  return (
    normalizeAddress(selectedWalletAddress) ||
    normalizeAddress(signableWalletAddress)
  );
}
