'use client';

import { ReactNode } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { Toaster } from '@/components/ui/toaster';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      {...(process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID
        ? { clientId: process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID }
        : {})}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
          logo: '/logo.png',
        },
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets',
          },
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      {children}
      <Toaster />
    </PrivyProvider>
  );
}
