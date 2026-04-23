// ─── Hyperliquid Network Config ────────────────────────────────────────────────
//
// Set NEXT_PUBLIC_HYPERLIQUID_TESTNET=true in your .env to target the testnet.
// All hooks and services import from here — never hardcode URLs or addresses.

import { arbitrum, arbitrumSepolia } from 'viem/chains';

export const HL_IS_TESTNET =
  process.env.NEXT_PUBLIC_HYPERLIQUID_TESTNET === 'true';

// ─── WebSocket ─────────────────────────────────────────────────────────────────

export const HL_WS_URL = HL_IS_TESTNET
  ? 'wss://api.hyperliquid-testnet.xyz/ws'
  : 'wss://api.hyperliquid.xyz/ws';

// ─── Deposit network config ────────────────────────────────────────────────────
//
// Mainnet:  Arbitrum One      (chainId 42161)   — native USDC
// Testnet:  Arbitrum Sepolia  (chainId 421614)  — Circle testnet USDC
//
// The bridge contract is deployed at the same address on both networks.
// Testnet USDC: Circle's official Arbitrum Sepolia deployment.

// ─── Transport URL helper ──────────────────────────────────────────────────────
//
// In the browser, direct fetch to api.hyperliquid.xyz is blocked by CORS.
// Route all HTTP transport calls through a Next.js proxy route instead.
// On the server (SSR), there is no CORS restriction so we use the direct URL.
//
// The HL library constructs the endpoint URL as:
//   new URL("exchange", apiUrl)  →  apiUrl must end with "/" to keep the prefix
//
// Proxy route: /api/hyperliquid/<network>/<endpoint>
//   e.g. POST /api/hyperliquid/mainnet/exchange → api.hyperliquid.xyz/exchange

export function getHLApiUrl(isTestnet: boolean): string {
  if (typeof window !== 'undefined') {
    const network = isTestnet ? 'testnet' : 'mainnet';
    return `${window.location.origin}/api/hyperliquid/${network}/`;
  }
  // Server-side: no CORS, use direct URL (trailing slash keeps URL resolution correct)
  return isTestnet
    ? 'https://api.hyperliquid-testnet.xyz/'
    : 'https://api.hyperliquid.xyz/';
}

export const HL_DEPOSIT_CONFIG = HL_IS_TESTNET
  ? {
      chain: arbitrumSepolia,
      chainId: 421614,
      bridgeAddress: '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7' as `0x${string}`,
      usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as `0x${string}`,
    }
  : {
      chain: arbitrum,
      chainId: 42161,
      bridgeAddress: '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7' as `0x${string}`,
      usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as `0x${string}`,
    };
