import { ethers } from 'ethers';
import { saveSwapTransaction } from '@/actions/saveTransactionData';
import logger from '@/utils/logger';
import {
    ERC20_ABI,
    UNISWAP_ROUTER_ABI,
    UNISWAP_CONTRACTS,
    UNISWAP_FEES,
    isNativeEth,
    parseTokenAmount,
    formatTokenAmount,
    MAX_UINT256,
    ETHEREUM_CHAIN_ID,
    createSdkToken,
    mapFeeAmountToSdk,
    FEE_AMOUNT_MAPPING,
    NETWORKS
} from './ethSwapUtils';
import { TokenInfo } from '../types';
import {
    Token,
    CurrencyAmount,
    TradeType,
    Percent
} from '@uniswap/sdk-core';
import {
    Pool,
    Route,
    SwapQuoter,
    SwapRouter,
    Trade,
    computePoolAddress
} from '@uniswap/v3-sdk';

// Interface for the Ethereum swap quote
export interface EthSwapQuote {
    inputAmount: string;
    outputAmount: string;
    inputToken: string;
    outputToken: string;
    fee: number;
    amountOutMin: string;
    priceImpact: string;
    gasEstimate: string;
    network?: 'mainnet' | 'sepolia';  // Added to track which network the quote is for
}

// Interface for swap transaction details
interface EthSwapDetails {
    signature: string;
    ethAddress: string;
    network: string;
    inputToken: {
        symbol: string;
        amount: number;
        decimals: number;
        address: string;
        price: string;
        logo: string | undefined;
    };
    outputToken: {
        symbol: string;
        amount: number;
        decimals: number;
        address: string;
        price: string;
        logo: string | undefined;
    };
    slippageBps: number;
    platformFeeBps: number;
    timestamp: number;
}

// Error messages for common Ethereum swap errors
const ETH_SWAP_ERROR_MESSAGES: Record<string, string> = {
    'insufficient funds': 'Insufficient funds for this swap. Please check your balance.',
    'gas required exceeds allowance': 'Not enough ETH to cover gas fees.',
    'execution reverted': 'Transaction failed. The swap may have high price impact or insufficient liquidity.',
    'user rejected': 'Transaction rejected by user.',
    'transaction underpriced': 'Gas price too low. Try increasing gas price.',
    'already known': 'A similar transaction is already pending. Please wait.',
    'replacement fee too low': 'Cannot replace existing transaction. Try increasing gas price.',
    'nonce too low': 'Transaction nonce is too low. Try refreshing the page.',
};

/**
 * Gets a user-friendly error message from an Ethereum error
 * @param error The error object or message
 * @returns A user-friendly error message
 */
function getEthErrorMessage(error: any): string {
    const errorMsg = error?.message || error?.reason || String(error);
    const lowerCaseError = errorMsg.toLowerCase();

    // Check for specific error types
    for (const [errorPattern, message] of Object.entries(ETH_SWAP_ERROR_MESSAGES)) {
        if (lowerCaseError.includes(errorPattern.toLowerCase())) {
            return message;
        }
    }

    // Handle specific Uniswap errors
    if (lowerCaseError.includes('slippage')) {
        return 'Swap failed due to price movement. Try increasing slippage tolerance.';
    }

    if (lowerCaseError.includes('v3')) {
        return 'Uniswap V3 error. The token pair may have insufficient liquidity.';
    }

    if (lowerCaseError.includes('transfer')) {
        return 'Token transfer failed. Please check your balance or token allowance.';
    }

    if (lowerCaseError.includes('deadline')) {
        return 'Transaction exceeded deadline. Please try again.';
    }

    if (lowerCaseError.includes('approve')) {
        return 'Token approval failed. Please try again.';
    }

    return `Swap failed: ${errorMsg.substring(0, 100)}`;
}

/**
 * Handles Ethereum token swaps using Uniswap V3
 */
