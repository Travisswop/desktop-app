'use client';
import { PrivyProvider as Privy } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { useState, useEffect, useMemo, useRef } from 'react';

interface SolanaConfig {
  rpcs: {
    'solana:mainnet': {
      rpc: any;
      rpcSubscriptions: any;
    };
  };
}

let cachedSolanaConnectors: ReturnType<
  typeof toSolanaWalletConnectors
> | null = null;

const getSolanaConnectors = () => {
  if (!cachedSolanaConnectors) {
    cachedSolanaConnectors = toSolanaWalletConnectors();
  }

  return cachedSolanaConnectors;
};

export default function PrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [solanaConnectors, setSolanaConnectors] =
    useState<any>(undefined);
  const [solanaConfig, setSolanaConfig] = useState<
    SolanaConfig | undefined
  >(undefined);
  const [privyConfigReady, setPrivyConfigReady] = useState(false);
  const initRef = useRef(false);

  const isProduction = process.env.NODE_ENV === 'production';
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // Initialize Solana config only on client side after mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    setSolanaConnectors(getSolanaConnectors());

    // Initialize Solana RPC config
    const initSolanaConfig = async () => {
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
      const socketUrl = process.env.NEXT_PUBLIC_SOLANA_SOCKET_URL;

      if (!rpcUrl || !socketUrl) {
        console.warn(
          'Solana RPC URLs not configured, using default Privy config',
        );
        setPrivyConfigReady(true);
        return;
      }

      try {
        // Dynamic import to avoid SSR issues
        const { createSolanaRpc, createSolanaRpcSubscriptions } =
          await import('@solana/kit');

        setSolanaConfig({
          rpcs: {
            'solana:mainnet': {
              rpc: createSolanaRpc(rpcUrl),
              rpcSubscriptions:
                createSolanaRpcSubscriptions(socketUrl),
            },
          },
        });
        setPrivyConfigReady(true);
      } catch (error) {
        console.error('Failed to initialize Solana config:', error);
        setPrivyConfigReady(true);
      }
    };

    initSolanaConfig();
  }, []);

  const privyConfig = useMemo(
    () => ({
      embeddedWallets: {
        ethereum: {
          createOnLogin: 'users-without-wallets' as const,
        },
        solana: {
          createOnLogin: 'users-without-wallets' as const,
        },
      },
      loginMethods: ['wallet', 'email', 'sms'] as const,
      appearance: {
        walletChainType: 'ethereum-and-solana' as const,
        showWalletLoginFirst: true,
        theme: 'light' as const,
        accentColor: '#000000',
      },
      ...(solanaConnectors && {
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
      }),
      ...(solanaConfig && {
        solana: solanaConfig,
      }),
      ...(isProduction && {
        defaultChainId: 1,
      }),
    }),
    [isProduction, solanaConfig, solanaConnectors],
  );

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

  if (!privyConfigReady) {
    return null;
  }

  return (
    <Privy
      appId={appId}
      config={privyConfig}
    >
      {children}
    </Privy>
  );
}
