// app/layout.tsx or _app.tsx or your root component
"use client";

import { useBalanceVisibilityStore } from "@/zustandStore/useBalanceVisibilityStore";
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

  return <div>{children}</div>;
}
