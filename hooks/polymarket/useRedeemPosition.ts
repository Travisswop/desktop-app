// Redemption is now handled by useMarketResolution hook via the Resolution contract.
// This stub exists only for backward compatibility with any remaining imports.
export function useRedeemPosition() {
  return {
    isRedeeming: false,
    error: null,
    redeemPosition: async () => false,
  };
}
