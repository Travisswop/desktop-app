'use client';

import { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';

// import LiFiModal from "./LiFiModal";
import SwapTokenModal from './SwapTokenModal';

interface LiFiPrivyWrapperProps {
  config: any;
  tokens?: any;
  onSwapComplete?: () => void;
}
export default function LiFiPrivyWrapper({
  tokens,
  config,
  onSwapComplete,
}: LiFiPrivyWrapperProps) {
  const { authenticated, ready, login } = usePrivy();
  const { wallets } = useWallets();
  const { wallets: solWallets } = useSolanaWallets();
  const [isReady, setIsReady] = useState(false);

  // Wait for Privy to be ready and authenticated
  useEffect(() => {
    if (ready && authenticated) {
      setIsReady(true);

      // Log wallet status
      console.log('LiFiPrivyWrapper ready with wallets:', {
        ethWallets: wallets.length,
        solWallets: solWallets?.length || 0,
        authenticated,
        ready,
      });
    }
  }, [ready, authenticated, wallets, solWallets]);

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
      <div className="p-4 text-center">
        Loading wallet integration...
      </div>
    );
  }

  return (
    // <LiFiModal
    //     config={config}
    //     onSwapComplete={onSwapComplete}
    // />
    <SwapTokenModal tokens={tokens} />
  );
}
