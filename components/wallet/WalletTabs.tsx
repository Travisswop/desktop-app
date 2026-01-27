'use client';

import { ReactNode, useRef, useEffect, useState } from 'react';
import { Wallet, TrendingUp, BarChart3 } from 'lucide-react';

export type WalletTabId = 'assets' | 'markets' | 'perps';

interface Tab {
  id: WalletTabId;
  label: string;
  icon: ReactNode;
}

const WALLET_TABS: Tab[] = [
  {
    id: 'assets',
    label: 'Assets',
    icon: <Wallet className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'markets',
    label: 'Markets',
    icon: <TrendingUp className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'perps',
    label: 'Perps',
    icon: <BarChart3 className="w-5 h-5" strokeWidth={1.5} />,
  },
];

interface WalletTabsProps {
  activeTab: WalletTabId;
  onTabChange: (tabId: WalletTabId) => void;
}

interface IndicatorStyle {
  width: number;
  left: number;
}

export default function WalletTabs({
  activeTab,
  onTabChange,
}: WalletTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<WalletTabId, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>({
    width: 0,
    left: 0,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Update indicator position when active tab changes
  useEffect(() => {
    const updateIndicator = () => {
      const activeButton = tabRefs.current.get(activeTab);
      const container = containerRef.current;

      if (activeButton && container) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();

        setIndicatorStyle({
          width: buttonRect.width,
          left: buttonRect.left - containerRect.left,
        });

        if (!isInitialized) {
          setIsInitialized(true);
        }
      }
    };

    updateIndicator();
    // Also update on resize
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeTab, isInitialized]);

  return (
    <div className="flex justify-center">
      {/* Glassmorphism container - iOS 26 style (Black & White) */}
      <div
        ref={containerRef}
        className="
          relative inline-flex gap-1 p-2
          rounded-full
          backdrop-blur-2xl
          border border-white/50
          shadow-xl shadow-black/10
        "
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.2) 100%)',
          boxShadow:
            'inset 0 1px 1px rgba(255,255,255,0.5), 0 8px 32px rgba(0,0,0,0.1)',
        }}
      >
        {/* Sliding glass indicator */}
        <div
          className={`
            absolute top-2 bottom-2
            rounded-full
            bg-black
            pointer-events-none
            ${isInitialized ? 'transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]' : ''}
          `}
          style={{
            width: indicatorStyle.width,
            left: indicatorStyle.left,
            boxShadow:
              '0 4px 20px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(255,255,255,0.05)',
          }}
        />

        {/* Tab buttons */}
        {WALLET_TABS.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
            }}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative z-10
              flex flex-col items-center justify-center gap-1
              px-8 py-3 min-w-[100px]
              rounded-full
              text-xs font-semibold
              transition-colors duration-300 ease-out
              ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-black/70 hover:text-black hover:bg-white/30'
              }
            `}
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
