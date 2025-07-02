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
 * Jupiter Error Code 6014 (0x177e) - Common Solutions:
 *
 * This error typically occurs when:
 * 1. Insufficient liquidity in the trading pair
 * 2. Price impact is too high for the swap amount
 * 3. The token pair has low trading volume
 * 4. The swap amount is too large relative to available liquidity
 *
 * Solutions to try:
 * 1. Reduce the swap amount
 * 2. Try a different token pair
 * 3. Increase slippage tolerance (but be careful with this)
 * 4. Wait for better market conditions
 * 5. Check if the token has sufficient liquidity on Jupiter
 */

/**
 * Maps Jupiter error codes to user-friendly messages
 * @param errorCode The Jupiter error code (decimal)
 * @returns User-friendly error message
 */
function getJupiterErrorMessage(errorCode: number): string {
  const errorMessages: Record<number, string> = {
    6001: 'Swap failed due to insufficient output amount. Try increasing slippage tolerance.',
    6002: 'Swap failed due to excessive slippage. Try reducing the swap amount.',
    6003: 'Swap failed due to invalid route. Please try a different token pair.',
    6004: 'Swap failed due to quote expiration. Please refresh and try again.',
    6005: 'Swap failed due to insufficient input amount. Please check your balance.',
    6006: 'Swap failed due to token account not found. Please refresh your wallet connection.',
    6007: 'Swap failed due to invalid token mint. Please try a different token.',
    6008: 'Swap failed due to route not found. Please try a different amount or token pair.',
    6009: 'Swap failed due to price impact too high. Try a smaller amount.',
    6010: 'Swap failed due to insufficient SOL for fees. Please ensure you have at least 0.002 SOL.',
    6011: 'Swap failed due to token account already exists. Please try again.',
    6012: 'Swap failed due to invalid fee account. Please try again.',
    6013: 'Swap failed due to fee calculation error. Please try again.',
    6014: 'Swap failed due to insufficient liquidity or price impact too high. Try a smaller amount or different token pair.',
    6015: 'Swap failed due to route optimization error. Please try again.',
    6016: 'Swap failed due to invalid platform fee configuration. Please try again.',
    6017: 'Swap failed due to fee account creation error. Please try again.',
    6018: 'Swap failed due to token transfer error. Please check your balance and try again.',
    6019: 'Swap failed due to route validation error. Please try a different token pair.',
    6020: 'Swap failed due to price validation error. Please try again.',
  };

  return (
    errorMessages[errorCode] ||
    'Swap failed due to an unknown error. Please try again.'
  );
}

/**
 * Gets specific suggestions for Jupiter error codes
 * @param errorCode The Jupiter error code (decimal)
 * @returns Array of suggested actions
 */
