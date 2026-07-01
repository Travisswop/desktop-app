import { useCallback, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  useSignTransaction,
  useWallets as useSolanaWallets,
} from '@privy-io/react-auth/solana';
import { Connection, Transaction } from '@solana/web3.js';
import { sponsorSolanaTransaction } from '@/actions/sponsorSolanaTransaction';
import { useUser } from '@/lib/UserContext';

export const TOKEN_ACCOUNT_RENT_EXEMPT = 0.00203928;
export const TRANSACTION_FEE_BUFFER = 0.001;
export const RENT_PER_TOKEN_ACCOUNT =
  TOKEN_ACCOUNT_RENT_EXEMPT + TRANSACTION_FEE_BUFFER;

export interface RedeemLinkToken {
  name: string;
  symbol: string;
  address?: string | null;
  decimals: number;
  logo?: string;
  logoURI?: string;
  isNative?: boolean;
}

export interface CreateRedeemLinkInput {
  token: RedeemLinkToken;
  totalAmount: number;
  maxWallets: number;
  tokensPerWallet: number;
}

export type RedeemLinkStatus = 'idle' | 'processing' | 'success' | 'error';

interface UseCreateRedeemLinkReturn {
  createLink: (input: CreateRedeemLinkInput) => Promise<void>;
  status: RedeemLinkStatus;
  redeemLink: string;
  error: string;
  reset: () => void;
}

// Pull the create-redemption-pool flow out of <RedeemModal> so other surfaces
// (the in-Send "Send via link" tab) can reuse the same path without rendering
// a second modal. The on-chain branching (Privy embedded vs external wallet)
// is identical to the original handler.
export function useCreateRedeemLink(): UseCreateRedeemLinkReturn {
  const { user } = usePrivy();
  const { accessToken } = useUser();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { signTransaction } = useSignTransaction();

  const [status, setStatus] = useState<RedeemLinkStatus>('idle');
  const [redeemLink, setRedeemLink] = useState('');
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    setStatus('idle');
    setRedeemLink('');
    setError('');
  }, []);

  const deleteRedeemLink = async (privyUserId: string, poolId: string) => {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/wallet/deleteRedeemLink`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyUserId, poolId }),
      },
    );
  };

  const createLink = useCallback(
    async ({
      token,
      totalAmount,
      maxWallets,
      tokensPerWallet,
    }: CreateRedeemLinkInput) => {
      setStatus('processing');
      setError('');
      setRedeemLink('');

      const solanaWallet = solanaWallets[0];
      if (!solanaWallet?.address) {
        setStatus('error');
        setError('Please connect a Solana wallet to create a redeem link.');
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = solanaWallet as any;
      const isPrivyEmbedded = w.walletClientType === 'privy';
      const walletId = isPrivyEmbedded ? (w.id as string) : undefined;

      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
          'https://api.devnet.solana.com',
      );

      let poolId: string | null = null;
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/wallet/createRedeemptionPool`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              privyUserId: user?.id,
              tokenName: token.name,
              tokenMint: token.address,
              tokenSymbol: token.symbol,
              tokenLogo: token.logoURI ?? token.logo,
              totalAmount,
              tokenDecimals: token.decimals,
              tokensPerWallet,
              maxWallets,
              creator: solanaWallet.address,
              isNative: token.isNative,
              walletId,
            }),
          },
        );

        if (!response.ok) {
          const errBody = await response.json().catch(() => null);
          throw new Error(
            errBody?.message || 'Failed to generate redeem link',
          );
        }

        const { data } = await response.json();
        poolId = data.poolId;

        // Privy embedded — backend already signed + sent. Done.
        if (!data.serializedTransaction) {
          setRedeemLink(`https://redeem.swopme.app/${data.poolId}`);
          setStatus('success');
          return;
        }

        // Prefer sponsorship for Privy embedded wallets even if an older backend
        // path returns the setup transaction to the client.
        const combinedTx = Transaction.from(
          Buffer.from(data.serializedTransaction, 'base64'),
        );
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash('finalized');
        combinedTx.recentBlockhash = blockhash;

        const serializedTx = new Uint8Array(
          combinedTx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          }),
        );
        const serializedTxBase64 = Buffer.from(serializedTx).toString('base64');

        if (walletId) {
          const sponsoredResult = await sponsorSolanaTransaction(
            serializedTxBase64,
            walletId,
            accessToken,
          );
          if (sponsoredResult.success) {
            setRedeemLink(`https://redeem.swopme.app/${data.poolId}`);
            setStatus('success');
            return;
          }
          console.warn(
            '[redeem-link] Sponsored setup failed; falling back to wallet signer.',
            sponsoredResult.error,
          );
        }

        // External wallet or sponsorship fallback — sign + broadcast client-side.
        const { signedTransaction: signedTx } = await signTransaction({
          transaction: serializedTx,
          wallet: solanaWallet,
        });
        const signature = await connection.sendRawTransaction(signedTx);
        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        });

        setRedeemLink(`https://redeem.swopme.app/${data.poolId}`);
        setStatus('success');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (poolId) {
          await deleteRedeemLink(user?.id || '', poolId).catch(() => {});
        }

        let message = 'Failed to set up token holding account';
        const logs: string[] = Array.isArray(e?.logs) ? e.logs : [];
        if (
          logs.some(
            (l) =>
              l.includes('insufficient lamports') ||
              l.includes('insufficient funds for rent'),
          )
        ) {
          // Reached when sponsored setup was refused (embedded wallets fall
          // back to the local signer) or for external wallets — either way
          // the signer itself could not pay the account rent.
          message =
            'Gas sponsorship could not cover this redeem link setup, and this wallet has no SOL to pay the account rent itself. Try again in a moment, or add a small amount of SOL.';
        } else if (
          e?.message?.includes('insufficient lamports') ||
          e?.message?.includes('insufficient funds for rent')
        ) {
          message =
            'Gas sponsorship could not cover this redeem link setup, and this wallet has no SOL to pay the account rent itself. Try again in a moment, or add a small amount of SOL.';
        } else if (logs.some((l) => l.includes('insufficient funds'))) {
          message =
            'Insufficient token balance. The amount exceeds your wallet balance.';
        } else if (e?.message) {
          message = e.message;
        }

        setStatus('error');
        setError(message);
      }
    },
    [solanaWallets, signTransaction, user?.id, accessToken],
  );

  return { createLink, status, redeemLink, error, reset };
}
