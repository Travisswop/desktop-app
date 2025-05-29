'use client';

import { PrivyProvider as Privy } from '@privy-io/react-auth';

export default function PrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Privy
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID as string}
      config={{
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      {children}
    </Privy>
  );
}
