'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Client } from '@xmtp/xmtp-js';
import { useWallets } from '@privy-io/react-auth';

const XmtpContext = createContext<Client | null>(null);

export const XmtpProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { wallets } = useWallets();
  const [xmtpClient, setXmtpClient] = useState<Client | null>(null);

  useEffect(() => {
    const initXmtp = async () => {
      if (wallets.length === 0) {
        console.warn(
          'No wallets available to initialize XMTP client.'
        );
        return;
      }

      const wallet = wallets.find(
        (w) => w.walletClientType === 'privy'
      );

      if (wallet) {
        const signer = {
          account: wallet.address,
          signMessage: async (message: string) => {
            return wallet.sign(message);
          },
          getAddress: () => Promise.resolve(wallet.address),
        };
        const client = await Client.create(signer);
        setXmtpClient(client);
      }
    };

    initXmtp();
  }, [wallets]);

  return (
    <XmtpContext.Provider value={xmtpClient}>
      {children}
    </XmtpContext.Provider>
  );
};

export const useXmtp = () => {
  const context = useContext(XmtpContext);
  if (!context) {
    throw new Error('useXmtp must be used within an XmtpProvider');
  }
  return context;
};
