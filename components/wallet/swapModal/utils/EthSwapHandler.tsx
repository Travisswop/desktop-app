import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { ethers } from 'ethers';
import { TokenInfo } from '../types';
import { EthSwapQuote, getEthSwapQuote, handleEthSwap, getTokenBalance } from './handleEthSwap';
import {
    isNativeEth,
    DEFAULT_ETH_TOKENS,
    getEthTokenInfoBySymbol,
    getTokenAddressBySymbol,
    UNISWAP_FEES,
    ETHEREUM_CHAIN_ID,
    NETWORKS,
    getDefaultTokens
} from './ethSwapUtils';
import EthPriceCard from './EthPriceCard';

// Add your Alchemy/Infura API keys here
const RPC_URLS = {
    mainnet: 'https://eth-mainnet.g.alchemy.com/v2/6WBsg7Xg8oFri6ovGrJeLeYwZjAEYol5',
    sepolia: 'https://eth-sepolia.g.alchemy.com/v2/M-8Ek1BvsYpiE2T8Gch9U'
};

// Add a simple throttling mechanism for API requests
const throttleRequests = <T extends (...args: any[]) => Promise<any>>(fn: T, delay: number): T => {
    let lastCall = 0;
    return (async (...args: any[]) => {
        const now = Date.now();
        if (now - lastCall < delay) {
            const waitTime = delay - (now - lastCall);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        lastCall = Date.now();
        return fn(...args);
    }) as T;
};

// Props for the ETH Swap Handler
interface EthSwapHandlerProps {
    ethAddress: string;
    wallet: any; // Privy wallet
    inputSymbol: string;
    outputSymbol: string;
    amount: string;
    slippageBps: number;
    onSwapComplete?: (txHash: string) => void;
    onSwapError?: (error: string) => void;
    onStatusUpdate?: (status: string) => void;
    onQuoteUpdate?: (quote: EthSwapQuote | null) => void;
    accessToken: string;
    priorityLevel?: string;
    platformFeeBps?: number;
    onBalanceRefresh?: () => void;
    className?: string;
    network?: 'mainnet' | 'sepolia'; // Added network selection
    open?: boolean; // Add this line - optional to maintain backward compatibility
}

export default function EthSwapHandler({
    ethAddress,
    wallet,
    inputSymbol,
    outputSymbol,
    amount,
    slippageBps,
    onSwapComplete,
    onSwapError,
    onStatusUpdate,
    onQuoteUpdate,
    accessToken,
    priorityLevel,
    platformFeeBps = 50, // Default 0.5%
    onBalanceRefresh,
    className = '',
    network = 'mainnet', // Default to mainnet
    open = false, // Add this line with a default value
}: EthSwapHandlerProps): JSX.Element {
    const [quote, setQuote] = useState<EthSwapQuote | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [swapLoading, setSwapLoading] = useState(false);
    const [activeNetwork, setActiveNetwork] = useState<'mainnet' | 'sepolia'>(network);

    // Use refs to prevent infinite loops
    const mountedRef = React.useRef(true);
    const hasInitializedRef = React.useRef(false);
    const lastFetchTimeRef = React.useRef(0);
    const fetchKeyRef = React.useRef('');  // Move this ref outside the useEffect
    const wasOpen = useRef(false);  // Initialize to false

    // Add a unique instance ID for this component to force clean remounts
    const instanceIdRef = useRef(Math.random().toString(36).substring(7));

    // Force reset all state (much more aggressive)
    const resetAllState = useCallback(() => {
        console.log('[DEBUG] Forcefully resetting all states');
        setQuote(null);
        setError(null);
        setLoading(false);
        isLoadingQuoteRef.current = false;
        prevQuoteParamsRef.current = '';
        quoteAttemptCountRef.current = 0;
        fetchKeyRef.current = '';
        forceRefresh.current = true;
        // Don't reset network-related state
    }, []);

    // State for token information
    const [inputToken, setInputToken] = useState<TokenInfo | null>(null);
    const [outputToken, setOutputToken] = useState<TokenInfo | null>(null);
    const [userTokens, setUserTokens] = useState<TokenInfo[]>([]);

    // Setup provider and signer from Privy wallet
    const [provider, setProvider] = useState<ethers.Provider | null>(null);
    const [signer, setSigner] = useState<ethers.Signer | null>(null);
    const [walletNetwork, setWalletNetwork] = useState<string | null>(null);
    const [walletChainId, setWalletChainId] = useState<number | null>(null);

    // Initialize providers for quotes
    const [mainnetProvider, setMainnetProvider] = useState<ethers.Provider | null>(null);
    const [sepoliaProvider, setSepoliaProvider] = useState<ethers.Provider | null>(null);

    // Get the appropriate network configuration based on active network
    const networkConfig = activeNetwork === 'sepolia' ? NETWORKS.SEPOLIA : NETWORKS.MAINNET;

    // Get token list based on active network
    const tokenList = getDefaultTokens(networkConfig);

    // Add useLayoutEffect for synchronous updates and an unmount guard with forceUpdate
    const [, forceRender] = useState({});

    // Add this immediately before the quote fetch effect
    // Special protection for unmounting during async operations
    useLayoutEffect(() => {
        console.log('[DEBUG] EthSwapHandler mounted/rendered');
        // Set mounted flag to true immediately in layout effect (synchronous)
        mountedRef.current = true;

        return () => {
            console.log('[DEBUG] EthSwapHandler unmounting - setting mounted flag to false');
            mountedRef.current = false;
        };
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Create providers for mainnet and sepolia - once only
    useEffect(() => {
        if (hasInitializedRef.current) return;

        try {
            const mainnetRpcProvider = new ethers.JsonRpcProvider(RPC_URLS.mainnet);
            const sepoliaRpcProvider = new ethers.JsonRpcProvider(RPC_URLS.sepolia);

            setMainnetProvider(mainnetRpcProvider);
            setSepoliaProvider(sepoliaRpcProvider);
            hasInitializedRef.current = true;
        } catch (err) {
            console.error("Failed to initialize RPC providers:", err);
            setError("Failed to connect to Ethereum networks");
        }
    }, []);

    // Setup provider from Privy wallet - only when wallet or address changes
    useEffect(() => {
        if (!wallet || !ethAddress) return;

        const initWallet = async () => {
            try {
                // Initialize Privy provider
                try {
                    // Get the Ethereum provider from Privy wallet
                    const privyProvider = await wallet.getEthereumProvider();

                    // Use direct JSON-RPC providers for more reliable connections
                    // This avoids CORS and timeout issues with Privy's provider
                    const networkProvider = activeNetwork === 'sepolia'
                        ? new ethers.JsonRpcProvider(RPC_URLS.sepolia)
                        : new ethers.JsonRpcProvider(RPC_URLS.mainnet);

                    // For transactions only, use Privy's provider to connect to the user's wallet
                    const walletProvider = new ethers.BrowserProvider(privyProvider);

                    // Get the network information from the provider
                    const network = await walletProvider.getNetwork();

                    if (!mountedRef.current) return;

                    setWalletNetwork(network.name);
                    setWalletChainId(Number(network.chainId));

                    // Set the provider and signer
                    setProvider(networkProvider);
                    const walletSigner = await walletProvider.getSigner();
                    setSigner(walletSigner);
                } catch (err) {
                    console.error("Failed to get provider/signer from Privy wallet:", err);
                    if (mountedRef.current) {
                        setError("Failed to connect to Ethereum wallet");
                    }
                }
            } catch (err) {
                console.error("Failed to initialize Ethereum provider:", err);
                if (mountedRef.current) {
                    setError("Failed to connect to Ethereum wallet");
                }
            }
        };

        initWallet();
    }, [wallet, ethAddress, activeNetwork]); // Only re-run when these change

    // Define a stable version of fetchTokenBalances that doesn't depend on userTokens
    const fetchTokenBalancesStable = useCallback(async () => {
        // Prevent excessive API calls
        const now = Date.now();
        if (now - lastFetchTimeRef.current < 10000) { // Only allow refresh every 10 seconds
            console.log("Token balance fetch throttled");
            return;
        }

        if (!provider || !ethAddress) return;

        // Update last fetch time
        lastFetchTimeRef.current = now;

        try {
            // To avoid rate limits, we'll only fetch a few tokens
            const essentialTokens = tokenList.slice(0, 2); // Just fetch the first two tokens

            // Create a function that fetches with delay
            const fetchWithDelay = async (token: any, index: number) => {
                // Add much longer staggered delay between requests
                await new Promise(resolve => setTimeout(resolve, index * 1000));

                try {
                    const tokenAddress = token.address as string;
                    const balance = await getTokenBalance(tokenAddress, ethAddress, provider);
                    return {
                        ...token,
                        balance,
                    };
                } catch (err) {
                    console.error(`Failed to fetch balance for ${token.symbol}:`, err);
                    return {
                        ...token,
                        balance: '0',
                    };
                }
            };

            // Process tokens with delays to avoid rate limiting
            const tokenPromises = essentialTokens.map(fetchWithDelay);
            const updatedTokensArray = await Promise.all(tokenPromises);

            // Only update state if component is still mounted
            if (!mountedRef.current) return;

            // Get the current user tokens
            const currentUserTokens = userTokens;

            // Update only the tokens we fetched, keep the rest unchanged
            const mergedTokens = tokenList.map(token => {
                const updatedToken = updatedTokensArray.find(t => t.symbol === token.symbol);
                if (updatedToken) return updatedToken;

                const existingToken = currentUserTokens.find(t => t.symbol === token.symbol);
                if (existingToken) return existingToken;

                return token;
            });

            // Update state with merged tokens
            setUserTokens(mergedTokens);
        } catch (err) {
            console.error("Failed to fetch token balances:", err);
        }
    }, [provider, ethAddress, tokenList]); // Intentionally NOT including userTokens

    // Replace the previous function
    useEffect(() => {
        // Only fetch if we have the necessary data and haven't fetched yet
        if (provider && ethAddress && lastFetchTimeRef.current === 0) {
            setTimeout(() => {
                if (mountedRef.current) {
                    fetchTokenBalancesStable();
                }
            }, 500);
        }
    }, [provider, ethAddress, fetchTokenBalancesStable]);

    // Fix the tokenBalance dependency in the callback
    // We need to memoize userTokens to break the dependency cycle
    const memoizedUserTokens = React.useRef(userTokens);
    useEffect(() => {
        memoizedUserTokens.current = userTokens;
    }, [userTokens]);

    // Create refs to track previous values
    const prevInputSymbolRef = React.useRef(inputSymbol);
    const prevOutputSymbolRef = React.useRef(outputSymbol);
    const activeNetworkChanged = React.useRef(false);
    const forceRefresh = React.useRef(false);

    // Update input and output tokens when symbols change - this is causing infinite updates
    useEffect(() => {
        // Skip updates if no symbols
        if (!inputSymbol || !outputSymbol) return;

        // Skip if no symbol changes
        if (prevInputSymbolRef.current === inputSymbol &&
            prevOutputSymbolRef.current === outputSymbol) {
            return;
        }

        // Update previous symbol refs
        prevInputSymbolRef.current = inputSymbol;
        prevOutputSymbolRef.current = outputSymbol;

        // Get tokens synchronously without updating state
        const newInputToken = getEthTokenInfoBySymbol(inputSymbol, userTokens, tokenList);
        const newOutputToken = getEthTokenInfoBySymbol(outputSymbol, userTokens, tokenList);

        // Use a timeout to break the synchronous update cycle
        setTimeout(() => {
            if (mountedRef.current) {
                setInputToken(newInputToken);
                setOutputToken(newOutputToken);
            }
        }, 0);

    }, [inputSymbol, outputSymbol]); // Minimal dependencies

    // Remove debug logs that trigger renders
    // console.log('inputToken', inputToken);
    // console.log('outputToken', outputToken);
    // console.log('userTokens', userTokens);
    // console.log('tokenList', tokenList);

    // Create previous value refs for tracking changes
    const prevQuoteParamsRef = React.useRef('');
    const quoteAttemptCountRef = React.useRef(0);

    // Add a ref for tracking if we're loading a quote
    const isLoadingQuoteRef = React.useRef(false);

    // At the beginning of the component, add state change tracking
    useEffect(() => {
        console.log(`[DEBUG] Loading state changed: ${loading}`);
    }, [loading]);

    useEffect(() => {
        console.log(`[DEBUG] Quote state changed:`, quote ? 'Has Quote' : 'No Quote');
    }, [quote]);



    // Complete rewrite of the quote fetching effect with better state management
    useEffect(() => {
        // Function to fetch quote with proper state handling
        const fetchQuoteWithStateManagement = async () => {
            console.log(`[DEBUG] Starting fetchQuoteWithStateManagement:`, {
                isLoading: isLoadingQuoteRef.current,
                amount,
                inputSymbol,
                outputSymbol,
                hasProviders: Boolean(mainnetProvider && sepoliaProvider),
                currentLoading: loading,
                currentSwapLoading: swapLoading
            });

            // Skip if already loading or missing requirements
            if (isLoadingQuoteRef.current || !amount || parseFloat(amount) <= 0 ||
                !inputSymbol || !outputSymbol || !mainnetProvider || !sepoliaProvider) {
                console.log(`[DEBUG] Skipping quote fetch - conditions not met`);
                return;
            }

            // Generate a unique key for this specific query
            const quoteKey = `${amount}-${inputSymbol}-${outputSymbol}-${activeNetwork}`;

            // Skip if we already processed this exact query and have a quote (unless forced)
            if (prevQuoteParamsRef.current === quoteKey && quote && !forceRefresh.current) {
                console.log(`[DEBUG] Skipping duplicate quote fetch - same parameters`);
                return;
            }

            // Update the tracking ref and mark as loading
            prevQuoteParamsRef.current = quoteKey;
            isLoadingQuoteRef.current = true;
            console.log(`[DEBUG] Setting loading state to TRUE`);
            setLoading(true);

            // Reset force refresh flag
            forceRefresh.current = false;

            try {
                // Log the request
                console.log(`Starting quote fetch for ${inputSymbol} to ${outputSymbol} on ${activeNetwork}`);

                // Get network-specific config
                const networkConfig = activeNetwork === 'sepolia' ? NETWORKS.SEPOLIA : NETWORKS.MAINNET;

                // Get token addresses
                const inputTokenAddress = getTokenAddressBySymbol(inputSymbol, networkConfig);
                const outputTokenAddress = getTokenAddressBySymbol(outputSymbol, networkConfig);

                if (!inputTokenAddress || !outputTokenAddress) {
                    console.warn("Invalid token selection for network", activeNetwork);
                    throw new Error(`Token not available on ${activeNetwork} network`);
                }

                // Use current token info
                const inputDecimals = inputToken?.decimals || 18;
                const outputDecimals = outputToken?.decimals || 18;

                console.log(`Fetching quote for ${inputSymbol} (${inputTokenAddress}) to ${outputSymbol} (${outputTokenAddress}) on ${activeNetwork}`);

                // Check providers first
                const quoteProvider = activeNetwork === 'sepolia' ? sepoliaProvider : mainnetProvider;
                if (!quoteProvider) {
                    throw new Error('Provider not available');
                }

                // Get quote
                const newQuote = await getEthSwapQuote({
                    provider: quoteProvider,
                    inputTokenAddress,
                    outputTokenAddress,
                    inputAmount: amount,
                    inputDecimals,
                    outputDecimals,
                    fee: UNISWAP_FEES.MEDIUM,
                    network: activeNetwork
                });

                // Only update if still mounted
                if (mountedRef.current) {
                    if (newQuote) {
                        // Update with success - use a synchronous pattern
                        console.log("[DEBUG] Quote fetch successful, updating state");

                        // Force a synchronous state update
                        setQuote(newQuote);
                        setError(null);
                        setLoading(false); // Reset loading immediately with the quote

                        // Force a render to ensure state updates are applied
                        forceRender({});

                        if (onQuoteUpdate) onQuoteUpdate(newQuote);
                    } else {
                        // Update with failure
                        console.log("Quote fetch returned no result");
                        setQuote(null);
                        setError("Could not get a swap quote");
                        setLoading(false); // Always reset loading
                        forceRender({});
                        if (onQuoteUpdate) onQuoteUpdate(null);
                    }
                } else {
                    console.log("[DEBUG] Component unmounted before quote update could be applied");
                }
            } catch (err: any) { // Type err as any
                // Handle errors
                console.error("Quote fetch error:", err);

                if (mountedRef.current) {
                    setQuote(null);
                    setError(err.message || "Failed to get quote");
                    if (onQuoteUpdate) onQuoteUpdate(null);
                }
            } finally {
                if (mountedRef.current) {
                    console.log(`[DEBUG] Quote fetch completed`);
                    // We already reset loading above, so no need to do it here
                } else {
                    console.log(`[DEBUG] Component unmounted - not updating state`);
                }
                isLoadingQuoteRef.current = false;
            }
        };

        // Skip if we're in a loading state (unless it's a network change)
        if ((loading || swapLoading) && !activeNetworkChanged.current) {
            return;
        }

        // Reset network change flag
        if (activeNetworkChanged.current) {
            activeNetworkChanged.current = false;
            forceRefresh.current = true;
        }

        // Use debounce to prevent rapid-fire API calls
        const timeoutId = setTimeout(() => {
            fetchQuoteWithStateManagement();
        }, 1000);

        // Cleanup
        return () => {
            clearTimeout(timeoutId);
        };
    }, [
        // Only dependencies that should trigger a refresh
        amount,
        inputSymbol,
        outputSymbol,
        activeNetwork,
        // Include these to avoid "missing dependencies" warnings
        inputToken,
        outputToken,
        mainnetProvider,
        sepoliaProvider,
        loading,
        swapLoading,
        onQuoteUpdate
    ]);

    // Add a cleanup effect to ensure loading state is reset
    useEffect(() => {
        return () => {
            setLoading(false);
        };
    }, []);

    // Track network changes to reset states appropriately
    useEffect(() => {
        console.log(`[DEBUG] Network change effect triggered: ${activeNetwork}`);

        // Reset state when network changes
        console.log(`[DEBUG] Resetting states due to network change`);
        setLoading(false);
        setError(null);
        setQuote(null);

        // Reset tracking refs
        prevQuoteParamsRef.current = '';
        quoteAttemptCountRef.current = 0;
        fetchKeyRef.current = '';

        // Set flags for network change
        console.log(`[DEBUG] Setting network change flags`);
        activeNetworkChanged.current = true;
        forceRefresh.current = true;

        console.log(`Network changed to: ${activeNetwork}`);

        // Force a token balance update
        if (provider && ethAddress) {
            setTimeout(() => {
                if (mountedRef.current) {
                    console.log(`[DEBUG] Fetching token balances after network change`);
                    fetchTokenBalancesStable();
                }
            }, 500);
        }
    }, [activeNetwork]); // Only run when network changes

    // Move the open state effect to the top, right after resetAllState
    useEffect(() => {
        if (open && !wasOpen.current) {
            // Modal just opened: forcefully reset all state
            console.log('[DEBUG] Modal opened - forcefully resetting all states');
            resetAllState();
            // Force a small delay before allowing any fetches
            setTimeout(() => {
                if (mountedRef.current) {
                    console.log('[DEBUG] Post-open delay completed - now ready to fetch quotes');
                }
            }, 500);
        }
        wasOpen.current = open;
    }, [open, resetAllState]);

    // Function to execute swap
    const executeSwap = async () => {
        if (!provider || !signer || !quote || !inputToken || !outputToken) {
            setError("Cannot execute swap: missing required information");
            return;
        }

        if (swapLoading) return;

        try {
            await handleEthSwap({
                quote,
                ethAddress,
                provider,
                signer,
                setSwapLoading,
                onSuccess: (txHash) => {
                    if (onSwapComplete) {
                        onSwapComplete(txHash);
                    }

                    // Refresh balances after swap
                    setTimeout(() => {
                        fetchTokenBalancesStable();
                        if (onBalanceRefresh) {
                            onBalanceRefresh();
                        }
                    }, 2000);
                },
                onError: (errorMsg) => {
                    setError(errorMsg);
                    if (onSwapError) {
                        onSwapError(errorMsg);
                    }
                },
                onStatusUpdate,
                slippageBps,
                inputToken,
                outputToken,
                platformFeeBps,
                accessToken,
                network: activeNetwork
            });
        } catch (err: any) {
            setError(err.message || "Swap failed");
            if (onSwapError) {
                onSwapError(err.message || "Swap failed");
            }
        }
    };

    // Fix network switching and reset loading state properly
    const toggleNetwork = async () => {
        console.log(`[DEBUG] toggleNetwork called - current network: ${activeNetwork}`);

        // Clear current state first to prevent stale data issues
        console.log(`[DEBUG] Clearing states before network switch`);
        setQuote(null);
        setError(null);
        setLoading(false);

        // Reset tracking refs to force new data fetching
        prevQuoteParamsRef.current = '';
        quoteAttemptCountRef.current = 0;
        fetchKeyRef.current = '';

        // Set flags for network change - important for the quote effect
        console.log(`[DEBUG] Setting network change flags in toggle`);
        activeNetworkChanged.current = true;
        forceRefresh.current = true;

        // Toggle the network
        const newNetwork = activeNetwork === 'mainnet' ? 'sepolia' : 'mainnet';
        console.log(`[DEBUG] Setting activeNetwork from ${activeNetwork} to ${newNetwork}`);
        setActiveNetwork(newNetwork);

        // Try to switch network in the wallet
        if (wallet) {
            try {
                const targetNetwork = newNetwork === 'sepolia' ? NETWORKS.SEPOLIA : NETWORKS.MAINNET;
                const provider = await wallet.getEthereumProvider();

                await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${targetNetwork.chainId.toString(16)}` }],
                });

                console.log(`[DEBUG] Successfully requested chain switch to ${newNetwork}`);
            } catch (switchError: any) {
                // This error code indicates that the chain has not been added to the wallet
                if (switchError.code === 4902) {
                    try {
                        const targetNetwork = newNetwork === 'sepolia' ? NETWORKS.SEPOLIA : NETWORKS.MAINNET;
                        const provider = await wallet.getEthereumProvider();

                        await provider.request({
                            method: 'wallet_addEthereumChain',
                            params: [
                                {
                                    chainId: `0x${targetNetwork.chainId.toString(16)}`,
                                    chainName: targetNetwork.name,
                                    rpcUrls: [newNetwork === 'sepolia' ? RPC_URLS.sepolia : RPC_URLS.mainnet],
                                    nativeCurrency: {
                                        name: 'Ethereum',
                                        symbol: 'ETH',
                                        decimals: 18
                                    },
                                    blockExplorerUrls: [targetNetwork.blockExplorer]
                                },
                            ],
                        });

                        console.log(`[DEBUG] Successfully added chain ${newNetwork}`);
                    } catch (addError) {
                        console.error(`[ERROR] Failed to add ${newNetwork} chain:`, addError);
                        setError(`Failed to add ${newNetwork} network to wallet`);
                    }
                } else {
                    console.error(`[ERROR] Failed to switch to ${newNetwork}:`, switchError);
                    setError(`Failed to switch to ${newNetwork} network`);
                }
            }
        }

        // Update provider for the new network
        console.log(`[DEBUG] Creating new provider for ${newNetwork}`);
        const networkProvider = newNetwork === 'sepolia'
            ? new ethers.JsonRpcProvider(RPC_URLS.sepolia)
            : new ethers.JsonRpcProvider(RPC_URLS.mainnet);

        setProvider(networkProvider);
        console.log(`[DEBUG] Network toggle complete`);
    };

    // Check if wallet is connected to the right network
    const isWalletNetworkMismatch = walletChainId !== null &&
        ((activeNetwork === 'mainnet' && walletChainId !== NETWORKS.MAINNET.chainId) ||
            (activeNetwork === 'sepolia' && walletChainId !== NETWORKS.SEPOLIA.chainId));

    // Add button state logging effect
    useEffect(() => {
        // Log button state for debugging
        console.log('[DEBUG] Button state changed:', {
            hasQuote: Boolean(quote),
            loading,
            swapLoading,
            hasProvider: Boolean(provider),
            hasSigner: Boolean(signer),
            isWalletNetworkMismatch,
            buttonText: swapLoading
                ? "Swapping..."
                : loading
                    ? "Loading Quote..."
                    : !provider || !signer
                        ? "Connect Wallet"
                        : isWalletNetworkMismatch
                            ? `Switch to ${activeNetwork === 'mainnet' ? 'Mainnet' : 'Sepolia'}`
                            : !quote
                                ? "Get Quote"
                                : `Swap ${inputSymbol} to ${outputSymbol}`
        });
    }, [quote, loading, swapLoading, provider, signer, isWalletNetworkMismatch, inputSymbol, outputSymbol, activeNetwork]);

    return (
        <div className={className}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Swap Tokens</h2>
                <div className="flex items-center">
                    <button
                        onClick={toggleNetwork}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${activeNetwork === 'mainnet'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                            }`}
                    >
                        {activeNetwork === 'mainnet' ? 'Mainnet' : 'Sepolia Testnet'}
                    </button>
                </div>
            </div>

            {isWalletNetworkMismatch && (
                <div className="p-3 mb-4 bg-yellow-100 text-yellow-700 rounded-lg text-sm">
                    <p className="font-medium">Network Mismatch</p>
                    <p>Your wallet is connected to {walletNetwork || "another network"}.
                        Switch to {activeNetwork === 'mainnet' ? 'Ethereum Mainnet' : 'Sepolia Testnet'} to execute swaps.</p>
                </div>
            )}

            {quote && !loading && (
                <div className="mb-4">
                    <EthPriceCard
                        quote={quote}
                        inputToken={inputToken as TokenInfo}
                        outputToken={outputToken as TokenInfo}
                        loading={loading}
                        slippageBps={slippageBps}
                    />
                </div>
            )}

            {error && (
                <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            {/* Log button state for debugging */}
            {/* {console.log()} would cause a linter error - moved to useEffect */}
            <button
                onClick={executeSwap}
                disabled={!quote || loading || swapLoading || !provider || !signer || isWalletNetworkMismatch}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {swapLoading
                    ? "Swapping..."
                    : loading
                        ? "Loading Quote..."
                        : !provider || !signer
                            ? "Connect Wallet"
                            : isWalletNetworkMismatch
                                ? `Switch to ${activeNetwork === 'mainnet' ? 'Mainnet' : 'Sepolia'}`
                                : !quote
                                    ? "Get Quote"
                                    : `Swap ${inputSymbol} to ${outputSymbol}`}
            </button>
        </div>
    );
}
