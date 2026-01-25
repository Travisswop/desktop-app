"use client";

import { ReactNode } from "react";
import { PolymarketWalletProvider } from "./PolymarketWalletContext";
import { TradingProvider } from "./TradingProvider";

export { usePolymarketWallet } from "./PolymarketWalletContext";
export { useTrading } from "./TradingProvider";

export function PolymarketProviders({ children }: { children: ReactNode }) {
  return (
    <PolymarketWalletProvider>
      <TradingProvider>{children}</TradingProvider>
    </PolymarketWalletProvider>
  );
}
