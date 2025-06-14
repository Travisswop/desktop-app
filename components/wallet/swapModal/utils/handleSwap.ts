import {
  VersionedTransaction,
  Connection,
  PublicKey,
  SimulatedTransactionResponse,
} from '@solana/web3.js';
import { PriorityLevel } from './PriorityFeeSelector';
import { saveSwapTransaction } from '@/actions/saveTransactionData';
import logger from '@/utils/logger';

/**
 * Simulates a transaction to catch errors before sending
 * @param connection Solana connection
 * @param transaction The transaction to simulate
 * @param address User's wallet address
 * @returns Simulation result
 */
async function simulateTransaction(
  connection: Connection,
  transaction: VersionedTransaction,
  address: string
): Promise<SimulatedTransactionResponse> {
  try {
    const simulation = await connection.simulateTransaction(
      transaction,
      { sigVerify: false }
    );

    if (simulation.value.err) {
      logger.error('Simulation error:', simulation.value.err);
      throw new Error(
        `Simulation failed: ${JSON.stringify(simulation.value.err)}`
      );
    }

    return simulation.value;
  } catch (error) {
    logger.error('Transaction simulation error:', error);
    throw error;
  }
}

export async function handleSwap({
  quote,
  solanaAddress,
  wallet,
  connection,
  setSwapLoading,
  onSuccess,
  onError,
  onStatusUpdate,
  priorityLevel = 'none',
  slippageBps = 200,
  onBalanceRefresh,
  inputToken,
  outputToken,
  platformFeeBps = 50, // Default to 0.5%
  accessToken,
}: {
  quote: any;
  solanaAddress: string;
  wallet: any;
  connection: Connection;
  setSwapLoading: (loading: boolean) => void;
  onSuccess?: (signature: string, feedData?: any) => void;
  onError?: (message: string) => void;
  onStatusUpdate?: (message: string) => void;
  priorityLevel?: PriorityLevel;
  slippageBps?: number;
  onBalanceRefresh?: () => void;
  inputToken?: any;
  outputToken?: any;
  platformFeeBps?: number;
  accessToken: string;
}) {
  if (!quote || !solanaAddress) return;
  // const adminFeeOwner = new PublicKey("FG4n7rVKzYyM9QGjUu6Mae8JGmQYJjsi6FJvmJHeM9HP");

  setSwapLoading(true);
  let signature: string | null = null;

  try {
    // Validate the quote object
    if (!quote.inputMint) {
      throw new Error('Quote is missing inputMint');
    }

    // Get the input mint from the quote
    logger.log('Input mint from quote:', quote.inputMint);
    let inputMint: PublicKey;

    try {
      inputMint = new PublicKey(quote.inputMint);
      logger.log(
        'Converted input mint to PublicKey:',
        inputMint.toString()
      );
    } catch (err) {
      logger.error('Invalid input mint format:', err);
      throw new Error(
        `Failed to create PublicKey from input mint: ${quote.inputMint}`
      );
    }

    let feeAccount: PublicKey | undefined;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/tokenAccount/${inputMint}`
      );
      const data = await response.json();
      feeAccount = data.tokenAccount;
    } catch (error: any) {
      logger.log('Error setting up fee account:', error);
    }

    // Prepare the swap request body
    const swapRequestBody = {
      quoteResponse: quote,
      userPublicKey: solanaAddress,
      wrapUnwrapSOL: true,
      dynamicComputeUnitLimit: true,
      asLegacyTransaction: false,
    };

    // Add priority fee if selected
    if (priorityLevel !== 'none') {
      swapRequestBody.prioritizationFeeLamports = 'auto';
      swapRequestBody.priorityLevel = priorityLevel;
    }

    // Add fee account if available
    if (feeAccount) {
      swapRequestBody.feeAccount = feeAccount.toString();
      logger.log(
        'Fee collection enabled with account:',
        feeAccount.toString()
      );
    } else {
      logger.log('Fee collection disabled - continuing without fees');
    }

    // Set custom slippage if provided
    if (slippageBps !== 200) {
      swapRequestBody.slippageBps = slippageBps;
    }

    // Log the swap request
    logger.log(
      'Swap request body:',
      JSON.stringify(swapRequestBody, null, 2)
    );

    if (onStatusUpdate) {
      onStatusUpdate('Preparing transaction...');
    }

    const res = await fetch('https://lite-api.jup.ag/swap/v1/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(swapRequestBody),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Swap API error (${res.status}): ${errorText}`);
    }

    const swapResponse = await res.json();

    if (!swapResponse.swapTransaction) {
      throw new Error(
        `Failed to create swap transaction: ${JSON.stringify(
          swapResponse
        )}`
      );
    }

    const txBase64 = swapResponse.swapTransaction;
    const txBuffer = Buffer.from(txBase64, 'base64');
    const transaction = VersionedTransaction.deserialize(txBuffer);

    // Simulate transaction before sending
    if (onStatusUpdate) {
      onStatusUpdate('Simulating transaction...');
    }

    try {
      await simulateTransaction(
        connection,
        transaction,
        solanaAddress
      );
      logger.log('Transaction simulation successful');
    } catch (simError) {
      logger.error('Transaction simulation failed:', simError);
      throw new Error(
        `Transaction simulation failed: ${
          (simError as Error).message
        }`
      );
    }

    if (onStatusUpdate) {
      onStatusUpdate('Please approve transaction in wallet...');
    }

    const signed = await wallet.wallets[0]?.signTransaction!(
      transaction
    );
    const serializedTx = signed.serialize();

    if (onStatusUpdate) {
      onStatusUpdate('Sending transaction...');
    }

    signature = await connection.sendRawTransaction(serializedTx, {
      maxRetries: 3,
      skipPreflight: true,
    });

    logger.log('Signature:', signature);

    if (onStatusUpdate) {
      onStatusUpdate('Confirming transaction...');
    }

    const confirmation = await connection.confirmTransaction(
      signature,
      'finalized'
    );

    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed: ${JSON.stringify(
          confirmation.value.err
        )}`
      );
    }

    logger.log(`✅ Success: https://solscan.io/tx/${signature}`);

    try {
      // Format the swap details for saving
      const swapDetails = {
        signature,
        solanaAddress,
        inputToken: {
          symbol: inputToken?.symbol || quote.inputMint,
          amount: quote.inAmount / 10 ** (inputToken?.decimals || 6),
          decimals: inputToken?.decimals || 6,
          mint: quote.inputMint,
          price: inputToken?.price || inputToken?.usdPrice || '0', // Include token price in USD'
          logo: inputToken?.icon || inputToken?.symbol,
        },
        outputToken: {
          symbol: outputToken?.symbol || quote.outputMint,
          amount:
            quote.outAmount / 10 ** (outputToken?.decimals || 6),
          decimals: outputToken?.decimals || 6,
          mint: quote.outputMint,
          price: outputToken?.price || outputToken?.usdPrice || '0', // Include token price in USD
          logo: outputToken?.icon || outputToken?.symbol,
        },
        slippageBps,
        platformFeeBps: platformFeeBps || 50,
        timestamp: Date.now(),
      };

      // Save to database
      saveSwapTransaction(swapDetails, accessToken);

      // Call onSuccess callback with both signature and feed data
      if (onSuccess) {
        onSuccess(signature);
      }
    } catch (saveError) {
      logger.error('Failed to save swap details:', saveError);
      // Still consider the swap successful, just log the error
      if (onSuccess) {
        onSuccess(signature);
      }
    }

    // Refresh balances after swap completes
    if (onBalanceRefresh) {
      setTimeout(() => {
        onBalanceRefresh();
      }, 2000); // Small delay to ensure blockchain state is updated
    }

    return signature;
  } catch (err: any) {
    logger.error('Swap Failed:', err);

    let errorMessage = 'Swap failed. Please try again.';

    // Generate appropriate error message based on error type
    if (err.message && err.message.includes('simulation failed')) {
      errorMessage =
        'Transaction failed simulation. Please try again with different parameters.';
    } else if (err.message && err.message.includes('Custom')) {
      errorMessage =
        'Swap failed due to price movement. Try increasing slippage tolerance.';
    } else if (err.message && err.message.includes('Blockhash')) {
      errorMessage = 'Transaction expired. Please try again.';
    } else if (
      err.message &&
      err.message.includes('insufficient funds')
    ) {
      errorMessage =
        'Insufficient funds to complete this transaction.';
    } else if (
      err.message &&
      err.message.includes('Transaction too large')
    ) {
      errorMessage =
        'Transaction is too large. Try a smaller swap amount.';
    } else if (err.message) {
      errorMessage = err.message;
    }

    if (onError) {
      onError(errorMessage);
    }

    return null;
  } finally {
    setSwapLoading(false);
  }
}
