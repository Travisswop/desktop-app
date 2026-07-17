import type { CoinbaseOnrampNetwork } from '@/services/wallet-service';

export interface FundingOnrampPrefill {
  initialNetwork?: CoinbaseOnrampNetwork;
  initialAmount?: string;
  sourceText?: string;
}

function normalizeIntentText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[@$"']/g, ' ')
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeFundingOnrampSourceText(value: unknown) {
  return normalizeIntentText(value).replace(/^astro\s+/, '');
}

export function inferFundingOnrampNetwork(
  text: string
): CoinbaseOnrampNetwork {
  if (/\b(solana|sol)\b/i.test(text)) {
    return 'solana';
  }
  if (/\bbase\b/i.test(text)) {
    return 'base';
  }
  return 'ethereum';
}

export function parseFundingOnrampAmount(text: string) {
  const explicitCurrency = text.match(
    /\$([0-9]+(?:\.[0-9]+)?)|\b([0-9]+(?:\.[0-9]+)?)\s*(?:usd|usdc|dollars?|bucks?)\b/i
  );
  if (explicitCurrency?.[1] || explicitCurrency?.[2]) {
    return explicitCurrency[1] || explicitCurrency[2];
  }

  const actionAmount = text.match(
    /\b(?:fund|top\s*up|top-up|add\s+funds?|deposit|buy|on\s*ramp|onramp|load\s+up)\b(?:\s+\w+){0,5}?\s+([0-9]+(?:\.[0-9]+)?)\b/i
  );
  return actionAmount?.[1] || '20';
}

export function findFundingOnrampIntent(
  text: string
): FundingOnrampPrefill | null {
  const hasFundingIntent =
    /\b(fund|top\s*up|top-up|add\s+funds?|deposit|buy\s+usdc|on\s*ramp|onramp|coinbase|cash\s*in|load\s+up)\b/i.test(
      text
    ) ||
    /\bneed\s+(?:more\s+)?(?:usdc|funds?|cash)\b/i.test(text) ||
    /\bwallet\s+(?:fund|funding|top\s*up|deposit)\b/i.test(text);

  if (!hasFundingIntent) return null;

  const sourceText = normalizeFundingOnrampSourceText(text);
  return {
    initialNetwork: inferFundingOnrampNetwork(text),
    initialAmount: parseFundingOnrampAmount(text),
    sourceText,
  };
}
