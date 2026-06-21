'use client';
import { PrivyProvider as Privy } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { useState, useEffect, useMemo, useRef } from 'react';
import { installClipboardWriteFallback } from '@/lib/clipboard';
import { solanaWalletConnectorOptions } from '@/lib/privy/solanaWalletConnectors';

interface SolanaConfig {
  rpcs: {
    'solana:mainnet': {
      rpc: any;
      rpcSubscriptions: any;
    };
  };
}

export default function PrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [solanaConfig, setSolanaConfig] = useState<
    SolanaConfig | undefined
  >(undefined);
  const [localOriginRedirectUrl, setLocalOriginRedirectUrl] = useState<
    string | null
  >(null);
  const initRef = useRef(false);

  const isProduction = process.env.NODE_ENV === 'production';
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const loginMethods: Array<'passkey' | 'email' | 'sms'> = [
    'passkey',
    'email',
    'sms',
  ];
  const solanaWalletConnectors = useMemo(
    () => toSolanaWalletConnectors(solanaWalletConnectorOptions),
    [],
  );

  useEffect(() => {
    installClipboardWriteFallback();
  }, []);

  useEffect(() => {
    if (
      window.location.hostname !== '127.0.0.1' &&
      window.location.hostname !== '::1'
    ) {
      return;
    }

    const localhostUrl = new URL(window.location.href);
    localhostUrl.hostname = 'localhost';
    const targetUrl = localhostUrl.toString();

    setLocalOriginRedirectUrl(targetUrl);
    window.location.replace(targetUrl);
  }, []);

  // Initialize Solana config only on client side after mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // Initialize Solana RPC config
    const initSolanaConfig = async () => {
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
      const socketUrl = process.env.NEXT_PUBLIC_SOLANA_SOCKET_URL;

      if (!rpcUrl || !socketUrl) {
        console.warn(
          'Solana RPC URLs not configured, using default Privy config',
        );
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
      } catch (error) {
        console.error('Failed to initialize Solana config:', error);
      }
    };

    initSolanaConfig();
  }, []);

  if (localOriginRedirectUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F7F7F9] text-sm text-gray-600">
        Redirecting to localhost...
      </div>
    );
  }

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
          // Suppress Privy's own "Confirm transaction / Approve" popup for
          // embedded-wallet signing. The app shows its own confirmation UI
          // (e.g. SendConfirmation) before submitting, so the extra Privy
          // prompt is redundant. Applies to all embedded-wallet actions
          // (sends, swaps, perps approveAgent, NFT transfers).
          // NOTE: if the popup still appears, disable "enforce wallet UIs"
          // in the Privy dashboard (Wallets settings) — it can be enforced
          // server-side.
          showWalletUIs: false,
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
        loginMethods,
        externalWallets: {
          disableAllExternalWallets: true,
          solana: {
            connectors: solanaWalletConnectors,
          },
        },
        appearance: {
          walletChainType: 'ethereum-and-solana',
          showWalletLoginFirst: false,
          theme: 'light',
          accentColor: '#000000',
        },
        ...(solanaConfig && {
          solana: solanaConfig,
        }),
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
