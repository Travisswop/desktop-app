/**
 * Client-side notification trigger helpers
 * These functions send notifications to the backend to be processed
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Send swap completed notification
 */
export async function sendSwapNotification(
  accessToken: string,
  swapData: {
    fromToken: string;
    toToken: string;
    fromAmount: string;
    toAmount: string;
    transactionHash: string;
    network: string;
    protocol?: string;
  }
) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v5/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        type: 'swap_completed',
        title: 'Swap Completed',
        body: `Swapped ${swapData.fromAmount} ${swapData.fromToken} for ${swapData.toAmount} ${swapData.toToken}`,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send swap notification');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending swap notification:', error);
  }
}

/**
 * Send token received notification
 */
export async function sendTokenReceivedNotification(
  accessToken: string,
  tokenData: {
    tokenSymbol: string;
    amount: string;
    senderAddress: string;
    transactionHash: string;
    network: string;
  }
) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v5/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        type: 'token_received',
        title: `${tokenData.tokenSymbol} Received`,
        body: `You received ${tokenData.amount} ${tokenData.tokenSymbol} from ${tokenData.senderAddress.substring(0, 8)}...`,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Error sending token received notification:', error);
  }
}

/**
 * Send message received notification
 */
export async function sendMessageNotification(
  accessToken: string,
  messageData: {
    senderUsername: string;
    messagePreview: string;
    conversationId: string;
  }
) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v5/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        type: 'message_received',
        title: messageData.senderUsername,
        body: messageData.messagePreview,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Error sending message notification:', error);
  }
}
