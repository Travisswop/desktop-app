import { NextResponse } from 'next/server';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';
import { createRedemptionPool } from '@/utils/db';
import bs58 from 'bs58';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';

// const connection = new Connection(
//   process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_URL ||
//     'https://api.devnet.solana.com'
// );

const connection = new Connection(clusterApiUrl('devnet'));

export async function POST(request: Request) {
  try {
    const {
      privyUserId,
      tokenName,
      tokenSymbol,
      tokenLogo,
      tokenMint,
      amount,
      tokenDecimals,
      tokensPerWallet,
      maxWallets,
      creator,
      isNative,
    } = await request.json();

    if (
      !privyUserId ||
      !tokenName ||
      !tokenSymbol ||
      !tokenLogo ||
      !amount ||
      !creator ||
      !maxWallets
    ) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Generate a new temporary account
    const tempAccount = Keypair.generate();

    // Store the private key in base58 format
    const privateKeyBase58 = bs58.encode(tempAccount.secretKey);

    // Check if this is a native SOL transfer
    const isNativeSOL = isNative;

    // Create a transaction to fund the temporary account with SOL for fees
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(creator),
        toPubkey: tempAccount.publicKey,
        lamports: LAMPORTS_PER_SOL / 100, // 0.001 SOL for fees
      })
    );

    if (!isNativeSOL) {
      try {
        // For SPL tokens, create the associated token account for the temporary account
        const mintPubkey = new PublicKey(tokenMint);
        const tempTokenAccount = await getAssociatedTokenAddress(
          mintPubkey,
          tempAccount.publicKey,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Add instruction to create the token account
        transaction.add(
          createAssociatedTokenAccountInstruction(
            new PublicKey(creator), // payer
            tempTokenAccount,
            tempAccount.publicKey,
            mintPubkey,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );

        // Get latest blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = new PublicKey(creator);

        // Return the transaction for the frontend to sign and send
        const serializedTransaction = transaction
          .serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          })
          .toString('base64');

        // Store in database with the private key
        const poolId = await createRedemptionPool(
          privyUserId,
          amount,
          tokenName,
          tokenSymbol,
          tokenLogo,
          tokenMint,
          privateKeyBase58,
          tokenDecimals,
          tokensPerWallet,
          maxWallets
        );

        console.log('poolId', poolId);

        // Generate the redemption link
        const redeemLink = `${process.env.NEXT_PUBLIC_APP_URL}/redeem/${poolId}`;

        return NextResponse.json({
          success: true,
          redeemLink,
          tempAddress: tempAccount.publicKey.toBase58(),
          setupTransaction: serializedTransaction,
          requiresSetup: true,
        });
      } catch (error: any) {
        console.error('Error creating token account:', error);
        return NextResponse.json(
          {
            success: false,
            message:
              'Failed to create token account: ' + error.message,
          },
          { status: 500 }
        );
      }
    }

    // For SOL, just create the pool and return the funding transaction
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(creator);

    const serializedTransaction = transaction
      .serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })
      .toString('base64');

    const poolId = await createRedemptionPool(
      privyUserId,
      amount,
      tokenName,
      tokenSymbol,
      tokenLogo,
      tokenMint,
      privateKeyBase58,
      tokenDecimals,
      tokensPerWallet,
      maxWallets
    );

    // Generate the redemption link
    const redeemLink = `${process.env.NEXT_PUBLIC_APP_URL}/redeem/${poolId}`;

    return NextResponse.json({
      success: true,
      redeemLink,
      tempAddress: tempAccount.publicKey.toBase58(),
      setupTransaction: serializedTransaction,
      requiresSetup: true,
    });
  } catch (error: any) {
    console.error('Error creating redemption link:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to create redemption link',
      },
      { status: 500 }
    );
  }
}
