"use client";

import { ReactNode } from "react";
import { Wallet, TrendingUp } from "lucide-react";

export type WalletTabId = "assets" | "markets";

interface Tab {
  id: WalletTabId;
  label: string;
  icon: ReactNode;
}

const WALLET_TABS: Tab[] = [
  {
    id: "assets",
    label: "Assets",
    icon: <Wallet className="w-5 h-5" strokeWidth={1.5} />
  },
  {
    id: "markets",
    label: "Markets",
    icon: <TrendingUp className="w-5 h-5" strokeWidth={1.5} />
  },
];

interface WalletTabsProps {
  activeTab: WalletTabId;
  onTabChange: (tabId: WalletTabId) => void;
}

export default function WalletTabs({ activeTab, onTabChange }: WalletTabsProps) {
  return (
    <div className="py-3 flex justify-center">
      {/* Glassmorphism container - iOS 26 style (Black & White) */}
      <div
        className="
          inline-flex gap-1 p-2
          rounded-full
          backdrop-blur-2xl
          border border-white/50
          shadow-xl shadow-black/10
        "
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.2) 100%)",
          boxShadow: "inset 0 1px 1px rgba(255,255,255,0.5), 0 8px 32px rgba(0,0,0,0.1)",
        }}
      >
        {WALLET_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex flex-col items-center justify-center gap-1
              px-8 py-3 min-w-[100px]
              rounded-full
              text-xs font-semibold
              transition-all duration-300 ease-out
              ${
                activeTab === tab.id
                  ? "bg-black text-white"
                  : "text-black/70 hover:text-black hover:bg-white/50"
              }
            `}
            style={
              activeTab === tab.id
                ? {
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
                  }
                : undefined
            }
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export { WALLET_TABS };
