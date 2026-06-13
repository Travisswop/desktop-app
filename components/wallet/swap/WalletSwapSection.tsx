'use client';

import { useEffect, useRef, useState } from 'react';
import { SolanaProvider } from '../../SolanaProvider';
import LiFiPrivyWrapper from '../LiFiPrivyWrapper';
import LimitOrderForm from './LimitOrderForm';
import OpenLimitOrders from './OpenLimitOrders';

interface WalletSwapSectionProps {
  tokens: any[];
  accessToken: string;
  onTokenRefresh?: () => void;
  solWalletAddress?: string;
  evmWalletAddress?: string;
  chains?: any[];
}

type SwapTab = 'market' | 'limit';

export default function WalletSwapSection({
  tokens,
  onTokenRefresh,
  solWalletAddress,
  evmWalletAddress,
  chains,
}: WalletSwapSectionProps) {
  const [tab, setTab] = useState<SwapTab>('market');
  const [ordersReloadKey, setOrdersReloadKey] = useState(0);
  const swapCardRef = useRef<HTMLDivElement>(null);
  const [activityPanelHeight, setActivityPanelHeight] = useState<
    number | null
  >(null);

  const refreshOrders = () => setOrdersReloadKey((k) => k + 1);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    let frameId: number | null = null;

    const updateActivityHeight = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;

        if (!mediaQuery.matches) {
          setActivityPanelHeight(null);
          return;
        }

        const nextHeight = swapCardRef.current
          ? Math.ceil(swapCardRef.current.getBoundingClientRect().height)
          : null;

        setActivityPanelHeight((currentHeight) =>
          nextHeight !== null &&
          Math.abs((currentHeight ?? 0) - nextHeight) > 1
            ? nextHeight
            : currentHeight,
        );
      });
    };

    updateActivityHeight();

    const observer =
      typeof ResizeObserver !== 'undefined' && swapCardRef.current
        ? new ResizeObserver(updateActivityHeight)
        : null;

    if (swapCardRef.current) {
      observer?.observe(swapCardRef.current);
    }

    mediaQuery.addEventListener('change', updateActivityHeight);
    window.addEventListener('resize', updateActivityHeight);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      observer?.disconnect();
      mediaQuery.removeEventListener('change', updateActivityHeight);
      window.removeEventListener('resize', updateActivityHeight);
    };
  }, []);

  return (
    <SolanaProvider>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* ── Swap card (Market / Limit) ── */}
        <div
          ref={swapCardRef}
          className="lg:col-span-2 self-start h-fit bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] p-4"
        >
          <div className="flex items-center gap-4 border-b border-black/[0.06] mb-4">
            {(['market', 'limit'] as SwapTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`pb-2 -mb-px text-sm font-medium capitalize border-b-2 transition ${
                  tab === t
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'market' ? (
            <LiFiPrivyWrapper
              config={{}}
              tokens={tokens}
              onSwapComplete={onTokenRefresh}
            />
          ) : (
            <LimitOrderForm
              tokens={tokens}
              onOrderCreated={() => {
                onTokenRefresh?.();
                refreshOrders();
              }}
            />
          )}
        </div>

        {/* ── Open limit orders ── */}
        <div
          className="self-start bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] p-4 min-h-0 overflow-hidden"
          style={
            activityPanelHeight !== null
              ? { height: activityPanelHeight }
              : undefined
          }
        >
          <OpenLimitOrders
            tokens={tokens}
            reloadKey={ordersReloadKey}
            onChanged={onTokenRefresh}
            solWalletAddress={solWalletAddress}
            evmWalletAddress={evmWalletAddress}
            chains={chains}
          />
        </div>
      </div>
    </SolanaProvider>
  );
}
