import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useWallets } from "@privy-io/react-auth";
import { useSolanaWallets } from "@privy-io/react-auth";
import { useJupiter } from "@jup-ag/react-hook";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicKey } from "@solana/web3.js";
import { SolanaWalletProvider } from "../../../lib/context/SolanaWalletContext";

interface SwapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SwapModal({ open, onOpenChange }: SwapModalProps) {
  const [outputMint, setOutputMint] = useState(
    new PublicKey("So11111111111111111111111111111111111111112") // WSOL
  );
  const [inputMint, setInputMint] = useState(
    new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") // USDC
  );
  const [amount, setAmount] = useState("0.01");
  const [routeLabels, setRouteLabels] = useState<string>("");
  const [quoteMeta, setQuoteMeta] = useState<any>(null);

  const wallet = useSolanaWallets();
  const solanaAddress = wallet.wallets[0]?.address;

  const amountInLamports = useMemo(() => {
    try {
      return Math.floor(parseFloat(amount) * 1e9); // Convert to lamports
    } catch {
      return 0;
    }
  }, [amount]);

  const { fetchQuote, exchange, loading } = useJupiter({
    amount: amountInLamports,
    inputMint,
    outputMint,
    slippageBps: 100,
    debounceTime: 250,
    userPublicKey: solanaAddress,
  });

  useEffect(() => {
    const fetchAndSetQuote = async () => {
      if (!amountInLamports || !inputMint || !outputMint) return;

      const quoteData = await fetchQuote();
      console.log("Quote data:", quoteData);
      if (quoteData?.quoteResponse) {
        const labels = quoteData.quoteResponse.routePlan
          .map((plan) => plan.swapInfo.label)
          .join(" → ");
        setRouteLabels(labels);
        setQuoteMeta(quoteData.quoteResponse);
      } else {
        setRouteLabels("No route found");
        setQuoteMeta(null);
      }
    };

    fetchAndSetQuote();
  }, [amountInLamports, inputMint, outputMint]);

  const isValidSolanaAddress = (address: string) => {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/; // Solana base58 address regex
    return base58Regex.test(address);
  };

  const handleSwap = async () => {
    if (!exchange || !quoteMeta || !solanaAddress) {
      console.error("Missing exchange, quoteMeta, or solanaAddress.");
      return;
    }

    // Validate Solana Address
    if (!isValidSolanaAddress(solanaAddress)) {
      console.error("Invalid Solana Address:", solanaAddress);
      return;
    } else {
      console.log("Valid Solana Address:", solanaAddress);
    }

    console.log("exchange:", exchange);

    const publicKey = new PublicKey(solanaAddress);

    const mockWallet = {
      publicKey,
      signTransaction: async (tx) => {
        // Optional: implement if you can sign here
        throw new Error("signTransaction not implemented");
      },
    };

    try {
      // Step 1: Execute the exchange
      //
      //
      const swapResult = await exchange({
        quoteResponseMeta: quoteMeta,
        wallet: mockWallet, // Convert to PublicKey only if valid
        prioritizationFeeLamports: 1000, // Example fee, adjust as needed
      });

      console.log(swapResult);

      // Step 2: Fetch the swap transaction details using fetchSwapTransaction
      // const { swapTransaction, blockhash, lastValidBlockHeight } = await fetchSwapTransaction({
      //   quoteResponseMeta: quoteMeta,
      //   userPublicKey: new PublicKey(solanaAddress),
      //   prioritizationFeeLamports: 1000, // Example fee
      //   enableSwapEndpointFee: true, // Set as needed
      // });

      // console.log("Transaction to send:", swapTransaction);
      // Optionally, send the swapTransaction to the Solana network for confirmation
    } catch (error) {
      console.error("Swap failed:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Swap SOL to USDC</h2>

        <div className="bg-muted rounded-2xl p-4 mb-3 shadow">
          <Input
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-xl border-none shadow-none bg-transparent p-0"
          />
        </div>

        <div className="flex justify-center my-2">
          <button
            onClick={() => {
              setInputMint(outputMint);
              setOutputMint(inputMint);
            }}
            className="bg-muted p-2 rounded-full border border-border hover:bg-accent transition"
          >
            <ArrowLeftRight size={20} className="rotate-90" />
          </button>
        </div>

        <div className="text-sm text-muted-foreground text-center mb-4">
          Best Route: {routeLabels || (loading ? "Loading..." : "No route")}
        </div>

        <Button
          className="w-full"
          onClick={handleSwap}
          disabled={loading || !quoteMeta}
        >
          {loading ? "Loading Route..." : "Confirm Swap"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
