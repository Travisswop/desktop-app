'use client';

import type { WalletName } from '@solana/wallet-adapter-base';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  ConnectionProvider,
  useWallet,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { clusterApiUrl } from '@solana/web3.js';
import mitt, { type Emitter } from 'mitt';
import {
  type FC,
  type PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { PrivyWalletAdapter } from './wallet/PrivyWalletAdapter';

const endpoint = clusterApiUrl(WalletAdapterNetwork.Mainnet);

export const SolanaConnectedWalletKey = 'li.fi-widget-recent-wallet';

type WalletEvents = {
  connect: string;
  disconnect: unknown;
};

export const emitter: Emitter<WalletEvents> = mitt<WalletEvents>();

const SolanaHandler: FC = () => {
  const { disconnect, select, wallet, connected } = useWallet();
  const { wallets: solWallets } = useSolanaWallets();

  useEffect(() => {
    const activePrivyWallet =
      solWallets && solWallets.length > 0 ? solWallets[0] : null;

    // Update the Privy adapter with the current wallet
    if (wallet instanceof PrivyWalletAdapter) {
      wallet.updateWallet(activePrivyWallet);
    }

    // Auto-select Privy wallet if available and not already connected
    if (
      activePrivyWallet &&
      !connected &&
      (!wallet || wallet instanceof PrivyWalletAdapter === false)
    ) {
      select('Privy' as WalletName);
    }
  }, [solWallets, wallet, connected, select, disconnect]);

  useEffect(() => {
    emitter.on('connect', async (connectorName) => {
      if (connectorName === 'privy') {
        select('Privy' as WalletName);
      }
    });

    emitter.on('disconnect', async () => {
      await disconnect();
    });

    return () => emitter.all.clear();
  }, [disconnect, select]);

  return null;
};

const SolanaProviderInner: FC<PropsWithChildren> = ({
  children,
}) => {
  const { wallets: solWallets } = useSolanaWallets();
  const activeWallet =
    solWallets && solWallets.length > 0 ? solWallets[0] : null;

  const wallets = useMemo(() => {
    if (!activeWallet) return [];

    return [
      new PrivyWalletAdapter({
        wallet: activeWallet,
      }),
    ];
  }, [activeWallet]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        localStorageKey={SolanaConnectedWalletKey}
        autoConnect={wallets.length > 0}
      >
        <SolanaHandler />
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
};

export const SolanaProvider: FC<PropsWithChildren> = ({ children }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <>{children}</>;
  }

  return <SolanaProviderInner>{children}</SolanaProviderInner>;
};
