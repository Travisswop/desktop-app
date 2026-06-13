import "./globals.css";
import PrivyProvider from "@/components/PrivyProvider";
import { UserProvider } from "@/lib/UserContext";
import { Metadata } from "next";

import { Figtree, Inter, JetBrains_Mono } from "next/font/google";
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

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${figtree.className} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body suppressHydrationWarning className={`font-[figtree] bg-[#F7F7F9]`}>
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={10}
          containerStyle={{
            top: 16,
            right: 16,
            zIndex: 99999,
          }}
          toastOptions={{
            duration: 4500,
            style: {
              maxWidth: '420px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.10)',
              background: '#08090b',
              color: '#f5f5f5',
              boxShadow: '0 20px 55px rgba(0,0,0,0.28)',
              padding: '12px 14px',
              fontSize: '13px',
              fontWeight: 500,
            },
            success: {
              iconTheme: {
                primary: '#3fe08f',
                secondary: '#08120d',
              },
              style: {
                borderColor: 'rgba(63,224,143,0.28)',
              },
            },
            error: {
              iconTheme: {
                primary: '#ff5a5f',
                secondary: '#18080a',
              },
              style: {
                borderColor: 'rgba(255,90,95,0.30)',
              },
            },
            loading: {
              style: {
                borderColor: 'rgba(255,255,255,0.16)',
              },
            },
          }}
        />
        <SonnerToaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4500,
            style: {
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.10)',
              background: '#08090b',
              color: '#f5f5f5',
              boxShadow: '0 20px 55px rgba(0,0,0,0.28)',
              fontSize: '13px',
              fontWeight: 500,
            },
            actionButtonStyle: {
              borderRadius: '6px',
              background: '#3fe08f',
              color: '#06110b',
              fontWeight: 700,
            },
            cancelButtonStyle: {
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.08)',
              color: '#f5f5f5',
              fontWeight: 600,
            },
          }}
        />

        <PrivyProvider>
          <UserProvider>{children}</UserProvider>
        </PrivyProvider>
      </body>
    </html>
  );
}
