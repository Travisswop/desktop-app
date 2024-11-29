// import type { Metadata } from "next";
// import localFont from "next/font/local";
import './globals.css';
import PrivyProvider from '@/components/PrivyProvider';
import { UserProvider } from '@/lib/UserContext';
import {
  Roboto,
  Poppins,
  Open_Sans,
  Montserrat,
  Rubik,
} from 'next/font/google';
import { TanstackProvider } from '@/components/providers/tanstackProvider';
import { Toaster } from 'react-hot-toast';

// const geistSans = localFont({
//   src: "./fonts/GeistVF.woff",
//   variable: "--font-geist-sans",
//   weight: "100 900",
// });
// const geistMono = localFont({
//   src: "./fonts/GeistMonoVF.woff",
//   variable: "--font-geist-mono",
//   weight: "100 900",
// });

// types/fonts.d.ts or any relevant file
export type FontType =
  | 'roboto'
  | 'poppins'
  | 'opensans'
  | 'montserrat'
  | 'rubik';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700', '900'],
});
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '700'],
});
const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
});
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700'],
});
const rubik = Rubik({ subsets: ['latin'], weight: ['400', '700'] });

export const fontMap: Record<FontType, string> = {
  roboto: roboto.className,
  poppins: poppins.className,
  opensans: openSans.className,
  montserrat: montserrat.className,
  rubik: rubik.className,
};

// export const metadata: Metadata = {
//   title: "Create Next App",
//   description: "Generated by create next app",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={roboto.className}
      suppressHydrationWarning
    >
      <body
        className={`font-[roboto] bg-accent`}
        // className={`${geistSans.variable} ${geistMono.variable} antialiased bg-accent`}
      >
        <Toaster position="top-center" reverseOrder={false} />
        <TanstackProvider>
          <PrivyProvider>
            <UserProvider>{children}</UserProvider>
          </PrivyProvider>
        </TanstackProvider>
      </body>
    </html>
  );
}
