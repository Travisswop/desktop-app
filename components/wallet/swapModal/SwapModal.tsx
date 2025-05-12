/* eslint-disable prefer-const */
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  ArrowUpDown,
  ChevronRight,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { AiOutlineExclamationCircle } from 'react-icons/ai';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSolanaWallets } from '@privy-io/react-auth';
import { Connection, PublicKey } from '@solana/web3.js';
import toast from 'react-hot-toast';

import {
  getTokenInfoBySymbol,
  formatUSD,
  TOKEN_ADDRESSES,
} from './utils/swapUtils';
import { handleSwap } from './utils/handleSwap';
import { getExchangeRate } from './utils/helperFunction';
import { PLATFORM_FEE_BPS } from './utils/feeConfig';
import { TokenInfo, QuoteResponse, SwapModalProps } from './types';

export default function SwapModal({
  open,
  onOpenChange,
  userToken,
}: SwapModalProps) {
  // State management
  const [selectedInputSymbol, setSelectedInputSymbol] =
    useState('SOL');
  const [selectedOutputSymbol, setSelectedOutputSymbol] =
    useState('USDC');
  const [tokenMetaData, setTokenMetaData] = useState<TokenInfo[]>([]);

  const [amount, setAmount] = useState('0.01');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTokenListOpen, setIsTokenListOpen] = useState(false);
  const [isInputToken, setIsInputToken] = useState(true);
  const [swapLoading, setSwapLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedTokens, setSearchedTokens] = useState<TokenInfo[]>(
    []
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchKey, setSearchKey] = useState(0);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const [inputMint, setInputMint] = useState<PublicKey | null>(null);
  const [outputMint, setOutputMint] = useState<PublicKey | null>(
    null
  );

  // Get wallet information
  const { wallets } = useSolanaWallets();
  const solanaAddress = wallets[0]?.address?.toString();

  // Create connection as a memoized value to prevent re-creation on renders
  const connection = useMemo(
    () =>
      new Connection(process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_URL!),
    []
  );

  // Memoize token information to prevent recalculation on every render
  const inputToken = useMemo(
    () =>
      getTokenInfoBySymbol(
        selectedInputSymbol,
        userToken,
        tokenMetaData
      ),
    [selectedInputSymbol, userToken, tokenMetaData]
  );

  const outputToken = useMemo(
    () =>
      getTokenInfoBySymbol(
        selectedOutputSymbol,
        userToken,
        tokenMetaData
      ),
    [selectedOutputSymbol, userToken, tokenMetaData]
  );

  // Fetch token metadata once on component mount
  useEffect(() => {
    const fetchTokenMetadata = async () => {
      try {
        const mintList = Object.values(TOKEN_ADDRESSES);
        const queryParam = encodeURIComponent(mintList.join(','));
        const url = `https://datapi.jup.ag/v1/assets/search?query=${queryParam}`;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch metadata: ${res.status}`);
        }

        const json = await res.json();
        if (Array.isArray(json)) {
          setTokenMetaData(json);
        } else {
          console.error('Expected array but got:', typeof json);
          setTokenMetaData([]);
        }
      } catch (err) {
        console.error('Error fetching metadata:', err);
        setError('Error fetching token metadata');
        setTokenMetaData([]);
      }
    };

    fetchTokenMetadata();
  }, []);

  // Update mints when tokens change
  useEffect(() => {
    if (inputToken && outputToken) {
      setInputMint(inputToken.address || inputToken.id || null);
      setOutputMint(outputToken.address || outputToken.id || null);
    }
  }, [inputToken, outputToken]);

  // Fetch quote when input or output changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (
        !inputMint ||
        !outputMint ||
        !amount ||
        parseFloat(amount) === 0
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

        const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint.toString()}&outputMint=${outputMint.toString()}&amount=${amountInSmallestUnit}&slippageBps=200&restrictIntermediateTokens=true&platformFeeBps=${PLATFORM_FEE_BPS}`;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch quote: ${res.status}`);
        }

        const data = await res.json();
        setQuote(data);
      } catch (err: any) {
        console.error('Quote fetch error:', err);
        setError(err.message || 'Failed to fetch quote');
        toast.error('Failed to fetch quote. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchQuote();
    }, 500); // Debounce the API call

    return () => clearTimeout(timeoutId);
  }, [inputMint, outputMint, amount, inputToken?.decimals]);

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
        const url = `https://datapi.jup.ag/v1/assets/search?query=${encodeURIComponent(
          searchQuery
        )}`;
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
        console.error('Error searching tokens:', err);
        if (isMounted) {
          setSearchedTokens([]);
          setError('Failed to search tokens. Please try again.');
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

  // Memoize the exchange rate calculation
  const exchangeRate = useMemo(
    () =>
      getExchangeRate({
        quote,
        amount,
        inputToken,
        outputToken,
      }),
    [quote, amount, inputToken, outputToken]
  );

  // Handler functions as useCallbacks to prevent unnecessary re-creations
  const handleTokenSelect = useCallback(
    (symbol: string, tokenData?: TokenInfo) => {
      // Check if user is trying to select the same token that's already in the other field
      if (
        (isInputToken && symbol === selectedOutputSymbol) ||
        (!isInputToken && symbol === selectedInputSymbol)
      ) {
        toast.error(
          'You cannot select the same token for both input and output'
        );
        setIsTokenListOpen(false);
        setSearchQuery('');
        setSearchedTokens([]);
        setSearchKey((prev) => prev + 1);
        return;
      }

      if (tokenData && tokenMetaData) {
        const tokenExists = tokenMetaData.some(
          (t) => t.symbol === symbol
        );

        if (!tokenExists) {
          const formattedToken = {
            ...tokenData,
            balance: '0',
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
      setSearchQuery('');
      setSearchedTokens([]);
      setSearchKey((prev) => prev + 1);
    },
    [
      isInputToken,
      selectedInputSymbol,
      selectedOutputSymbol,
      tokenMetaData,
    ]
  );

  const reverseTokens = useCallback(() => {
    const newInputSymbol = selectedOutputSymbol;
    const userOwnsNewInput = userToken.find(
      (t) => t.symbol === newInputSymbol
    );

    if (userOwnsNewInput) {
      // If user owns the output token, do normal swap
      setSelectedInputSymbol(selectedOutputSymbol);
      setSelectedOutputSymbol(selectedInputSymbol);
    } else {
      // If user doesn't own the output token, set input to empty and move current input to output
      setSelectedOutputSymbol(selectedInputSymbol);
      setSelectedInputSymbol('');
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

    handleSwap({
      quote,
      solanaAddress,
      wallet: wallets.length > 0 ? { wallets } : null,
      connection,
      setSwapLoading,
      onSuccess: (signature) => {
        setTxSignature(signature);
        setError(null);
      },
    });
  }, [
    quote,
    selectedInputSymbol,
    solanaAddress,
    wallets,
    connection,
  ]);

  const openTokenList = useCallback((isInput: boolean) => {
    setSearchQuery('');
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
  }, [
    isInputToken,
    searchQuery,
    searchedTokens,
    userToken,
    tokenMetaData,
  ]);

  // Formatted output amount calculation
  const formattedOutputAmount = useMemo(() => {
    if (!quote?.outAmount || !outputToken?.decimals) {
      return '0';
    }
    return (quote.outAmount / 10 ** outputToken.decimals).toString();
  }, [quote?.outAmount, outputToken?.decimals]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full rounded-2xl p-6 gap-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Swap Tokens</h2>
          <button onClick={() => onOpenChange(false)} />
        </div>

        {/* Token Input - with curved bottom */}
        <div className="relative bg-[#F7F7F7] rounded-2xl p-4 shadow">
          <div className="flex justify-between items-center">
            {selectedInputSymbol ? (
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="text-xl border-none shadow-none bg-transparent p-0"
              />
            ) : (
              <div className="text-gray-500 text-xl p-0">
                Select a token
              </div>
            )}
            <Button
              variant="ghost"
              className="flex items-center bg-white px-5 py-1 gap-0 rounded-full shadow"
              onClick={() => openTokenList(true)}
            >
              {selectedInputSymbol ? (
                <>
                  <img
                    src={inputToken?.icon || inputToken?.logoURI}
                    alt={inputToken?.symbol}
                    className="w-5 h-5 mr-2 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
                    }}
                  />
                  <span className="font-medium">
                    {inputToken?.symbol}
                  </span>
                </>
              ) : (
                <span className="font-medium">Select</span>
              )}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground mt-1">
            <div>
              {selectedInputSymbol &&
              inputToken?.price &&
              !isNaN(
                parseFloat(
                  inputToken.price || inputToken?.usdPrice || '0'
                )
              ) ? (
                `$${formatUSD(
                  inputToken.price || inputToken?.usdPrice || '0',
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
            <div>Balance: {inputToken?.balance || '0'}</div>
          </div>
        </div>

        {/* Reverse Button - positioned in the middle */}
        <div className="relative h-0">
          <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
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
              <img
                src={outputToken?.icon || outputToken?.logoURI}
                alt={outputToken?.symbol}
                className="w-5 h-5 mr-2 rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png';
                }}
              />
              <span className="font-medium">
                {outputToken?.symbol}
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground mt-1">
            <div>
              {outputToken &&
              quote?.outAmount &&
              !isNaN(
                parseFloat(
                  outputToken.price || outputToken?.usdPrice || '0'
                )
              ) ? (
                `$${formatUSD(
                  outputToken.price || outputToken?.usdPrice || '0',
                  formattedOutputAmount
                )}`
              ) : (
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> No price data
                </span>
              )}
            </div>
            <div>Balance: {outputToken?.balance || '0'}</div>
          </div>
        </div>

        {/* Exchange Rate Info */}
        <div className="flex items-center p-3 bg-[#F7F7F7] rounded-lg my-3">
          <div className="flex items-center text-sm text-gray-600 w-full">
            <div className="flex items-center space-x-2 gap-1">
              <div className="flex justify-center items-center">
                <AiOutlineExclamationCircle className="text-xl" />
              </div>
              <span>
                {selectedInputSymbol
                  ? exchangeRate
                  : 'Please select an input token'}
              </span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSwapClick}
          className="py-6 text-base font-medium bg-[#F7F7F7] text-black hover:text-black hover:bg-[#F7F7F7] rounded-lg w-3/4 mx-auto"
          disabled={
            swapLoading || !quote || !selectedInputSymbol || loading
          }
        >
          {swapLoading
            ? 'Swapping...'
            : loading
            ? 'Loading...'
            : selectedInputSymbol
            ? 'Swap'
            : 'Select input token'}
        </Button>

        {/* Transaction result section */}
        {txSignature && (
          <div className="mt-3 text-center">
            <a
              href={`https://solscan.io/tx/${txSignature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 text-blue-500 hover:text-blue-700 text-sm"
            >
              View transaction on Solscan{' '}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-3 text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        {/* Token Selection Modal */}
        {isTokenListOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-lg w-[90%] max-w-sm max-h-[450px] overflow-hidden p-0">
              <div className="flex justify-between items-center p-4">
                <h3 className="text-md font-semibold">
                  Select a token
                </h3>
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
                      key={`${token.symbol}-${searchKey}`}
                      variant="ghost"
                      onClick={() =>
                        handleTokenSelect(token.symbol, token)
                      }
                      className="flex items-center justify-start w-full gap-3 text-left hover:bg-gray-100 px-3 py-2 rounded-lg h-auto"
                    >
                      <img
                        src={token?.icon || token?.logoURI}
                        alt={token.symbol}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
                        }}
                      />
                      <div className="flex flex-col text-sm">
                        <span className="font-medium">
                          {token.symbol}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {token?.name || token.symbol}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>

                {searchQuery &&
                  !isSearching &&
                  searchedTokens.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      No tokens found
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
