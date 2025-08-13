import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  ArrowUpDown,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Info,
  CheckCircle,
  Loader2,
  XCircle,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSolanaWallets } from "@privy-io/react-auth";
import { Connection, PublicKey } from "@solana/web3.js";
import toast from "react-hot-toast";

import {
  getTokenInfoBySymbol,
  formatUSD,
  TOKEN_ADDRESSES,
} from "./utils/swapUtils";
import { handleSwap } from "./utils/handleSwap";
import { PLATFORM_FEE_BPS } from "./utils/feeConfig";
import { TokenInfo, QuoteResponse, SwapModalProps } from "./types";
// import SlippageControl from "./utils/SlippageControl";
import PriceCard from "./utils/PriceCard";
import PriorityFeeSelector, {
  PriorityLevel,
} from "./utils/PriorityFeeSelector";
import TokenImage from "./TokenImage";

export default function SwapModal({
  userToken,
  accessToken,
  initialInputToken,
  initialOutputToken,
  initialAmount,
  onTokenRefresh,
}: SwapModalProps) {
  // State management
  // Initialize state with initial values if provided
  const [selectedInputSymbol, setSelectedInputSymbol] = useState(
    initialInputToken || "SOL"
  );
  const [selectedOutputSymbol, setSelectedOutputSymbol] = useState(
    initialOutputToken || "USDC"
  );
  const [amount, setAmount] = useState(initialAmount || "0.01");

  const [tokenMetaData, setTokenMetaData] = useState<TokenInfo[]>([]);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTokenListOpen, setIsTokenListOpen] = useState(false);
  const [isInputToken, setIsInputToken] = useState(true);
  const [swapLoading, setSwapLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedTokens, setSearchedTokens] = useState<TokenInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchKey, setSearchKey] = useState(0);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  // Quote refresh timer states
  const [refreshCountdown, setRefreshCountdown] = useState(10);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // New state variables for transaction status
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState(false);

  // New state variables
  const [slippageBps, setSlippageBps] = useState(50); // Default 0.5%
  const [priorityLevel, setPriorityLevel] = useState<PriorityLevel>("none");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [refreshingBalances, setRefreshingBalances] = useState(false);

  const [inputMint, setInputMint] = useState<PublicKey | null>(null);
  const [outputMint, setOutputMint] = useState<PublicKey | null>(null);

  // Function to reset transaction state when modal is opened/closed
  const resetModalState = useCallback(() => {
    // Only reset transaction-related state, not the token selection
    setError(null);
    setTxStatus(null);
    setTxSuccess(false);
    setTxSignature(null);
    setSwapLoading(false);
    setShowAdvancedOptions(false);
  }, []);

  // Reset state when modal opens or closes
  useEffect(() => {
    resetModalState();
  }, [open, resetModalState]);

  // const handleOpenChange = useCallback(
  //   (newOpenState: boolean) => {
  //     if (!newOpenState) {
  //       resetModalState();
  //       // Optionally clear the URL params here if needed
  //     }
  //     onOpenChange(newOpenState);
  //   },
  //   [onOpenChange, resetModalState]
  // );

  // Handle custom onOpenChange to properly reset state
  // const handleOpenChange = useCallback(
  //   (newOpenState: boolean) => {
  //     if (!newOpenState) {
  //       resetModalState();
  //     }
  //     onOpenChange(newOpenState);
  //   },
  //   [onOpenChange, resetModalState]
  // );

  // Get wallet information
  const { wallets } = useSolanaWallets();
  const solanaAddress = wallets[0]?.address?.toString();

  // Create connection as a memoized value to prevent re-creation on renders
  const connection = useMemo(
    () => new Connection(process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_URL!),
    []
  );

  // Memoize token information to prevent recalculation on every render
  const inputToken = useMemo(
    () => getTokenInfoBySymbol(selectedInputSymbol, userToken, tokenMetaData),
    [selectedInputSymbol, userToken, tokenMetaData]
  );

  const outputToken = useMemo(
    () => getTokenInfoBySymbol(selectedOutputSymbol, userToken, tokenMetaData),
    [selectedOutputSymbol, userToken, tokenMetaData]
  );
  // Set input amount to half of balance
  const setHalfAmount = useCallback(() => {
    if (!inputToken || !inputToken.balance) return;

    try {
      const balance = parseFloat(inputToken.balance);
      if (isNaN(balance) || balance <= 0) return;

      // Calculate half of the balance
      const halfAmount = (balance / 2).toString();
      setAmount(halfAmount);
    } catch (err) {
      console.error("Error setting half amount:", err);
    }
  }, [inputToken]);

  // Set input amount to max balance
  const setMaxAmount = useCallback(() => {
    if (!inputToken || !inputToken.balance) return;

    try {
      const balance = parseFloat(inputToken.balance);
      if (isNaN(balance) || balance <= 0) return;

      // If token is SOL, keep a small amount for transaction fees
      if (selectedInputSymbol === "SOL") {
        const maxAmount = Math.max(0, balance - 0.01).toString();
        setAmount(maxAmount);
      } else {
        setAmount(balance.toString());
      }
    } catch (err) {
      console.error("Error setting max amount:", err);
    }
  }, [inputToken, selectedInputSymbol]);

  // Check if the user has insufficient funds
  const hasInsufficientFunds = useMemo(() => {
    if (!inputToken || !amount || !inputToken.balance) {
      return false;
    }

    const inputAmount = parseFloat(amount);
    const userBalance = parseFloat(inputToken.balance);

    // Add minimum amount check for SOL
    if (selectedInputSymbol === "SOL" && inputAmount < 0.01) {
      return true;
    }

    return inputAmount > userBalance;
  }, [inputToken, amount, selectedInputSymbol]);

  // Add minimum amount validation message
  const getAmountError = useMemo(() => {
    if (!amount) return null;
    const inputAmount = parseFloat(amount);

    if (selectedInputSymbol === "SOL" && inputAmount < 0.01) {
      return "Minimum swap amount is 0.01 SOL";
    }

    return null;
  }, [amount, selectedInputSymbol]);

  // Fetch token metadata once on component mount
  useEffect(() => {
    const fetchTokenMetadata = async () => {
      try {
        // Only fetch metadata for input and output tokens
        const tokensToFetch = [
          TOKEN_ADDRESSES[selectedInputSymbol as keyof typeof TOKEN_ADDRESSES],
          TOKEN_ADDRESSES[selectedOutputSymbol as keyof typeof TOKEN_ADDRESSES],
        ].filter(Boolean); // Remove any undefined values

        if (tokensToFetch.length === 0) return;

        // Check if we already have metadata for these tokens
        const tokensNeeded = tokensToFetch.filter(
          (mint) =>
            !tokenMetaData.some(
              (t) => t.address?.toString() === mint || t.id?.toString() === mint
            )
        );

        if (tokensNeeded.length === 0) return;

        const queryParam = encodeURIComponent(tokensNeeded.join(","));
        const url = `https://datapi.jup.ag/v1/assets/search?query=${queryParam}`;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch metadata: ${res.status}`);
        }

        const json = await res.json();
        if (Array.isArray(json)) {
          setTokenMetaData((prev) => [...prev, ...json]);
        }
      } catch (err) {
        console.error("Error fetching metadata:", err);
        setError("Error fetching token metadata");
      }
    };

    fetchTokenMetadata();
  }, [selectedInputSymbol, selectedOutputSymbol, tokenMetaData]);

  // Update mints when tokens change
  useEffect(() => {
    if (inputToken && outputToken) {
      setInputMint(inputToken.address || inputToken.id || null);
      setOutputMint(outputToken.address || outputToken.id || null);
    }
  }, [inputToken, outputToken]);

  // Fetch quote function
  const fetchQuote = useCallback(async () => {
    if (
      !inputMint ||
      !outputMint ||
      !amount ||
      parseFloat(amount) === 0 ||
      swapLoading
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const decimals = inputToken?.decimals || 6;
      const amountInSmallestUnit = Math.floor(
        parseFloat(amount) * 10 ** decimals
      );

      const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint.toString()}&outputMint=${outputMint.toString()}&amount=${amountInSmallestUnit}&slippageBps=${slippageBps}&restrictIntermediateTokens=true&platformFeeBps=${PLATFORM_FEE_BPS}`;

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Failed to fetch quote: ${res.status}`);
      }

      const data = await res.json();
      setQuote(data);
      // Reset countdown whenever we get a new quote
      setRefreshCountdown(10);
    } catch (err: any) {
      console.error("Quote fetch error:", err);
      setError(err.message || "Failed to fetch quote");
      toast.error("Failed to fetch quote. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    inputMint,
    outputMint,
    amount,
    inputToken?.decimals,
    slippageBps,
    swapLoading,
  ]);

  // Fetch quote when input or output changes with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchQuote();
    }, 500); // Debounce the API call

    return () => clearTimeout(timeoutId);
  }, [
    inputMint,
    outputMint,
    amount,
    inputToken?.decimals,
    slippageBps,
    fetchQuote,
  ]);

  // Setup auto-refresh timer for quotes
  useEffect(() => {
    if (!open || !autoRefreshEnabled || swapLoading) {
      // Clear any existing timer if modal is closed or auto-refresh disabled
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      return;
    }

    // Set up countdown and refresh logic
    refreshTimerRef.current = setInterval(() => {
      setRefreshCountdown((prev) => {
        // When we reach 0, refresh the quote and reset to 10
        if (prev <= 1) {
          fetchQuote();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    // Clean up on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [open, autoRefreshEnabled, fetchQuote, swapLoading]);

  // Clear refresh timer when component unmounts
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  // Reset auto-refresh when modal state changes
  useEffect(() => {
    if (true) {
      setAutoRefreshEnabled(true);
      setRefreshCountdown(10);
    }
  }, []);

  // Handle token search with debouncing
  useEffect(() => {
    let isMounted = true;

    const searchTokensViaAPI = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        if (isMounted) {
          setSearchedTokens([]);
          setIsSearching(false);
        }
        return;
      }

      if (isMounted) {
        setIsSearching(true);
        setSearchedTokens([]);
      }

      try {
        // Use a more specific search query
        const searchParam = encodeURIComponent(searchQuery.trim());
        const url = `https://datapi.jup.ag/v1/assets/search?query=${searchParam}&limit=20`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }

        const data = await response.json();

        if (isMounted) {
          const newTokens = Array.isArray(data) ? [...data] : [];
          setSearchedTokens(newTokens);
        }
      } catch (err) {
        console.error("Error searching tokens:", err);
        if (isMounted) {
          setSearchedTokens([]);
          setError("Failed to search tokens. Please try again.");
        }
      } finally {
        if (isMounted) {
          setIsSearching(false);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      searchTokensViaAPI();
    }, 500); // Debounce search

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  // Handler functions as useCallbacks to prevent unnecessary re-creations
  const handleTokenSelect = useCallback(
    (symbol: string, tokenData?: TokenInfo) => {
      // Check if user is trying to select the same token that's already in the other field
      if (
        (isInputToken && symbol === selectedOutputSymbol) ||
        (!isInputToken && symbol === selectedInputSymbol)
      ) {
        toast.error(
          "You cannot select the same token for both input and output"
        );
        setIsTokenListOpen(false);
        setSearchQuery("");
        setSearchedTokens([]);
        setSearchKey((prev) => prev + 1);
        return;
      }

      if (tokenData && tokenMetaData) {
        const tokenExists = tokenMetaData.some((t) => t.symbol === symbol);

        if (!tokenExists) {
          const formattedToken = {
            ...tokenData,
            balance: "0",
          };

          setTokenMetaData([...tokenMetaData, formattedToken]);
        }
      }

      if (isInputToken) {
        setSelectedInputSymbol(symbol);
      } else {
        setSelectedOutputSymbol(symbol);
      }

      setIsTokenListOpen(false);
      setSearchQuery("");
      setSearchedTokens([]);
      setSearchKey((prev) => prev + 1);
    },
    [isInputToken, selectedInputSymbol, selectedOutputSymbol, tokenMetaData]
  );

  const reverseTokens = useCallback(() => {
    const newInputSymbol = selectedOutputSymbol;
    const userOwnsNewInput = userToken.find((t) => t.symbol === newInputSymbol);

    if (userOwnsNewInput) {
      // If user owns the output token, do normal swap
      setSelectedInputSymbol(selectedOutputSymbol);
      setSelectedOutputSymbol(selectedInputSymbol);
    } else {
      // If user doesn't own the output token, set input to empty and move current input to output
      setSelectedOutputSymbol(selectedInputSymbol);
      setSelectedInputSymbol("");
    }
    setError(null);
  }, [selectedInputSymbol, selectedOutputSymbol, userToken]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);

      if (!value || value.length < 2) {
        setSearchedTokens([]);
      }
      setSearchKey((prev) => prev + 1);
    },
    []
  );

  const handleSwapClick = useCallback(() => {
    if (!quote || !selectedInputSymbol) return;

    // Reset transaction states
    setTxStatus(null);
    setTxSuccess(false);
    setError(null);
    setTxSignature(null);

    handleSwap({
      quote,
      solanaAddress,
      wallet: wallets.length > 0 ? { wallets } : null,
      connection,
      setSwapLoading,
      priorityLevel,
      slippageBps,
      inputToken,
      outputToken,
      platformFeeBps: PLATFORM_FEE_BPS,
      accessToken,
      onStatusUpdate: (status) => {
        setTxStatus(status);
      },
      onSuccess: (signature, feedData) => {
        setTxSignature(signature);
        setTxStatus("Transaction completed successfully!");
        setTxSuccess(true);
        setError(null);

        // Show a success notification for the feed
        if (feedData) {
          toast.success("Swap transaction added to your activity feed!");
        }

        // Refresh token list after successful swap
        if (onTokenRefresh) {
          onTokenRefresh();
        }
      },
      onError: (errorMessage) => {
        setError(errorMessage);
        setTxStatus(null);
      },
      onBalanceRefresh: () => {
        // Implement balance refresh logic if available in your app
        // This would typically involve fetching updated token balances
        setRefreshingBalances(true);
        setTimeout(() => {
          setRefreshingBalances(false);
          // Use toast just for this notification since it's not related to the transaction directly
          toast.success("Balances updated");
        }, 2000);
      },
    });
  }, [
    quote,
    selectedInputSymbol,
    solanaAddress,
    wallets,
    connection,
    priorityLevel,
    slippageBps,
    inputToken,
    outputToken,
    accessToken,
    onTokenRefresh,
  ]);

  const openTokenList = useCallback((isInput: boolean) => {
    setSearchQuery("");
    setSearchedTokens([]);
    setIsSearching(false);
    setSearchKey((prev) => prev + 1);
    setIsInputToken(isInput);
    setIsTokenListOpen(true);
  }, []);

  // Memoize token display list to prevent recalculation
  const displayTokens = useMemo(() => {
    if (isInputToken) {
      return userToken;
    }

    if (searchQuery && searchQuery.length >= 2) {
      return searchedTokens;
    }

    // Merge user tokens with metadata
    const symbolsSet = new Set(userToken.map((t) => t.symbol));
    const merged = [...userToken];

    if (tokenMetaData) {
      for (const token of tokenMetaData) {
        if (!symbolsSet.has(token.symbol)) {
          merged.push(token);
        }
      }
    }

    return merged;
  }, [isInputToken, searchQuery, searchedTokens, userToken, tokenMetaData]);

  // Formatted output amount calculation
  const formattedOutputAmount = useMemo(() => {
    if (!quote?.outAmount || !outputToken?.decimals) {
      return "0";
    }
    return (quote.outAmount / 10 ** outputToken.decimals).toString();
  }, [quote?.outAmount, outputToken?.decimals]);

  return (
    <section>
      <div className="max-w-md w-full rounded-2xl p-6 gap-2">
        <h2 className="sr-only">Swap Tokens</h2>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Swap Tokens</h2>
        </div>

        {/* Token Input - with curved bottom */}
        <div className="relative bg-[#F7F7F7] rounded-2xl p-4 shadow">
          <div className="flex justify-between items-start gap-2">
            {selectedInputSymbol ? (
              <div className="flex-1 min-w-0">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className={`text-xl border-none shadow-none bg-transparent p-0 w-full ${
                    hasInsufficientFunds ? "text-red-500" : ""
                  }`}
                />
                <div className="text-sm text-gray-500 mt-1">
                  {selectedInputSymbol &&
                  inputToken?.price &&
                  !isNaN(
                    parseFloat(inputToken.price || inputToken?.usdPrice || "0")
                  ) ? (
                    `$${formatUSD(
                      inputToken.price || inputToken?.usdPrice || "0",
                      (
                        (quote?.inAmount || 0) /
                        10 ** (inputToken?.decimals || 6)
                      ).toString()
                    )}`
                  ) : (
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> No price data
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-xl p-0 flex-1">
                Select a token
              </div>
            )}
            <Button
              variant="ghost"
              className="flex items-center bg-white px-5 py-1 gap-0 rounded-full shadow shrink-0"
              onClick={() => openTokenList(true)}
            >
              {selectedInputSymbol ? (
                <>
                  <TokenImage
                    src={inputToken?.icon || inputToken?.logoURI}
                    alt={inputToken?.symbol || "Input Token"}
                    width={20}
                    height={20}
                    className="w-5 h-5 mr-2 rounded-full"
                    fallbackSrc={inputToken.marketData?.iconUrl}
                  />
                  <span className="font-medium">{inputToken?.symbol}</span>
                </>
              ) : (
                <span className="font-medium">Select</span>
              )}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="flex space-x-2">
              {inputToken?.balance && parseFloat(inputToken.balance) > 0 && (
                <>
                  <button
                    onClick={setHalfAmount}
                    className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-gray-700 transition-colors"
                  >
                    Half
                  </button>
                  <button
                    onClick={setMaxAmount}
                    className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-gray-700 transition-colors"
                  >
                    Max
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className={hasInsufficientFunds ? "text-red-500" : ""}>
                Balance: {inputToken?.balance || "0"}
              </span>
              {refreshingBalances ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : null}
            </div>
          </div>
        </div>

        {/* Reverse Button - positioned in the middle */}
        <div className="relative h-0 z-10">
          <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Button
              className="rounded-full w-12 h-12 flex items-center justify-center bg-[#F7F7F7] border-5 border-white"
              variant="outline"
              onClick={reverseTokens}
              disabled={loading || swapLoading}
            >
              <ArrowUpDown className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Token Output - with curved top */}
        <div className="relative bg-[#F7F7F7] rounded-2xl p-4 mb-3 shadow pt-8">
          <div className="flex justify-between items-center">
            <Input
              type="number"
              value={formattedOutputAmount}
              placeholder="0.0"
              readOnly
              className="text-xl border-none shadow-none bg-transparent p-0"
            />
            <Button
              variant="ghost"
              className="flex items-center bg-white px-5 py-1 gap-0 rounded-full shadow"
              onClick={() => openTokenList(false)}
            >
              <TokenImage
                src={outputToken?.icon || outputToken?.logoURI}
                alt={outputToken?.symbol || "Output Token"}
                width={20}
                height={20}
                className="w-5 h-5 mr-2 rounded-full"
                fallbackSrc={outputToken.marketData?.iconUrl}
              />
              <span className="font-medium">{outputToken?.symbol}</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground mt-1">
            <div>
              {outputToken &&
              quote?.outAmount &&
              !isNaN(
                parseFloat(outputToken.price || outputToken?.usdPrice || "0")
              ) ? (
                `$${formatUSD(
                  outputToken.price || outputToken?.usdPrice || "0",
                  formattedOutputAmount
                )}`
              ) : (
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> No price data
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span>Balance: {outputToken?.balance || "0"}</span>
              {refreshingBalances ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : null}
            </div>
          </div>
        </div>

        {/* Price Card - shows price impact and other details */}
        {quote && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center text-xs text-gray-500">
                <span className="mr-1">Quote includes a 0.5% Swop fee</span>
                <Info className="w-3 h-3" />
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                <span>Refreshing in {refreshCountdown}s</span>
                <button
                  onClick={() => fetchQuote()}
                  className="ml-2 p-1 hover:bg-gray-200 rounded-full"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
            <PriceCard
              quote={quote}
              inputToken={inputToken}
              outputToken={outputToken}
              loading={loading}
              slippageBps={slippageBps}
            />
          </div>
        )}

        {/* Advanced Options Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="text-xs text-gray-500 ml-auto"
        >
          {showAdvancedOptions ? "Hide Advanced" : "Advanced Options"}
        </Button>

        {/* Priority Fee Selector */}
        {showAdvancedOptions && (
          <div className="bg-[#F7F7F7] rounded-xl p-3">
            <PriorityFeeSelector
              priorityLevel={priorityLevel}
              setPriorityLevel={setPriorityLevel}
            />
          </div>
        )}

        {/* Transaction Status Display */}
        {(txStatus || error || txSuccess) && (
          <div
            className={`mt-2 p-3 rounded-lg ${
              error
                ? "bg-red-100 text-red-700"
                : txSuccess
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {error ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : txSuccess ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              )}
              <span className="text-sm font-medium">{error || txStatus}</span>
            </div>
          </div>
        )}

        <Button
          onClick={handleSwapClick}
          className="py-6 text-base font-medium bg-[#F7F7F7] text-black hover:text-black hover:bg-[#F7F7F7] rounded-lg w-full mx-auto"
          disabled={
            swapLoading ||
            !quote ||
            !selectedInputSymbol ||
            loading ||
            hasInsufficientFunds ||
            getAmountError !== null
          }
        >
          {swapLoading
            ? "Swapping..."
            : loading
            ? "Loading..."
            : hasInsufficientFunds
            ? `Insufficient ${inputToken?.symbol}`
            : getAmountError
            ? getAmountError
            : selectedInputSymbol
            ? "Swap"
            : "Select input token"}
        </Button>

        {/* Transaction result section */}
        {txSignature && txSuccess && (
          <div className="mt-3 text-center">
            <a
              href={`https://solscan.io/tx/${txSignature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 text-blue-500 hover:text-blue-700 text-sm"
            >
              View transaction on Solscan <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Token Selection Modal */}
        {isTokenListOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-lg w-[90%] max-w-sm max-h-[450px] overflow-hidden p-0">
              <div className="flex justify-between items-center p-4">
                <h3 className="text-md font-semibold">Select a token</h3>
                <button
                  onClick={() => setIsTokenListOpen(false)}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  ✕
                </button>
              </div>

              {/* Show search input only for output token */}
              {!isInputToken && (
                <div className="px-4 py-2">
                  <input
                    type="text"
                    placeholder="Search token..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>
              )}

              {isSearching && (
                <div className="text-center py-4 text-gray-500">
                  Searching tokens...
                </div>
              )}

              <div
                className="overflow-y-auto max-h-[300px] p-2"
                key={`token-list-${searchKey}-${searchQuery}`}
              >
                <div className="space-y-1 flex flex-col">
                  {displayTokens.map((token) => (
                    <Button
                      key={`${token.symbol}-${
                        token.address || token.id || Math.random()
                      }-${searchKey}`}
                      variant="ghost"
                      onClick={() => handleTokenSelect(token.symbol, token)}
                      className="flex items-center justify-start w-full gap-3 text-left hover:bg-gray-100 px-3 py-2 rounded-lg h-auto"
                    >
                      <TokenImage
                        src={token?.icon || token?.logoURI}
                        alt={token.symbol}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full"
                        fallbackSrc={token.marketData?.iconUrl}
                      />
                      <div className="flex flex-col text-sm">
                        <span className="font-medium">{token.symbol}</span>
                        <span className="text-gray-400 text-xs">
                          {token?.name || token.symbol}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>

                {searchQuery && !isSearching && searchedTokens.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No tokens found
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
