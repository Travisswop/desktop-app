import './globals.css';
import PrivyProvider from '@/components/PrivyProvider';
import { UserProvider } from '@/lib/UserContext';

import { Roboto } from 'next/font/google';
import { TanstackProvider } from '@/components/providers/tanstackProvider';
import { Toaster } from 'react-hot-toast';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700', '900'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={roboto.className}>
      <body className={`font-[roboto] bg-accent`}>
        <Toaster position="top-center" reverseOrder={false} />
        <TanstackProvider>
          <PrivyProvider>
            <UserProvider>
              {children}
            </UserProvider>
          </PrivyProvider>
        </TanstackProvider>
      </body>
    </html>
  );
}
