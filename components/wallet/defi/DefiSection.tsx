'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ChevronDown, RefreshCcw, Search } from 'lucide-react';
import type {
  AaveActionMode,
  AaveChain,
  AavePosition,
  AaveReserve,
} from '@/types/aave';
import { AaveTokenIcon } from './AaveTokenIcon';
import { AaveActionModal } from './AaveActionModal';
import { useAaveMarkets, useAavePositions } from './hooks/useAaveData';

type DefiTab = 'markets' | 'supply' | 'borrow';

const CHAINS: { id: AaveChain; label: string; dot: string }[] = [
  { id: 'ethereum', label: 'Ethereum', dot: '#627EEA' },
  { id: 'polygon', label: 'Polygon', dot: '#8247E5' },
  { id: 'base', label: 'Base', dot: '#0052FF' },
  { id: 'arbitrum', label: 'Arbitrum', dot: '#28A0F0' },
];

// Major assets pinned to the top of the markets list, in this order
const FEATURED_ORDER = [
  'USDC',
  'WETH',
  'WBTC',
  'CBBTC',
  'DAI',
  'LINK',
  'USDT',
  'WSTETH',
  'WPOL',
  'WMATIC',
];

// Rows beyond this scroll inside the card instead of growing the page
const MARKETS_MAX_HEIGHT = 'max-h-[240px]';

// Hide/display-disable rates that would round to 0.00% in the UI.
// Positions in hidden assets still work: lookups use the unfiltered set.
const MIN_DISPLAY_APY = 0.00005;

const formatUsd = (value: number) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });

const formatPct = (value: number) => `${(value * 100).toFixed(2)}%`;

const formatAmount = (value: number) =>
  value.toLocaleString('en-US', { maximumFractionDigits: 6 });

const hasDisplayableSupplyApy = (reserve: AaveReserve) =>
  reserve.supplyApy >= MIN_DISPLAY_APY;

const hasDisplayableBorrowApy = (reserve: AaveReserve) =>
  reserve.borrowingEnabled && reserve.variableBorrowApy >= MIN_DISPLAY_APY;

const hasDisplayableApy = (reserve: AaveReserve) =>
  hasDisplayableSupplyApy(reserve) || hasDisplayableBorrowApy(reserve);

interface DefiSectionProps {
  accessToken: string;
  evmWalletAddress: string | null;
}

interface ModalState {
  mode: AaveActionMode;
  reserve: AaveReserve;
  position?: AavePosition | null;
}

