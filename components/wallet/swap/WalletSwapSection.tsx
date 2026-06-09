'use client';

import { useState } from 'react';
import { SolanaProvider } from '../../SolanaProvider';
import LiFiPrivyWrapper from '../LiFiPrivyWrapper';
import LimitOrderForm from './LimitOrderForm';
import OpenLimitOrders from './OpenLimitOrders';

interface WalletSwapSectionProps {
  tokens: any[];
  accessToken: string;
  onTokenRefresh?: () => void;
}

type SwapTab = 'market' | 'limit';

export default function WalletSwapSection({
  tokens,
  onTokenRefresh,
}: WalletSwapSectionProps) {
  const [tab, setTab] = useState<SwapTab>('market');
  const [ordersReloadKey, setOrdersReloadKey] = useState(0);

  const refreshOrders = () => setOrdersReloadKey((k) => k + 1);

  return (
    <SolanaProvider>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* ── Swap card (Market / Limit) ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] p-4">
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
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] p-4">
          <OpenLimitOrders
            tokens={tokens}
            reloadKey={ordersReloadKey}
            onChanged={onTokenRefresh}
          />
        </div>
      </div>
    </SolanaProvider>
  );
}
