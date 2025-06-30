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

      // Enhanced error logging for debugging
      if (simulation.value.logs) {
        logger.error('Simulation logs:', simulation.value.logs);
      }

      // Check for specific error types
      const errorStr = JSON.stringify(simulation.value.err);
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

    // Check SOL balance for transaction fees (if swapping SOL, account for the swap amount too)
    try {
      const solBalance = await connection.getBalance(
        new PublicKey(solanaAddress)
      );

      console.log('🚀 ~ solBalance:', solBalance);
      const minSolForFees = 0.002 * 1e9; // 0.002 SOL for fees - covers transaction fee + rent + buffer
      console.log('🚀 ~ minSolForFees:', minSolForFees);
      console.log('🚀 ~ inputMint:', quote.inAmount.toString());
      if (
        inputMint.toString() ===
        'So11111111111111111111111111111111111111112'
      ) {
        // If swapping SOL, ensure we have enough for both swap and fees
        // Convert inAmount to number to ensure proper addition
        const inAmountNum = Number(quote.inAmount);
        console.log('🚀 ~ inAmountNum:', inAmountNum);
        const requiredSol = inAmountNum + minSolForFees;
        console.log('🚀 ~ requiredSol:', requiredSol);
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
      const data = await response.json();
      console.log('🚀 ~ data:', data);
      feeAccount = data.tokenAccount;
    } catch (error: any) {
      logger.log('Error setting up fee account:', error);
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
      feeAccount?: PublicKey;
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
      swapRequestBody.feeAccount = feeAccount;
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
      if (errorStr.includes('ProgramFailedToComplete')) {
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
      } else {
        errorMessage =
          'Transaction simulation failed. Please try again with different parameters.';
      }
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
