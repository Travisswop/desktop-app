'use client';

import { PrivyProvider as Privy } from '@privy-io/react-auth';

export default function PrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const privyId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  return (
    <Privy
      appId={privyId as string}
      config={{
        loginMethods: ['email', 'google', 'wallet'],
        appearance: {
          theme: '#FFFFFF',
          accentColor: '#676FFF',
          showWalletLoginFirst: false,
          logo: 'https://res.cloudinary.com/bayshore/image/upload/v1729560495/z8grcj0jvpgsrvab1q4i.jpg',
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
