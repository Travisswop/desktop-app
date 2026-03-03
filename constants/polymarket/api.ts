// Gamma API (read-only market discovery — no geo-restriction)
export const GAMMA_API_URL = 'https://gamma-api.polymarket.com';
export const POLYMARKET_PROFILE_URL = (address: string) =>
  `https://polymarket.com/${address}`;

// RPC
export const POLYGON_RPC_URL =
  process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_URL ||
  'https://polygon-rpc.com';

// Polymarket backend base (standalone polymarket-backend service)
export const POLYMARKET_API_BASE =
  process.env.NEXT_PUBLIC_POLYMARKET_API_URL || 'http://localhost:8080';
