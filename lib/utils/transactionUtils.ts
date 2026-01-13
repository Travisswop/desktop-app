import { SendFlowState } from '@/types/wallet-types';

/**
 * Calculate transaction amount in token units
 * If sending in USD, converts USD to token amount using market price
 * Otherwise returns the amount as-is
 */
export function calculateTransactionAmount(flowData: SendFlowState): string {
  if (flowData.isUSD && flowData.token?.marketData?.price) {
    const amountInUSD = Number(flowData.amount);
    const tokenPrice = Number(flowData.token.marketData.price);

    if (tokenPrice === 0) {
      throw new Error('Token price cannot be zero');
    }

    const tokenAmount = amountInUSD / tokenPrice;
    return tokenAmount.toString();
  }
  return flowData.amount;
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
