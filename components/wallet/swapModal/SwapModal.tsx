/* eslint-disable prefer-const */
import React, { useEffect, useState } from "react";
import { ArrowUpDown, ChevronRight } from "lucide-react";
import { AiOutlineExclamationCircle } from "react-icons/ai";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSolanaWallets } from "@privy-io/react-auth";
import { Connection, PublicKey } from "@solana/web3.js";

import {
  KNOWN_TOKENS,
  getTokenInfoBySymbol,
  formatUSD,
} from "./utils/swapUtils";
import { handleSwap } from "./utils/handleSwap";

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

  const [amount, setAmount] = useState("0.01");
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTokenListOpen, setIsTokenListOpen] = useState(false);
  const [isInputToken, setIsInputToken] = useState(true);

  const [inputMint, setInputMint] = useState<PublicKey | null>(null);
  const [outputMint, setOutputMint] = useState<PublicKey | null>(null);

  const wallet = useSolanaWallets();
  const solanaAddress = wallet.wallets[0]?.address?.toString();

  const connection = new Connection(
    "https://frequent-neat-valley.solana-mainnet.quiknode.pro/c87706bb433055dc44d32b704d34e4f918432c09"
  );

  const inputToken = getTokenInfoBySymbol(selectedInputSymbol, userToken);
  const outputToken = getTokenInfoBySymbol(selectedOutputSymbol, userToken);

  // Assign mint values when token information is available
  useEffect(() => {
    if (inputToken && outputToken) {
      setInputMint(inputToken.mint);
      setOutputMint(outputToken.mint);
    }
  }, [inputToken, outputToken]); // Depend on inputToken and outputToken

  useEffect(() => {
    const fetchQuote = async () => {
      if (!inputMint || !outputMint || !amount) return;

      console.log(
        "input and output mint and amount inside useEffect: 111111111111111111111111111111111111111111111111111111111111111111111111",
        inputMint,
        outputMint,
        amount
      );

      setLoading(true);
      setError(null);
      try {
        const decimals = 9;
        const amountInSmallestUnit = Math.floor(
          parseFloat(amount) * 10 ** decimals
        );

        const res = await fetch(
          `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint.toString()}&outputMint=${outputMint.toString()}&amount=${amountInSmallestUnit}&slippageBps=50`
        );
        const data = await res.json();

        setQuote(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch quote");
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [inputMint, outputMint, amount]); // Only run when inputMint, outputMint, or amount changes

  console.log("Quote from jupiter :", quote);

  const exchangeRate =
    quote?.outAmount && amount
      ? `1 ${inputToken?.symbol} = ${(
          quote.outAmount /
          10 ** (outputToken?.decimals || 6) /
          parseFloat(amount)
        ).toFixed(4)} ${outputToken?.symbol} ($${(
          (quote.outAmount /
            10 ** (outputToken?.decimals || 6) /
            parseFloat(amount)) *
          parseFloat(outputToken?.marketData?.price || "0")
        ).toFixed(2)})`
      : null;

  const handleTokenSelect = (symbol: string) => {
    if (isInputToken) {
      setSelectedInputSymbol(symbol);
    } else {
      setSelectedOutputSymbol(symbol);
    }
    setIsTokenListOpen(false);
  };

  const reverseTokens = () => {
    setSelectedInputSymbol(outputToken?.symbol || "");
    setSelectedOutputSymbol(inputToken?.symbol || "");
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
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="text-xl border-none shadow-none bg-transparent p-0"
            />
            <Button
              variant="ghost"
              className="flex items-center bg-white px-5 py-1 gap-0 rounded-full shadow"
              onClick={() => {
                setIsInputToken(true);
                setIsTokenListOpen(true);
              }}
            >
              <img
                src={inputToken.logoURI}
                alt={inputToken.symbol}
                className="w-5 h-5 mr-2 rounded-full"
              />
              <span className="font-medium">{inputToken.symbol}</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground mt-1">
            <div>
              {inputToken?.marketData?.price &&
                `$${formatUSD(
                  inputToken.marketData.price,
                  (quote?.outAmount / 10 ** inputToken?.decimals).toString(),
                  inputToken.decimals
                )}`}
            </div>
            <div>Balance: {inputToken.balance}</div>
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
                setIsInputToken(false);
                setIsTokenListOpen(true);
              }}
            >
              <img
                src={outputToken.logoURI}
                alt={outputToken.symbol}
                className="w-5 h-5 mr-2 rounded-full"
              />
              <span className="font-medium">{outputToken.symbol}</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground mt-1">
            <div>
              {outputToken?.marketData?.price &&
                quote?.outAmount &&
                `$${formatUSD(
                  outputToken.marketData.price,
                  (quote.outAmount / 10 ** outputToken?.decimals).toString(),
                  outputToken.decimals
                )}`}
            </div>
            <div>Balance: {outputToken.balance}</div>
          </div>
        </div>

        {/* Exchange Rate Info */}
        <div className="flex items-center p-3 bg-[#F7F7F7] rounded-lg my-3">
          <div className="flex items-center text-sm text-gray-600 w-full">
            <div className="flex items-center space-x-2 gap-1">
              <div className="flex justify-center items-center ">
                <AiOutlineExclamationCircle className="text-xl" />
              </div>
              <span>{exchangeRate}</span>
            </div>
          </div>
        </div>

        {/* Swap Button */}
        <Button
          onClick={() =>
            handleSwap({
              quote,
              solanaAddress,
              wallet,
              connection,
              setLoading,
            })
          }
          className=" py-6 text-base font-medium bg-[#F7F7F7] text-black hover:text-black hover:bg-[#F7F7F7] rounded-lg w-3/4 mx-auto"
          disabled={loading}
        >
          Swap
        </Button>

        {/* Error Handling */}
        {/* {error && <div className="mt-4 text-red-500">{error}</div>} */}

        {/* Token Selection List */}
        {isTokenListOpen && (
          <div className="absolute bg-white shadow-xl rounded-lg p-4 max-h-60 overflow-auto w-full z-10">
            {KNOWN_TOKENS.map((token) => (
              <Button
                key={token.symbol}
                variant="ghost"
                className="flex items-center space-x-2 w-full text-left"
                onClick={() => handleTokenSelect(token.symbol)}
              >
                <img
                  src={token.logoURI}
                  alt={token.symbol}
                  className="w-5 h-5 rounded-full"
                />
                <span>{token.symbol}</span>
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
