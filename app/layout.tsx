import "./globals.css";
import PrivyProvider from "@/components/PrivyProvider";
import { UserProvider } from "@/lib/UserContext";

import { Figtree, Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { SocketChatProvider } from "@/lib/context/SocketChatContext";
import { WalletProvider } from "@/providers/SyncedWalletProvider";
import { LiFiWalletProvider } from "@/providers/WalletManagementProvider";
import { Metadata } from "next";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Swop",
  description: "Web3 ecommerce",
  metadataBase: new URL("https://www.swopme.app"),
  openGraph: {
    title: "Swop",
    description: "Web3 ecommerce",
    url: "https://www.swopme.app",
    siteName: "Swop",
    images: [
      {
        url: "/og-image.png", // Must be an absolute URL or path from public folder
        width: 1200,
        height: 630,
        alt: "Swop Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Swop",
    description: "Web3 ecommerce",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${figtree.className} ${inter.variable}`}>
      <body className={`font-[figtree] bg-[#F7F7F9]`}>
        <Toaster position="top-center" reverseOrder={false} />

        <PrivyProvider>
          <WalletProvider>
            <LiFiWalletProvider>
              <SocketChatProvider>
                <UserProvider>{children}</UserProvider>
              </SocketChatProvider>
            </LiFiWalletProvider>
          </WalletProvider>
        </PrivyProvider>
      </body>
    </html>
  );
}
