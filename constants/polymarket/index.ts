// Re-export API URLs
export {
  GAMMA_API_URL,
  POLYMARKET_PROFILE_URL,
  POLYGON_RPC_URL,
} from './api';

// Re-export token addresses and constants
export { USDC_E_CONTRACT_ADDRESS, USDC_E_DECIMALS } from './tokens';

// Re-export categories
export {
  CATEGORIES,
  DEFAULT_CATEGORY,
  getCategoryById,
  type CategoryId,
  type Category,
} from './categories';

// Re-export query constants
export {
  QUERY_STALE_TIMES,
  QUERY_REFETCH_INTERVALS,
  POLLING_DURATION,
  POLLING_INTERVAL,
} from './query';

// Re-export validation constants
export {
  MIN_ORDER_SIZE,
  MIN_ORDER_AMOUNT,
  MIN_PRICE_CENTS,
  MAX_PRICE_CENTS,
  DUST_THRESHOLD,
  MAX_LIMIT_PRICE_INPUT_LENGTH,
} from './validation';

// Chain configuration
export const POLYGON_CHAIN_ID = 137;
