// Polymarket API URLs
export const RELAYER_URL = 'https://relayer-v2.polymarket.com/';
export const CLOB_API_URL = 'https://clob.polymarket.com';
export const CLOB_WS_MARKET_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';
export const CLOB_WS_USER_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/user';
export const GEOBLOCK_API_URL = 'https://polymarket.com/api/geoblock';
export const GAMMA_API_URL = 'https://gamma-api.polymarket.com';
export const POLYMARKET_PROFILE_URL = (address: string) =>
  `https://polymarket.com/${address}`;

// RPC
export const POLYGON_RPC_URL =
  process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_URL ||
  'https://polygon-rpc.com';

// Swop app backend base URL (orders, users, notifications, etc.)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Dedicated Polymarket microservice base URL.
// In development this runs on port 5000; in production set NEXT_PUBLIC_POLYMARKET_API_URL.
export const POLYMARKET_BACKEND_URL = (
  process.env.NEXT_PUBLIC_POLYMARKET_API_URL || 'http://localhost:5000'
).replace(/\/$/, '');

// Remote builder signing — handled by the polymarket-backend to keep builder secrets off the client.
// NOTE: previously this pointed to the swop-app-backend which has no such route.
export const REMOTE_SIGNING_URL = () =>
  `${POLYMARKET_BACKEND_URL}/api/prediction-markets/sign`;
