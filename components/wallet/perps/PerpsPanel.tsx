'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import * as hl from '@nktkas/hyperliquid';
import { HL_IS_TESTNET, getHLApiUrl } from '@/services/hyperliquid/config';

// Hooks
import {
  useHyperliquidMarkets,
  useMarketByCoins,
} from './hooks/useHyperliquidMarkets';
import { useHyperliquidPositions } from './hooks/useHyperliquidPositions';
import { useHyperliquidPortfolio } from './hooks/useHyperliquidPortfolio';
import { useHyperliquidTrading } from './hooks/useHyperliquidTrading';
import { useHyperliquidDexTransfer } from './hooks/useHyperliquidDexTransfer';
import {
  useAllMids,
  useUserFills,
} from './hooks/useHyperliquidWebSocket';
import type { DepositCheckStatus } from './hooks/useHyperliquidBalanceCheck';

// Components
import { AgentSetupModal } from './AgentSetupModal';
import { TradingForm } from './TradingForm';
import { PerpsHeader } from './PerpsHeader';
import { ChartPanel } from './ChartPanel';
import { PositionsTable, type PerpsFill } from './PositionsTable';
import { AccountCard } from './AccountCard';
import { RecentFillsCard } from './RecentFillsCard';
import { MarketSearchModal } from './MarketSearchModal';

import type {
  HLMarket,
  HLPosition,
} from '@/services/hyperliquid/types';
import type {
  AgentActionCompletion,
  HyperliquidAgentOrderPrefill,
} from '@/lib/chat/agentActionHandoff';
import { useUser } from '@/lib/UserContext';
import {
  buildPerpsPositionKey,
  reconcilePerpsPositionFeed,
  toPerpsFeedNumber,
  upsertPerpsPositionFeed,
} from '@/lib/perps/perpsFeed';

interface PerpsPanelProps {
  agentClient: hl.ExchangeClient | null;
  masterClient: hl.ExchangeClient | null;
  masterAddress: string | null;
  isInitialized: boolean;
  isInitializing: boolean;
  isReconnecting: boolean;
  /** True until the agent hook has had a chance to rehydrate a saved key. */
  isHydrating: boolean;
  agentError: string | null;
  initializeAgent: () => Promise<hl.ExchangeClient | null>;
  onClose: () => void;
  onOpenDeposit: () => void;
  depositStatus: DepositCheckStatus;
  onRecheckBalance: () => void;
  /** Coin to focus on when the panel opens (e.g. user clicked an ETH row in PerpsCard) */
  initialCoin?: string | null;
  /** Approved agent proposal defaults. The ticket still requires user review/confirm. */
  agentOrderPrefill?: HyperliquidAgentOrderPrefill | null;
  onAgentActionComplete?: (completion: AgentActionCompletion) => void;
}

interface HyperliquidUserFill {
  coin?: string;
  px?: string;
  sz?: string;
  side?: 'B' | 'A';
  time?: number;
  startPosition?: string;
  closedPnl?: string;
  dir?: string;
  hash?: string;
  oid?: number | string;
  liquidation?: {
    liquidatedUser?: string;
    markPx?: string;
    method?: string;
  };
}

const fillsTransport = new hl.HttpTransport({
  isTestnet: HL_IS_TESTNET,
  apiUrl: getHLApiUrl(HL_IS_TESTNET),
});
const fillsInfoClient = new hl.InfoClient({ transport: fillsTransport });

function getUserEventFills(data: unknown): HyperliquidUserFill[] {
  if (!data || typeof data !== 'object') return [];
  const fills = (data as { fills?: unknown }).fills;
  return Array.isArray(fills) ? (fills as HyperliquidUserFill[]) : [];
}

function getFillTimestamp(fill: HyperliquidUserFill) {
  const milliseconds = Number(fill.time);
  return Number.isFinite(milliseconds)
    ? new Date(milliseconds).toISOString()
    : new Date().toISOString();
}

function fillKeyFor(f: PerpsFill) {
  return `${f.hash ?? ''}:${f.oid ?? ''}:${f.coin}:${f.time}:${f.px}:${f.sz}`;
}

