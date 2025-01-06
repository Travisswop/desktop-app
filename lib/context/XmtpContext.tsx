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

const XmtpContext = createContext<Client | null>(null);

export const XmtpProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { wallets } = useWallets();
  const { user } = usePrivyUser();
  const [xmtpClient, setXmtpClient] = useState<Client | null>(null);
  const xmtpClientRef = useRef<Client | null>(null);
  const initializingRef = useRef(false);
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
      xmtpClientRef.current = null;
      return;
    }

    // Only initialize if we have a valid wallet
    if (!linkedEthereumWallet) {
      setXmtpClient(null);
      xmtpClientRef.current = null;
      return;
    }

    // Check if we already have a client initialized
    if (
      xmtpClientRef.current?.address?.toLowerCase() ===
      linkedEthereumWallet.address.toLowerCase()
    ) {
      return;
    }

    // Prevent concurrent initializations
    if (initializingRef.current) return;

    const initXmtp = async () => {
      try {
        initializingRef.current = true;

        // Try to load from local storage first
        const keys = localStorage.getItem(
          `xmtp-keys-${linkedEthereumWallet.address.toLowerCase()}`
        );

        let client;

        if (keys) {
          try {
            // Create client with stored keys
            client = await Client.create(null, {
              env: 'production',
              privateKeyOverride: new Uint8Array(
                Buffer.from(keys, 'hex')
              ),
            });
          } catch (err) {
            console.log('🚀 ~ initXmtp ~ err:', err);
            // Clear invalid keys from local storage
            localStorage.removeItem(
              `xmtp-keys-${linkedEthereumWallet.address.toLowerCase()}`
            );
          }
        }

        if (!client) {
          // Create new client and store keys
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

          // Store the wallet address in localStorage
          localStorage.setItem(
            `xmtp-signer-address-${linkedEthereumWallet.address.toLowerCase()}`,
            linkedEthereumWallet.address
          );

          client = await Client.create(signer, {
            env: 'production',
          });

          // Store keys in localStorage
          localStorage.setItem(
            `xmtp-keys-${linkedEthereumWallet.address.toLowerCase()}`,
            client.toString()
          );
        }

        setXmtpClient(client);
        xmtpClientRef.current = client;
      } catch (error) {
        console.error('XMTP client initialization failed:', error);
        setXmtpClient(null);
        xmtpClientRef.current = null;
      } finally {
        initializingRef.current = false;
      }
    };

    initXmtp();
  }, [linkedEthereumWallet, pathname]);

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
