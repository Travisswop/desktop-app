'use client';

import { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';

// import LiFiModal from "./LiFiModal";
import SwapTokenModal from './SwapTokenModal';

interface LiFiPrivyWrapperProps {
  config: any;
  tokens?: any;
  preferredSolanaWalletAddress?: string;
  onSwapComplete?: () => void;
  onSwapReceiptDismiss?: () => void;
}
export default function LiFiPrivyWrapper({
  tokens,
  preferredSolanaWalletAddress,
  onSwapComplete,
  onSwapReceiptDismiss,
}: LiFiPrivyWrapperProps) {
  const { authenticated, ready, login } = usePrivy();
  const { wallets } = useWallets();
  const { wallets: solWallets } = useSolanaWallets();
  const [isReady, setIsReady] = useState(false);
  const [connectionSlow, setConnectionSlow] = useState(false);
  // Bumping this restarts the wait window without reloading the page.
  const [retryNonce, setRetryNonce] = useState(0);

  // Wait for Privy to be ready and authenticated
  useEffect(() => {
    if (ready && authenticated) {
      setIsReady(true);
    }
  }, [ready, authenticated, wallets, solWallets]);

  // If we're still waiting after a few seconds, it's most likely a network
  // hiccup rather than a normal load — surface a friendly heads-up.
  useEffect(() => {
    if (isReady) {
      setConnectionSlow(false);
      return;
    }
    setConnectionSlow(false);
    const timer = setTimeout(() => setConnectionSlow(true), 6000);
    return () => clearTimeout(timer);
  }, [isReady, retryNonce]);

  // Soft retry: re-arm the wait so Privy can reconnect in the background,
  // no full page reload.
  const handleRetry = () => {
    if (!authenticated) {
      login();
      return;
    }
    setRetryNonce((n) => n + 1);
  };

  // If not authenticated, show login button
  if (!authenticated && ready) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center">
        <p className="mb-4">
          You need to connect your wallet to use the swap feature
        </p>
        <button
          onClick={() => login()}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <span
          className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500"
          aria-hidden="true"
        />
        {connectionSlow ? (
          <>
            <p className="text-sm font-medium text-gray-800">
              Having trouble reaching your wallet
            </p>
            <p className="max-w-xs text-xs text-gray-500">
              This is usually a slow or dropped internet connection. Please
              check your network — we&apos;ll reconnect automatically.
            </p>
            <button
              onClick={handleRetry}
              className="mt-1 rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Retry
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-600">Connecting your wallet…</p>
        )}
      </div>
    );
  }

  return (
    <SwapTokenModal
      tokens={tokens}
      preferredSolanaWalletAddress={preferredSolanaWalletAddress}
      onSwapComplete={() => {
        onSwapComplete?.();
      }}
      onSwapReceiptDismiss={onSwapReceiptDismiss}
    />
  );
}
