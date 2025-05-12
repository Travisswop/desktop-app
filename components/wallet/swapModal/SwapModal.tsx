/* eslint-disable prefer-const */
import React, { useEffect, useState } from "react";
import { ArrowUpDown, ChevronRight, AlertCircle, ExternalLink } from "lucide-react";
import { AiOutlineExclamationCircle } from "react-icons/ai";

import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { getExchangeRate } from "./utils/helperFunction";

interface SwapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToken: any;
}

export default function SwapModal({
  open,
  onOpenChange,
  userToken,
}: SwapModalProps) {
  const [selectedInputSymbol, setSelectedInputSymbol] = useState("SOL");
  const [selectedOutputSymbol, setSelectedOutputSymbol] = useState("USDC");
  const [tokenMetaData, setTokenMetaData] = useState<any>(null);

  const [amount, setAmount] = useState("0.01");
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTokenListOpen, setIsTokenListOpen] = useState(false);
  const [isInputToken, setIsInputToken] = useState(true);
  const [swapLoading, setSwapLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedTokens, setSearchedTokens] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchKey, setSearchKey] = useState(0);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const [inputMint, setInputMint] = useState<PublicKey | null>(null);
  const [outputMint, setOutputMint] = useState<PublicKey | null>(null);

  const wallet = useSolanaWallets();
  const solanaAddress = wallet.wallets[0]?.address?.toString();

  const connection = new Connection(
    "https://frequent-neat-valley.solana-mainnet.quiknode.pro/c87706bb433055dc44d32b704d34e4f918432c09"
  );

  const inputToken = getTokenInfoBySymbol(
    selectedInputSymbol,
    userToken,
    tokenMetaData
  );
  const outputToken = getTokenInfoBySymbol(
    selectedOutputSymbol,
    userToken,
    tokenMetaData
  );

  

  useEffect(() => {
    const fetchTokenMetadata = async () => {
      const mintList = Object.values(TOKEN_ADDRESSES);
      const queryParam = encodeURIComponent(mintList.join(","));
      const url = `https://datapi.jup.ag/v1/assets/search?query=${queryParam}`;

      try {
        const res = await fetch(url);
        const json = await res.json();
        setTokenMetaData(json);
      } catch (err) {
        console.error("Error fetching metadata:", err);
        setError("Error fetching metadata");
      }
    };

    fetchTokenMetadata();
  }, []); 

  useEffect(() => {
    if (inputToken && outputToken) {
      setInputMint(inputToken.address || inputToken.id);
      setOutputMint(outputToken.address || outputToken.id);
    }
  }, [inputToken, outputToken]); 

  useEffect(() => {
    const fetchQuote = async () => {
      if (!inputMint || !outputMint || !amount) return;

      setLoading(true);
      setError(null);
      try {
        const decimals = inputToken?.decimals || 6;
        const amountInSmallestUnit = Math.floor(
          parseFloat(amount) * 10 ** decimals
        );

        const res = await fetch(
          `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint.toString()}&outputMint=${outputMint.toString()}&amount=${amountInSmallestUnit}&slippageBps=200`
        );
        const data = await res.json();

        setQuote(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch quote");
        toast.error("Failed to fetch quote. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [inputMint, outputMint, amount]);

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
        const url = `https://datapi.jup.ag/v1/assets/search?query=${encodeURIComponent(searchQuery)}`;
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
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  console.log("Quote response:" , quote , "output token : " , outputToken , 'input token : ' , inputToken, "usertoken : " , userToken); 

  const exchangeRate = getExchangeRate({
    quote,
    amount,
    inputToken,
    outputToken,
  });

  const handleTokenSelect = (symbol: string, tokenData?: any) => {
    // Check if user is trying to select the same token that's already in the other field
    if ((isInputToken && symbol === selectedOutputSymbol) || 
        (!isInputToken && symbol === selectedInputSymbol)) {
      toast.error("You cannot select the same token for both input and output");
      setIsTokenListOpen(false);
      setSearchQuery("");
      setSearchedTokens([]);
      setSearchKey(prev => prev + 1);
      return;
    }

    console.log('token metadata of the selected token : ', tokenMetaData);
    if (tokenData) {
      const tokenExists = tokenMetaData?.some((t: any) => t.symbol === symbol);
      
      if (!tokenExists && tokenMetaData) {
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
    setSearchKey(prev => prev + 1); 
  };

  const reverseTokens = () => {
    const newInputSymbol = selectedOutputSymbol;
    const userOwnsNewInput = userToken.find(
      (t: any) => t.symbol === newInputSymbol
    );

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
  };

  function mergeTokens(
    userToken: { symbol: string }[],
    tokenMetaData: { symbol: string }[]
  ) {
    const symbolsSet = new Set(userToken.map((t) => t.symbol));
    const merged = [...userToken];

    for (const token of tokenMetaData) {
      if (!symbolsSet.has(token.symbol)) {
        merged.push(token);
      }
    }

    return merged;
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (!value || value.length < 2) {
      setSearchedTokens([]);
    }
    setSearchKey(prev => prev + 1);
  }

  const getDisplayTokens = () => {
    if (isInputToken) {
      return userToken;
    }
    
    if (searchQuery && searchQuery.length >= 2) {
      return searchedTokens;
    }
    
    return mergeTokens(userToken, tokenMetaData || []);
  };
    

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full rounded-2xl p-6 gap-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Swap Tokens</h2>
          <button onClick={() => onOpenChange(false)} />
        </div>

        {/* Token Input - with curved bottom */}
        <div className="relative bg-[#F7F7F7] rounded-2xl p-4 shadow  ">
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
              <div className="text-gray-500 text-xl p-0">Select a token</div>
            )}
            <Button
              variant="ghost"
              className="flex items-center bg-white px-5 py-1 gap-0 rounded-full shadow"
              onClick={() => {
                // Reset all search related state
                setSearchQuery("");
                setSearchedTokens([]);
                setIsSearching(false);
                setSearchKey(prev => prev + 1); // Force refresh
                setIsInputToken(true);
                setIsTokenListOpen(true);
              }}
            >
              {selectedInputSymbol ? (
                <>
                  <img
                    src={inputToken?.icon || inputToken?.logoURI}
                    alt={inputToken?.symbol}
                    className="w-5 h-5 mr-2 rounded-full"
                  />
                  <span className="font-medium">{inputToken?.symbol}</span>
                </>
              ) : (
                <span className="font-medium">Select</span>
              )}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground mt-1">
            <div>
              {selectedInputSymbol && inputToken?.price && !isNaN(inputToken.price || inputToken?.usdPrice)
                ? `$${formatUSD(
                    inputToken.price || inputToken?.usdPrice,
                    (quote?.inAmount / 10 ** inputToken?.decimals).toString()
                  )}`
                : <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> No price data</span>}
            </div>
            <div>Balance: {inputToken?.balance || "0"}</div>
          </div>
        </div>

        {/* Reverse Button - positioned in the middle */}
        <div className="relative h-0">
          <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <Button
              className="rounded-full w-12 h-12 flex items-center justify-center bg-[#F7F7F7]  border-5 border-white "
              variant="outline"
              onClick={reverseTokens}
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
              value={
                quote?.outAmount
                  ? quote.outAmount / 10 ** outputToken?.decimals
                  : "0"
              }
              placeholder="0.0"
              readOnly
              className="text-xl border-none shadow-none bg-transparent p-0"
            />
            <Button
              variant="ghost"
              className="flex items-center bg-white px-5 py-1 gap-0 rounded-full shadow"
              onClick={() => {
                // Reset all search related state
                setSearchQuery("");
                setSearchedTokens([]);
                setIsSearching(false);
                setSearchKey(prev => prev + 1); // Force refresh
                setIsInputToken(false);
                setIsTokenListOpen(true);
              }}
            >
              <img
                src={outputToken?.icon || outputToken?.logoURI}
                alt={outputToken?.symbol}
                className="w-5 h-5 mr-2 rounded-full"
              />
              <span className="font-medium">{outputToken?.symbol}</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground mt-1">
            <div>
              {outputToken && quote?.outAmount && !isNaN(outputToken.price || outputToken?.usdPrice)
                ? `$${formatUSD(
                    outputToken.price || outputToken?.usdPrice,
                    (quote.outAmount / 10 ** outputToken?.decimals).toString()
                  )}`
                : <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> No price data</span>}
            </div>
            <div>Balance: {outputToken?.balance}</div>
          </div>
        </div>

        {/* Exchange Rate Info */}
        <div className="flex items-center p-3 bg-[#F7F7F7] rounded-lg my-3">
          <div className="flex items-center text-sm text-gray-600 w-full">
            <div className="flex items-center space-x-2 gap-1">
              <div className="flex justify-center items-center ">
                <AiOutlineExclamationCircle className="text-xl" />
              </div>
              <span>{selectedInputSymbol ? exchangeRate : "Please select an input token"}</span>
            </div>
          </div>
        </div>

        <Button
          onClick={() =>
            handleSwap({
              quote,
              solanaAddress,
              wallet,
              connection,
              setSwapLoading,
              onSuccess: (signature) => {
                setTxSignature(signature);
                // Clear any previous errors
                setError(null);
              }
            })
          }
          className="py-6 text-base font-medium bg-[#F7F7F7] text-black hover:text-black hover:bg-[#F7F7F7] rounded-lg w-3/4 mx-auto"
          disabled={swapLoading || !quote || !selectedInputSymbol}
        >
          {swapLoading ? "Swapping..." : selectedInputSymbol ? "Swap" : "Select input token"}
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
              View transaction on Solscan <ExternalLink className="w-3 h-3" />
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
              <div className="flex justify-between items-center p-4 ">
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
                    className="w-full px-3 py-2 border rounded-md text-sm "
                  />
                </div>
              )}

              {isSearching && (
                <div className="text-center py-4 text-gray-500">Searching tokens...</div>
              )}

              <div className="overflow-y-auto max-h-[300px] p-2" key={`token-list-${searchKey}-${searchQuery}`}>
                <div className="space-y-1 flex flex-col">
                  {getDisplayTokens().map(
                    (token: {
                      symbol: any;
                      icon: string;
                      name: string;
                      logoURI: string;
                    }) => (
                      <Button
                        key={`${token.symbol}-${searchKey}`}
                        variant="ghost"
                        onClick={() => handleTokenSelect(token.symbol, token)}
                        className="flex items-center justify-start w-full gap-3 text-left hover:bg-gray-100 px-3 py-2 rounded-lg h-auto"
                      >
                        <img
                          src={token?.icon || token?.logoURI}
                          alt={token.symbol}
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="flex flex-col text-sm">
                          <span className="font-medium">{token.symbol}</span>
                          <span className="text-gray-400 text-xs">{token?.name}</span>
                        </div>
                      </Button>
                    )
                  )}
                </div>

                {searchQuery && !isSearching && searchedTokens.length === 0 && (
                  <div className="text-center py-4 text-gray-500">No tokens found</div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
