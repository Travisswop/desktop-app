import type { CheckoutIntent } from '@/lib/checkout-api';
import type { TokenData } from '@/types/token';

export const SOLANA_USDC_MINT =
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export const NATIVE_EVM_TOKEN_ADDRESS =
  '0x0000000000000000000000000000000000000000';
export const EVM_USDC_BY_CHAIN: Partial<Record<TokenData['chain'], string>> = {
  ETHEREUM: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  POLYGON: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  BASE: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  ARBITRUM: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
};
const DEFAULT_USDC_DECIMALS = 6;
const DEFAULT_TOKEN_DISPLAY_DECIMALS = 8;
const MAX_SLIPPAGE_BPS = 9999;
const LIFI_SERVICE_FEE_BPS = 25;
const EVM_LIFI_OUTPUT_BUFFER_RAW_UNITS = 50;
const EVM_LIFI_OUTPUT_DUST_BUFFER =
  EVM_LIFI_OUTPUT_BUFFER_RAW_UNITS / 10 ** DEFAULT_USDC_DECIMALS;

export function getCheckoutAmounts(intent: CheckoutIntent) {
  const merchantReceivesAmount =
    intent.fees?.merchantReceivesAmount ?? intent.amount.value;
  const royaltyAmount = intent.fees?.royaltyAmount ?? 0;
  const platformFeeAmount = intent.fees?.platformFeeAmount ?? 0;
  const totalDueAmount =
    intent.fees?.totalDueAmount ??
    merchantReceivesAmount + royaltyAmount + platformFeeAmount;
  const slippageBps = intent.fees?.slippageBps ?? 50;
  const platformFeeBps = intent.fees?.platformFeeBps ?? 50;

  return {
    merchantReceivesAmount,
    royaltyAmount,
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

export function isEvmSettlementUsdc(token: TokenData) {
  if (token.chain === 'SOLANA') return false;
  if (token.symbol?.toUpperCase() !== 'USDC') return false;

  const expectedAddress = EVM_USDC_BY_CHAIN[token.chain];
  if (!expectedAddress) return false;

  const tokenAddress = getEvmTokenAddressForCheckout(token);
  return Boolean(
    tokenAddress &&
      tokenAddress.toLowerCase() === expectedAddress.toLowerCase()
  );
}

export function getEvmTokenAddressForCheckout(token: TokenData) {
  if (token.chain === 'SOLANA') return token.address || null;

  const address = token.address?.trim() || '';
  const walletAddress = token.walletAddress?.trim() || '';
  const addressLooksLikeWallet =
    address &&
    walletAddress &&
    address.toLowerCase() === walletAddress.toLowerCase();

  if (token.symbol?.toUpperCase() === 'USDC') {
    return (
      EVM_USDC_BY_CHAIN[token.chain] ||
      (addressLooksLikeWallet ? null : address)
    );
  }

  return addressLooksLikeWallet ? null : address || null;
}

export function getLifiTokenAddressForCheckout(token: TokenData) {
  if (
    token.isNative ||
    ['ETH', 'POL', 'MATIC'].includes(token.symbol?.toUpperCase() || '')
  ) {
    return NATIVE_EVM_TOKEN_ADDRESS;
  }

  return getEvmTokenAddressForCheckout(token) || NATIVE_EVM_TOKEN_ADDRESS;
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

function getGrossAmountBeforeFeeRate(amount: number, feeRate: number) {
  const safeFeeRate = Math.max(0, Math.min(Number(feeRate) || 0, 0.9999));
  if (safeFeeRate <= 0) return amount;
  return amount / (1 - safeFeeRate);
}

function getCheckoutLifiIntegratorFeeRate(
  platformFeeAmount: number,
  platformFeeBps: number,
  totalDueAmount: number
) {
  const percentageFeeRate =
    Math.max(0, Math.min(Number(platformFeeBps) || 0, 9999)) / 10000;
  const minimumFeeRate =
    totalDueAmount > 0 ? platformFeeAmount / totalDueAmount : 0;
  return Math.min(0.9999, Math.max(percentageFeeRate, minimumFeeRate));
}

function getCheckoutLifiEffectiveFeeRate(
  platformFeeAmount: number,
  platformFeeBps: number,
  totalDueAmount: number
) {
  const integratorFeeRate = getCheckoutLifiIntegratorFeeRate(
    platformFeeAmount,
    platformFeeBps,
    totalDueAmount
  );
  const serviceFeeRate = LIFI_SERVICE_FEE_BPS / 10000;
  const feeRate = integratorFeeRate + serviceFeeRate;
  return Math.min(feeRate, 0.9999);
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
  if (!token) return '';

  const {
    merchantReceivesAmount,
    platformFeeAmount,
    platformFeeBps,
    totalDueAmount,
    slippageBps,
  } = getCheckoutAmounts(intent);

  // The settlement currency itself needs no conversion: the buyer owes
  // exactly the total due, regardless of what a market price feed says
  // USDC is worth (feeds often report 0.9998-1.0002 and would skew the
  // amount).
  if (isSolanaSettlementUsdc(token) || isEvmSettlementUsdc(token)) {
    return formatRoundedUpTokenAmount(
      totalDueAmount,
      getTokenPaymentDecimals(token)
    );
  }

  const price = Number(token.marketData?.price);
  if (!Number.isFinite(price) || price <= 0) return '';

  const targetOutputAmount =
    token.chain === 'SOLANA'
      ? totalDueAmount
      : Math.max(
          totalDueAmount,
          getGrossAmountBeforeFeeRate(
            merchantReceivesAmount,
            getCheckoutLifiEffectiveFeeRate(
              platformFeeAmount,
              platformFeeBps,
              totalDueAmount
            )
          )
        ) + EVM_LIFI_OUTPUT_DUST_BUFFER;
  const amount =
    (targetOutputAmount / price) * getSlippageProtectedMultiplier(slippageBps);
  return formatRoundedUpTokenAmount(amount, getTokenPaymentDecimals(token));
}
