/* eslint-disable prefer-const */
import React, { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  ChevronRight,
  DollarSign,
  Droplet,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSolanaWallets } from "@privy-io/react-auth";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

interface SwapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToken: any;
}

const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const SWOP_MINT = new PublicKey("GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1");

const KNOWN_TOKENS = [
  {
    symbol: "SOL",
    mint: SOL_MINT,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png",
    decimals: 9,
  },
  {
    symbol: "USDC",
    mint: USDC_MINT,
    logoURI:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
    decimals: 6,
  },
  {
    symbol: "SWOP",
    mint: SWOP_MINT,
    logoURI: "https://swop.fi/logo.svg",
    decimals: 6,
  },
  {
    symbol: "USDT",
    mint: new PublicKey("Es9vMFrzaCERngt7T9yDg8K97Ed1iXy3Kcz7GnKxFQ2j"),
    logoURI:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERngt7T9yDg8K97Ed1iXy3Kcz7GnKxFQ2j/logo.png",
    decimals: 6,
  },
];

export default function SwapModal({
  open,
  onOpenChange,
  userToken,
}: SwapModalProps) {
  const [selectedInputSymbol, setSelectedInputSymbol] = useState("SOL");
  const [selectedOutputSymbol, setSelectedOutputSymbol] = useState("USDC");

  const [amount, setAmount] = useState("0.01");
  const [quote, setQuote] = useState<any>(null);
  const [routeLabels, setRouteLabels] = useState<string>("N/A");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTokenListOpen, setIsTokenListOpen] = useState(false);
  const [isInputToken, setIsInputToken] = useState(true);

  const wallet = useSolanaWallets();
  const solanaAddress = wallet.wallets[0]?.address?.toString();

  const connection = new Connection(
    "https://frequent-neat-valley.solana-mainnet.quiknode.pro/c87706bb433055dc44d32b704d34e4f918432c09"
  );

  let inputMint: unknown;
  let outputMint: unknown;

  // Fetch Jupiter quote
  useEffect(() => {
    const fetchQuote = async () => {
      if (!inputMint || !outputMint || !amount) return;

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
        setRouteLabels(
          data.route?.map((r: any) => r.label).join(" → ") || "N/A"
        );
      } catch (err: any) {
        setError(err.message || "Failed to fetch quote");
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [inputMint, outputMint, amount]);

  const handleSwap = async () => {
    if (!quote || !solanaAddress) return;

    setLoading(true);
    try {
      const res = await fetch("https://lite-api.jup.ag/swap/v1/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: solanaAddress,
          wrapUnwrapSOL: true,
          dynamicComputeUnitLimit: true,
        }),
      });

      const swapResponse = await res.json();

      const txBase64 = swapResponse.swapTransaction;
      const txBuffer = Buffer.from(txBase64, "base64");
      const transaction = VersionedTransaction.deserialize(txBuffer);

      // Sign with Privy Wallet
      const signed = await wallet.wallets[0]?.signTransaction!(transaction);
      const serializedTx = signed.serialize();

      const signature = await connection.sendRawTransaction(serializedTx, {
        maxRetries: 2,
        skipPreflight: true,
      });

      const confirmation = await connection.confirmTransaction(
        signature,
        "finalized"
      );

      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        );
      }

      console.log(`✅ Success: https://solscan.io/tx/${signature}`);
    } catch (err) {
      console.error("Swap Failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTokenInfoBySymbol = (symbol: string) => {
    const baseToken = KNOWN_TOKENS.find((t) => t.symbol === symbol);
    const userHeldToken = userToken.find((t: any) => t.symbol === symbol);
    return {
      ...baseToken,
      balance: userHeldToken?.balance || "0",
      marketData: userHeldToken?.marketData || null,
    };
  };

  const inputToken = getTokenInfoBySymbol(selectedInputSymbol);
  const outputToken = getTokenInfoBySymbol(selectedOutputSymbol);

  inputMint = inputToken?.mint;
  outputMint = outputToken?.mint;

  const formatUSD = (price: string, amount: string, decimals: number = 9) => {
    const numAmount = parseFloat(amount);
    const priceNum = parseFloat(price);
    return (numAmount * priceNum).toFixed(4);
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Swap Tokens</h2>
          <button onClick={() => onOpenChange(false)} />
        </div>

        {/* Token Input */}
        <div className="relative bg-muted rounded-2xl p-4 mb-3 shadow">
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
              className="flex items-center bg-white px-3 py-1 gap-0 rounded-full shadow"
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
          <div className="flex gap-2 justify-between text-sm text-muted-foreground mt-1">
            <div>Balance: {inputToken.balance}</div>
          </div>
        </div>

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
        {/* Token Output */}
        <div className="relative bg-muted rounded-2xl p-4 mb-3 shadow">
          <div className="flex justify-between items-center">
            <Input
              type="number"
              value={
                quote?.outAmount
                  ? quote.outAmount / 10 ** outputToken.decimals
                  : "0"
              }
              placeholder="0.0"
              readOnly
              className="text-xl border-none shadow-none bg-transparent p-0"
            />
            <Button
              variant="ghost"
              className="flex items-center bg-white px-3 py-1 gap-0 rounded-full shadow"
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
          <div className="flex gap-2 justify-between text-sm text-muted-foreground mt-1">
            <div>Balance: {outputToken.balance}</div>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-between items-center">
          <span>{exchangeRate}</span>
          <Button
            onClick={handleSwap}
            className="bg-indigo-600 text-white"
            disabled={loading}
          >
            {loading ? "Swapping..." : "Swap"}
          </Button>
        </div>

        {/* Error Handling */}
        {error && <div className="mt-4 text-red-500">{error}</div>}
      </DialogContent>
    </Dialog>
  );
}
