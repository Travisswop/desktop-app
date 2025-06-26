'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
} from 'react';
import { Client } from '@xmtp/xmtp-js';
import { useWallets } from '@privy-io/react-auth';
import { usePrivyUser } from '@/lib/hooks/usePrivyUser';
import { usePathname } from 'next/navigation';

interface XmtpContextType {
  client: Client | null;
  isLoading: boolean;
  error: Error | null;
}

const XmtpContext = createContext<XmtpContextType>({
  client: null,
  isLoading: false,
  error: null,
});

export const XmtpProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { wallets } = useWallets();
  const { user } = usePrivyUser();
  const [xmtpClient, setXmtpClient] = useState<Client | null>(null);
  const xmtpClientRef = useRef<Client | null>(null);
  const initializingRef = useRef(false);
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const linkedEthereumWallet = useMemo(() => {
    if (!wallets?.length || !user?.linkedAccounts?.length)
      return null;

    const linkedWallet = user.linkedAccounts.find(
      (item: any) => item.chainType === 'ethereum' && item.address
    );

    if (!linkedWallet) return null;

    const ethWallet = wallets.find(
      (w) =>
        w.address?.toLowerCase() ===
        (linkedWallet as any).address?.toLowerCase()
    );

    return ethWallet || null;
  }, [wallets, user]);

  useEffect(() => {
    if (pathname === '/login' || pathname === '/onboard') {
      setXmtpClient(null);
      xmtpClientRef.current = null;
      return;
    }

    if (!linkedEthereumWallet) {
      setXmtpClient(null);
      xmtpClientRef.current = null;
      return;
    }

    if (
      xmtpClientRef.current?.address?.toLowerCase() ===
      linkedEthereumWallet.address.toLowerCase()
    ) {
      return;
    }

    if (initializingRef.current) return;

    const initXmtp = async () => {
      try {
        setIsLoading(true);
        initializingRef.current = true;

        // Get current wallet address in lowercase for consistency
        const walletAddress =
          linkedEthereumWallet.address.toLowerCase();

        // Always create a fresh client on sign in
        const wallet =
          wallets.find(
            (wallet) =>
              wallet.walletClientType === 'privy' &&
              wallet.connectorType === 'embedded'
          ) || wallets[0];

        if (!wallet) {
          throw new Error('No Privy embedded wallet found');
        }

        const provider = await wallet.getEthereumProvider();
        const signer = {
          getAddress: () => Promise.resolve(wallet.address),
          signMessage: async (message: string) => {
            try {
              // Use the embedded wallet's provider for signing
              return await provider.request({
                method: 'personal_sign',
                params: [message, wallet.address],
              });
            } catch (err) {
              console.error('Failed to sign message:', err);
              throw err;
            }
          },
        };
        const client = await Client.create(signer, {
          env: 'production',
          version: 'v3',
        });

        setXmtpClient(client);
        xmtpClientRef.current = client;
      } catch (error) {
        console.error('XMTP client initialization failed:', error);
        setError(
          error instanceof Error ? error : new Error(String(error))
        );
        setXmtpClient(null);
        xmtpClientRef.current = null;
      } finally {
        setIsLoading(false);
        initializingRef.current = false;
      }
    };

    initXmtp();
  }, [linkedEthereumWallet, pathname, user, wallets]);

  return (
    <XmtpContext.Provider
      value={{ client: xmtpClient, isLoading, error }}
    >
      {children}
    </XmtpContext.Provider>
  );
};

export const useXmtpContext = () => {
  const context = useContext(XmtpContext);
  if (!context) {
    throw new Error(
      'useXmtpContext must be used within an XmtpProvider'
    );
  }
  return context;
};
