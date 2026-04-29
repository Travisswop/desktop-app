import { useMemo } from "react";
import { ClobClient } from "@polymarket/clob-client-v2";
import { usePolymarketWallet } from "@/providers/polymarket";
import { useSafeDeployment } from "@/hooks/polymarket/useSafeDeployment";

import { TradingSession } from "@/lib/polymarket/session";
import {
  CLOB_API_URL,
  POLYGON_CHAIN_ID,
} from "@/constants/polymarket";

// Creates an authenticated ClobClient (V2 SDK) with the user's API credentials.
// Builder attribution is via builderCode in the order struct — no remote HMAC signing.

export function useClobClient(
  tradingSession: TradingSession | null,
  isTradingSessionComplete: boolean | undefined
) {
  const { eoaAddress, ethersSigner } = usePolymarketWallet();
  const { derivedSafeAddressFromEoa } = useSafeDeployment(eoaAddress);

  const clobClient = useMemo(() => {
    if (
      !ethersSigner ||
      !eoaAddress ||
      !derivedSafeAddressFromEoa ||
      !isTradingSessionComplete ||
      !tradingSession?.apiCredentials
    ) {
      return null;
    }

    // Guard: all three credential fields must be non-empty strings.
    // A missing `secret` causes postHeartbeat to crash inside buildPolyHmacSignature.
    const { key, secret, passphrase } = tradingSession.apiCredentials;
    if (!key || !secret || !passphrase) {
      console.warn(
        "[Polymarket] API credentials are incomplete — skipping ClobClient creation.",
      );
      return null;
    }

    // V2: builderCode is a static bytes32 identifier — no HMAC remote signing needed.
    const builderCode = process.env.NEXT_PUBLIC_POLY_BUILDER_CODE;

    return new ClobClient({
      host: CLOB_API_URL,
      chain: POLYGON_CHAIN_ID,
      signer: ethersSigner,
      creds: tradingSession.apiCredentials,
      signatureType: 2, // GNOSIS_SAFE — EOA signs for Safe proxy wallet
      funderAddress: derivedSafeAddressFromEoa,
      ...(builderCode ? { builderConfig: { builderCode } } : {}),
    });
  }, [
    eoaAddress,
    ethersSigner,
    derivedSafeAddressFromEoa,
    isTradingSessionComplete,
    tradingSession?.apiCredentials,
  ]);

  return { clobClient };
}