export function DefiSection({
  accessToken,
  evmWalletAddress,
}: DefiSectionProps) {
  const queryClient = useQueryClient();

  const [chain, setChain] = useState<AaveChain>('ethereum');
  const [tab, setTab] = useState<DefiTab>('markets');
  const [chainMenuOpen, setChainMenuOpen] = useState(false);
  const [marketSearch, setMarketSearch] = useState('');
  const [modal, setModal] = useState<ModalState | null>(null);

  const markets = useAaveMarkets(chain);
  const positions = useAavePositions(chain, evmWalletAddress, accessToken);

  const sortedReserves = useMemo(() => {
    const reserves = markets.data?.reserves ?? [];
    const rank = (reserve: AaveReserve) => {
      const index = FEATURED_ORDER.indexOf(reserve.symbol.toUpperCase());
      return index === -1 ? FEATURED_ORDER.length : index;
    };
    return [...reserves].sort(
      (a, b) => rank(a) - rank(b) || a.symbol.localeCompare(b.symbol),
    );
  }, [markets.data?.reserves]);

  const marketReserves = useMemo(
    () =>
      sortedReserves.filter(
        (reserve) => hasDisplayableApy(reserve),
      ),
    [sortedReserves],
  );

  const visibleReserves = useMemo(() => {
    const query = marketSearch.trim().toLowerCase();
    if (!query) return marketReserves;
    return marketReserves.filter(
      (reserve) =>
        reserve.symbol.toLowerCase().includes(query) ||
        reserve.name.toLowerCase().includes(query),
    );
  }, [marketReserves, marketSearch]);

  const reserveBySymbol = useMemo(() => {
    const map = new Map<string, AaveReserve>();
    sortedReserves.forEach((reserve) => map.set(reserve.asset, reserve));
    return map;
  }, [sortedReserves]);

  const activeChain = CHAINS.find((entry) => entry.id === chain)!;
  const account = positions.data?.account ?? null;
  const marketsUnavailable = Boolean(markets.data?.degraded);
  const positionsUnavailable = Boolean(positions.data?.degraded);

  const refreshPositions = () => {
    queryClient.invalidateQueries({ queryKey: ['aave-positions', chain] });
    queryClient.invalidateQueries({ queryKey: ['aave-markets', chain] });
  };

  const openAction = (
    mode: AaveActionMode,
    reserve: AaveReserve,
    position?: AavePosition | null,
  ) => {
    if (!evmWalletAddress) return;
    setModal({ mode, reserve, position });
  };

  const healthBadge =
    account?.healthFactor == null ? null : (
      <span
        className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-full ${
          account.healthFactor >= 2
            ? 'bg-emerald-50 text-emerald-600'
            : account.healthFactor >= 1.1
              ? 'bg-amber-50 text-amber-600'
              : 'bg-red-50 text-red-600'
        }`}
      >
        HF {account.healthFactor.toFixed(2)}
      </span>
    );

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]">
      {/* Tabs + chain selector */}
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-6">
          {(
            [
              ['markets', 'Markets'],
              ['supply', 'Supply'],
              ['borrow', 'Borrow'],
            ] as [DefiTab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === id
                  ? 'text-gray-900 border-gray-900'
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative pb-2">
          <button
            onClick={() => setChainMenuOpen((open) => !open)}
            className="flex items-center gap-2 text-sm font-medium text-gray-800 border border-black/[0.08] rounded-full px-3.5 py-1.5 hover:bg-gray-50 transition-colors"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: activeChain.dot }}
            />
            {activeChain.label}
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {chainMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setChainMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-40 bg-white rounded-xl border border-black/[0.06] shadow-lg overflow-hidden">
                {CHAINS.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => {
                      setChain(entry.id);
                      setChainMenuOpen(false);
                      setMarketSearch('');
                    }}
                    className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors ${
                      entry.id === chain
                        ? 'font-semibold text-gray-900'
                        : 'text-gray-600'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: entry.dot }}
                    />
                    {entry.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="border-b border-black/[0.06]" />

      {tab === 'markets' && (
        <MarketsTab
          loading={markets.isLoading}
          error={markets.error as Error | null}
          onRetry={() => markets.refetch()}
          reserves={visibleReserves}
          totalCount={marketReserves.length}
          search={marketSearch}
          onSearchChange={setMarketSearch}
          walletConnected={Boolean(evmWalletAddress)}
          serviceUnavailable={marketsUnavailable}
          chainLabel={activeChain.label}
          onAction={openAction}
        />
      )}

      {tab === 'supply' && (
        <PositionsTab
          mode="supply"
          loading={positions.isLoading}
          unavailable={positionsUnavailable}
          chainLabel={activeChain.label}
          walletConnected={Boolean(evmWalletAddress)}
          positionsList={positions.data?.supplies ?? []}
          headline={
            account ? (
              <SummaryRow
                items={[
                  {
                    label: 'Total supplied',
                    value: formatUsd(account.totalCollateralUsd),
                  },
                ]}
                badge={healthBadge}
              />
            ) : null
          }
          emptyText="Nothing supplied yet. Supply an asset from Markets to start earning interest."
          onRetry={() => positions.refetch()}
          onBrowseMarkets={() => setTab('markets')}
          actions={(position) => {
            const reserve = reserveBySymbol.get(position.asset);
            return (
              <>
                <RowButton
                  label="Supply"
                  disabled={!reserve || !evmWalletAddress}
                  onClick={() =>
                    reserve && openAction('supply', reserve, position)
                  }
                />
                <RowButton
                  label="Withdraw"
                  disabled={!reserve || !evmWalletAddress}
                  onClick={() =>
                    reserve && openAction('withdraw', reserve, position)
                  }
                />
              </>
            );
          }}
          apyFor={(position) => ({
            value: formatPct(position.supplyApy),
            className: 'text-emerald-600',
            label: 'APY',
          })}
        />
      )}

      {tab === 'borrow' && (
        <PositionsTab
          mode="borrow"
          loading={positions.isLoading}
          unavailable={positionsUnavailable}
          chainLabel={activeChain.label}
          walletConnected={Boolean(evmWalletAddress)}
          positionsList={positions.data?.borrows ?? []}
          headline={
            account ? (
              <SummaryRow
                items={[
                  {
                    label: 'Total debt',
                    value: formatUsd(account.totalDebtUsd),
                  },
                  {
                    label: 'Available to borrow',
                    value: formatUsd(account.availableBorrowsUsd),
                  },
                ]}
                badge={healthBadge}
              />
            ) : null
          }
          emptyText="No open borrows. Supply collateral first, then borrow against it from Markets."
          onRetry={() => positions.refetch()}
          onBrowseMarkets={() => setTab('markets')}
          actions={(position) => {
            const reserve = reserveBySymbol.get(position.asset);
            return (
              <>
                <RowButton
                  label="Borrow"
                  disabled={!reserve || !evmWalletAddress}
                  onClick={() =>
                    reserve && openAction('borrow', reserve, position)
                  }
                />
                <RowButton
                  label="Repay"
                  disabled={!reserve || !evmWalletAddress}
                  onClick={() =>
                    reserve && openAction('repay', reserve, position)
                  }
                />
              </>
            );
          }}
          apyFor={(position) => ({
            value: formatPct(position.variableBorrowApy),
            className: 'text-gray-900',
            label: 'APY',
          })}
        />
      )}

      {modal && evmWalletAddress && markets.data && (
        <AaveActionModal
          mode={modal.mode}
          chain={chain}
          poolAddress={markets.data.poolAddress}
          reserve={modal.reserve}
          userAddress={evmWalletAddress}
          account={account}
          position={modal.position}
          onClose={() => setModal(null)}
          onSuccess={() => {
            // refetch after a short delay so the RPC view catches up
            setTimeout(refreshPositions, 2500);
          }}
        />
      )}
    </div>
  );
}

/* ─── Markets tab ─────────────────────────────────────────────────────────── */

function MarketsTab({
  loading,
  error,
  onRetry,
  reserves,
  totalCount,
  search,
  onSearchChange,
  walletConnected,
  serviceUnavailable,
  chainLabel,
  onAction,
}: {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  reserves: AaveReserve[];
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  walletConnected: boolean;
  serviceUnavailable: boolean;
  chainLabel: string;
  onAction: (mode: AaveActionMode, reserve: AaveReserve) => void;
}) {
  if (loading) return <RowsSkeleton />;

  if (error) {
    return (
      <div className="px-5 py-8 text-center">
        <p className="text-sm text-gray-500">{error.message}</p>
        <button
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-black/[0.08] rounded-full px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          <RefreshCcw className="w-3 h-3" />
          Retry
        </button>
      </div>
    );
  }

  if (serviceUnavailable) {
    return (
      <AaveUnavailableState
        chainLabel={chainLabel}
        onRetry={onRetry}
      />
    );
  }

  return (
    <div>
      <div className="px-5 pt-3">
        <div className="flex items-center gap-2 rounded-xl border border-black/[0.06] bg-gray-50 px-3 py-2">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={`Search ${totalCount} assets — PYUSD, wstETH, GHO…`}
            className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_120px_120px_170px] items-center px-5 py-2.5 font-mono text-[11px] uppercase tracking-wider text-gray-400">
        <span>Asset</span>
        <span className="text-right">Supply APY</span>
        <span className="text-right">Borrow APY</span>
        <span />
      </div>

      {reserves.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-gray-500">
          No assets match “{search}”.
        </p>
      )}

      <div
        className={`${MARKETS_MAX_HEIGHT} overflow-y-auto overscroll-contain`}
      >
        {reserves.map((reserve) => (
          <MarketRow
            key={reserve.asset}
            reserve={reserve}
            walletConnected={walletConnected}
            onAction={onAction}
          />
        ))}
      </div>

      <p className="px-5 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-gray-300 border-t border-black/[0.04]">
        {reserves.length} of {totalCount} assets
      </p>
    </div>
  );
}

function MarketRow({
  reserve,
  walletConnected,
  onAction,
}: {
  reserve: AaveReserve;
  walletConnected: boolean;
  onAction: (mode: AaveActionMode, reserve: AaveReserve) => void;
}) {
  const canSupply = walletConnected && hasDisplayableSupplyApy(reserve);
  const canBorrow = walletConnected && hasDisplayableBorrowApy(reserve);

  return (
    <div className="grid grid-cols-[1fr_120px_120px_170px] items-center px-5 py-3 border-t border-black/[0.04] hover:bg-gray-50/60 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <AaveTokenIcon symbol={reserve.symbol} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {reserve.symbol}
          </p>
          <p className="text-xs text-gray-400 truncate">{reserve.name}</p>
        </div>
      </div>
      <span className="text-right font-mono text-sm text-emerald-600">
        {hasDisplayableSupplyApy(reserve)
          ? formatPct(reserve.supplyApy)
          : '—'}
      </span>
      <span className="text-right font-mono text-sm text-gray-900">
        {hasDisplayableBorrowApy(reserve)
          ? formatPct(reserve.variableBorrowApy)
          : '—'}
      </span>
      <div className="flex items-center justify-end gap-2">
        <RowButton
          label="Supply"
          disabled={!canSupply}
          onClick={() => onAction('supply', reserve)}
        />
        <RowButton
          label="Borrow"
          disabled={!canBorrow}
          onClick={() => onAction('borrow', reserve)}
        />
      </div>
    </div>
  );
}

/* ─── Supply / Borrow positions tab ───────────────────────────────────────── */

function PositionsTab({
  mode,
  loading,
  unavailable,
  chainLabel,
  walletConnected,
  positionsList,
  headline,
  emptyText,
  onRetry,
  onBrowseMarkets,
  actions,
  apyFor,
}: {
  mode: 'supply' | 'borrow';
  loading: boolean;
  unavailable: boolean;
  chainLabel: string;
  walletConnected: boolean;
  positionsList: AavePosition[];
  headline: React.ReactNode;
  emptyText: string;
  onRetry: () => void;
  onBrowseMarkets: () => void;
  actions: (position: AavePosition) => React.ReactNode;
  apyFor: (position: AavePosition) => {
    value: string;
    className: string;
    label: string;
  };
}) {
  if (!walletConnected) {
    return (
      <p className="px-5 py-8 text-center text-sm text-gray-500">
        Connect an EVM wallet to view your {mode} positions.
      </p>
    );
  }

  if (loading) return <RowsSkeleton rows={2} />;

  if (unavailable) {
    return (
      <AaveUnavailableState
        chainLabel={chainLabel}
        onRetry={onRetry}
      />
    );
  }

  return (
    <div>
      {headline}
      {positionsList.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-500">{emptyText}</p>
          <button
            onClick={onBrowseMarkets}
            className="mt-3 text-xs font-semibold text-gray-700 border border-black/[0.08] rounded-full px-3.5 py-1.5 hover:bg-gray-50 transition-colors"
          >
            Browse markets
          </button>
        </div>
      ) : (
        positionsList.map((position) => {
          const apy = apyFor(position);
          return (
            <div
              key={position.asset}
              className="grid grid-cols-[1fr_150px_110px_170px] items-center px-5 py-3 border-t border-black/[0.04]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <AaveTokenIcon symbol={position.symbol} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {position.symbol}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {position.name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm text-gray-900">
                  {formatAmount(position.amount)}
                </p>
                <p className="font-mono text-xs text-gray-400">
                  {formatUsd(position.usdValue)}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-mono text-sm ${apy.className}`}>
                  {apy.value}
                </p>
                <p className="font-mono text-[10px] uppercase text-gray-400">
                  {apy.label}
                </p>
              </div>
              <div className="flex items-center justify-end gap-2">
                {actions(position)}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ─── Shared bits ─────────────────────────────────────────────────────────── */

function AaveUnavailableState({
  chainLabel,
  onRetry,
}: {
  chainLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="px-5 py-8 text-center">
      <AlertCircle className="mx-auto mb-2 h-4 w-4 text-amber-500" />
      <p className="text-sm font-medium text-gray-700">
        Aave data is temporarily unavailable on {chainLabel}.
      </p>
      <p className="mx-auto mt-1 max-w-md text-xs text-gray-400">
        The RPC provider is rate-limited right now. Your wallet is still
        connected; retry after the provider recovers.
      </p>
      <button
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-black/[0.08] rounded-full px-3 py-1.5 hover:bg-gray-50 transition-colors"
      >
        <RefreshCcw className="w-3 h-3" />
        Retry
      </button>
    </div>
  );
}

function SummaryRow({
  items,
  badge,
}: {
  items: { label: string; value: string }[];
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-6 px-5 py-3">
      {items.map((item) => (
        <div key={item.label}>
          <p className="font-mono text-[10px] uppercase tracking-wider text-gray-400">
            {item.label}
          </p>
          <p className="text-sm font-semibold text-gray-900">{item.value}</p>
        </div>
      ))}
      {badge && <div className="ml-auto">{badge}</div>}
    </div>
  );
}

function RowButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-xs font-semibold text-gray-700 border border-black/[0.08] rounded-full px-3.5 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  );
}

function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="px-5 py-3 space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 animate-pulse">
          <div className="w-[34px] h-[34px] rounded-full bg-gray-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 bg-gray-100 rounded" />
            <div className="h-2.5 w-16 bg-gray-100 rounded" />
          </div>
          <div className="h-3 w-14 bg-gray-100 rounded" />
          <div className="h-3 w-14 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}
