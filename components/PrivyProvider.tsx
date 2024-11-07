'use client';

import { PrivyProvider as Privy } from '@privy-io/react-auth';

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
        fundingMethodConfig: {
          moonpay: {
            useSandbox: true,
          },
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          requireUserPasswordOnCreate: false,
        },
        mfa: {
          noPromptOnMfaRequired: false,
        },
      }}
    >
      {children}
    </Privy>
  );
}
