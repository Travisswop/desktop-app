import logger from '../utils/logger';

interface SwapFeeNotifyPayload {
  txHash: string;
  walletAddress?: string;
  inputTokenSymbol?: string;
  inputAmount?: string;
  inputUsdValue?: string;
  outputTokenSymbol?: string;
  outputAmount?: string;
  outputUsdValue?: string;
}

export async function notifySwapFee(
  payload: SwapFeeNotifyPayload,
  accessToken: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/notifySwapFee`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to notify swap fee:', errorText);
      return {
        success: false,
        error: `Notify swap fee failed: ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    logger.error('Error notifying swap fee:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error',
    };
  }
}
