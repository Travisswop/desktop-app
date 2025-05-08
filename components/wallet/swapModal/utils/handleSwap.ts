import { VersionedTransaction, Connection } from "@solana/web3.js";
import toast from "react-hot-toast";

export async function handleSwap({
  quote,
  solanaAddress,
  wallet,
  connection,
  setSwapLoading,
  onSuccess,
}: {
  quote: any;
  solanaAddress: string;
  wallet: any;
  connection: Connection;
  setSwapLoading: (loading: boolean) => void;
  onSuccess?: (signature: string) => void;
}) {
  if (!quote || !solanaAddress) return;

  setSwapLoading(true);
  try {
    const res = await fetch("https://lite-api.jup.ag/swap/v1/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: solanaAddress,
        wrapUnwrapSOL: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      }),
    });

    const swapResponse = await res.json();

    const txBase64 = swapResponse.swapTransaction;
    const txBuffer = Buffer.from(txBase64, "base64");
    const transaction = VersionedTransaction.deserialize(txBuffer);

    const signed = await wallet.wallets[0]?.signTransaction!(transaction);
    const serializedTx = signed.serialize();

    const signature = await connection.sendRawTransaction(serializedTx, {
      maxRetries: 3,
      skipPreflight: true,
    });

    console.log("Signature:", signature);
    // Create a loading toast with an ID we can reference later
    const loadingToastId = toast.loading("Confirming transaction...");

    const confirmation = await connection.confirmTransaction(
      signature,
      "finalized"
    );

    // Dismiss the loading toast
    toast.dismiss(loadingToastId);

    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
      );
    }

    console.log(`✅ Success: https://solscan.io/tx/${signature}`);
    
    // Show success toast
    toast.success("Swap completed successfully!");
    
    // Call onSuccess callback with the signature
    if (onSuccess) {
      onSuccess(signature);
    }

    return signature;
  } catch (err: any) {
    console.error("Swap Failed:", err);

    // Dismiss any loading toasts that might be active
    toast.dismiss();

    // Show appropriate error toast based on error type
    if (err.message && err.message.includes("Custom")) {
      toast.error("Swap failed due to price movement. Try increasing slippage tolerance.");
    } else if (err.message && err.message.includes("Blockhash")) {
      toast.error("Transaction expired. Please try again.");
    } else if (err.message && err.message.includes("insufficient funds")) {
      toast.error("Insufficient funds to complete this transaction.");
    } else {
      toast.error(err.message || "Swap failed. Please try again.");
    }
    
    return null;
  } finally {
    setSwapLoading(false);
  }
}
