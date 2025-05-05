"use client";

import React, { ReactNode } from "react";
import { Connection } from "@solana/web3.js";
import { JupiterProvider } from "@jup-ag/react-hook";
import { useSolanaWallets } from "@privy-io/react-auth";
import { PublicKey } from "@solana/web3.js";

const connection = new Connection(
  "https://solana-mainnet.g.alchemy.com/v2/Z8M1_aOq8Pb_eH2Ryr2culQZ-G_H0Wqr"
);

interface JupiterProviderClientProps {
  children: ReactNode;
}

export const JupiterProviderClient = ({
  children,
}: JupiterProviderClientProps) => {
  const wallet = useSolanaWallets();
  const userPublicKey = new PublicKey(
    "AUArjTCpBFF67iFafnQYS1AmEK33FdmEbtk8UMCyLouU"
  );
  // Create a direct implementation rather than using the problematic hook
  return (
    <JupiterProvider
      connection={connection}
      userPublicKey={userPublicKey}
      wrapUnwrapSOL={true}
    >
      {children}
    </JupiterProvider>
  );
};
