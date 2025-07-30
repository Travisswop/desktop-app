'use client';

import { PrivyProvider as Privy } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

const solanaConnectors = toSolanaWalletConnectors();

export default function PrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enhanced debugging for production
  const isProduction = process.env.NODE_ENV === 'production';
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // Validate configuration
  if (!appId) {
    console.error('❌ NEXT_PUBLIC_PRIVY_APP_ID is not set!');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-red-500 mb-4">
            Configuration Error
          </h2>
          <p className="text-gray-700">
            NEXT_PUBLIC_PRIVY_APP_ID environment variable is not set.
            Please check your environment configuration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Privy
      appId={appId}
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
          theme: 'light',
          accentColor: '#000000',
        },
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
        solanaClusters: [
          {
            name: 'mainnet-beta',
            rpcUrl:
              process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_URL ||
              'https://chaotic-restless-putty.solana-mainnet.quiknode.pro/',
          },
        ],
        // Production-specific settings
        ...(isProduction && {
          defaultChainId: 1, // Ethereum mainnet for production
        }),
      }}
    >
      {children}
    </Privy>
  );
}
