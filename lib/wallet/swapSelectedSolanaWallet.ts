import { ConnectedStandardSolanaWallet } from '@privy-io/js-sdk-core';
import {
  resolveSolanaSigningWallet,
  type SolanaAddressLike,
  type SolanaStandardWalletLike,
} from '@/lib/wallet/solanaSigningWallet';

type SwapSolanaWalletLike = SolanaAddressLike;

type SwapSolanaStandardWalletLike =
  SolanaStandardWalletLike<SolanaAddressLike> & {
    id?: string;
    name?: string;
    features?: Record<string, unknown>;
  };

export const resolveSwapSelectedSolanaWallet = ({
  connectedWallets,
  standardWallets,
  preferredAddress,
}: {
  connectedWallets: readonly SwapSolanaWalletLike[];
  standardWallets: readonly SwapSolanaStandardWalletLike[];
  preferredAddress?: string | null;
}) =>
  resolveSolanaSigningWallet({
    connectedWallets,
    standardWallets,
    preferredAddress,
    makeConnectedStandardWallet: (wallet, account) =>
      new ConnectedStandardSolanaWallet({
        wallet: wallet as any,
        account: account as any,
      }),
  }) as ConnectedStandardSolanaWallet | SwapSolanaWalletLike | undefined;
