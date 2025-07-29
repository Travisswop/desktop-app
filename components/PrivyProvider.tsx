'use client';

import { PrivyProvider as Privy } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

const solanaConnectors = toSolanaWalletConnectors();

export default function PrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Add some debugging
  console.log('Privy App ID:', process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  console.log('Privy Client ID:', process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID);
  console.log('Current origin:', typeof window !== 'undefined' ? window.location.origin : 'server');

  return (
    <Privy
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID as string}
      config={{
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
        loginMethods: ['wallet', 'email', 'sms'],
        appearance: {
          walletChainType: 'ethereum-and-solana',
          showWalletLoginFirst: true,
        },
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
        solanaClusters: [
          {
            name: 'mainnet-beta',
            rpcUrl: 'https://chaotic-restless-putty.solana-mainnet.quiknode.pro/',
          },
        ],
      }}
    >
      {children}
    </Privy>
  );
}