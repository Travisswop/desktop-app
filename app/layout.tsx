import "./globals.css";
import PrivyProvider from "@/components/PrivyProvider";
import { UserProvider } from "@/lib/UserContext";
import { Metadata } from "next";

import { Figtree, Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Toaster as SonnerToaster } from "sonner";

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
    // ❌ removed images — this was cascading to all pages including /feed/[id]
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Swop",
    description: "Web3 ecommerce",
    // ❌ removed images here too
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
        <SonnerToaster position="top-right" richColors />

        <PrivyProvider>
          <UserProvider>{children}</UserProvider>
        </PrivyProvider>
      </body>
    </html>
  );
}
