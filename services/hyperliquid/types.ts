// ─── Hyperliquid Shared Types ──────────────────────────────────────────────────
// All types derived from @nktkas/hyperliquid SDK + Privy integration

// ─── Market / Meta ─────────────────────────────────────────────────────────────

export interface HLAssetMeta {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated: boolean;
}

export interface HLAssetContext {
  dayNtlVlm: string;
  funding: string;
  impactPxs: [string, string];
  markPx: string;
  midPx: string;
  openInterest: string;
  oraclePx: string;
  premium: string;
  prevDayPx: string;
}

export interface HLMarket {
  index: number;
  name: string;         // e.g. "BTC-PERP"
  coin: string;         // e.g. "BTC"
  markPrice: string;
  midPrice: string;
  fundingRate: string;
  szDecimals: number;
  maxLeverage: number;
  openInterest: string;
  dayVolume: string;
  change24h: number;    // percentage
}

// ─── Positions ─────────────────────────────────────────────────────────────────

export interface HLLeverage {
  type: 'cross' | 'isolated';
  value: number;
  rawUsd?: string;
}

export interface HLPosition {
  coin: string;
  szi: string;                // signed size (positive = long, negative = short)
  entryPx: string;
  unrealizedPnl: string;
  returnOnEquity: string;
  liquidationPx: string | null;
  marginUsed: string;
  leverage: HLLeverage;
  maxTradeSzs: [string, string];
  positionValue: string;
  cumFunding: {
    allTime: string;
    sinceChange: string;
    sinceOpen: string;
  };
}

export interface HLMarginSummary {
  accountValue: string;
  totalMarginUsed: string;
  totalNtlPos: string;
  totalRawUsd: string;
}

export interface HLUserState {
  assetPositions: Array<{ position: HLPosition; type: 'oneWay' }>;
  crossMarginSummary: HLMarginSummary;
  marginSummary: HLMarginSummary;
  withdrawable: string;
  crossMaintenanceMarginUsed: string;
}

// ─── Orders ────────────────────────────────────────────────────────────────────

export type HLOrderTif = 'Gtc' | 'Ioc' | 'Alo';

export interface HLLimitOrder {
  limit: { tif: HLOrderTif };
}

export interface HLTriggerOrder {
  trigger: {
    isMarket: boolean;
    tpsl: 'tp' | 'sl';
    triggerPx: string;
  };
}

export type HLOrderType = HLLimitOrder | HLTriggerOrder;

export type HLGrouping = 'na' | 'normalTpsl' | 'positionTpsl';

export interface HLOrderRequest {
  a: number;       // asset index
  b: boolean;      // true = buy/long, false = sell/short
  p: string;       // price
  s: string;       // size
  r: boolean;      // reduce-only
  t: HLOrderType;
  c?: string;      // client order id (optional)
}

export interface HLOpenOrder {
  coin: string;
  limitPx: string;
  oid: number;
  orderType: string;
  origSz: string;
  reduceOnly: boolean;
  side: 'A' | 'B'; // Ask = sell, Bid = buy
  sz: string;
  timestamp: number;
  tif: string;
  triggerCondition: string;
  triggerPx: string;
}

// ─── Order Form State ──────────────────────────────────────────────────────────

export type OrderSide = 'long' | 'short';
export type OrderMode = 'market' | 'limit' | 'tpsl';

export interface OrderFormState {
  side: OrderSide;
  mode: OrderMode;
  size: string;          // USD size
  limitPrice: string;
  leverage: number;
  isCross: boolean;
  takeProfit: string;
  stopLoss: string;
  reduceOnly: boolean;
}

// ─── WebSocket ─────────────────────────────────────────────────────────────────

export interface HLOrderBookLevel {
  px: string;
  sz: string;
  n: number;
}

export interface HLOrderBook {
  coin: string;
  levels: [HLOrderBookLevel[], HLOrderBookLevel[]]; // [bids, asks]
  time: number;
}

export interface HLTradeData {
  coin: string;
  side: 'A' | 'B';
  px: string;
  sz: string;
  time: number;
  hash: string;
  tid: number;
}

// ─── Agent ─────────────────────────────────────────────────────────────────────

export interface HLAgentInfo {
  address: string;
  name: string;
  validUntil: number;
}

// ─── Deposit / Withdraw ────────────────────────────────────────────────────────

export const HYPERLIQUID_BRIDGE_ADDRESS =
  '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7' as const;

export const ARBITRUM_USDC_ADDRESS =
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const;

export const ARBITRUM_CHAIN_ID = 42161;

// ─── Risk Utils ────────────────────────────────────────────────────────────────

export type LiquidationRisk = 'safe' | 'warning' | 'danger';

export function getLiquidationRisk(position: HLPosition): LiquidationRisk {
  if (!position.liquidationPx) return 'safe';

  const liqPx = parseFloat(position.liquidationPx);
  const entryPx = parseFloat(position.entryPx);
  const isLong = parseFloat(position.szi) > 0;

  const distancePct = isLong
    ? (entryPx - liqPx) / entryPx
    : (liqPx - entryPx) / entryPx;

  if (distancePct < 0.05) return 'danger';
  if (distancePct < 0.15) return 'warning';
  return 'safe';
}

export function formatPrice(price: string | number, decimals = 2): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '0.00';
  if (num >= 1000) {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return num.toFixed(decimals > 4 ? decimals : 4);
}

export function formatSize(size: string | number, szDecimals = 3): string {
  const num = typeof size === 'string' ? Math.abs(parseFloat(size)) : Math.abs(size);
  if (isNaN(num)) return '0';
  return num.toFixed(szDecimals);
}

export function formatPnl(pnl: string | number): { value: string; isPositive: boolean } {
  const num = typeof pnl === 'string' ? parseFloat(pnl) : pnl;
  if (isNaN(num)) return { value: '$0.00', isPositive: true };
  return {
    value: `${num >= 0 ? '+' : ''}$${Math.abs(num).toFixed(2)}`,
    isPositive: num >= 0,
  };
}
