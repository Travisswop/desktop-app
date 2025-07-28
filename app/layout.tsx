import './globals.css';
import PrivyProvider from '@/components/PrivyProvider';
import { UserProvider } from '@/lib/UserContext';

import { Figtree, Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { XmtpProvider } from '@/lib/context/XmtpContext';
import { WalletProvider } from '@/providers/SyncedWalletProvider';
import { LiFiWalletProvider } from '@/providers/WalletManagementProvider';

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${figtree.className} ${inter.variable}`}
    >
      <body className={`font-[figtree] bg-[#F7F7F9]`}>
        <Toaster position="top-center" reverseOrder={false} />

        <PrivyProvider>
          <WalletProvider>
            <LiFiWalletProvider>
              <XmtpProvider>
                <UserProvider>{children}</UserProvider>
              </XmtpProvider>
            </LiFiWalletProvider>
          </WalletProvider>
        </PrivyProvider>
      </body>
    </html>
  );
}
