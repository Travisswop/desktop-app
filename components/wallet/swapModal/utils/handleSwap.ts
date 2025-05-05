import { VersionedTransaction, Connection } from "@solana/web3.js";

export async function handleSwap({
  quote,
  solanaAddress,
  wallet,
  connection,
  setLoading,
}: {
  quote: any;
  solanaAddress: string;
  wallet: any;
  connection: Connection;
  setLoading: (loading: boolean) => void;
}) {
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

    const signed = await wallet.wallets[0]?.signTransaction!(transaction);
    const serializedTx = signed.serialize();

    console.log('tx and signature:', transaction , signed, serializedTx);
    console.log("Transaction:", transaction);

    const signature = await connection.sendRawTransaction(serializedTx, {
      maxRetries: 2,
      skipPreflight: true,
    });

    console.log("Signature:", signature);

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
}
