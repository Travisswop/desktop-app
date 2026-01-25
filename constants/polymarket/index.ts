// Re-export API URLs
export {
  RELAYER_URL,
  CLOB_API_URL,
  GEOBLOCK_API_URL,
  GAMMA_API_URL,
  POLYMARKET_PROFILE_URL,
  POLYGON_RPC_URL,
  REMOTE_SIGNING_URL,
} from "./api";

// Re-export token addresses and constants
export {
  USDC_E_CONTRACT_ADDRESS,
  USDC_E_DECIMALS,
  CTF_CONTRACT_ADDRESS,
  CTF_EXCHANGE_ADDRESS,
  NEG_RISK_CTF_EXCHANGE_ADDRESS,
  NEG_RISK_ADAPTER_ADDRESS,
} from "./tokens";

// Re-export categories
export {
  CATEGORIES,
  DEFAULT_CATEGORY,
  getCategoryById,
  type CategoryId,
  type Category,
} from "./categories";

// Re-export query constants
export {
  QUERY_STALE_TIMES,
  QUERY_REFETCH_INTERVALS,
  POLLING_DURATION,
  POLLING_INTERVAL,
} from "./query";

// Re-export validation constants
export {
  MIN_ORDER_SIZE,
  MIN_PRICE_CENTS,
  MAX_PRICE_CENTS,
  DUST_THRESHOLD,
  MAX_LIMIT_PRICE_INPUT_LENGTH,
} from "./validation";

// Chain configuration
export const POLYGON_CHAIN_ID = 137;

// Session storage
export const SESSION_STORAGE_KEY = "polymarket_trading_session";
