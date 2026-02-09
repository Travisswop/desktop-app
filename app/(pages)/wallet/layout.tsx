// app/layout.tsx or _app.tsx or your root component
"use client";

import { useBalanceVisibilityStore } from "@/zustandStore/useBalanceVisibilityStore";
import { ReactNode, useEffect } from "react";

interface RootLayoutProps {
  children: ReactNode;
}

export default function WalletLayout({ children }: RootLayoutProps) {
  const initializeFromCookie = useBalanceVisibilityStore(
    (state) => state.initializeFromCookie,
  );

  useEffect(() => {
    initializeFromCookie();
  }, [initializeFromCookie]);

  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
