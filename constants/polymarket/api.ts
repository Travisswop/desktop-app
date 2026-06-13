// Polymarket API URLs
export const RELAYER_URL = 'https://relayer-v2.polymarket.com/';
export const CLOB_API_URL = 'https://clob.polymarket.com';
export const CLOB_WS_MARKET_URL =
  'wss://ws-subscriptions-clob.polymarket.com/ws/market';
export const CLOB_WS_USER_URL =
  'wss://ws-subscriptions-clob.polymarket.com/ws/user';
export const GEOBLOCK_API_URL = 'https://polymarket.com/api/geoblock';
export const GAMMA_API_URL = 'https://gamma-api.polymarket.com';
export const POLYMARKET_PROFILE_URL = (address: string) =>
  `https://polymarket.com/${address}`;

// RPC
export const POLYGON_RPC_URL =
  process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_URL ||
  'https://polygon-rpc.com';

// Dedicated Polymarket microservice base URL.
export const POLYMARKET_BACKEND_URL = (
  process.env.NEXT_PUBLIC_POLYMARKET_API_URL ||
  'https://polymarket.apiswop.co'
).replace(/\/$/, '');

// Remote builder signing — still required by the RelayClient (Safe/relayer operations).
// In CLOB V2, CLOB order attribution uses builderCode in the order struct instead.
export const REMOTE_SIGNING_URL = () =>
  `${POLYMARKET_BACKEND_URL}/api/prediction-markets/sign`;
