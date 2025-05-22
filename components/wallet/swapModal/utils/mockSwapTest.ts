import { saveSwapTransaction } from '@/actions/saveTransactionData';

/**
 * Mock function to generate a fake swap transaction and save it to the backend
 * for testing purposes only.
 */
export async function mockSwapTransaction(
  accessToken: string,
  walletAddress?: string
) {
  // Generate a mock transaction signature
  const mockSignature = `mock_${Math.random()
    .toString(36)
    .substring(2, 15)}_${Date.now()}`;
  const mockWalletAddress =
    walletAddress || 'YourMockWalletAddressHere'; // Replace with a test wallet address

  // Mock swap details
  const mockSwapDetails = {
    signature: mockSignature,
    solanaAddress: mockWalletAddress,
    inputToken: {
      symbol: 'SOL',
      amount: 0.5, // Mock amount of SOL
      decimals: 9,
      mint: 'So11111111111111111111111111111111111111112', // SOL mint address
      price: '20.45', // Mock SOL price in USD,
      logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1747030504',
    },
    outputToken: {
      symbol: 'USDC',
      amount: 10.225, // Mock amount of USDC
      decimals: 6,
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint address
      price: '1.00', // USDC price in USD
      logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1747030504',
    },
    slippageBps: 50, // 0.5% slippage
    platformFeeBps: 50, // 0.5% platform fee
    timestamp: Date.now(),
  };

  try {
    // Call the actual save transaction function with our mock data
    const result = await saveSwapTransaction(
      mockSwapDetails,
      accessToken
    );

    if (result) {
      return {
        success: true,
        data: result,
        signature: mockSignature,
      };
    } else {
      console.error('❌ Failed to save mock swap transaction');
      return {
        success: false,
        error: 'Failed to save transaction data',
      };
    }
  } catch (error) {
    console.error('❌ Error in mock swap test:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
