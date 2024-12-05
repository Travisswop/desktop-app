'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from 'react';
import { Client } from '@xmtp/xmtp-js';
import { useWallets } from '@privy-io/react-auth';
import { usePrivyUser } from '@/lib/hooks/usePrivyUser';
import { usePathname } from 'next/navigation';

const XmtpContext = createContext<Client | null>(null);

export const XmtpProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { wallets } = useWallets();
  const { user } = usePrivyUser();
  const [xmtpClient, setXmtpClient] = useState<Client | null>(null);
  const pathname = usePathname();

  // Memoize the wallet and linked account information
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
    // Reset client if on login or onboard pages
    if (pathname === '/login' || pathname === '/onboard') {
      setXmtpClient(null);
      return;
    }

    // Only initialize if we have a valid wallet
    if (!linkedEthereumWallet) {
      setXmtpClient(null);
      return;
    }

    // Prevent multiple initializations
    if (xmtpClient) return;

    const initXmtp = async () => {
      try {
        const signer = {
          account: linkedEthereumWallet.address,
          signMessage: async (message: string) => {
            try {
              return await linkedEthereumWallet.sign(message);
            } catch (err) {
              console.error('Failed to sign message:', err);
              throw err;
            }
          },
          getAddress: () =>
            Promise.resolve(linkedEthereumWallet.address),
        };

        const client = await Client.create(signer, {
          env: 'production',
        });
        setXmtpClient(client);
      } catch (error) {
        console.error('XMTP client initialization failed:', error);
        setXmtpClient(null);
      }
    };

    initXmtp();
  }, [linkedEthereumWallet, pathname, xmtpClient]);

  return (
    <XmtpContext.Provider value={xmtpClient}>
      {children}
    </XmtpContext.Provider>
  );
};

export const useXmtpContext = () => {
  const context = useContext(XmtpContext);
  if (context === null) {
    console.warn(
      'useXmtpContext must be used within an XmtpProvider'
    );
    return null;
  }
  return context;
};