function getJupiterErrorSuggestions(errorCode: number): string[] {
  const suggestions: Record<number, string[]> = {
    6014: [
      'Try reducing the swap amount by 50% or more',
      'Check if the token has sufficient liquidity on Jupiter',
      'Consider swapping to a more liquid token first (like USDC)',
      'Wait for better market conditions',
      'Try a different token pair with higher volume',
    ],
    6001: [
      'Increase slippage tolerance to 1-2%',
      'Try a smaller swap amount',
      'Check if the quote is still valid',
    ],
    6009: [
      'Reduce the swap amount significantly',
      'Try breaking the swap into smaller chunks',
      'Check the price impact before confirming',
    ],
    6004: [
      'Refresh the quote and try again',
      'The market may have moved significantly',
      'Try again in a few minutes',
    ],
  };

  return (
    suggestions[errorCode] || [
      'Please try again with different parameters',
    ]
  );
}

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

      // Enhanced error logging for debugging
      if (simulation.value.logs) {
        logger.error('Simulation logs:', simulation.value.logs);
      }

      // Check for specific error types
      const errorStr = JSON.stringify(simulation.value.err);

      // Log Jupiter-specific error codes for debugging
      if (errorStr.includes('"Custom":')) {
        const customErrorMatch = errorStr.match(/"Custom":(\d+)/);
        if (customErrorMatch) {
          const errorCode = parseInt(customErrorMatch[1]);
          const hexCode = '0x' + errorCode.toString(16);
          logger.error(
            `Jupiter custom error detected: ${errorCode} (${hexCode})`
          );
          logger.error('Error details:', simulation.value.err);

          // Log suggestions for common errors
          const suggestions = getJupiterErrorSuggestions(errorCode);
          if (suggestions.length > 0) {
            logger.error('Suggested solutions:');
            suggestions.forEach((suggestion, index) => {
              logger.error(`${index + 1}. ${suggestion}`);
            });
          }
        }
      }

      if (errorStr.includes('ProgramFailedToComplete')) {
        logger.error(
          'Program failed to complete - this usually indicates:'
        );
        logger.error('1. Insufficient SOL for transaction fees');
        logger.error("2. Token account doesn't exist");
        logger.error(
          '3. Quote has expired or price moved significantly'
        );
        logger.error('4. Insufficient token balance');
      }

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
  platformFeeBps = 100, // Default to 1%
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

    // Check SOL balance for transaction fees (if swapping SOL, account for the swap amount too)
    try {
      const solBalance = await connection.getBalance(
        new PublicKey(solanaAddress)
      );

      const minSolForFees = 0.002 * 1e9; // 0.002 SOL for fees - covers transaction fee + rent + buffer

      if (
        inputMint.toString() ===
        'So11111111111111111111111111111111111111112'
      ) {
        // If swapping SOL, ensure we have enough for both swap and fees
        // Convert inAmount to number to ensure proper addition
        const inAmountNum = Number(quote.inAmount);

        const requiredSol = inAmountNum + minSolForFees;

        if (solBalance < requiredSol) {
          throw new Error(
            `Insufficient SOL. Need ${(requiredSol / 1e9).toFixed(
              3
            )} SOL (${(quote.inAmount / 1e9).toFixed(
              3
            )} SOL for swap + 0.002 SOL for fees)`
          );
        }
      } else {
        // If swapping other tokens, just check for fee SOL
        if (solBalance < minSolForFees) {
          throw new Error(
            'Insufficient SOL for transaction fees. Need at least 0.002 SOL.'
          );
        }
      }
      logger.log(`SOL balance: ${solBalance / 1e9} SOL`);
    } catch (balanceError) {
      logger.error('Error checking SOL balance:', balanceError);
      throw balanceError;
    }

    let feeAccount: PublicKey | undefined;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/tokenAccount/${inputMint}`
      );

      if (!response.ok) {
        logger.warn(
          `Fee account API returned ${response.status}, continuing without fees`
        );
        feeAccount = undefined;
      } else {
        const data = await response.json();

        // Convert the fee account string to a PublicKey object
        if (data.tokenAccount) {
          try {
            feeAccount = new PublicKey(data.tokenAccount);
            logger.log(
              'Fee account converted to PublicKey:',
              feeAccount.toString()
            );
          } catch (pubKeyError) {
            logger.error('Invalid fee account format:', pubKeyError);
            feeAccount = undefined;
          }
        } else {
          logger.warn(
            'No token account returned from API, continuing without fees'
          );
        }
      }
    } catch (error: any) {
      logger.warn(
        'Error setting up fee account, continuing without fees:',
        error
      );
      feeAccount = undefined;
    }

    // Prepare the swap request body
    const swapRequestBody: {
      quoteResponse: any;
      userPublicKey: string;
      wrapUnwrapSOL: boolean;
      dynamicComputeUnitLimit: boolean;
      asLegacyTransaction: boolean;
      prioritizationFeeLamports?: string;
      priorityLevel?: PriorityLevel;
      feeAccount?: string;
      slippageBps?: number;
    } = {
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
      try {
        // Validate the fee account one more time before adding
        const validatedFeeAccount = new PublicKey(
          feeAccount.toString()
        );
        swapRequestBody.feeAccount = validatedFeeAccount.toString();
        logger.log(
          'Fee collection enabled with account:',
          validatedFeeAccount.toString()
        );
      } catch (validationError) {
        logger.error(
          'Fee account validation failed, disabling fee collection:',
          validationError
        );
        // Don't add fee account to request body
      }
    } else {
      logger.log('Fee collection disabled - continuing without fees');
    }

    // Set custom slippage if provided
    if (slippageBps !== 200) {
      swapRequestBody.slippageBps = slippageBps;
    }

    // Validate fee account format if present
    if (swapRequestBody.feeAccount) {
      try {
        new PublicKey(swapRequestBody.feeAccount);
        logger.log(
          'Fee account validation passed:',
          swapRequestBody.feeAccount
        );
      } catch (validationError) {
        logger.error(
          'Invalid fee account format, removing from request:',
          validationError
        );
        delete swapRequestBody.feeAccount;
      }
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
    let transaction = VersionedTransaction.deserialize(txBuffer);

    // Simulate transaction before sending
    if (onStatusUpdate) {
      onStatusUpdate('Simulating transaction...');
    }

    let simulationSuccess = false;
    let retryCount = 0;
    const maxRetries = 2;

    while (!simulationSuccess && retryCount <= maxRetries) {
      try {
        await simulateTransaction(
          connection,
          transaction,
          solanaAddress
        );
        logger.log('Transaction simulation successful');
        simulationSuccess = true;
      } catch (simError) {
        retryCount++;
        logger.error(
          `Transaction simulation failed (attempt ${retryCount}):`,
          simError
        );

        if (retryCount <= maxRetries) {
          logger.log('Fetching fresh quote and retrying...');
          if (onStatusUpdate) {
            onStatusUpdate('Fetching fresh quote...');
          }

          try {
            // Fetch a fresh quote
            const freshQuoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${quote.inputMint}&outputMint=${quote.outputMint}&amount=${quote.inAmount}&slippageBps=${slippageBps}&restrictIntermediateTokens=true&platformFeeBps=${platformFeeBps}`;
            const freshQuoteRes = await fetch(freshQuoteUrl);

            if (freshQuoteRes.ok) {
              const freshQuote = await freshQuoteRes.json();

              // Update the swap request with fresh quote
              swapRequestBody.quoteResponse = freshQuote;

              // Get fresh transaction
              const freshRes = await fetch(
                'https://lite-api.jup.ag/swap/v1/swap',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(swapRequestBody),
                }
              );

              if (freshRes.ok) {
                const freshSwapResponse = await freshRes.json();
                if (freshSwapResponse.swapTransaction) {
                  const freshTxBase64 =
                    freshSwapResponse.swapTransaction;
                  const freshTxBuffer = Buffer.from(
                    freshTxBase64,
                    'base64'
                  );
                  transaction =
                    VersionedTransaction.deserialize(freshTxBuffer);
                  logger.log(
                    'Fresh transaction created, retrying simulation...'
                  );
                  continue;
                }
              }
            }
          } catch (retryError) {
            logger.error('Error fetching fresh quote:', retryError);
          }
        }

        // If we've exhausted retries or failed to get fresh quote, throw the error
        throw new Error(
          `Transaction simulation failed after ${retryCount} attempts: ${
            (simError as Error).message
          }`
        );
      }
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
      const errorStr = err.message;

      // Check for Jupiter-specific error codes
      const customErrorMatch = errorStr.match(/"Custom":(\d+)/);
      if (customErrorMatch) {
        const errorCode = parseInt(customErrorMatch[1]);
        errorMessage = getJupiterErrorMessage(errorCode);
      } else if (errorStr.includes('ProgramFailedToComplete')) {
        errorMessage =
          'Transaction failed due to insufficient funds or expired quote. Please check your balance and try again.';
      } else if (errorStr.includes('InsufficientFundsForRent')) {
        errorMessage =
          'Insufficient SOL for account rent. Please ensure you have at least 0.01 SOL for fees.';
      } else if (errorStr.includes('TokenAccountNotFoundError')) {
        errorMessage =
          'Token account not found. Please try refreshing your wallet connection.';
      } else if (errorStr.includes('InsufficientFunds')) {
        errorMessage = 'Insufficient token balance for this swap.';
      } else if (errorStr.includes('Custom')) {
        // Generic custom error handling
        errorMessage =
          'Swap failed due to price movement or insufficient liquidity. Try increasing slippage tolerance or reducing the amount.';
      } else {
        errorMessage =
          'Transaction simulation failed. Please try again with different parameters.';
      }
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
    } else if (
      err.message &&
      err.message.includes('Quote has expired')
    ) {
      errorMessage =
        'Quote has expired. Please refresh and try again.';
    } else if (
      err.message &&
      err.message.includes('Insufficient SOL')
    ) {
      errorMessage = err.message; // Use the specific SOL balance error message
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
