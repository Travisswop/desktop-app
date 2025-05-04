import "./globals.css";
import PrivyProvider from "@/components/PrivyProvider";
import { UserProvider } from "@/lib/UserContext";
import { SolanaWalletProvider } from "@/lib/context/SolanaWalletContext";

import { Figtree } from "next/font/google";
import { TanstackProvider } from "@/components/providers/tanstackProvider";
import { Toaster } from "react-hot-toast";
import { XmtpProvider } from "@/lib/context/XmtpContext";
import JupiterProviderClient from "@/components/providers/JupiterProviderClient";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={figtree.className}>
      <body className={`font-[figtree] bg-[#F7F7F9]`}>
        <Toaster position="top-center" reverseOrder={false} />
        <JupiterProviderClient>
          <TanstackProvider>
            <PrivyProvider>
              <SolanaWalletProvider>
                <XmtpProvider>
                  <UserProvider>{children}</UserProvider>
                </XmtpProvider>
              </SolanaWalletProvider>
            </PrivyProvider>
          </TanstackProvider>
        </JupiterProviderClient>
      </body>
    </html>
  );
}