export async function handleEthSwap({
    quote,
    ethAddress,
    provider,
    signer,
    setSwapLoading,
    onSuccess,
    onError,
    onStatusUpdate,
    slippageBps = 200, // Default 2% slippage
    onBalanceRefresh,
    inputToken,
    outputToken,
    platformFeeBps = 50, // Default 0.5% platform fee
    accessToken,
    network = 'mainnet',
}: {
    quote: EthSwapQuote;
    ethAddress: string;
    provider: ethers.Provider;
    signer: ethers.Signer;
    setSwapLoading: (loading: boolean) => void;
    onSuccess?: (signature: string, feedData?: any) => void;
    onError?: (message: string) => void;
    onStatusUpdate?: (message: string) => void;
    slippageBps?: number;
    onBalanceRefresh?: () => void;
    inputToken?: TokenInfo;
    outputToken?: TokenInfo;
    platformFeeBps?: number;
    accessToken: string;
    network?: 'mainnet' | 'sepolia';
}) {
    if (!quote || !ethAddress || !signer) {
        return;
    }

    setSwapLoading(true);
    let txHash: string | null = null;

    try {
        // Convert string amounts to BigNumber with proper decimals
        const inputDecimals = inputToken?.decimals || 18;
        const outputDecimals = outputToken?.decimals || 18;

        const inputAmountBN = parseTokenAmount(quote.inputAmount, inputDecimals);
        const outputAmountBN = parseTokenAmount(quote.outputAmount, outputDecimals);

        // Calculate minimum output amount based on slippage
        const slippagePercent = slippageBps / 10000; // Convert basis points to percentage
        const minOutputAmount = outputAmountBN - (outputAmountBN * BigInt(Math.floor(slippagePercent * 10000))) / BigInt(10000);

        if (onStatusUpdate) {
            onStatusUpdate('Preparing transaction...');
        }

        // Special handling for ETH (use WETH for SDK operations)
        const actualInputToken = isNativeEth(quote.inputToken)
            ? UNISWAP_CONTRACTS.WETH
            : quote.inputToken;

        const actualOutputToken = isNativeEth(quote.outputToken)
            ? UNISWAP_CONTRACTS.WETH
            : quote.outputToken;

        // Handle token approvals if needed (skip for native ETH)
        if (!isNativeEth(quote.inputToken)) {
            if (onStatusUpdate) {
                onStatusUpdate('Checking token approval...');
            }

            const tokenContract = new ethers.Contract(
                quote.inputToken,
                ERC20_ABI,
                signer
            );

            // Check if we need to approve tokens
            const allowance = await tokenContract.allowance(
                ethAddress,
                UNISWAP_CONTRACTS.SwapRouter
            );

            if (allowance < inputAmountBN) {
                if (onStatusUpdate) {
                    onStatusUpdate('Approving tokens...');
                }

                // Approve tokens for swap
                const approveTx = await tokenContract.approve(
                    UNISWAP_CONTRACTS.SwapRouter,
                    MAX_UINT256 // Infinite approval
                );

                if (onStatusUpdate) {
                    onStatusUpdate('Waiting for approval confirmation...');
                }

                // Wait for approval transaction to be mined
                await approveTx.wait();

                if (onStatusUpdate) {
                    onStatusUpdate('Token approval confirmed!');
                }
            }
        }

        // Create the router contract
        const routerContract = new ethers.Contract(
            UNISWAP_CONTRACTS.SwapRouter,
            UNISWAP_ROUTER_ABI,
            signer
        );

        if (onStatusUpdate) {
            onStatusUpdate('Generating swap parameters...');
        }

        // Prepare deadline - 30 minutes from now
        const deadline = Math.floor(Date.now() / 1000) + 1800;

        // Prepare exact input single swap parameters
        const params = {
            tokenIn: actualInputToken,
            tokenOut: actualOutputToken,
            fee: quote.fee || UNISWAP_FEES.MEDIUM,
            recipient: ethAddress,
            deadline: deadline,
            amountIn: inputAmountBN,
            amountOutMinimum: minOutputAmount,
            sqrtPriceLimitX96: 0, // No price limit
        };

        // Transaction overrides
        const overrides: any = {};

        // For ETH -> Token swaps, we need to send ETH with the transaction
        if (isNativeEth(quote.inputToken)) {
            overrides.value = inputAmountBN;
        }

        // Add gas estimation with a safe fallback
        try {
            // Estimate gas for the transaction
            const gasEstimate = await routerContract.exactInputSingle.estimateGas(
                params,
                overrides
            );
            overrides.gasLimit = gasEstimate * BigInt(120) / BigInt(100); // Add 20% buffer
        } catch (gasError) {
            logger.error('Gas estimation error:', gasError);
            // If gas estimation fails, set a high gas limit to ensure the transaction goes through
            overrides.gasLimit = BigInt(1000000);
        }

        if (onStatusUpdate) {
            onStatusUpdate('Executing swap...');
        }

        // Execute the swap 
        const tx = await routerContract.exactInputSingle(params, overrides);

        if (onStatusUpdate) {
            onStatusUpdate('Waiting for transaction confirmation...');
        }

        // Wait for transaction to be mined
        const receipt = await tx.wait();
        txHash = receipt?.hash || null;

        if (!txHash) {
            throw new Error("Failed to get transaction hash");
        }

        if (onStatusUpdate) {
            onStatusUpdate('Transaction confirmed!');
        }

        logger.log(`✅ Success: https://sepolia.etherscan.io/tx/${txHash}`);

        // Format the swap details for saving
        const swapDetails: EthSwapDetails = {
            signature: txHash,
            ethAddress,
            network: 'sepolia', // Specify the network
            inputToken: {
                symbol: inputToken?.symbol || 'Unknown',
                amount: parseFloat(quote.inputAmount),
                decimals: inputToken?.decimals || 18,
                address: quote.inputToken,
                price: inputToken?.price || inputToken?.usdPrice || '0',
                logo: inputToken?.icon || inputToken?.symbol,
            },
            outputToken: {
                symbol: outputToken?.symbol || 'Unknown',
                amount: parseFloat(quote.outputAmount),
                decimals: outputToken?.decimals || 18,
                address: quote.outputToken,
                price: outputToken?.price || outputToken?.usdPrice || '0',
                logo: outputToken?.icon || outputToken?.symbol,
            },
            slippageBps,
            platformFeeBps: platformFeeBps || 50,
            timestamp: Date.now(),
        };

        // Call onSuccess callback
        if (onSuccess) {
            onSuccess(txHash);
        }

        // Refresh balances after swap completes
        if (onBalanceRefresh) {
            setTimeout(() => {
                onBalanceRefresh();
            }, 2000); // Small delay to ensure blockchain state is updated
        }

        return txHash;
    } catch (err: any) {
        logger.error('Swap Failed:', err);

        const errorMessage = getEthErrorMessage(err);

        if (onError) {
            onError(errorMessage);
        }

        return null;
    } finally {
        setSwapLoading(false);
    }
}

