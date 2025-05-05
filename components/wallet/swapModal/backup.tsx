import React, { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSolanaWallets } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicKey, Connection, VersionedTransaction } from "@solana/web3.js";

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
  const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
  const USDC_MINT = new PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );
  const CUSTOM_TOKEN_MINT = new PublicKey(
    "GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1"
  );

  const [swapMode, setSwapMode] = useState<"SOL" | "CUSTOM">("SOL");
  const [inputMint, setInputMint] = useState(SOL_MINT);
  const [outputMint, setOutputMint] = useState(USDC_MINT);
  const [amount, setAmount] = useState("0.01");

  const [routeLabels, setRouteLabels] = useState<string>("");
  const [quoteMeta, setQuoteMeta] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wallet = useSolanaWallets();
  const solanaAddress = wallet.wallets[0]?.address?.toString();

  const connection = new Connection(
    "https://frequent-neat-valley.solana-mainnet.quiknode.pro/c87706bb433055dc44d32b704d34e4f918432c09/"
  );

  // Change input mint when swap mode changes
  useEffect(() => {
    if (swapMode === "SOL") {
      setInputMint(SOL_MINT);
    } else {
      setInputMint(CUSTOM_TOKEN_MINT);
    }
  }, [swapMode]);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!inputMint || !outputMint || !amount) return;
      setLoading(true);
      setError(null);

      try {
        const decimals = 9; // Adjust based on token decimals
        const amountInSmallestUnit = Math.floor(
          parseFloat(amount) * 10 ** decimals
        );

        // &restrictIntermediateTokens=true
        const res = await fetch(
          `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint.toString()}&outputMint=${outputMint.toString()}&amount=${amountInSmallestUnit}&slippageBps=50`
        );
        const data = await res.json();
        console.log("Quote Data:", data);
        setQuote(data);
        setQuoteMeta(data.meta);
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
          prioritizationFeeLamports: {
            priorityLevelWithMaxLamports: {
              maxLamports: 1000000,
              priorityLevel: "veryHigh",
            },
          },
        }),
      });

      const swapResponse = await res.json();
      const txBase64 = swapResponse.swapTransaction;
      const txBuffer = Buffer.from(txBase64, "base64");
      const transaction = VersionedTransaction.deserialize(txBuffer);

      const signed = await wallet.wallets[0]?.signTransaction!(transaction);
      const serializedTx = signed.serialize();

      const signature = await connection.sendRawTransaction(serializedTx, {
        maxRetries: 2,
        skipPreflight: true,
      });

      await connection.confirmTransaction(signature, "finalized");

      console.log(`✅ Success: https://solscan.io/tx/${signature}`);
    } catch (err: any) {
      console.error("Swap Error:", err);
      setError(err.message || "Swap failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">
          Swap {swapMode === "SOL" ? "SOL" : "MyToken"} to USDC
        </h2>

        <div className="flex justify-center mb-4">
          <Button
            variant="outline"
            onClick={() => setSwapMode(swapMode === "SOL" ? "CUSTOM" : "SOL")}
            className="text-xs"
          >
            Switch to {swapMode === "SOL" ? "MyToken" : "SOL"} Swap
          </Button>
        </div>

        <div className="bg-muted rounded-2xl p-4 mb-3 shadow">
          <Input
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => {
              const val = e.target.value;
              if (!isNaN(Number(val)) && Number(val) >= 0) {
                setAmount(val);
              }
            }}
            className="text-xl border-none shadow-none bg-transparent p-0"
          />
        </div>

        <div className="flex justify-center my-2">
          <button
            onClick={() => {
              setInputMint(outputMint);
              setOutputMint(inputMint);
              setQuote(null);
              setQuoteMeta(null);
              setRouteLabels("");
            }}
            className="bg-muted p-2 rounded-full border border-border hover:bg-accent transition"
          >
            <ArrowLeftRight size={20} className="rotate-90" />
          </button>
        </div>

        <div className="text-sm text-muted-foreground text-center mb-4">
          Best Route: {routeLabels || (loading ? "Loading..." : "No route")}
        </div>

        {error && (
          <div className="text-sm text-red-500 text-center mb-4">{error}</div>
        )}

        <Button
          className="w-full"
          onClick={handleSwap}
          disabled={loading || !quote || !solanaAddress}
        >
          {loading ? "Loading Route..." : "Confirm Swap"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
