'use client';

import { WagmiProvider } from '@privy-io/wagmi';
import {
  QueryClientProvider,
  QueryClient,
} from '@tanstack/react-query';
import type { FC, PropsWithChildren } from 'react';
import { type Chain, mainnet } from 'viem/chains';
import { SolanaProvider } from './SolanaProvider';
import { createConfig } from '@privy-io/wagmi';
import { http } from 'viem';

// Create a wagmi config
const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
});

// Create a query client
const queryClient = new QueryClient();

// Inner component that uses hooks that require QueryClientProvider
const InnerWalletProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <SolanaProvider>
      <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
        {children}
      </WagmiProvider>
    </SolanaProvider>
  );
};

// Main wrapper that provides QueryClient
export const WalletProvider: FC<PropsWithChildren> = ({
  children,
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <InnerWalletProvider>{children}</InnerWalletProvider>
    </QueryClientProvider>
  );
};
