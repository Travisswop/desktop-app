export const QUERY_STALE_TIMES = {
  BALANCE: 30_000,
  POSITIONS: 15_000,
  MARKETS: 300_000,
  ORDERS: 15_000,
} as const;

export const QUERY_REFETCH_INTERVALS = {
  BALANCE: 30_000,
  POSITIONS: 15_000,
  ORDERS: 15_000,
} as const;

export const POLLING_DURATION = 30_000; // 30 seconds
export const POLLING_INTERVAL = 2_000; // 2 seconds
