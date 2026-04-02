'use client';

import { Zap, TrendingUp, TrendingDown, AlertTriangle, ArrowDownToLine } from 'lucide-react';
import { useHyperliquidPositions } from './hooks/useHyperliquidPositions';
import { useAllMids } from './hooks/useHyperliquidWebSocket';
import { formatPrice, formatPnl, getLiquidationRisk } from '@/services/hyperliquid/types';

interface PerpsCardProps {
  /** The user's external wallet address = Hyperliquid master account */
  masterAddress: string | undefined;
  onOpenTrading: () => void;
  onOpenDeposit: () => void;
}

/**
 * PerpsCard
 *
 * Dashboard card that replaces the "Coming Soon" placeholder in WalletContent.
 * Shows a summary of the user's Hyperliquid account:
 *  - Total account value + unrealized PnL
 *  - Up to 3 open positions with live prices from WebSocket
 *  - Liquidation risk warnings
 *  - "Trade →" button to open the full PerpsPanel
 */
export function PerpsCard({ masterAddress, onOpenTrading, onOpenDeposit }: PerpsCardProps) {
  const { data, isLoading } = useHyperliquidPositions(masterAddress ?? null);
  const { mids } = useAllMids(!!masterAddress);

  const accountValue = parseFloat(data?.accountValue ?? '0');
  const unrealizedPnl = parseFloat(data?.unrealizedPnl ?? '0');
  const positions = data?.positions ?? [];
  const hasPositions = positions.length > 0;

  // Check if any position is in danger
  const hasDanger = positions.some(
    (p) => getLiquidationRisk(p) === 'danger',
  );

  return (
    <div
      className={`bg-white rounded-xl p-4 flex flex-col min-h-[380px] drop-shadow-lg transition-all ${
        hasDanger ? 'ring-2 ring-red-300 ring-offset-1' : ''
      }`}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-700">Perps Balance</span>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
            HL
          </span>
          {hasDanger && (
            <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full font-medium animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              Liq Risk
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {masterAddress && (
            <button
              onClick={() => onOpenDeposit()}
              className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:text-blue-700 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg"
            >
              <ArrowDownToLine className="w-3 h-3" />
              Deposit
            </button>
          )}
          <button
            onClick={onOpenTrading}
            className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition-colors bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg"
          >
            Trade →
          </button>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : !masterAddress ? (
        <NoWalletState onOpenTrading={onOpenTrading} />
      ) : (
        <>
          {/* Account Value + PnL */}
          <div className="mb-4">
            <p className="text-3xl font-bold text-gray-900">
              ${accountValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-gray-400">Account Value</p>
              {unrealizedPnl !== 0 && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    unrealizedPnl >= 0
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-red-50 text-red-500'
                  }`}
                >
                  {formatPnl(unrealizedPnl).value} PnL
                </span>
              )}
            </div>
          </div>

          {/* Positions list */}
          {hasPositions ? (
            <div className="space-y-2 flex-1">
              {positions.slice(0, 3).map((pos) => {
                const isLong = parseFloat(pos.szi) > 0;
                const pnl = formatPnl(pos.unrealizedPnl);
                const risk = getLiquidationRisk(pos);
                const livePrice = mids[pos.coin] ?? '0';

                return (
                  <button
                    key={pos.coin}
                    onClick={onOpenTrading}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isLong ? 'bg-emerald-100' : 'bg-red-100'
                        }`}
                      >
                        {isLong ? (
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-gray-800">
                            {pos.coin}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                              isLong
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {isLong ? 'LONG' : 'SHORT'} {pos.leverage.value}x
                          </span>
                          {risk !== 'safe' && (
                            <AlertTriangle
                              className={`w-3 h-3 ${
                                risk === 'danger'
                                  ? 'text-red-500 animate-pulse'
                                  : 'text-amber-500'
                              }`}
                            />
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          ${formatPrice(livePrice || pos.entryPx)} mark
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        pnl.isPositive ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {pnl.value}
                    </span>
                  </button>
                );
              })}

              {positions.length > 3 && (
                <button
                  onClick={onOpenTrading}
                  className="w-full text-xs text-gray-400 hover:text-emerald-600 text-center py-1.5 transition-colors"
                >
                  +{positions.length - 3} more position{positions.length - 3 > 1 ? 's' : ''} →
                </button>
              )}
            </div>
          ) : (
            <NoPositionsState
              accountValue={accountValue}
              onOpenTrading={onOpenTrading}
              onDeposit={() => onOpenDeposit()}
            />
          )}
        </>
      )}

    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex-1 space-y-3">
      <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
      <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

function NoWalletState({ onOpenTrading }: { onOpenTrading: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
        <Zap className="w-6 h-6 text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">Connect Your Wallet</p>
        <p className="text-xs text-gray-400 mt-1">
          Connect MetaMask or WalletConnect to start trading perps
        </p>
      </div>
      <button
        onClick={onOpenTrading}
        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl transition-colors"
      >
        Get Started
      </button>
    </div>
  );
}

function NoPositionsState({
  accountValue,
  onOpenTrading,
  onDeposit,
}: {
  accountValue: number;
  onOpenTrading: () => void;
  onDeposit: () => void;
}) {
  const hasBalance = accountValue > 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
        <TrendingUp className="w-6 h-6 text-emerald-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">
          {hasBalance ? 'No Open Positions' : 'Fund Your Account'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {hasBalance
            ? 'Trade BTC, ETH, SOL and 100+ perpetuals'
            : 'Deposit USDC from Arbitrum to start trading'}
        </p>
      </div>

      {hasBalance ? (
        <button
          onClick={onOpenTrading}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-emerald-200"
        >
          Start Trading
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onDeposit}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-200"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Deposit USDC
          </button>
          <button
            onClick={onOpenTrading}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium rounded-xl transition-colors"
          >
            Trade →
          </button>
        </div>
      )}
    </div>
  );
}
