"use client";

import React, { ReactNode } from "react";
import { Connection } from "@solana/web3.js";
import { JupiterProvider } from "@jup-ag/react-hook";
import { PublicKey } from "@solana/web3.js";

const connection = new Connection(
  "https://solana-mainnet.g.alchemy.com/v2/Z8M1_aOq8Pb_eH2Ryr2culQZ-G_H0Wqr"
);

interface JupiterProviderClientProps {
  children: ReactNode;
  userPublicKey: PublicKey | null;
}

export const JupiterProviderClient = ({
  children,
  userPublicKey
}: JupiterProviderClientProps) => {
  // Create a direct implementation rather than using the problematic hook
  return (
    <JupiterProvider
      connection={connection}
      userPublicKey={userPublicKey ?? undefined}
      wrapUnwrapSOL={true}
    >
      {children}
    </JupiterProvider>
  );
};
