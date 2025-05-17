import logger from '../utils/logger';

interface SwapDetails {
  signature: string;
  solanaAddress: string;
  inputToken: {
    symbol: string;
    amount: number;
    decimals: number;
    mint: string;
    price?: string | number; // Price in USD
  };
  outputToken: {
    symbol: string;
    amount: number;
    decimals: number;
    mint: string;
    price?: string | number; // Price in USD
  };
  slippageBps: number;
  platformFeeBps: number;
  timestamp: number;
}
/**
 * Saves the swap transaction details to the database for feed display
 * @param swapDetails Details of the completed swap
 * @returns Promise resolving to the saved transaction data
 */
export async function saveSwapTransaction(
  swapDetails: SwapDetails,
  accessToken: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/saveSwapTransaction`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          signature: swapDetails.signature,
          walletAddress: swapDetails.solanaAddress,
          inputToken: {
            symbol: swapDetails.inputToken.symbol,
            amount: swapDetails.inputToken.amount,
            decimals: swapDetails.inputToken.decimals,
            mint: swapDetails.inputToken.mint,
            price: swapDetails.inputToken.price || '0', // Include price in USD
          },
          outputToken: {
            symbol: swapDetails.outputToken.symbol,
            amount: swapDetails.outputToken.amount,
            decimals: swapDetails.outputToken.decimals,
            mint: swapDetails.outputToken.mint,
            price: swapDetails.outputToken.price || '0', // Include price in USD
          },
          slippageBps: swapDetails.slippageBps,
          platformFeeBps: swapDetails.platformFeeBps,
          timestamp: swapDetails.timestamp,
          transactionType: 'SWAP',
          network: 'solana',
        }),
        // Use cache: 'no-store' to prevent caching the POST request
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to save swap transaction:', errorText);
      throw new Error(
        `Failed to save transaction: ${response.status}`
      );
    }

    const data = await response.json();
    logger.log('Transaction saved to database:', data);
    return data;
  } catch (error) {
    logger.error('Error saving swap transaction to database:', error);
    // We don't want to break the flow if saving fails
    return null;
  }
}

interface TokenTransferDetails {
  signature: string;
  senderAddress: string;
  recipientAddress: string;
  token: {
    symbol: string;
    amount: number;
    decimals: number;
    mint: string;
    price?: string | number; // Price in USD
  };
  timestamp: number;
  memo?: string;
}

/**
 * Saves the token transfer transaction details to the database for feed display
 * @param transferDetails Details of the completed token transfer
 * @param accessToken User access token for authentication
 * @returns Promise resolving to the saved transaction data
 */
export async function saveTokenTransferTransaction(
  transferDetails: TokenTransferDetails,
  accessToken: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/saveTokenTransferTransaction`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          signature: transferDetails.signature,
          senderAddress: transferDetails.senderAddress,
          recipientAddress: transferDetails.recipientAddress,
          token: {
            symbol: transferDetails.token.symbol,
            amount: transferDetails.token.amount,
            decimals: transferDetails.token.decimals,
            mint: transferDetails.token.mint,
            price: transferDetails.token.price || '0', // Include price in USD
          },
          memo: transferDetails.memo,
          timestamp: transferDetails.timestamp,
          transactionType: 'TOKEN_TRANSFER',
          network: 'solana',
        }),
        // Use cache: 'no-store' to prevent caching the POST request
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        'Failed to save token transfer transaction:',
        errorText
      );
      throw new Error(
        `Failed to save transaction: ${response.status}`
      );
    }

    const data = await response.json();
    logger.log('Token transfer transaction saved to database:', data);
    return data;
  } catch (error) {
    logger.error(
      'Error saving token transfer transaction to database:',
      error
    );
    // We don't want to break the flow if saving fails
    return null;
  }
}

interface NftTransferDetails {
  signature: string;
  senderAddress: string;
  recipientAddress: string;
  nft: {
    name: string;
    mint: string;
    collectionName?: string;
    collectionAddress?: string;
    image?: string;
    price?: string | number; // Estimated value in USD if available
  };
  timestamp: number;
  memo?: string;
}

/**
 * Saves the NFT transfer transaction details to the database for feed display
 * @param transferDetails Details of the completed NFT transfer
 * @param accessToken User access token for authentication
 * @returns Promise resolving to the saved transaction data
 */
export async function saveNftTransferTransaction(
  transferDetails: NftTransferDetails,
  accessToken: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/saveNftTransferTransaction`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          signature: transferDetails.signature,
          senderAddress: transferDetails.senderAddress,
          recipientAddress: transferDetails.recipientAddress,
          nft: {
            name: transferDetails.nft.name,
            mint: transferDetails.nft.mint,
            collectionName: transferDetails.nft.collectionName || '',
            collectionAddress:
              transferDetails.nft.collectionAddress || '',
            image: transferDetails.nft.image || '',
            price: transferDetails.nft.price || '0', // Include estimated value in USD if available
          },
          memo: transferDetails.memo,
          timestamp: transferDetails.timestamp,
          transactionType: 'NFT_TRANSFER',
          network: 'solana',
        }),
        // Use cache: 'no-store' to prevent caching the POST request
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        'Failed to save NFT transfer transaction:',
        errorText
      );
      throw new Error(
        `Failed to save transaction: ${response.status}`
      );
    }

    const data = await response.json();
    logger.log('NFT transfer transaction saved to database:', data);
    return data;
  } catch (error) {
    logger.error(
      'Error saving NFT transfer transaction to database:',
      error
    );
    // We don't want to break the flow if saving fails
    return null;
  }
}