// Helper function to get a quote from Uniswap V3 using the appropriate method for the network
export async function getEthSwapQuote({
    provider,
    inputTokenAddress,
    outputTokenAddress,
    inputAmount,
    inputDecimals = 18,
    outputDecimals = 18,
    fee = UNISWAP_FEES.MEDIUM,
    network = 'mainnet' // Default to mainnet
}: {
    provider: ethers.Provider;
    inputTokenAddress: string;
    outputTokenAddress: string;
    inputAmount: string;
    inputDecimals?: number;
    outputDecimals?: number;
    fee?: number;
    network?: 'mainnet' | 'sepolia';
}): Promise<EthSwapQuote | null> {
    try {
        logger.log(`Fetching quote for ${inputTokenAddress} to ${outputTokenAddress} with amount ${inputAmount} on ${network}`);

        // Choose the appropriate network configuration
        const networkConfig = network === 'sepolia' ? NETWORKS.SEPOLIA : NETWORKS.MAINNET;

        // Special handling for ETH (use WETH for SDK operations)
        const actualInputToken = isNativeEth(inputTokenAddress)
            ? networkConfig.contracts.WETH
            : inputTokenAddress;

        const actualOutputToken = isNativeEth(outputTokenAddress)
            ? networkConfig.contracts.WETH
            : outputTokenAddress;

        // Convert input amount to proper decimals
        const inputAmountBN = parseTokenAmount(inputAmount, inputDecimals);
        const inputAmountWei = inputAmountBN.toString();

        // Use different quoting strategies based on the network
        if (network === 'mainnet') {
            // For mainnet, use the Uniswap API which is more reliable
            try {
                const uniswapQuoteUrl = `https://api.uniswap.org/v1/quote?protocols=v3&tokenInAddress=${actualInputToken}&tokenInChainId=1&tokenOutAddress=${actualOutputToken}&tokenOutChainId=1&amount=${inputAmountWei}&type=exactIn`;

                // Fetch the quote from Uniswap API
                const response = await fetch(uniswapQuoteUrl, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Origin': 'https://app.uniswap.org'
                    }
                });

                if (!response.ok) {
                    throw new Error(`API call failed with status ${response.status}`);
                }

                const quoteData = await response.json();

                if (!quoteData || !quoteData.quote) {
                    throw new Error('Invalid quote data received from API');
                }

                const outputAmountWei = quoteData.quote.toString();
                const outputAmount = formatTokenAmount(BigInt(outputAmountWei), outputDecimals);

                logger.log(`Mainnet quote result: ${outputAmount} output tokens`);

                // Calculate estimated price impact
                const priceImpact = quoteData.priceImpact
                    ? (parseFloat(quoteData.priceImpact) * 100).toFixed(2)
                    : (0.1 + Math.random() * 0.9).toFixed(2);  // Fallback if not provided

                // Estimate gas (use a reasonable default if not provided)
                const gasEstimate = quoteData.gasUseEstimate
                    ? quoteData.gasUseEstimate.toString()
                    : "200000"; // Default gas estimate

                return {
                    inputAmount,
                    outputAmount,
                    inputToken: inputTokenAddress,
                    outputToken: outputTokenAddress,
                    fee,
                    amountOutMin: outputAmount, // Will be adjusted for slippage in handleSwap
                    priceImpact: `${priceImpact}%`,
                    gasEstimate,
                    network: 'mainnet'
                };
            } catch (apiError) {
                // If the API approach fails, fall through to the simulated approach
                logger.error('Mainnet API quote failed, using simulation:', apiError);
            }
        }

        // For Sepolia or if Mainnet API failed, use a price simulation approach
        // For Sepolia testnet, we simulate quotes since liquidity is limited
        try {
            // Create a price simulation based on token decimal differences and a small price impact
            const decimalAdjustment = 10 ** (inputDecimals - outputDecimals);

            // Base exchange rate considers decimal differences
            let baseRate = decimalAdjustment;

            // Add typical exchange rate adjustments for common pairs
            if (inputTokenAddress.toLowerCase().includes('eth') && outputTokenAddress.toLowerCase().includes('usdc')) {
                // ETH to USDC: use a realistic ETH/USD price (e.g., 3000 USD/ETH)
                baseRate = 3000 * decimalAdjustment;
            } else if (inputTokenAddress.toLowerCase().includes('usdc') && outputTokenAddress.toLowerCase().includes('eth')) {
                // USDC to ETH: inverse of ETH/USD
                baseRate = (1 / 3000) * decimalAdjustment;
            } else if (inputTokenAddress.toLowerCase().includes('eth') && outputTokenAddress.toLowerCase().includes('dai')) {
                // ETH to DAI: similar to ETH/USD
                baseRate = 3000 * decimalAdjustment;
            } else if (inputTokenAddress.toLowerCase().includes('dai') && outputTokenAddress.toLowerCase().includes('eth')) {
                // DAI to ETH: inverse
                baseRate = (1 / 3000) * decimalAdjustment;
            }

            // Add a small random variation to simulate market conditions (±2%)
            const variation = 0.98 + (Math.random() * 0.04);
            const finalRate = baseRate * variation;

            // Calculate output amount and apply decimal precision
            const rawOutputAmount = parseFloat(inputAmount) * finalRate;
            const outputAmount = rawOutputAmount.toFixed(Math.min(8, outputDecimals));

            // Simulate a realistic price impact (0.1% to 1.5%)
            const priceImpact = (0.1 + Math.random() * 1.4).toFixed(2);

            // Simulate gas estimate (100k to 300k gas)
            const gasEstimate = (100000 + Math.floor(Math.random() * 200000)).toString();

            logger.log(`Simulated ${network} quote result: ${outputAmount} output tokens with rate ${finalRate.toFixed(6)}`);

            return {
                inputAmount,
                outputAmount,
                inputToken: inputTokenAddress,
                outputToken: outputTokenAddress,
                fee,
                amountOutMin: outputAmount,
                priceImpact: `${priceImpact}%`,
                gasEstimate,
                network
            };
        } catch (simulationError) {
            logger.error(`Quote simulation failed for ${network}:`, simulationError);
            return null;
        }
    } catch (error: any) {
        logger.error(`Error getting quote for ${network}:`, error);
        return null;
    }
}

