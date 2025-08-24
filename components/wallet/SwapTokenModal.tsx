"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpDown } from "lucide-react";
import Image from "next/image";
import { debounce } from "lodash";
import { fetchTokensFromLiFi } from "@/actions/lifiForTokenSwap";
import { usePrivy, useSolanaWallets, useWallets } from "@privy-io/react-auth";
import { Connection, VersionedTransaction } from "@solana/web3.js";

const getChainIcon = (chainName: string) => {
  const chainIcons: Record<string, string> = {
    SOLANA: "/images/IconShop/solana@2x.png",
    ETHEREUM: "/images/IconShop/ethereum.png",
    BSC: "/images/IconShop/binance-smart-chain.png",
    POLYGON: "/images/IconShop/polygon.png",
    ARBITRUM: "/images/IconShop/arbitrum.png",
    BASE: "/images/IconShop/base.png",
  };
  return chainIcons[chainName.toUpperCase()] || null;
};

const getChainId = (chainName: string) => {
  const chainIds: Record<string, string> = {
    SOLANA: "1151111081099710",
    ETHEREUM: "1",
    BSC: "56",
    POLYGON: "137",
    ARBITRUM: "42161",
    BASE: "8453",
  };
  return chainIds[chainName.toUpperCase()] || "1";
};

// Chain configuration for receiver selection
const RECEIVER_CHAINS = [
  {
    id: "1",
    name: "ETH",
    fullName: "Ethereum",
    icon: "/images/IconShop/outline-icons/light/ethereum-outline@3x.png",
  },
  {
    id: "1151111081099710",
    name: "SOL",
    fullName: "Solana",
    icon: "/images/IconShop/solana@2x.png",
  },
  {
    id: "137",
    name: "POL",
    fullName: "Polygon",
    icon: "/images/IconShop/polygon.png",
  },
  {
    id: "8453",
    name: "BASE",
    fullName: "Base",
    icon: "https://www.base.org/document/safari-pinned-tab.svg",
  },
];

