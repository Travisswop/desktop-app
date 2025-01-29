import './globals.css';
import PrivyProvider from '@/components/PrivyProvider';
import { UserProvider } from '@/lib/UserContext';

import { Figtree } from 'next/font/google';
import { TanstackProvider } from '@/components/providers/tanstackProvider';
import { Toaster } from 'react-hot-toast';
import { XmtpProvider } from '@/lib/context/XmtpContext';
import { initializeApp } from './init';

// const roboto = Roboto({
//   subsets: ["latin"],
//   weight: ["100", "300", "400", "500", "700", "900"],
// });
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
});

// Initialize the app
initializeApp().catch(console.error);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={figtree.className}>
      <body className={`font-[figtree] bg-[#F7F7F9]`}>
        <Toaster position="top-center" reverseOrder={false} />
        <TanstackProvider>
          <PrivyProvider>
            <XmtpProvider>
              <UserProvider>{children}</UserProvider>
            </XmtpProvider>
          </PrivyProvider>
        </TanstackProvider>
      </body>
    </html>
  );
}