/**
 * PerpsPanel — full-screen perps trading dashboard. "Fresh" two-column layout:
 *
 *   ┌────────────────────────────────────────────────────────┐
 *   │ Header (back · identity · price · stats)                │
 *   ├──────────────────────────────────┬─────────────────────┤
 *   │ Chart                            │ Trade ticket        │
 *   │ Positions / Orders / History     │ Account · Recent    │
 *   └──────────────────────────────────┴─────────────────────┘
 *
 * Market switching happens through a command-palette modal (MarketSearchModal)
 * rather than a persistent left rail.
 */
export function PerpsPanel({
  agentClient,
  masterClient,
  masterAddress,
  isInitialized,
  isInitializing,
  isReconnecting,
  isHydrating,
  agentError,
  initializeAgent,
  onClose,
  onOpenDeposit,
  depositStatus,
  onRecheckBalance,
  initialCoin,
  agentOrderPrefill,
  onAgentActionComplete,
}: PerpsPanelProps) {
  const { toast } = useToast();
  const { accessToken, user, primaryMicrosite } = useUser();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const syncedPositionSnapshotsRef = useRef<Set<string>>(new Set());
  const syncedLiquidationFillsRef = useRef<Set<string>>(new Set());
  const reconciledPositionSnapshotsRef = useRef<Set<string>>(new Set());

  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showMarketSearch, setShowMarketSearch] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<string | null>(
    initialCoin ?? 'BTC',
  );
  const [closingCoin, setClosingCoin] = useState<string | null>(null);
  const [activeTimeframe, setActiveTimeframe] = useState<string>('15m');
  const [tradeLeverage, setTradeLeverage] = useState({
    value: 10,
    isCross: true,
  });
  const [fills, setFills] = useState<PerpsFill[]>([]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    scrollContainerRef.current?.scrollTo({ top: 0 });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const requestedCoin = agentOrderPrefill?.coin || initialCoin;
    if (requestedCoin) setSelectedCoin(requestedCoin);
  }, [agentOrderPrefill?.coin, initialCoin]);

  // Seed historical fills (the WS `user` channel only streams *new* fills, never
  // a snapshot — so Recent fills + Trade history would stay empty without this).
  useEffect(() => {
    if (!masterAddress) return;
    let cancelled = false;

    (async () => {
      try {
        const history = await fillsInfoClient.userFills({
          user: masterAddress as `0x${string}`,
        });
        if (cancelled || !Array.isArray(history)) return;

        setFills((prev) => {
          const merged = new Map<string, PerpsFill>();
          const add = (f: PerpsFill) => merged.set(fillKeyFor(f), f);
          prev.forEach(add);
          (history as HyperliquidUserFill[]).forEach((f) => {
            if (!f.coin || !f.side || f.px == null || f.sz == null) return;
            add({
              coin: f.coin,
              side: f.side,
              px: f.px,
              sz: f.sz,
              time: Number(f.time) || Date.now(),
              closedPnl: f.closedPnl,
              hash: f.hash,
              oid: f.oid,
              dir: f.dir,
            });
          });
          return Array.from(merged.values())
            .sort((a, b) => b.time - a.time)
            .slice(0, 50);
        });
      } catch (err) {
        console.warn('Failed to fetch historical perps fills:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [masterAddress]);

  // Re-open AgentSetupModal once a deposit settles.
  useEffect(() => {
    if (
      depositStatus === 'ready' &&
      !isInitialized &&
      !isInitializing &&
      !isReconnecting
    ) {
      setShowAgentModal(true);
    }
  }, [depositStatus, isInitialized, isInitializing, isReconnecting]);

  // Show setup only after silent rehydrate has had a chance to restore a saved
  // agent. isHydrating stays true until the hook has actually attempted that, so
  // the modal no longer flashes open on every page load / redeploy before the
  // persisted agent key has been picked up.
  useEffect(() => {
    if (isInitialized) {
      setShowAgentModal(false);
      return;
    }
    if (!isInitializing && !isReconnecting && !isHydrating)
      setShowAgentModal(true);
  }, [isInitialized, isInitializing, isReconnecting, isHydrating]);

  const handleOpenDepositFromAgentModal = useCallback(() => {
    setShowAgentModal(false);
    onOpenDeposit();
  }, [onOpenDeposit]);

  // Data
  const { data: markets = [] } = useHyperliquidMarkets();
  const effectiveMaster = masterAddress;
  const { data: accountData, refetch: refetchPositions } =
    useHyperliquidPositions(effectiveMaster);

  const { mids } = useAllMids(true);

  // Coin → mark price from the polled markets feed. Used as a fallback for the
  // positions table when the live `allMids` map has no entry for a coin yet
  // (WS connecting/dropped) — mirrors the header's `selectedMarket?.markPrice`
  // fallback so the Mark column never silently shows the entry price.
  const marketMarks = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of markets) {
      if (m.markPrice && m.markPrice !== '0') map[m.coin] = m.markPrice;
    }
    return map;
  }, [markets]);

  const { connected: fillsConnected } = useUserFills(
    effectiveMaster,
    useCallback((data: unknown) => {
      const smartsiteId = user?.primaryMicrosite || primaryMicrosite;
      const fillsList = getUserEventFills(data);

      // Accumulate fills for the Trade history + Recent fills views.
      if (fillsList.length > 0) {
        setFills((prev) => {
          const merged = new Map<string, PerpsFill>();
          const add = (f: PerpsFill) => merged.set(fillKeyFor(f), f);
          prev.forEach(add);
          fillsList.forEach((f) => {
            if (!f.coin || !f.side || f.px == null || f.sz == null) return;
            add({
              coin: f.coin,
              side: f.side,
              px: f.px,
              sz: f.sz,
              time: Number(f.time) || Date.now(),
              closedPnl: f.closedPnl,
              hash: f.hash,
              oid: f.oid,
              dir: f.dir,
            });
          });
          return Array.from(merged.values())
            .sort((a, b) => b.time - a.time)
            .slice(0, 50);
        });
      }

      if (accessToken && user?._id && smartsiteId && masterAddress) {
        fillsList.forEach((fill) => {
          if (!fill.liquidation || !fill.coin) return;

          const fillKey = [
            fill.hash,
            fill.oid,
            fill.coin,
            fill.time,
            fill.liquidation.markPx,
          ].join(':');
          if (syncedLiquidationFillsRef.current.has(fillKey)) return;
          syncedLiquidationFillsRef.current.add(fillKey);

          const position = accountData?.positions.find(
            (item) => item.coin === fill.coin,
          );
          const startSize = toPerpsFeedNumber(fill.startPosition);
          const isLong =
            position
              ? toPerpsFeedNumber(position.szi) > 0
              : startSize >= 0;
          const exitPrice = toPerpsFeedNumber(
            fill.liquidation.markPx || fill.px || position?.entryPx,
          );
          const entryPrice = toPerpsFeedNumber(
            position?.entryPx || fill.px || exitPrice,
          );
          const leverage = position?.leverage.value || tradeLeverage.value;
          const sizeCoins = Math.abs(
            toPerpsFeedNumber(position?.szi || fill.startPosition || fill.sz),
          );
          const realizedPnl = toPerpsFeedNumber(fill.closedPnl);
          const fallbackReturnPct =
            entryPrice > 0 && exitPrice > 0
              ? ((isLong ? exitPrice - entryPrice : entryPrice - exitPrice) /
                  entryPrice) *
                leverage *
                100
              : 0;
          const returnPct =
            position?.returnOnEquity !== undefined
              ? toPerpsFeedNumber(position.returnOnEquity) * 100
              : fallbackReturnPct;
          const timestamp = getFillTimestamp(fill);

          upsertPerpsPositionFeed({
            token: accessToken,
            userId: user._id,
            smartsiteId,
            content: {
              provider: 'hyperliquid',
              positionKey: buildPerpsPositionKey({
                userId: user._id,
                masterAddress,
                coin: fill.coin,
              }),
              coin: fill.coin,
              side: isLong ? 'long' : 'short',
              status: 'liquidated',
              event: 'liquidate',
              leverage,
              marginMode:
                position?.leverage.type === 'isolated' ? 'isolated' : 'cross',
              entryPrice,
              markPrice: exitPrice,
              exitPrice,
              liquidationPrice: exitPrice,
              collateralUsd: toPerpsFeedNumber(position?.marginUsed),
              notionalUsd:
                toPerpsFeedNumber(position?.positionValue) ||
                sizeCoins * exitPrice,
              sizeCoins,
              returnPct,
              unrealizedPnl: realizedPnl,
              realizedPnl,
              orderId:
                fill.oid === undefined || fill.oid === null
                  ? undefined
                  : String(fill.oid),
              masterAddress,
              updatedAt: timestamp,
              closedAt: timestamp,
              liquidatedAt: timestamp,
            },
          }).catch((feedError) => {
            console.warn(
              'Failed to update liquidated perps feed card:',
              feedError,
            );
          });
        });
      }

      refetchPositions();
    }, [
      accessToken,
      accountData?.positions,
      masterAddress,
      primaryMicrosite,
      refetchPositions,
      tradeLeverage.value,
      user?._id,
      user?.primaryMicrosite,
    ]),
    !!effectiveMaster,
  );

  // Trading
  const {
    placeMarketOrder,
    placeLimitOrder,
    placeTpSlOrder,
    updateLeverage,
    closePosition,
    isSubmitting,
    error: tradeError,
    clearError,
  } = useHyperliquidTrading(agentClient);

  const selectedMarket = useMarketByCoins(markets, selectedCoin);
  const liveMarkPrice = selectedCoin
    ? (mids[selectedCoin] ?? selectedMarket?.markPrice ?? '0')
    : '0';

  // Builder-deployed (HIP-3) perps keep their collateral in a DEX-specific
  // account, separate from the main USDC perp account. To present ONE perps
  // wallet, aggregate positions + balances across the main DEX and every
  // builder DEX. `perDex` exposes each DEX's own balance for the trade ticket.
  const selectedDex = selectedMarket?.dex?.trim() || '';
  const builderDexes = useMemo(() => {
    const set = new Set<string>();
    for (const m of markets) {
      const d = (m as { dex?: string }).dex?.trim();
      if (d) set.add(d);
    }
    return Array.from(set);
  }, [markets]);

  const { data: portfolio, refetch: refetchPortfolio } =
    useHyperliquidPortfolio(effectiveMaster, builderDexes, {
      enabled: !!effectiveMaster,
    });

  // The account that backs the *currently selected* market — used for the trade
  // ticket's balance display, margin check, and auto-funding math.
  const tradeAccount = portfolio?.perDex?.[selectedDex] ?? accountData;

  // Move USDC from the main perp account into the selected builder DEX so the
  // user can fund HIP-3 trades. Master-signed (the agent cannot move funds).
  const {
    transferToDex,
    sweepDexToMain,
    isTransferring,
    error: transferError,
  } = useHyperliquidDexTransfer({ masterClient, masterAddress: effectiveMaster });

  const handleTransferToDex = useCallback(
    async (amountUsd: number) => {
      if (!selectedDex) return;
      await transferToDex(selectedDex, amountUsd);
      await Promise.all([refetchPortfolio(), refetchPositions()]);
    },
    [selectedDex, transferToDex, refetchPortfolio, refetchPositions],
  );

  // Aggregated positions/orders across all DEXs (so a builder-DEX position like
  // SPCX shows up in the table, not just main-DEX positions).
  const allPositions = portfolio?.positions ?? accountData?.positions ?? [];
  const allOpenOrders = portfolio?.openOrders ?? accountData?.openOrders ?? [];

  const existingPosition = allPositions.find(
    (p) => p.coin === selectedCoin,
  );

  useEffect(() => {
    const positions = accountData?.positions || [];
    const smartsiteId = user?.primaryMicrosite || primaryMicrosite;

    if (
      !accountData ||
      !accessToken ||
      !user?._id ||
      !smartsiteId ||
      !masterAddress
    ) {
      return;
    }

    const activePositionKeys = positions.map((position) =>
      buildPerpsPositionKey({
        userId: user._id,
        masterAddress,
        coin: position.coin,
      }),
    );
    const reconcileSnapshotKey = [
      masterAddress,
      Object.keys(mids).length > 0 ? 'mids-ready' : 'mids-pending',
      ...activePositionKeys.map((key) => key.toLowerCase()).sort(),
    ].join(':');

    if (!reconciledPositionSnapshotsRef.current.has(reconcileSnapshotKey)) {
      reconciledPositionSnapshotsRef.current.add(reconcileSnapshotKey);
      reconcilePerpsPositionFeed({
        token: accessToken,
        userId: user._id,
        smartsiteId,
        masterAddress,
        activePositionKeys,
        markPricesByCoin: mids,
      }).catch((feedError) => {
        reconciledPositionSnapshotsRef.current.delete(reconcileSnapshotKey);
        console.warn('Failed to reconcile perps feed cards:', feedError);
      });
    }

    positions.forEach((position) => {
      const positionKey = buildPerpsPositionKey({
        userId: user._id,
        masterAddress,
        coin: position.coin,
      });
      const snapshotKey = [
        positionKey,
        position.szi,
        position.entryPx,
        position.marginUsed,
        position.positionValue,
        position.leverage.value,
        position.leverage.type,
      ].join(':');

      if (syncedPositionSnapshotsRef.current.has(snapshotKey)) return;
      syncedPositionSnapshotsRef.current.add(snapshotKey);

      const isLong = toPerpsFeedNumber(position.szi) > 0;
      const markPrice = toPerpsFeedNumber(
        mids[position.coin] || position.entryPx,
      );
      const timestamp = new Date().toISOString();

      upsertPerpsPositionFeed({
        token: accessToken,
        userId: user._id,
        smartsiteId,
        content: {
          provider: 'hyperliquid',
          positionKey,
          coin: position.coin,
          side: isLong ? 'long' : 'short',
          status: 'open',
          event: 'open',
          leverage: position.leverage.value,
          marginMode:
            position.leverage.type === 'isolated' ? 'isolated' : 'cross',
          entryPrice: toPerpsFeedNumber(position.entryPx),
          markPrice,
          liquidationPrice: position.liquidationPx
            ? toPerpsFeedNumber(position.liquidationPx)
            : null,
          collateralUsd: toPerpsFeedNumber(position.marginUsed),
          notionalUsd: toPerpsFeedNumber(position.positionValue),
          sizeCoins: Math.abs(toPerpsFeedNumber(position.szi)),
          returnPct: toPerpsFeedNumber(position.returnOnEquity) * 100,
          unrealizedPnl: toPerpsFeedNumber(position.unrealizedPnl),
          masterAddress,
          openedAt: timestamp,
          updatedAt: timestamp,
        },
      }).catch((feedError) => {
        console.warn('Failed to backfill perps feed card:', feedError);
      });
    });
  }, [
    accountData,
    accessToken,
    user?._id,
    user?.primaryMicrosite,
    primaryMicrosite,
    masterAddress,
    mids,
  ]);

  const handleMarketSelect = useCallback((market: HLMarket) => {
    setSelectedCoin(market.coin);
  }, []);

  const handleSelectCoin = useCallback((coin: string) => {
    setSelectedCoin(coin);
  }, []);

  const handleClosePosition = useCallback(
    async (position: HLPosition) => {
      setClosingCoin(position.coin);
      try {
        const isLong = parseFloat(position.szi) > 0;
        // Resolve the market for THIS position's coin — never the ticket's
        // currently-selected coin. Mixing one asset's index/price with
        // another's makes Hyperliquid reject the order as ">95% away from
        // the reference price".
        const positionMarket = markets.find((m) => m.coin === position.coin);
        if (!positionMarket) {
          throw new Error(
            `No market found for ${position.coin} — cannot close position.`,
          );
        }
        // Price off the position's own coin only. Fall back to its market
        // mark, then its entry price — but never liveMarkPrice (the selected
        // ticket coin, which may be a different asset).
        const livePrice =
          mids[position.coin] ??
          positionMarket.markPrice ??
          position.entryPx;
        const orderResult = await closePosition(
          positionMarket.index,
          Math.abs(parseFloat(position.szi)).toString(),
          isLong,
          livePrice,
        );
        const timestamp = new Date().toISOString();
        upsertPerpsPositionFeed({
          token: accessToken,
          userId: user?._id,
          smartsiteId: user?.primaryMicrosite || primaryMicrosite,
          content: {
            provider: 'hyperliquid',
            positionKey: buildPerpsPositionKey({
              userId: user?._id,
              masterAddress,
              coin: position.coin,
            }),
            coin: position.coin,
            side: isLong ? 'long' : 'short',
            status: 'closed',
            event: 'close',
            leverage: position.leverage.value,
            marginMode:
              position.leverage.type === 'isolated' ? 'isolated' : 'cross',
            entryPrice: toPerpsFeedNumber(position.entryPx),
            markPrice: toPerpsFeedNumber(livePrice || position.entryPx),
            exitPrice: toPerpsFeedNumber(livePrice || position.entryPx),
            liquidationPrice: position.liquidationPx
              ? toPerpsFeedNumber(position.liquidationPx)
              : null,
            collateralUsd: toPerpsFeedNumber(position.marginUsed),
            notionalUsd: toPerpsFeedNumber(position.positionValue),
            sizeCoins: Math.abs(toPerpsFeedNumber(position.szi)),
            returnPct: toPerpsFeedNumber(position.returnOnEquity) * 100,
            unrealizedPnl: toPerpsFeedNumber(position.unrealizedPnl),
            orderId: extractPerpsOrderId(orderResult),
            masterAddress,
            updatedAt: timestamp,
            closedAt: timestamp,
          },
        }).catch((feedError) => {
          console.warn('Failed to update perps feed card:', feedError);
        });
        toast({
          title: 'Position closed',
          description: `${isLong ? 'Long' : 'Short'} ${position.coin} position closed successfully`,
        });
        refetchPositions();

        // One perps wallet: if this was a builder-DEX position, sweep the freed
        // collateral back to the main account so funds re-pool and can be used
        // for any market next time.
        const positionDex = positionMarket.dex?.trim() || '';
        if (positionDex) {
          try {
            const refreshed = await refetchPortfolio();
            const freed =
              parseFloat(
                refreshed.data?.perDex?.[positionDex]?.withdrawable ?? '0',
              ) || 0;
            if (freed > 0.01) {
              await sweepDexToMain(positionDex, freed);
              await refetchPortfolio();
            }
          } catch (sweepErr) {
            console.warn('Sweep-back to main failed:', sweepErr);
          }
        }
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Close failed',
          description:
            err instanceof Error
              ? err.message
              : 'Failed to close position',
        });
      } finally {
        setClosingCoin(null);
      }
    },
    [
      closePosition,
      markets,
      mids,
      toast,
      refetchPositions,
      refetchPortfolio,
      sweepDexToMain,
      accessToken,
      user?._id,
      user?.primaryMicrosite,
      primaryMicrosite,
      masterAddress,
    ],
  );

  const handleInitAgent = useCallback(async () => {
    try {
      await initializeAgent();
      setShowAgentModal(false);
      toast({
        title: 'Trading enabled',
        description:
          'Agent wallet connected. You can now place orders instantly.',
      });
    } catch {
      // surfaced in modal
    }
  }, [initializeAgent, toast]);

  useEffect(() => {
    if (tradeError) {
      toast({
        variant: 'destructive',
        title: 'Order failed',
        description: tradeError,
      });
    }
  }, [tradeError, toast]);

  return (
    <>
      <div
        className="fixed inset-0 z-[90] flex h-dvh flex-col overflow-hidden"
        style={{ background: '#ecebe6' }}
      >
        {/* ── Body (scrollable) ───────────────────────────────── */}
        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="max-w-[1380px] mx-auto px-5 py-5 space-y-3">
            {/* Header */}
            <PerpsHeader
              market={selectedMarket ?? null}
              markPrice={liveMarkPrice}
              isCross={tradeLeverage.isCross}
              onBack={onClose}
              onOpenMarketSearch={() => setShowMarketSearch(true)}
            />

            {/* Two-column body */}
            <div className="grid gap-3 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
              {/* Left — chart + positions */}
              <div className="space-y-3 min-w-0">
                <div className="h-[460px]">
                  <ChartPanel
                    coin={selectedCoin}
                    interval={activeTimeframe}
                    onIntervalChange={setActiveTimeframe}
                  />
                </div>

                <PositionsTable
                  positions={allPositions}
                  openOrders={allOpenOrders}
                  fills={fills}
                  mids={mids}
                  marketMarks={marketMarks}
                  connected={fillsConnected}
                  closingCoin={closingCoin}
                  onClosePosition={handleClosePosition}
                  onSelectCoin={handleSelectCoin}
                />
              </div>

              {/* Right — ticket + account + recent fills */}
              <div className="space-y-3">
                <div className="bg-white border border-black/[0.06] rounded-[18px] p-[18px] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]">
                  <TradingForm
                    market={selectedMarket ?? null}
                    markPrice={liveMarkPrice}
                    existingPosition={existingPosition}
                    accountValue={tradeAccount?.accountValue ?? '0'}
                    availableMargin={tradeAccount?.withdrawable ?? '0'}
                    isAgentReady={isInitialized}
                    isSubmitting={isSubmitting}
                    error={tradeError}
                    onLeverageChange={(value, isCross) =>
                      setTradeLeverage({ value, isCross })
                    }
                    onPlaceMarket={placeMarketOrder}
                    onPlaceLimit={placeLimitOrder}
                    onPlaceTpSl={placeTpSlOrder}
                    onUpdateLeverage={updateLeverage}
                    onClearError={clearError}
                    onOpenDeposit={onOpenDeposit}
                    onAgentActionComplete={onAgentActionComplete}
                    agentOrderPrefill={agentOrderPrefill}
                    masterAddress={masterAddress}
                    dexName={selectedDex ? (selectedMarket?.dexName || selectedDex) : null}
                    mainAvailableMargin={
                      portfolio?.perDex?.['']?.withdrawable ??
                      accountData?.withdrawable ??
                      '0'
                    }
                    onTransferToDex={handleTransferToDex}
                    isTransferringToDex={isTransferring}
                    transferToDexError={transferError}
                  />
                </div>

                <AccountCard
                  accountValue={
                    portfolio?.accountValue ??
                    accountData?.accountValue ??
                    '0'
                  }
                  available={
                    portfolio?.withdrawable ??
                    accountData?.withdrawable ??
                    '0'
                  }
                  inPositions={
                    portfolio?.marginUsed ??
                    accountData?.marginUsed ??
                    '0'
                  }
                  unrealizedPnl={
                    portfolio?.unrealizedPnl ??
                    accountData?.unrealizedPnl ??
                    '0'
                  }
                  isInitialized={isInitialized}
                  isReconnecting={isReconnecting}
                  onOpenDeposit={onOpenDeposit}
                  onEnableTrading={() => setShowAgentModal(true)}
                />

                <RecentFillsCard fills={fills} connected={fillsConnected} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <MarketSearchModal
        open={showMarketSearch}
        markets={markets}
        selectedCoin={selectedCoin}
        liveMids={mids}
        onSelect={handleMarketSelect}
        onClose={() => setShowMarketSearch(false)}
      />

      <AgentSetupModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        onConfirm={handleInitAgent}
        isInitializing={isInitializing}
        error={agentError}
        depositStatus={depositStatus}
        onOpenDeposit={handleOpenDepositFromAgentModal}
        onRecheckBalance={onRecheckBalance}
      />
    </>
  );
}

function extractPerpsOrderId(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const text = JSON.stringify(value);
  const oidMatch = text.match(/"oid"\s*:\s*"?([0-9A-Za-z_-]+)"?/);
  if (oidMatch?.[1]) return oidMatch[1];
  const orderIdMatch = text.match(/"orderId"\s*:\s*"?([0-9A-Za-z_-]+)"?/);
  return orderIdMatch?.[1];
}
