'use client';

import { PrivyProvider as Privy } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
const solanaConnectors = toSolanaWalletConnectors({
  // By default, shouldAutoConnect is enabled
  shouldAutoConnect: true,
});
export default function PrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Privy
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ['email', 'google', 'wallet'],
        appearance: {
          theme: '#FFFFFF',
          accentColor: '#676FFF',
          showWalletLoginFirst: false,
          logo: 'https://res.cloudinary.com/bayshore/image/upload/v1729560495/z8grcj0jvpgsrvab1q4i.jpg',
          walletChainType: 'ethereum-and-solana',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </Privy>
  );
}
