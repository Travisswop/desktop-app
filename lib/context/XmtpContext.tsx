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

        // Check for stored XMTP keys with a more secure key format
        const storedKeysData = localStorage.getItem(
          `xmtp-keys-${walletAddress}`
        );

        if (storedKeysData) {
          try {
            const { keys, address } = JSON.parse(storedKeysData);

            // Verify the stored keys belong to the current wallet
            if (address.toLowerCase() === walletAddress) {
              const client = await Client.create(null, {
                env: 'production',
                privateKeyOverride: new Uint8Array(keys),
              });

              // Double check the created client matches the wallet address
              if (client.address.toLowerCase() === walletAddress) {
                setXmtpClient(client);
                xmtpClientRef.current = client;
                return;
              }
            }

            // If validation fails, remove the invalid keys
            console.warn(
              'Stored XMTP keys do not match current wallet'
            );
            localStorage.removeItem(`xmtp-keys-${walletAddress}`);
          } catch (err) {
            console.error(
              'Failed to create client with stored keys:',
              err
            );
            localStorage.removeItem(`xmtp-keys-${walletAddress}`);
          }
        }

        // Create new client if no valid stored keys
        const provider =
          await linkedEthereumWallet.getEthereumProvider();
        const signer = {
          getAddress: () => Promise.resolve(walletAddress),
          signMessage: async (message: string) => {
            try {
              return await provider.request({
                method: 'personal_sign',
                params: [message, walletAddress],
              });
            } catch (err) {
              console.error('Failed to sign message:', err);
              throw err;
            }
          },
        };

        // Get keys first (requires one signature)
        const keys = await Client.getKeys(signer, {
          env: 'production',
        });

        // Create client using the keys (no signature needed)
        const client = await Client.create(null, {
          env: 'production',
          privateKeyOverride: keys,
        });

        // Store keys with wallet address for validation
        localStorage.setItem(
          `xmtp-keys-${walletAddress}`,
          JSON.stringify({
            keys: Array.from(keys),
            address: walletAddress,
            timestamp: Date.now(), // Add timestamp for potential key rotation
          })
        );

        setXmtpClient(client);
        xmtpClientRef.current = client;
      } catch (error) {
        console.error('XMTP client initialization failed:', error);
        setError(
          error instanceof Error
            ? error
            : new Error('Failed to initialize XMTP')
        );
        setXmtpClient(null);
        xmtpClientRef.current = null;
      } finally {
        setIsLoading(false);
        initializingRef.current = false;
      }
    };

    initXmtp();
  }, [linkedEthereumWallet, pathname, user]);

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
