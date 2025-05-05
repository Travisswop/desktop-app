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
}

export default function SwapModal({ open, onOpenChange }: SwapModalProps) {
  const [inputMint, setInputMint] = useState(
    new PublicKey("So11111111111111111111111111111111111111112") // SOL
  );
  const [outputMint, setOutputMint] = useState(
    new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") // USDC
  );

  const [amount, setAmount] = useState("0.01");
  const [routeLabels, setRouteLabels] = useState<string>("");
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const wallet = useSolanaWallets();
  const solanaAddress = wallet.wallets[0]?.address?.toString();
  const payer = wallet.wallets[0]?.publicKey;
  const connection = new Connection("https://api.mainnet-beta.solana.com");

  useEffect(() => {
    const fetchQuote = async () => {
      if (!inputMint || !outputMint || !amount) return;
      setLoading(true);
      setError(null);

      try {
        const amountInSmallestUnit = Math.floor(parseFloat(amount) * 10 ** 9);
        const res = await fetch(
          `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint.toString()}&outputMint=${outputMint.toString()}&amount=${amountInSmallestUnit}&slippageBps=50&restrictIntermediateTokens=true&dynamicSlippage=true`
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
    if (!quote || !solanaAddress || !payer) {
      setError("Wallet not connected or missing data");
      return;
    }

    setStatus("Fetching swap transaction...");
    try {
      const swapResponse = await (
        await fetch("https://lite-api.jup.ag/swap/v1/swap", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey: solanaAddress,
            dynamicSlippage: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: {
              priorityLevelWithMaxLamports: {
                maxLamports: 10000000,
                global: false,
                priorityLevel: "veryHigh",
              },
            },
          }),
        })
      ).json();

      const txBase64 = swapResponse.swapTransaction;
      const txBuffer = Buffer.from(txBase64, "base64");
      const transaction = VersionedTransaction.deserialize(txBuffer);

      // Sign with Privy Wallet
      const signed = await wallet.wallets[0]?.signTransaction!(transaction);
      const serializedTx = signed.serialize();

      setStatus("Sending transaction...");
      const signature = await connection.sendRawTransaction(serializedTx, {
        maxRetries: 2,
        skipPreflight: true,
      });

      setStatus("Confirming transaction...");
      const confirmation = await connection.confirmTransaction(
        { signature },
        "finalized"
      );

      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        );
      }

      setStatus(`✅ Success: https://solscan.io/tx/${signature}`);
    } catch (err: any) {
      setError(`Swap failed: ${err.message}`);
      setStatus(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="space-y-4">
        <h2 className="text-lg font-semibold">Swap SOL ↔ USDC</h2>
        <div className="space-y-2">
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount in SOL"
            type="number"
          />
          <div className="text-sm text-gray-500">Route: {routeLabels}</div>
        </div>

        <Button onClick={handleSwap} disabled={loading}>
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          Swap
        </Button>

        {loading && <p className="text-sm text-blue-500">Loading quote...</p>}
        {status && <p className="text-sm text-green-600">{status}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
