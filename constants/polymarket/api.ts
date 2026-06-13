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
// Ordered list of Polygon RPC endpoints used with viem's `fallback` transport.
// The public `polygon-rpc.com` endpoint started returning 403 "tenant disabled",
// which silently broke on-chain approval reads (they resolve to "not approved"),
// re-prompting fully-approved users to "Enable trading". Keep multiple healthy
// public nodes so a single dead endpoint never breaks reads.
export const POLYGON_RPC_URLS = [
  process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_URL,
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.drpc.org',
].filter((url): url is string => !!url);

export const POLYGON_RPC_URL = POLYGON_RPC_URLS[0];

// Dedicated Polymarket microservice base URL.
export const POLYMARKET_BACKEND_URL = (
  process.env.NEXT_PUBLIC_POLYMARKET_API_URL ||
  'https://polymarket.apiswop.co'
).replace(/\/$/, '');

// Remote builder signing — still required by the RelayClient (Safe/relayer operations).
// In CLOB V2, CLOB order attribution uses builderCode in the order struct instead.
export const REMOTE_SIGNING_URL = () =>
  `${POLYMARKET_BACKEND_URL}/api/prediction-markets/sign`;
