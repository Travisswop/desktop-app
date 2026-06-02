import {
  MIN_ORDER_SIZE,
  MIN_PRICE_CENTS,
  MAX_PRICE_CENTS,
} from "@/constants/polymarket";

export const isValidSize = (size: number) => size > MIN_ORDER_SIZE;

export const isValidPriceCents = (cents: number) =>
  !isNaN(cents) && cents >= MIN_PRICE_CENTS && cents <= MAX_PRICE_CENTS;

export const isValidDecimalInput = (value: string) =>
  value === "" || /^\d*\.?\d*$/.test(value);

export const isValidCentsInput = (value: string) =>
  value === "" || /^\d{0,2}$/.test(value);

const CENTS_PER_DOLLAR = 100;
const MAX_BUY_BUFFER_CENTS = 1;
const FLOATING_POINT_EPSILON = 1e-9;

export function getSafePolymarketMaxBuyAmount(balance: number): number {
  if (!Number.isFinite(balance) || balance <= 0) return 0;

  const balanceCents = Math.floor(
    balance * CENTS_PER_DOLLAR + FLOATING_POINT_EPSILON,
  );
  const safeCents = Math.max(0, balanceCents - MAX_BUY_BUFFER_CENTS);

  return safeCents / CENTS_PER_DOLLAR;
}

export function getSafePolymarketMaxLimitShares(
  balance: number,
  limitPriceDecimal: number,
): number {
  if (!Number.isFinite(limitPriceDecimal) || limitPriceDecimal <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(getSafePolymarketMaxBuyAmount(balance) / limitPriceDecimal),
  );
}
