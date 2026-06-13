"use client";

import { useBalanceVisibilityStore } from "@/zustandStore/useBalanceVisibilityStore";
import { LiFiWalletProvider } from "@/providers/WalletManagementProvider";
import { ReactNode, useEffect } from "react";

interface WalletLayoutProps {
  children: ReactNode;
}

export default function WalletLayout({ children }: WalletLayoutProps) {
  const initializeFromCookie = useBalanceVisibilityStore(
    (state) => state.initializeFromCookie,
  );

  useEffect(() => {
    initializeFromCookie();
  }, [initializeFromCookie]);

  return <LiFiWalletProvider>{children}</LiFiWalletProvider>;
}
