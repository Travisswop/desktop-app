import {
  VersionedTransaction,
  Connection,
  PublicKey,
  TransactionMessage,
} from "@solana/web3.js";
import toast from "react-hot-toast";
// import {
//   ASSOCIATED_TOKEN_PROGRAM_ID,
//   TOKEN_PROGRAM_ID,
//   getAssociatedTokenAddress,
//   createAssociatedTokenAccountIdempotent

// } from "@solana/spl-token";

// Function to get or create the associated token address (ATA)
// async function getOrCreateATA(
//   mint: PublicKey,
//   solanaAddress: string,
//   adminFeeOwner: PublicKey,
//   connection: Connection,
//   wallet: any
// ): Promise<PublicKey> {
//   const owner = new PublicKey('FG4n7rVKzYyM9QGjUu6Mae8JGmQYJjsi6FJvmJHeM9HP');

//   const ata = await Token.getAssociatedTokenAddress(
//     mint,
//     owner,
//     false,
//     TOKEN_PROGRAM_ID,
//     ASSOCIATED_TOKEN_PROGRAM_ID,
//   );
//   console.log("ata : ", ata.toBase58());

//   const accountInfo = await connection.getAccountInfo(ata);
//   console.log("accountInfo : ", accountInfo);

//   if (accountInfo !== null) {
//     console.log(`ATA exists: ${ata.toBase58()}`);
//     return ata;
//   }

//   return await toast.promise(
//     (async () => {
//       console.log(`Creating ATA for ${mint.toBase58()}...`);

//       const walletPublicKeyString = wallet.wallets[0]?.address;
//       const walletPublicKey = new PublicKey(walletPublicKeyString);
//       if (!walletPublicKey) {
//         throw new Error("Wallet public key not found");
//       }

//       const createIx = createAssociatedTokenAccountIdempotent(
//         connection,
//         walletPublicKey,
//         mint,
//         owner,
//         ata,
//         TOKEN_PROGRAM_ID,
//         ASSOCIATED_TOKEN_PROGRAM_ID,
//       );

//       const blockhashInfo = await connection.getLatestBlockhash();
//       const messageV0 = new TransactionMessage({
//         payerKey: walletPublicKey,
//         recentBlockhash: blockhashInfo.blockhash,
//         instructions: [createIx],
//       }).compileToV0Message();

//       const transaction = new VersionedTransaction(messageV0);

//       const signedTx = await wallet.wallets[0]?.signTransaction(transaction);
//       if (!signedTx) {
//         throw new Error("Failed to sign transaction");
//       }

//       const signature = await connection.sendRawTransaction(signedTx.serialize(), {
//         maxRetries: 3,
//         skipPreflight: true,
//       });

//       await connection.confirmTransaction(signature, "finalized");
//       console.log(`Successfully created ATA: ${ata.toBase58()}`);
//       return ata;
//     })(),
//     {
//       loading: "Creating associated token account...",
//       success: "ATA created successfully",
//       error: "Failed to create ATA",
//     }
//   );
// }



// Main swap handler
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
  // const adminFeeOwner = new PublicKey("FG4n7rVKzYyM9QGjUu6Mae8JGmQYJjsi6FJvmJHeM9HP");

  setSwapLoading(true);
  try {
    // const inputMint = new PublicKey(quote.inputMint);
    // const outputMint = new PublicKey(quote.outputMint);
    // const feeAccount = await getOrCreateATA(
    //   outputMint,
    //   solanaAddress,
    //   adminFeeOwner,
    //   connection,
    //   wallet
    // );


    // console.log("feeAccount from handleSwap: ", feeAccount);

    const res = await fetch("https://lite-api.jup.ag/swap/v1/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: solanaAddress,
        // feeAccount: feeAccount.toBase58(),
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

    const loadingToastId = toast.loading("Confirming transaction...");
    const confirmation = await connection.confirmTransaction(
      signature,
      "finalized"
    );
    toast.dismiss(loadingToastId);

    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
      );
    }

    toast.success("Swap completed successfully!");
    onSuccess?.(signature);

    return signature;
  } catch (err: any) {
    console.error("Swap Failed:", err);
    toast.dismiss();

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
