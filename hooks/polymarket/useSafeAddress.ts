import { useQuery } from "@tanstack/react-query";

export function useSafeAddress(eoaAddress: string | undefined) {
  return useQuery({
    queryKey: ["polymarket-safe-address", eoaAddress],
    queryFn: async (): Promise<string | null> => {
      if (!eoaAddress) return null;

      const apiBase =
        process.env.NEXT_PUBLIC_POLYMARKET_API_URL || "http://localhost:8080";
      const response = await fetch(
        `${apiBase}/api/prediction-markets/safe-address?eoa=${eoaAddress}`
      );

      if (!response.ok) {
        throw new Error("Failed to derive Safe address");
      }

      const data = await response.json();
      return data.safeAddress as string;
    },
    enabled: !!eoaAddress,
    staleTime: Infinity, // Safe address is deterministic — never changes
  });
}
