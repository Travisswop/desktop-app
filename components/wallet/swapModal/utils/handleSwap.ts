import {
  VersionedTransaction,
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import toast from 'react-hot-toast';
import { getOrCreateFeeTokenAccount } from './tokenAccountUtils';
import bs58 from 'bs58';

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
    // Validate the quote object
    if (!quote.inputMint) {
      throw new Error('Quote is missing inputMint');
    }

    // Get the input mint from the quote
    console.log('Input mint from quote:', quote.inputMint);
    let inputMint: PublicKey;

    try {
      inputMint = new PublicKey(quote.inputMint);
      console.log(
        'Converted input mint to PublicKey:',
        inputMint.toString()
      );
    } catch (err) {
      console.error('Invalid input mint format:', err);
      throw new Error(
        `Failed to create PublicKey from input mint: ${quote.inputMint}`
      );
    }

    let feeAccount: PublicKey | undefined;

    try {
      // Get private key from env variable for creating token accounts if needed
      const feePayerPrivateKey =
        process.env.NEXT_PUBLIC_FEE_PAYER_PRIVATE_KEY;

      if (!feePayerPrivateKey) {
        console.warn(
          'Fee payer private key not found in environment variables'
        );
        console.log(
          'Will continue without creating fee accounts if needed'
        );
      } else {
        try {
          // Create a keypair from the private key
          const feePayerKeypair = Keypair.fromSecretKey(
            bs58.decode(feePayerPrivateKey)
          );

          // Get or create the fee token account for the input mint
          feeAccount = await getOrCreateFeeTokenAccount(
            connection,
            inputMint,
            feePayerKeypair
          );

          console.log('Using fee account:', feeAccount.toString());
        } catch (keyError) {
          console.error(
            'Error creating keypair from private key:',
            keyError
          );
          console.log('Will continue swap without fee collection');
        }
      }
    } catch (feeAccountError) {
      console.error('Error setting up fee account:', feeAccountError);
      console.log('Will continue swap without fee collection');
    }

    // Prepare the swap request body
    const swapRequestBody: any = {
      quoteResponse: quote,
      userPublicKey: solanaAddress,
      wrapUnwrapSOL: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    };

    // Add fee account if available
    if (feeAccount) {
      swapRequestBody.feeAccount = feeAccount.toString();
      console.log(
        'Fee collection enabled with account:',
        feeAccount.toString()
      );
    } else {
      console.log(
        'Fee collection disabled - continuing without fees'
      );
    }

    // Log the swap request
    console.log(
      'Swap request body:',
      JSON.stringify(swapRequestBody, null, 2)
    );

    const res = await fetch('https://lite-api.jup.ag/swap/v1/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(swapRequestBody),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Swap API error (${res.status}): ${errorText}`);
    }

    const swapResponse = await res.json();

    if (!swapResponse.swapTransaction) {
      throw new Error(
        `Failed to create swap transaction: ${JSON.stringify(
          swapResponse
        )}`
      );
    }

    const txBase64 = swapResponse.swapTransaction;
    const txBuffer = Buffer.from(txBase64, 'base64');
    const transaction = VersionedTransaction.deserialize(txBuffer);

    const signed = await wallet.wallets[0]?.signTransaction!(
      transaction
    );
    const serializedTx = signed.serialize();

    const signature = await connection.sendRawTransaction(
      serializedTx,
      {
        maxRetries: 3,
        skipPreflight: true,
      }
    );

    console.log('Signature:', signature);
    // Create a loading toast with an ID we can reference later
    const loadingToastId = toast.loading('Confirming transaction...');

    const confirmation = await connection.confirmTransaction(
      signature,
      'finalized'
    );
    toast.dismiss(loadingToastId);

    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed: ${JSON.stringify(
          confirmation.value.err
        )}`
      );
    }

    console.log(`✅ Success: https://solscan.io/tx/${signature}`);

    // Show success toast
    toast.success('Swap completed successfully!');

    // Call onSuccess callback with the signature
    if (onSuccess) {
      onSuccess(signature);
    }

    return signature;
  } catch (err: any) {
    console.error('Swap Failed:', err);

    // Dismiss any loading toasts that might be active
    toast.dismiss();

    // Show appropriate error toast based on error type
    if (err.message && err.message.includes('Custom')) {
      toast.error(
        'Swap failed due to price movement. Try increasing slippage tolerance.'
      );
    } else if (err.message && err.message.includes('Blockhash')) {
      toast.error('Transaction expired. Please try again.');
    } else if (
      err.message &&
      err.message.includes('insufficient funds')
    ) {
      toast.error('Insufficient funds to complete this transaction.');
    } else {
      toast.error(err.message || 'Swap failed. Please try again.');
    }

    return null;
  } finally {
    setSwapLoading(false);
  }
}
