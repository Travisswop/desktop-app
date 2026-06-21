'use client';

import { WagmiProvider } from '@privy-io/wagmi';
import {
  QueryClientProvider,
  QueryClient,
} from '@tanstack/react-query';
import type { FC, PropsWithChildren } from 'react';
import { mainnet, polygon, base, arbitrum } from 'viem/chains';
import { SolanaProvider } from './SolanaProvider';
import { createConfig } from '@privy-io/wagmi';
import { http } from 'viem';
import { ALCHEMY_RPC_URLS } from '@/types/config';

// Create a wagmi config with all supported EVM chains.
// This config is used by @lifi/wallet-management to sign transactions
// (including EIP-2612 permits). ALL chains that LiFi can route through
// must be listed here with the correct chainId so typed-data signatures
// include the right domain separator.
const wagmiConfig = createConfig({
  chains: [mainnet, polygon, base, arbitrum],
  transports: {
    [mainnet.id]:  http(ALCHEMY_RPC_URLS.ETHEREUM),
    [polygon.id]:  http(ALCHEMY_RPC_URLS.POLYGON),
    [base.id]:     http(ALCHEMY_RPC_URLS.BASE),
    [arbitrum.id]: http(ALCHEMY_RPC_URLS.ARBITRUM),
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
