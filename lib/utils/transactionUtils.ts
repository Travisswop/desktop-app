import { SendFlowState } from '@/types/wallet-types';

function getTokenDecimals(flowData: SendFlowState) {
  const decimals = Number(flowData.token?.decimals);
  return Number.isFinite(decimals) && decimals >= 0 ? Math.floor(decimals) : 18;
}

function trimToTokenDecimals(value: string, decimals: number) {
  const normalized = String(value || '0').trim().replace(/,/g, '');
  if (!normalized || normalized === '.') return '0';

  const asNumber = Number(normalized);
  const decimalLimit = Math.min(Math.max(decimals, 0), 100);
  const decimalString = /e/i.test(normalized)
    ? Number.isFinite(asNumber)
      ? asNumber.toFixed(decimalLimit)
      : '0'
    : normalized;
  const sign = decimalString.startsWith('-') ? '-' : '';
  const unsigned = sign ? decimalString.slice(1) : decimalString;
  const [wholeRaw = '0', fractionRaw = ''] = unsigned.split('.');
  const whole = wholeRaw.replace(/[^\d]/g, '') || '0';
  const fraction = fractionRaw.replace(/[^\d]/g, '').slice(0, decimalLimit);

  return `${sign}${fraction ? `${whole}.${fraction}` : whole}`;
}

/**
 * Calculate transaction amount in token units
 * If sending in USD, converts USD to token amount using market price
 * Otherwise returns the amount as-is
 */
export function calculateTransactionAmount(flowData: SendFlowState): string {
  const tokenDecimals = getTokenDecimals(flowData);

  if (flowData.isUSD && flowData.token?.marketData?.price) {
    const amountInUSD = Number(flowData.amount);
    const tokenPrice = Number(flowData.token.marketData.price);

    if (tokenPrice === 0) {
      throw new Error('Token price cannot be zero');
    }

    const tokenAmount = amountInUSD / tokenPrice;
    const safePrecision = Math.min(Math.max(tokenDecimals + 6, 20), 100);
    return trimToTokenDecimals(tokenAmount.toFixed(safePrecision), tokenDecimals);
  }
  return trimToTokenDecimals(flowData.amount, tokenDecimals);
}

export function createTransactionPayload({
  basePayload,
  sendFlow,
  hash,
  amount,
  walletAddress,
}: {
  basePayload: any;
  sendFlow: any;
  hash: string;
  amount: number;
  walletAddress: string | undefined;
}) {
  return {
    ...basePayload,
    content: {
      transaction_type: sendFlow.nft ? 'nft' : 'token',
      sender_ens: basePayload.smartsiteEnsName,
      sender_wallet_address: walletAddress || '',
      receiver_ens: sendFlow.recipient?.ensName || '',
      receiver_wallet_address: sendFlow.recipient?.address || '',
      amount: Number(amount),
      token: sendFlow.token?.symbol,
      chain: sendFlow.token?.chain,
      currency: sendFlow.token?.symbol || '',
      tokenPrice: sendFlow.isUSD
        ? sendFlow.amount
        : Number(sendFlow.amount) *
          (sendFlow.token?.marketData?.price
            ? Number(sendFlow.token.marketData.price)
            : 0),
      transaction_hash: hash,
    },
  };
}
