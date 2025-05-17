import {
  saveTokenTransferTransaction,
  saveNftTransferTransaction,
} from '@/actions/saveTransactionData';
import logger from '@/utils/logger';

/**
 * Mock function to generate a fake token transfer transaction and save it to the backend
 * for testing purposes only.
 */
export async function mockTokenTransfer(
  accessToken: string,
  walletAddress?: string,
  recipientAddress?: string
) {
  logger.log('Starting mock token transfer test...');

  // Generate a mock transaction signature
  const mockSignature = `mock_token_${Math.random()
    .toString(36)
    .substring(2, 15)}_${Date.now()}`;

  const mockSenderAddress =
    walletAddress || 'YourMockWalletAddressHere';
  const mockRecipientAddress =
    recipientAddress || 'RecipientMockWalletAddress';

  // Mock token transfer details
  const mockTransferDetails = {
    signature: mockSignature,
    senderAddress: mockSenderAddress,
    recipientAddress: mockRecipientAddress,
    token: {
      symbol: 'SOL',
      amount: 1.25, // Mock amount of SOL
      decimals: 9,
      mint: 'So11111111111111111111111111111111111111112', // SOL mint address
      price: '20.45', // Mock SOL price in USD
    },
    timestamp: Date.now(),
    memo: 'Mock token transfer for testing',
  };

  logger.log('Mock token transfer details:', mockTransferDetails);

  try {
    // Call the actual save transaction function with our mock data
    const result = await saveTokenTransferTransaction(
      mockTransferDetails,
      accessToken
    );

    if (result) {
      logger.log(
        '✅ Mock token transfer transaction saved successfully:',
        result
      );
      return {
        success: true,
        data: result,
        signature: mockSignature,
        type: 'TOKEN_TRANSFER',
        tokenSymbol: 'SOL',
      };
    } else {
      logger.error(
        '❌ Failed to save mock token transfer transaction'
      );
      return {
        success: false,
        error: 'Failed to save transaction data',
        type: 'TOKEN_TRANSFER',
      };
    }
  } catch (error) {
    logger.error('❌ Error in mock token transfer test:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      type: 'TOKEN_TRANSFER',
    };
  }
}

/**
 * Mock function to generate a fake NFT transfer transaction and save it to the backend
 * for testing purposes only.
 */
export async function mockNftTransfer(
  accessToken: string,
  walletAddress?: string,
  recipientAddress?: string
) {
  logger.log('Starting mock NFT transfer test...');

  // Generate a mock transaction signature
  const mockSignature = `mock_nft_${Math.random()
    .toString(36)
    .substring(2, 15)}_${Date.now()}`;

  const mockSenderAddress =
    walletAddress || 'YourMockWalletAddressHere';
  const mockRecipientAddress =
    recipientAddress || 'RecipientMockWalletAddress';

  // Define some sample NFTs to use in the mock
  const sampleNfts = [
    {
      name: 'Solana Monkey Business #1234',
      mint: '5FJeEJR8576YxXFdGRAu4NBBFcyfmtjsZKPsX5Y6q5H1',
      collectionName: 'Solana Monkey Business',
      collectionAddress:
        'SmbCd1ZLh7fN1xGZZKhW8uZFkd7oaQzk7fx2JG9CJaX',
      image: 'https://arweave.net/example-monkey-image',
      price: '45.00',
    },
    {
      name: 'DeGods #4567',
      mint: '9uDFQvxB8eUUB4Kv6j2NJiHRXrKdJvkzSEzqRwTRPsHK',
      collectionName: 'DeGods',
      collectionAddress:
        'DGKnN8MUuMKTHuYx9XRZR9oQRMcQuPWZoS4rkMBz9yRW',
      image: 'https://arweave.net/example-degods-image',
      price: '157.50',
    },
    {
      name: 'Okay Bears #7890',
      mint: 'BWXrWKEHrpyBVVdRAdUiUdE8GWBf2GpFKLRr2aMxh5V3',
      collectionName: 'Okay Bears',
      collectionAddress:
        'oBeaRWFwi5M9j4ESa3tLPHmSWAUbt3Jbuxx8r2pXYEQ',
      image: 'https://arweave.net/example-bears-image',
      price: '69.42',
    },
  ];

  // Select a random NFT from the sample list
  const randomNft =
    sampleNfts[Math.floor(Math.random() * sampleNfts.length)];

  // Mock NFT transfer details
  const mockTransferDetails = {
    signature: mockSignature,
    senderAddress: mockSenderAddress,
    recipientAddress: mockRecipientAddress,
    nft: randomNft,
    timestamp: Date.now(),
    memo: 'Mock NFT transfer for testing',
  };

  logger.log('Mock NFT transfer details:', mockTransferDetails);

  try {
    // Call the actual save transaction function with our mock data
    const result = await saveNftTransferTransaction(
      mockTransferDetails,
      accessToken
    );

    if (result) {
      logger.log(
        '✅ Mock NFT transfer transaction saved successfully:',
        result
      );
      return {
        success: true,
        data: result,
        signature: mockSignature,
        type: 'NFT_TRANSFER',
        nftName: randomNft.name,
      };
    } else {
      logger.error('❌ Failed to save mock NFT transfer transaction');
      return {
        success: false,
        error: 'Failed to save transaction data',
        type: 'NFT_TRANSFER',
      };
    }
  } catch (error) {
    logger.error('❌ Error in mock NFT transfer test:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      type: 'NFT_TRANSFER',
    };
  }
}