export default function SwapTokenModal({ tokens }: { tokens: any[] }) {
  // State management
  const [payToken, setPayToken] = useState<any>(tokens?.[0] || null);
  const [receiveToken, setReceiveToken] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selecting, setSelecting] = useState<"pay" | "receive" | null>(null);
  const [availableTokens, setAvailableTokens] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [chainId, setChainId] = useState("1151111081099710");
  const [receiverChainId, setReceiverChainId] = useState("137");
  const [selectedReceiverChain, setSelectedReceiverChain] = useState("137");
  const [quote, setQuote] = useState<any>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { wallets } = useWallets();
  const { wallets: solWallets } = useSolanaWallets();

  console.log("solWallets", solWallets);

  const ethWallet = wallets[0]?.address;
  const solWallet = solWallets[0]?.address;

  const [fromWalletAddress, setFromWalletAddress] = useState(solWallet || "");
  const [toWalletAddress, setToWalletAddress] = useState(solWallet || "");

  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStatus, setSwapStatus] = useState<string | null>(null);

  const { authenticated, ready, user: PrivyUser } = usePrivy();

  const formatTokenAmount = (amount: string, decimals: number): string => {
    const result = Number(amount) * Math.pow(10, decimals);
    return Math.floor(result).toString();
  };

  const getExplorerUrl = (chainId: string, txHash: string): string => {
    const explorerUrls: Record<string, string> = {
      "1151111081099710": `https://solscan.io/tx/${txHash}`, // Solana
      "1": `https://etherscan.io/tx/${txHash}`, // Ethereum
      "56": `https://bscscan.com/tx/${txHash}`, // BSC
      "137": `https://polygonscan.com/tx/${txHash}`, // Polygon
      "42161": `https://arbiscan.io/tx/${txHash}`, // Arbitrum
      "8453": `https://basescan.org/tx/${txHash}`, // Base
    };
    return explorerUrls[chainId] || `https://etherscan.io/tx/${txHash}`;
  };

  const validateBalance = () => {
    if (!payToken?.balance || !payAmount) return { isValid: true, error: null };

    const balance = parseFloat(payToken.balance);
    const amount = parseFloat(payAmount);

    if (amount > balance) {
      return {
        isValid: false,
        error: `Insufficient balance. Available: ${balance.toFixed(6)} ${
          payToken.symbol
        }`,
      };
    }

    if (amount <= 0) {
      return {
        isValid: false,
        error: "Amount must be greater than 0",
      };
    }

    return { isValid: true, error: null };
  };

  const executeCrossChainSwap = async () => {
    try {
      setIsSwapping(true);
      setSwapError(null);
      setTxHash(null);
      setSwapStatus("Preparing transaction...");

      // Validate balance first
      const balanceCheck = validateBalance();
      if (!balanceCheck.isValid) {
        setSwapError(balanceCheck.error);
        setIsSwapping(false);
        return;
      }

      // Check if quote is available
      if (!quote) {
        setSwapError("No quote available. Please try again.");
        setIsSwapping(false);
        return;
      }

      // Determine which wallet to use based on the chain
      const fromChainId = parseInt(chainId);

      if (fromChainId === 1151111081099710) {
        // Solana transaction
        await executeSolanaSwap();
        setIsSwapping(false);
      } else {
        // EVM chains
        const allAccounts = PrivyUser?.linkedAccounts || [];
        const ethereumAccount = allAccounts.find(
          (account: any) =>
            account.chainType === "ethereum" &&
            account.type === "wallet" &&
            account.address
        );

        if (!ethereumAccount) {
          setSwapError("No Ethereum wallet connected");
          setIsSwapping(false);
          return;
        }

        const wallet = wallets.find(
          (w) =>
            w.address?.toLowerCase() ===
            (ethereumAccount as any).address.toLowerCase()
        );

        if (!wallet) {
          setSwapError("Wallet not found");
          setIsSwapping(false);
          return;
        }

        const provider = await wallet.getEthereumProvider();
        if (!provider) {
          setSwapError("Failed to get wallet provider");
          setIsSwapping(false);
          return;
        }

        setSwapStatus("Waiting for confirmation...");

        // Execute the transaction
        const txHash = await provider.request({
          method: "eth_sendTransaction",
          params: [quote.transactionRequest],
        });

        console.log("Transaction hash:", txHash);
        setTxHash(txHash);
        setSwapStatus("Transaction submitted! Waiting for confirmation...");
        setSwapStatus("Swap completed successfully!");
        setIsSwapping(false);
      }
    } catch (error: any) {
      console.error("Swap error:", error);

      let errorMessage = "Swap failed";
      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setSwapError(errorMessage);
      setSwapStatus(null);
      setIsSwapping(false);
    }
  };

  useEffect(() => {
    setSwapError(null);
    setSwapStatus(null);
  }, [payAmount, payToken, receiveToken]);

  const balanceValidation = validateBalance();

  // Set chain ID based on payToken
  useEffect(() => {
    if (payToken?.chain) {
      setChainId(getChainId(payToken.chain));
    }
  }, [payToken]);

  // set from and to walletAddress
  useEffect(() => {
    if (payToken && payToken?.chain === "SOLANA") {
      setFromWalletAddress(solWallet);
    } else {
      setFromWalletAddress(ethWallet);
    }
    if (!receiveToken) {
      setToWalletAddress("");
    } else if (
      receiveToken &&
      (receiveToken?.chain === "SOLANA" ||
        receiveToken?.chainId == 1151111081099710)
    ) {
      setToWalletAddress(solWallet);
    } else {
      setToWalletAddress(ethWallet);
    }
  }, [ethWallet, payToken, receiveToken, solWallet]);

  // FIXED: getLifiQuote function with proper Solana handling
  const getLifiQuote = async () => {
    try {
      const queryParams = new URLSearchParams();

      // Convert human-readable amount to token units
      const fromAmount = formatTokenAmount(payAmount, payToken.decimals || 6);

      // Validate the amount
      if (fromAmount === "0" || !fromAmount) {
        throw new Error("Invalid amount");
      }

      // FIXED: Proper token address handling for Solana
      let fromTokenAddress;
      if (chainId === "1151111081099710") {
        // Solana chain
        if (payToken?.symbol === "SOL") {
          // For native SOL, use the wrapped SOL address
          fromTokenAddress = "So11111111111111111111111111111111111111112";
        } else if (payToken?.address) {
          // For SPL tokens, use the token mint address
          fromTokenAddress = payToken.address;
        } else {
          throw new Error("Invalid Solana token");
        }
      } else {
        // EVM chains
        if (payToken?.symbol === "ETH" || payToken?.symbol === "POL") {
          fromTokenAddress = "0x0000000000000000000000000000000000000000";
        } else if (payToken?.address) {
          fromTokenAddress = payToken.address;
        } else {
          throw new Error("Invalid EVM token");
        }
      }

      // FIXED: Proper receive token address handling
      let toTokenAddress;
      if (receiverChainId === "1151111081099710") {
        // Receiving on Solana
        if (receiveToken?.symbol === "SOL") {
          toTokenAddress = "So11111111111111111111111111111111111111112";
        } else if (receiveToken?.address) {
          toTokenAddress = receiveToken.address;
        } else {
          throw new Error("Invalid Solana receive token");
        }
      } else {
        // Receiving on EVM
        if (receiveToken?.symbol === "ETH" || receiveToken?.symbol === "POL") {
          toTokenAddress = "0x0000000000000000000000000000000000000000";
        } else if (receiveToken?.address) {
          toTokenAddress = receiveToken.address;
        } else {
          throw new Error("Invalid EVM receive token");
        }
      }

      // Validate wallet addresses
      if (!fromWalletAddress || !toWalletAddress) {
        throw new Error("Wallet addresses not available");
      }

      // Build query parameters
      queryParams.append("fromChain", chainId.toString());
      queryParams.append("toChain", receiverChainId.toString());
      queryParams.append("fromToken", fromTokenAddress);
      queryParams.append("toToken", toTokenAddress);
      queryParams.append("fromAddress", fromWalletAddress);
      queryParams.append("toAddress", toWalletAddress);
      queryParams.append("fromAmount", fromAmount);
      queryParams.append("slippage", "0.03"); // 3%

      // FIXED: Add integrator for better support
      queryParams.append("integrator", "your-app-name");

      const response = await fetch(`https://li.quest/v1/quote?${queryParams}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("LiFi API Error:", errorData);

        if (response.status === 404) {
          throw new Error(
            "Route not found. This token pair or chain combination may not be supported."
          );
        } else if (response.status === 400) {
          throw new Error(
            `Invalid parameters: ${errorData?.message || "Bad request"}`
          );
        } else if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please wait and try again.");
        } else {
          throw new Error(
            errorData?.message || `Quote request failed: ${response.status}`
          );
        }
      }

      const quote = await response.json();

      if (!quote || !quote.estimate) {
        throw new Error("Invalid quote response");
      }

      return quote;
    } catch (error) {
      console.error("Error getting LiFi quote:", error);
      throw error;
    }
  };

  // Quote fetching useEffect
  useEffect(() => {
    let isCancelled = false;

    const fetchQuote = async () => {
      if (
        !payAmount ||
        !payToken ||
        !receiveToken ||
        !fromWalletAddress ||
        !toWalletAddress
      ) {
        setQuote(null);
        return;
      }

      try {
        setIsCalculating(true);
        setSwapError(null);

        const quote = await getLifiQuote();

        if (!isCancelled) {
          setQuote(quote);
          console.log("Quote received:", quote);
        }
      } catch (error: any) {
        if (!isCancelled) {
          console.error("Quote fetch error:", error);
          setQuote(null);
          setSwapError(error.message || "Failed to get quote");
        }
      } finally {
        if (!isCancelled) {
          setIsCalculating(false);
        }
      }
    };

    fetchQuote();

    return () => {
      isCancelled = true;
    };
  }, [
    chainId,
    fromWalletAddress,
    payAmount,
    payToken,
    receiveToken,
    receiverChainId,
    toWalletAddress,
  ]);

  // Calculate receive amount from quote
  useEffect(() => {
    if (quote && receiveToken) {
      try {
        setIsCalculating(true);
        const toAmount = quote?.estimate?.toAmount || quote.toAmount;

        if (toAmount && receiveToken.decimals) {
          const decimals = receiveToken.decimals;
          const readableAmount = Number(toAmount) / Math.pow(10, decimals);
          const formattedAmount = readableAmount
            .toFixed(8)
            .replace(/\.?0+$/, "");

          setReceiveAmount(formattedAmount);
          setIsCalculating(false);
        } else {
          setReceiveAmount("0");
          setIsCalculating(false);
        }
      } catch (error) {
        console.error("Error calculating receive amount from quote:", error);
        setReceiveAmount("Error");
        setIsCalculating(false);
      }
    } else if (payAmount && payToken && receiveToken && !quote) {
      setIsCalculating(true);
    } else {
      setReceiveAmount("");
      setIsCalculating(false);
    }
  }, [quote, receiveToken, payAmount, payToken]);

  // Solana swap execution
  // Solana swap execution
  const executeSolanaSwap = async () => {
    try {
      if (!solWallets || solWallets.length === 0) {
        setSwapError("No Solana wallet connected");
        setIsSwapping(false);
        return;
      }

      const solanaWallet = solWallets[0];

      // ✅ use .env RPC
      const rpcUrl =
        process.env.NEXT_PUBLIC_HELIUS_API_URL ||
        process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL ||
        process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_URL;

      const connection = new Connection(rpcUrl, "confirmed");

      // ✅ Extract tx from LiFi quote
      const { transactionRequest } = quote;
      const rawTx = transactionRequest?.transaction || transactionRequest?.data;
      if (!rawTx) {
        throw new Error("No transactionRequest found in LiFi quote");
      }

      // ✅ Decode base64 into VersionedTransaction
      const txBuffer = Buffer.from(rawTx, "base64");
      const tx = VersionedTransaction.deserialize(txBuffer);

      // ✅ Option 1: Let Privy handle sending
      const txId = await solanaWallet.sendTransaction(tx, connection);

      // ✅ Option 2: Manual sign + send (if Privy supports signTransaction)
      // const signedTx = await solanaWallet.signTransaction(tx);
      // const txId = await connection.sendRawTransaction(signedTx.serialize());

      setTxHash(txId);
      setSwapStatus("Transaction submitted! Waiting for confirmation...");

      await connection.confirmTransaction(txId, "confirmed");
      setSwapStatus("Transaction confirmed ✅");
    } catch (error) {
      console.error("Solana swap failed:", error);
      setSwapError(error.message || "Transaction failed");
    } finally {
      setIsSwapping(false);
    }
  };

  // Debounced token search for receive tokens
  const debouncedSearch = useCallback(
    debounce(async (query: string, chain: string) => {
      setIsLoadingTokens(true);
      try {
        const tokens = await fetchTokensFromLiFi(chain, query);

        let result = tokens;

        if (query) {
          const lowerQuery = query.toLowerCase();
          result = [...tokens].sort((a, b) => {
            const aSymbol = a.symbol?.toLowerCase() || "";
            const bSymbol = b.symbol?.toLowerCase() || "";

            if (aSymbol === lowerQuery && bSymbol !== lowerQuery) return -1;
            if (bSymbol === lowerQuery && aSymbol !== lowerQuery) return 1;
            if (
              aSymbol.startsWith(lowerQuery) &&
              !bSymbol.startsWith(lowerQuery)
            )
              return -1;
            if (
              bSymbol.startsWith(lowerQuery) &&
              !aSymbol.startsWith(lowerQuery)
            )
              return 1;
            if (aSymbol.includes(lowerQuery) && !bSymbol.includes(lowerQuery))
              return -1;
            if (bSymbol.includes(lowerQuery) && !aSymbol.includes(lowerQuery))
              return 1;
            return 0;
          });
        }

        setAvailableTokens(result.slice(0, 20));
      } catch (error) {
        console.error("Error fetching tokens:", error);
      } finally {
        setIsLoadingTokens(false);
      }
    }, 400),
    []
  );

  // Handle receiver chain selection
  const handleReceiverChainSelect = (chainId: string) => {
    setSelectedReceiverChain(chainId);
    setReceiverChainId(chainId);
    setReceiveToken(null);
    setSearchQuery("");
    debouncedSearch("", chainId);
  };

  // Fetch tokens when chainId or searchQuery changes
  useEffect(() => {
    if (openDrawer && selecting === "receive") {
      debouncedSearch(searchQuery, selectedReceiverChain);
    }
    return () => debouncedSearch.cancel();
  }, [
    searchQuery,
    selectedReceiverChain,
    openDrawer,
    selecting,
    debouncedSearch,
  ]);

  // Initialize with first 20 tokens when drawer opens for pay tokens
  useEffect(() => {
    if (openDrawer && selecting === "pay") {
      setAvailableTokens(tokens.slice(0, 20));
    }
  }, [openDrawer, selecting, tokens]);

  // Debounced pay amount handler
  const debouncedSetPayAmount = useCallback(
    debounce((value: string) => {
      setPayAmount(value);
    }, 300),
    []
  );

  const handlePayAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPayAmount(value);
    debouncedSetPayAmount(value);
  };

  const handleFlip = () => {
    const tempToken = payToken;
    const tempAmount = payAmount;

    setPayToken(receiveToken);
    setReceiveToken(tempToken);
    setPayAmount(receiveAmount);
    setReceiveAmount(tempAmount);
  };

  const handlePercentageClick = (percentage: number) => {
    if (payToken?.balance) {
      setIsCalculating(true);
      const amount = (parseFloat(payToken.balance) * percentage).toString();
      setPayAmount(amount);
      setIsCalculating(false);
    }
  };

  // Handle token selection
  const handleTokenSelect = (token: any, type: "pay" | "receive") => {
    if (type === "pay") {
      setPayToken(token);
    } else {
      setReceiveToken(token);
    }
    setOpenDrawer(false);
    setSearchQuery("");
  };

  // Local search for pay tokens
  const handlePayTokenSearch = (query: string) => {
    setIsLoadingTokens(true);
    try {
      const results = tokens.filter(
        (token: any) =>
          token.symbol.toLowerCase().includes(query.toLowerCase()) ||
          token.name.toLowerCase().includes(query.toLowerCase())
      );
      setAvailableTokens(results.slice(0, query ? 50 : 20));
    } catch (error) {
      console.error("Error filtering tokens:", error);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (selecting === "pay") {
      handlePayTokenSearch(query);
    }
  };

  // Calculate exchange rate from quote
  const calculateExchangeRateFromQuote = () => {
    if (!quote || !payToken || !receiveToken) {
      return null;
    }

    try {
      const fromAmount = quote.estimate?.fromAmount || quote.fromAmount;
      const toAmount = quote.estimate?.toAmount || quote.toAmount;

      if (!fromAmount || !toAmount) {
        return null;
      }

      const fromAmountReadable =
        Number(fromAmount) / Math.pow(10, payToken.decimals || 18);
      const toAmountReadable =
        Number(toAmount) / Math.pow(10, receiveToken.decimals || 18);

      if (fromAmountReadable <= 0) {
        return null;
      }

      const rate = toAmountReadable / fromAmountReadable;
      return rate;
    } catch (error) {
      console.error("Error calculating exchange rate from quote:", error);
      return null;
    }
  };

  const getQuoteExchangeInfo = () => {
    if (!quote) return null;

    const fromAmountUSD = quote.estimate?.fromAmountUSD || quote.fromAmountUSD;
    const toAmountUSD = quote.estimate?.toAmountUSD || quote.toAmountUSD;

    return {
      exchangeRate: calculateExchangeRateFromQuote(),
      fromAmountUSD: fromAmountUSD ? parseFloat(fromAmountUSD) : null,
      toAmountUSD: toAmountUSD ? parseFloat(toAmountUSD) : null,
      priceImpact:
        fromAmountUSD && toAmountUSD
          ? ((parseFloat(toAmountUSD) - parseFloat(fromAmountUSD)) /
              parseFloat(fromAmountUSD)) *
            100
          : null,
    };
  };

  return (
    <div className="flex justify-center mt-10 relative">
      <Card className="w-full max-w-md p-4 rounded-2xl shadow-lg bg-white text-black">
        <h2 className="text-lg font-base text-center mb-3">Swap Tokens</h2>

        <div className="space-y-4">
          {/* Pay Section */}
          <div className="p-3 rounded-xl bg-gray-100">
            <div className="flex justify-between items-center text-sm text-gray-400 mb-1">
              <span>You Pay</span>
              <span
                className={`${
                  !balanceValidation.isValid ? "text-red-500" : ""
                }`}
              >
                {payToken?.balance
                  ? `${parseFloat(payToken.balance).toFixed(4)} ${
                      payToken.symbol
                    }`
                  : "0"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Input
                type="number"
                placeholder="0"
                value={payAmount}
                onChange={handlePayAmountChange}
                className="bg-transparent border-none text-2xl w-full
                  focus:outline-gray-100 focus:ring-gray-100 focus:border-gray-100 focus-visible:ring-gray-100"
              />
              <button
                onClick={() => {
                  setSelecting("pay");
                  setOpenDrawer(true);
                  setSearchQuery("");
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <div className="relative min-w-max">
                    {payToken?.logoURI && (
                      <Image
                        src={payToken.logoURI}
                        alt={payToken.symbol}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    {payToken?.chain && (
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
                        <Image
                          src={getChainIcon(payToken.chain)}
                          alt={payToken.chain}
                          width={12}
                          height={12}
                          className="w-3 h-3 rounded-full"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center ml-2">
                    <span className="font-medium">
                      {payToken ? payToken.symbol : "Select"}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 ml-1 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            </div>
            <div className="flex gap-2 mt-2 text-xs text-gray-400">
              <Button
                variant="ghost"
                size="sm"
                className="px-2 py-1 rounded-lg bg-white"
                onClick={() => handlePercentageClick(0.5)}
              >
                50%
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-2 py-1 rounded-lg bg-white"
                onClick={() => handlePercentageClick(1)}
              >
                Max
              </Button>
            </div>
          </div>

          {/* Flip Button */}
          <div className="flex justify-center">
            <button
              onClick={handleFlip}
              className="p-2 bg-white rounded-full hover:bg-[#f2f2f2] transition"
            >
              <ArrowUpDown className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Receive Section */}
          <div className="p-3 rounded-xl bg-gray-100">
            <div className="flex justify-between items-center text-sm text-gray-400 mb-1">
              <span>You Receive</span>
              <span>
                {receiveToken?.balance
                  ? parseFloat(receiveToken.balance).toFixed(4)
                  : "0"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <Input
                type="number"
                placeholder="0"
                value={isCalculating ? "Calculating..." : receiveAmount}
                disabled
                className="bg-transparent border-none text-2xl focus:ring-0 focus:outline-none w-full"
              />
              <button
                onClick={() => {
                  setSelecting("receive");
                  setOpenDrawer(true);
                  setSearchQuery("");
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow hover:bg-gray-50"
              >
                {receiveToken ? (
                  <div className="flex items-center">
                    <div className="relative min-w-max">
                      <Image
                        src={receiveToken.logoURI}
                        alt={receiveToken.symbol}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full"
                      />
                      {receiveToken?.chain && (
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
                          <Image
                            src={getChainIcon(receiveToken.chain)}
                            alt={receiveToken.chain}
                            width={12}
                            height={12}
                            className="w-3 h-3 rounded-full"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center ml-2">
                      <span className="font-medium">{receiveToken.symbol}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 ml-1 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="font-medium">Select</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 ml-1 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Error/Status Display */}
          {(swapError || swapStatus || !balanceValidation.isValid) && (
            <div className="p-3 rounded-lg">
              {!balanceValidation.isValid && (
                <div className="text-red-500 text-sm mb-2 text-center">
                  {balanceValidation.error}
                </div>
              )}
              {swapError && (
                <div className="text-red-500 text-sm mb-2 text-center">
                  {swapError}
                </div>
              )}
              {swapStatus && (
                <div className="text-blue-600 text-sm text-center">
                  {swapStatus}
                </div>
              )}

              {txHash && (
                <div className="text-green-600 text-xs text-center mt-2">
                  <a
                    href={getExplorerUrl(chainId, txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    View transaction
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Exchange Rate Display */}
          {(() => {
            const quoteInfo = getQuoteExchangeInfo();
            return (
              payToken &&
              receiveToken &&
              quote &&
              quoteInfo?.exchangeRate && (
                <div className="text-center text-sm text-gray-500 space-y-1">
                  <div>
                    1 {payToken.symbol} ≈{" "}
                    {quoteInfo.exchangeRate < 0.000001
                      ? quoteInfo.exchangeRate.toExponential(4)
                      : quoteInfo.exchangeRate.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 8,
                        })}{" "}
                    {receiveToken.symbol}
                  </div>
                  {quoteInfo.fromAmountUSD && quoteInfo.toAmountUSD && (
                    <div className="text-xs">
                      ${quoteInfo.fromAmountUSD.toFixed(2)} → $
                      {quoteInfo.toAmountUSD.toFixed(2)}
                      {quoteInfo.priceImpact !== null && (
                        <span
                          className={`ml-2 ${
                            quoteInfo.priceImpact >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          ({quoteInfo.priceImpact >= 0 ? "+" : ""}
                          {quoteInfo.priceImpact.toFixed(2)}%)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            );
          })()}

          {/* Swap Button */}
          <Button
            onClick={executeCrossChainSwap}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            disabled={
              !payAmount ||
              !receiveAmount ||
              isCalculating ||
              isSwapping ||
              !balanceValidation.isValid ||
              !quote
            }
          >
            {isSwapping
              ? "Swapping..."
              : !balanceValidation.isValid
              ? "Insufficient Balance"
              : isCalculating
              ? "Calculating..."
              : "Swap"}
          </Button>

          {/* Loading state during swap */}
          {isSwapping && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
                <p className="text-center text-gray-700">
                  {swapStatus || "Processing swap..."}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Token Select Drawer */}
      {openDrawer && (
        <div className="absolute inset-0 z-10 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => {
              setOpenDrawer(false);
              setSearchQuery("");
            }}
          />
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-4 max-h-[60vh] overflow-y-auto z-20">
            <div className="mb-4">
              <p className="font-medium text-lg mb-2">
                {selecting === "pay"
                  ? "Select Token to Pay"
                  : "Select Token to Receive"}
              </p>

              {/* Chain Selection Tabs - Only show for receiver tokens */}
              {selecting === "receive" && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Select Chain:</p>
                  <div className="flex gap-2 mb-3">
                    {RECEIVER_CHAINS.map((chain) => (
                      <button
                        key={chain.id}
                        onClick={() => handleReceiverChainSelect(chain.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                          selectedReceiverChain === chain.id
                            ? "bg-purple-100 border-purple-300 text-purple-700"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <Image
                          src={chain.icon}
                          alt={chain.name}
                          width={20}
                          height={20}
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="font-medium text-sm">
                          {chain.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Input
                placeholder="Search token name or symbol"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full"
              />
            </div>

            {isLoadingTokens ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {availableTokens
                  .filter((token: any) =>
                    selecting === "pay"
                      ? token.address !== receiveToken?.address
                      : token.address !== payToken?.address
                  )
                  .map((token: any) => (
                    <button
                      key={token.address}
                      onClick={() => handleTokenSelect(token, selecting!)}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="relative">
                        {token.logoURI && (
                          <Image
                            src={token.logoURI}
                            alt={token.symbol}
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        {token.chain && (
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
                            <Image
                              src={getChainIcon(token.chain)}
                              alt={token.chain}
                              width={12}
                              height={12}
                              className="w-3 h-3 rounded-full"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between w-full items-center">
                        <div className="text-left">
                          <p className="font-medium">{token.symbol}</p>
                          <p className="text-xs text-gray-500">{token.name}</p>
                        </div>
                        {token.balance && (
                          <span className="text-gray-400 text-sm">
                            {parseFloat(token.balance).toFixed(4)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}

                {!isLoadingTokens && availableTokens.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No tokens found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
