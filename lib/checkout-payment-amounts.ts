import type { CheckoutIntent } from '@/lib/checkout-api';
import type { TokenData } from '@/types/token';

export const SOLANA_USDC_MINT =
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const SOL_MINT = 'So11111111111111111111111111111111111111112';
const DEFAULT_USDC_DECIMALS = 6;
const DEFAULT_TOKEN_DISPLAY_DECIMALS = 8;
const MAX_SLIPPAGE_BPS = 9999;

export function getCheckoutAmounts(intent: CheckoutIntent) {
  const merchantReceivesAmount =
    intent.fees?.merchantReceivesAmount ?? intent.amount.value;
  const platformFeeAmount = intent.fees?.platformFeeAmount ?? 0;
  const totalDueAmount =
    intent.fees?.totalDueAmount ??
    merchantReceivesAmount + platformFeeAmount;
  const slippageBps = intent.fees?.slippageBps ?? 50;
  const platformFeeBps = intent.fees?.platformFeeBps ?? 50;

  return {
    merchantReceivesAmount,
    platformFeeAmount,
    totalDueAmount,
    slippageBps,
    platformFeeBps,
  };
}

export function getSlippageProtectedMultiplier(slippageBps: number) {
  const safeBps = Number.isFinite(slippageBps)
    ? Math.max(0, Math.min(slippageBps, MAX_SLIPPAGE_BPS))
    : 50;
  const slippageRate = safeBps / 10000;

  if (slippageRate <= 0) return 1;
  return 1 / (1 - slippageRate);
}

export function isSolanaSettlementUsdc(token: TokenData) {
  if (token.chain !== 'SOLANA') return false;
  if (token.symbol?.toUpperCase() !== 'USDC') return false;

  const address = token.address?.trim();
  return !address || address === SOLANA_USDC_MINT;
}

function getTokenPaymentDecimals(token: TokenData) {
  const fallbackDecimals =
    token.symbol?.toUpperCase() === 'USDC'
      ? DEFAULT_USDC_DECIMALS
      : DEFAULT_TOKEN_DISPLAY_DECIMALS;

  return Math.min(token.decimals || fallbackDecimals, fallbackDecimals);
}

function formatRoundedUpTokenAmount(amount: number, decimals: number) {
  const factor = 10 ** decimals;
  const roundedUp = Math.ceil(amount * factor - 1e-8) / factor;
  return roundedUp.toFixed(decimals);
}

export function getProtectedCheckoutOutputRawAmount(
  intent: CheckoutIntent,
  outputDecimals = DEFAULT_USDC_DECIMALS
) {
  const { totalDueAmount, slippageBps } = getCheckoutAmounts(intent);
  const multiplier = getSlippageProtectedMultiplier(slippageBps);
  return Math.ceil(totalDueAmount * 10 ** outputDecimals * multiplier).toString();
}

export function formatRawTokenAmount(rawAmount: string, decimals: number) {
  const safeDecimals = Math.max(0, Math.min(Math.trunc(decimals || 0), 18));
  const raw = BigInt(rawAmount || '0');

  if (safeDecimals === 0) return raw.toString();

  const scale = 10n ** BigInt(safeDecimals);
  const whole = raw / scale;
  const fraction = raw % scale;
  const fractionText = fraction
    .toString()
    .padStart(safeDecimals, '0')
    .replace(/0+$/, '');

  return fractionText ? `${whole.toString()}.${fractionText}` : whole.toString();
}

export function calculateCheckoutTokenAmount(
  intent: CheckoutIntent,
  token: TokenData | null
) {
  if (!token?.marketData?.price) return '';

  const price = Number(token.marketData.price);
  if (!Number.isFinite(price) || price <= 0) return '';

  const { totalDueAmount, slippageBps } = getCheckoutAmounts(intent);
  const payoutMultiplier = isSolanaSettlementUsdc(token)
    ? 1
    : getSlippageProtectedMultiplier(slippageBps);
  const amount = (totalDueAmount / price) * payoutMultiplier;
  return formatRoundedUpTokenAmount(amount, getTokenPaymentDecimals(token));
}
