'use client';

import { useState } from 'react';
import { Layers, RefreshCw, X, Loader2 } from 'lucide-react';
import { PositionCard } from './PositionCard';
import type { HLPosition } from '@/services/hyperliquid/types';
import type { HLOpenOrder } from '@/services/hyperliquid/types';

interface PositionsListProps {
  positions: HLPosition[];
  openOrders: HLOpenOrder[];
  accountValue: string;
  unrealizedPnl: string;
  withdrawable: string;
  marginUsed: string;
  liveMids?: Record<string, string>;
  isLoading?: boolean;
  closingCoin?: string | null;
  onClosePosition: (position: HLPosition) => Promise<void>;
  onCancelOrder?: (coin: string, orderId: number) => Promise<void>;
  onRefresh?: () => void;
}

type Tab = 'positions' | 'orders';

/**
 * PositionsList
 *
 * Tabbed panel showing:
 *  - Open Positions (with PositionCard)
 *  - Open Orders (limit / trigger orders)
 *
 * Also renders a summary bar with account value, total PnL, margin used.
 */
export function PositionsList({
  positions,
  openOrders,
  accountValue,
  unrealizedPnl,
  withdrawable,
  marginUsed,
  liveMids = {},
  isLoading = false,
  closingCoin,
  onClosePosition,
  onCancelOrder,
  onRefresh,
}: PositionsListProps) {
  const [activeTab, setActiveTab] = useState<Tab>('positions');

  const totalPnl = parseFloat(unrealizedPnl);
  const isPnlPositive = totalPnl >= 0;

  return (
    <div className="flex flex-col h-full">
      {/* Account summary bar */}
      <div className="grid grid-cols-4 gap-px bg-gray-100 text-xs border-b border-gray-200">
        <SummaryCell label="Account Value" value={`$${parseFloat(accountValue).toFixed(2)}`} />
        <SummaryCell
          label="Unrealized PnL"
          value={`${isPnlPositive ? '+' : ''}$${Math.abs(totalPnl).toFixed(2)}`}
          valueColor={isPnlPositive ? 'text-emerald-600' : 'text-red-500'}
        />
        <SummaryCell label="Margin Used" value={`$${parseFloat(marginUsed).toFixed(2)}`} />
        <SummaryCell label="Withdrawable" value={`$${parseFloat(withdrawable).toFixed(2)}`} />
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-gray-100">
        <TabButton
          label={`Positions${positions.length > 0 ? ` (${positions.length})` : ''}`}
          active={activeTab === 'positions'}
          onClick={() => setActiveTab('positions')}
        />
        <TabButton
          label={`Orders${openOrders.length > 0 ? ` (${openOrders.length})` : ''}`}
          active={activeTab === 'orders'}
          onClick={() => setActiveTab('orders')}
        />
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="ml-auto mr-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeTab === 'positions' ? (
          isLoading && positions.length === 0 ? (
            <SkeletonList count={2} />
          ) : positions.length === 0 ? (
            <EmptyState
              icon={<Layers className="w-8 h-8 text-gray-300" />}
              message="No open positions"
              sub="Open a trade to see your positions here"
            />
          ) : (
            positions.map((pos) => (
              <PositionCard
                key={pos.coin}
                position={pos}
                markPrice={liveMids[pos.coin]}
                onClose={onClosePosition}
                isClosing={closingCoin === pos.coin}
              />
            ))
          )
        ) : (
          /* Open Orders Tab */
          openOrders.length === 0 ? (
            <EmptyState
              icon={<Layers className="w-8 h-8 text-gray-300" />}
              message="No open orders"
              sub="Place a limit or trigger order to see it here"
            />
          ) : (
            <div className="space-y-1.5">
              {/* Header */}
              <div className="grid grid-cols-5 text-xs text-gray-400 font-medium px-1">
                <span>Market</span>
                <span>Role</span>
                <span>Side</span>
                <span className="text-right">Price</span>
                <span className="text-right">Size</span>
              </div>
              {openOrders.map((order) => (
                <OpenOrderRow key={order.oid} order={order} onCancel={onCancelOrder} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryCell({
  label,
  value,
  valueColor = 'text-gray-800',
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white px-3 py-2 text-center">
      <p className="text-gray-400 text-xs">{label}</p>
      <p className={`font-semibold text-xs ${valueColor}`}>{value}</p>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
        active
          ? 'border-emerald-500 text-emerald-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

function getOrderRole(order: HLOpenOrder): {
  label: string;
  badgeClass: string;
  displayPrice: string;
} {
  const type = (order.orderType ?? '').toLowerCase();
  const cond = (order.triggerCondition ?? '').toLowerCase();
  const hasTrigger = order.triggerPx && parseFloat(order.triggerPx) > 0;

  if (type.includes('take profit') || cond.includes('tp')) {
    return {
      label: 'Take Profit',
      badgeClass: 'bg-emerald-50 text-emerald-600',
      displayPrice: hasTrigger ? order.triggerPx : order.limitPx,
    };
  }
  if (type.includes('stop') || cond.includes('sl')) {
    return {
      label: 'Stop Loss',
      badgeClass: 'bg-red-50 text-red-500',
      displayPrice: hasTrigger ? order.triggerPx : order.limitPx,
    };
  }
  // Reduce-only without a recognized trigger label — treat as a closing order
  if (order.reduceOnly) {
    return {
      label: 'Close',
      badgeClass: 'bg-orange-50 text-orange-500',
      displayPrice: order.limitPx,
    };
  }
  return {
    label: 'Entry',
    badgeClass: 'bg-blue-50 text-blue-600',
    displayPrice: order.limitPx,
  };
}

function OpenOrderRow({
  order,
  onCancel,
}: {
  order: HLOpenOrder;
  onCancel?: (coin: string, orderId: number) => Promise<void>;
}) {
  const [canceling, setCanceling] = useState(false);
  const isBid = order.side === 'B';
  const role = getOrderRole(order);
  const priceNum = parseFloat(role.displayPrice);

  const handleCancel = async () => {
    if (!onCancel || canceling) return;
    setCanceling(true);
    try {
      await onCancel(order.coin, order.oid);
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-1 py-2 text-xs rounded-lg hover:bg-gray-50">
      <div className="grid grid-cols-5 items-center flex-1 gap-1">
        <span className="font-medium text-gray-800">{order.coin}</span>
        <span className={`px-1.5 py-0.5 rounded-full font-semibold text-center w-fit ${role.badgeClass}`}>
          {role.label}
        </span>
        <span className={`font-medium ${isBid ? 'text-emerald-600' : 'text-red-500'}`}>
          {isBid ? 'Buy' : 'Sell'}
        </span>
        <span className="text-right text-gray-700 tabular-nums">
          ${priceNum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </span>
        <span className="text-right text-gray-700 tabular-nums">{order.sz}</span>
      </div>
      {onCancel && (
        <button
          onClick={handleCancel}
          disabled={canceling}
          title="Cancel order"
          className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {canceling ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <X className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  message,
  sub,
}: {
  icon: React.ReactNode;
  message: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
      {icon}
      <p className="text-sm font-medium text-gray-500">{message}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function SkeletonList({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </>
  );
}
