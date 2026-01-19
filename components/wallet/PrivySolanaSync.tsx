'use client';

import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect } from 'react';

export const PrivySolanaSync = () => {
    const { wallets: solWallets } = useSolanaWallets();
    const { wallet, connected, publicKey, connect } = useWallet();

    useEffect(() => {
        const activeWallet = solWallets && solWallets.length > 0 ? solWallets[0] : null;

        // Auto-connect when Privy wallet is available but adapter isn't connected
        if (activeWallet && !connected && wallet) {
            console.log('PrivySolanaSync: Auto-connecting Privy wallet adapter');
            connect().catch(console.error);
        }

        // Debug logging
        console.log('PrivySolanaSync state:', {
            privyWallet: activeWallet?.address,
            adapterConnected: connected,
            adapterPublicKey: publicKey?.toBase58(),
            adapterWallet: wallet?.adapter?.name,
            readyState: wallet?.readyState
        });
    }, [solWallets, connected, publicKey, wallet, connect]);

    return null;
};