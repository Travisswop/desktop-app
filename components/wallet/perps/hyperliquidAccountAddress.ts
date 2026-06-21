type ResolveHyperliquidAccountAddressArgs = {
  walletAddress?: string | null;
  initializedMasterAddress?: string | null;
  candidateMasterAddress?: string | null;
};

const cleanAddress = (address?: string | null) => {
  const trimmed = address?.trim();
  return trimmed || null;
};

export function resolveHyperliquidAccountAddress({
  walletAddress,
  initializedMasterAddress,
  candidateMasterAddress,
}: ResolveHyperliquidAccountAddressArgs) {
  return (
    cleanAddress(walletAddress) ||
    cleanAddress(initializedMasterAddress) ||
    cleanAddress(candidateMasterAddress)
  );
}