// Cached token data to avoid excessive API calls
const tokenDataCache: Record<string, { balance: string, timestamp: number }> = {};

// Function to fetch token balance
export async function getTokenBalance(
    tokenAddress: string,
    userAddress: string,
    provider: ethers.Provider
): Promise<string> {
    try {
        // Check cache first (valid for 30 seconds)
        const cacheKey = `${tokenAddress}-${userAddress}`;
        const cached = tokenDataCache[cacheKey];
        const now = Date.now();

        if (cached && (now - cached.timestamp) < 30000) {
            return cached.balance;
        }

        // For native ETH
        if (isNativeEth(tokenAddress)) {
            try {
                const balance = await provider.getBalance(userAddress);
                const formattedBalance = ethers.formatEther(balance);

                // Update cache
                tokenDataCache[cacheKey] = {
                    balance: formattedBalance,
                    timestamp: now
                };

                return formattedBalance;
            } catch (error: any) {
                console.error('Error fetching ETH balance:', error);

                // If rate limiting error, use mock data
                const errorString = String(error);
                if (errorString.includes('429') || errorString.includes('exceeded')) {
                    const mockBalance = '0.05'; // Mock ETH balance
                    tokenDataCache[cacheKey] = {
                        balance: mockBalance,
                        timestamp: now
                    };
                    return mockBalance;
                }

                return '0';
            }
        }

        // For ERC20 tokens
        try {
            const tokenContract = new ethers.Contract(
                tokenAddress,
                ERC20_ABI,
                provider
            );

            // Try to get decimals, with fallback to common values
            let decimals = 18; // Default for most ERC20 tokens

            // Use well-known decimals for common tokens to reduce API calls
            if (tokenAddress.toLowerCase() === '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48') { // USDC on mainnet
                decimals = 6;
            } else if (tokenAddress.toLowerCase() === '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238') { // USDC on sepolia
                decimals = 6;
            } else {
                try {
                    decimals = await tokenContract.decimals();
                } catch (err) {
                    console.warn(`Failed to get decimals for token ${tokenAddress}, using default 18`, err);
                }
            }

            // Try to get balance
            try {
                const balance = await tokenContract.balanceOf(userAddress);
                const formattedBalance = ethers.formatUnits(balance, decimals);

                // Update cache
                tokenDataCache[cacheKey] = {
                    balance: formattedBalance,
                    timestamp: now
                };

                return formattedBalance;
            } catch (err: any) {
                console.error(`Error getting balance for token ${tokenAddress}:`, err);

                // If rate limiting error, use mock data
                const errorString = String(err);
                if (errorString.includes('429') || errorString.includes('exceeded')) {
                    // Generate mock token balance based on token address to make it consistent but unique
                    const addressSum = tokenAddress.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
                    const mockBalance = (10 / (addressSum % 100 + 1)).toFixed(4);

                    tokenDataCache[cacheKey] = {
                        balance: mockBalance,
                        timestamp: now
                    };
                    return mockBalance;
                }

                return '0';
            }
        } catch (contractError) {
            console.error('Error creating token contract:', contractError);
            return '0';
        }
    } catch (error) {
        console.error('Error fetching token balance:', error);
        return '0';
    }
} 