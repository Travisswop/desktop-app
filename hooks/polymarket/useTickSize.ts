// AMM pools use constant-product pricing — there is no discrete tick size.
// This hook returns a fixed default (0.01) so existing UI components that
// reference tickSize continue to compile without CLOB dependencies.
export function useTickSize(_tokenId: string | null) {
  return { tickSize: 0.01, isLoading: false, refetch: () => {} };
}
