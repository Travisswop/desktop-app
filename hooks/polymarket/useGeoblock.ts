import { useState, useEffect, useCallback } from "react";
import { GEOBLOCK_API_URL } from "@/constants/polymarket";

export type GeoblockStatus = {
  blocked: boolean;
  ip: string;
  country: string;
  region: string;
  countryCode?: string;
  closeOnly?: boolean;
};

// Per Polymarket's settlement terms these jurisdictions are close-only:
// existing positions may be sold, but no new positions may be opened.
// Fallback list for when the geoblock service doesn't return closeOnly.
export const POLYMARKET_CLOSE_ONLY_COUNTRIES = new Set([
  "PL",
  "SG",
  "TH",
  "TW",
]);

function deriveCloseOnly(data: GeoblockStatus): boolean {
  if (data.blocked) return false;
  if (data.closeOnly === true) return true;
  const code = (data.countryCode || data.country || "").toUpperCase();
  return POLYMARKET_CLOSE_ONLY_COUNTRIES.has(code);
}

type UseGeoblockReturn = {
  isBlocked: boolean;
  isCloseOnly: boolean;
  isLoading: boolean;
  error: Error | null;
  geoblockStatus: GeoblockStatus | null;
  recheckGeoblock: () => Promise<void>;
};

// This hook checks if the user is geoblocked from using Polymarket
// Integrators should use this to enforce the same geoblocking rules as Polymarket.com

export function useGeoblock(): UseGeoblockReturn {
  const [isBlocked, setIsBlocked] = useState(false);
  const [isCloseOnly, setIsCloseOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [geoblockStatus, setGeoblockStatus] = useState<GeoblockStatus | null>(
    null
  );

  const checkGeoblock = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(GEOBLOCK_API_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Geoblock API error: ${response.status}`);
      }

      const data: GeoblockStatus = await response.json();

      setGeoblockStatus(data);
      setIsBlocked(data.blocked);
      setIsCloseOnly(deriveCloseOnly(data));
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to check geoblock");
      setError(error);
      console.error("Geoblock check failed:", error);

      // On error, default to not blocked to avoid false positives
      // In production, you may want to block by default for safety
      setIsBlocked(false);
      setIsCloseOnly(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check geoblock on mount
  useEffect(() => {
    checkGeoblock();
  }, [checkGeoblock]);

  return {
    isBlocked,
    isCloseOnly,
    isLoading,
    error,
    geoblockStatus,
    recheckGeoblock: checkGeoblock,
  };
}
