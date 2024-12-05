'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
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

  useEffect(() => {
    const initXmtp = async () => {
      // Don't initialize if on login or onboard pages
      if (pathname === '/login' || pathname === '/onboard') {
        setXmtpClient(null);
        return;
      }

      if (!wallets?.length || !user?.linkedAccounts?.length) {
        setXmtpClient(null);
        return;
      }

      const linkedWallet = user.linkedAccounts.find(
        (item: any) => item.chainType === 'ethereum' && item.address
      );

      if (!linkedWallet) {
        setXmtpClient(null);
        return;
      }

      const ethWallet = wallets.find(
        (w) =>
          w.address?.toLowerCase() ===
          (linkedWallet as any).address?.toLowerCase()
      );

      if (!ethWallet) {
        setXmtpClient(null);
        return;
      }

      const signer = {
        account: ethWallet.address,
        signMessage: async (message: string) => {
          try {
            return await ethWallet.sign(message);
          } catch (err) {
            console.error('Failed to sign message:', err);
            throw err;
          }
        },
        getAddress: () => Promise.resolve(ethWallet.address),
      };

      const client = await Client.create(signer, {
        env: 'production',
      });
      setXmtpClient(client);
    };

    initXmtp();
  }, [wallets, user, pathname]);

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
