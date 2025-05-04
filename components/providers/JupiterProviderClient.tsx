"use client";

import { JupiterProvider } from "@jup-ag/react-hook";
import { Connection } from "@solana/web3.js";
import { ReactNode } from "react";

// Create a connection to Solana
const connection = new Connection("https://api.mainnet-beta.solana.com");

interface JupiterProviderClientProps {
  children: ReactNode;
}

export default function JupiterProviderClient({
  children,
}: JupiterProviderClientProps) {
  return <JupiterProvider connection={connection}>{children}</JupiterProvider>;
}
