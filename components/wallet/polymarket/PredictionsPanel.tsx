'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowUpFromLine,
  Plus,
  ListOrdered,
  Clock3,
  History,
  Download,
  ChevronDown,
  SlidersHorizontal,
  Share2,
  X,
} from 'lucide-react';
import {
  useClobOrder,
  useRedeemPosition,
  useUserPositions,
  useActiveOrders,
  usePolymarketCollateralBalance,
  useNetDeposits,
  useTradeActivity,
  usePolymarketTeams,
  type PolymarketPosition,
  type PolymarketMarket,
  type TeamsMap,
  type TradeActivity,
} from '@/hooks/polymarket';
import { useSportsMeta } from '@/hooks/polymarket/useSportsMeta';
import {
  usePolymarketWallet,
  useTrading,
} from '@/providers/polymarket';
import {
  DUST_THRESHOLD,
  POLLING_DURATION,
  POLLING_INTERVAL,
  USDC_E_DECIMALS,
  CATEGORIES,
  SPORT_SUBCATEGORIES,
  type CategoryId,
  type SportSubcategoryId,
  getCategoryById,
  getSportSubcategoryById,
} from '@/constants/polymarket';
import { createPollingInterval } from '@/lib/polymarket/polling';
import { formatPolymarketError } from '@/lib/polymarket';
import {
  useMarketDetailStore,
  marketRouteKey,
} from '@/zustandStore/marketDetailStore';
import { Switch } from '@/components/ui/switch';
import { safeLocalStorage } from '@/lib/browserStorage';
import {
  getRedeemablePayout,
  hasRedeemablePayout,
  isVisiblePortfolioPosition,
  isZeroPositionBalanceRedeemError,
} from '@/lib/polymarket/position-payout';
import {
  isSilentRedeemUnavailableError,
  resolveRedeemWallet,
} from '@/lib/polymarket/redeem-wallet';
import {
  pruneAssetSet,
  selectNextAutoClaimPosition,
} from '@/lib/polymarket/auto-claim';
import {
  displaySideForMarket,
  type PredictionSideDisplay,
} from '@/lib/polymarket/side-labels';
import {
  groupFlatMarketsIntoGames,
  isValidGameCard,
  type GroupedMarket,
  type ParsedOutcome,
  type SportsGameGroup,
} from '@/lib/polymarket/sports-grouping';

import HighVolumeMarkets from './Markets';
import SportsTableView from './Markets/SportsTableView';
import OrderCard from './Orders/OrderCard';
import PendingRedemptionNotice, {
  type PendingRedemptionSnapshot,
} from './Positions/PendingRedemptionNotice';
import PositionShareModal, {
  type PredictionSharePosition,
  type PredictionShareStatus,
} from './Positions/PositionShareModal';
import BrowseMarketsBento from './BrowseMarketsBento';

/**
 * Top-level views inside the predictions panel. The panel has no tab nav —
 * each chip on the bento hero drills down to one of these views, and the
 * back button returns to 'main' (or, on 'main', closes the panel).
 */
export type PredictionsPanelView =
  | 'main'
  | 'orders'
  | 'bets'
  | 'history';

// Apple-clean palette mirroring the wireframe "A · Bento hero + feed":
// warm cream canvas, white cards with hairline borders + soft shadows, a
// single dark "LIVE NOW" tile as the only inverted surface.
const CANVAS = '#ecebe6';
const HAIR = 'rgba(0,0,0,0.06)';
const HAIR2 = 'rgba(0,0,0,0.04)';
const POS_GREEN = '#19a974';
const POS_GREEN_SOFT = 'rgba(25,169,116,0.10)';
const NEG_RED = '#e5484d';
const NEG_RED_SOFT = 'rgba(229,72,77,0.08)';
const LIVE_RED = '#ff5a5f';
const SURFACE2 = '#fafafa';
const MUTED = '#6e6e76';
const MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const AUTO_CLAIM_STORAGE_KEY = 'swop:prediction:auto-claim-wins';
const ERC1155_BALANCE_OF_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

interface PredictionsPanelProps {
  initialView?: PredictionsPanelView;
  onClose: () => void;
  /** Open the deposit/withdraw modal pre-set to a tab */
  onOpenTransfer: (tab: 'deposit' | 'withdraw') => void;
  /**
   * When true, render in-flow inside the page layout (preserving the
   * global Header) instead of as a fixed full-screen overlay. Used by
   * the dedicated /prediction route.
   */
  embedded?: boolean;
}

type RedeemOptions = {
  silentOnly?: boolean;
};

type RedeemOutcome =
  | 'redeemed'
  | 'already-redeemed'
  | 'manual-required'
  | 'failed'
  | 'skipped';

type RedeemHandler = (
  position: PolymarketPosition,
  options?: RedeemOptions,
) => Promise<RedeemOutcome>;

/**
 * PredictionsPanel — full-screen overlay covering the predictions
 * wireframe screens 1-6 (A · feed, A2 · sports, A3/A3L · ticket via the
 * /prediction/market/[id] page, A4 · open orders, A5 · history). The panel has no
 * tab nav — drill-downs are triggered by the chips inside the bento
 * balance hero (Open orders / My bets / History), and each drill-down
 * view has its own back button that returns to 'main'.
 */
export default function PredictionsPanel({
  initialView = 'main',
  onClose,
  onOpenTransfer,
  embedded = false,
}: PredictionsPanelProps) {
  const [view, setView] = useState<PredictionsPanelView>(initialView);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const { eoaAddress, publicClient } = usePolymarketWallet();
  const {
    clobClient,
    safeAddress,
    depositWalletAddress,
    portfolioAddresses,
    walletType,
  } = useTrading();
  const queryClient = useQueryClient();

  const { data: positions, isError: positionsRefreshError } =
    useUserPositions(portfolioAddresses);
  const { data: teamsData } = usePolymarketTeams();
  const {
    data: activeOrders = [],
    isError: activeOrdersRefreshError,
  } = useActiveOrders(clobClient, safeAddress);
  const { totalUsdcBalance } =
    usePolymarketCollateralBalance(portfolioAddresses);
  const { data: netDeposits } = useNetDeposits(portfolioAddresses);

  const { redeemPosition, canRedeem } = useRedeemPosition();
  const { submitOrder, cancelOrder, isSubmitting } = useClobOrder(
    clobClient,
    eoaAddress,
  );

  const [redeemingAsset, setRedeemingAsset] = useState<string | null>(
    null,
  );
  const [sellingAsset, setSellingAsset] = useState<string | null>(
    null,
  );
  const [cancellingOrderId, setCancellingOrderId] = useState<
    string | null
  >(null);
  const [pendingVerification, setPendingVerification] = useState<
    Map<string, number>
  >(new Map());
  const [pendingRedemptions, setPendingRedemptions] = useState<
    PendingRedemptionSnapshot[]
  >([]);
  const [autoClaimEnabled, setAutoClaimEnabled] = useState(false);
  const [autoClaimAttemptedAssets, setAutoClaimAttemptedAssets] =
    useState<Set<string>>(() => new Set());
  const [autoClaimManualAssets, setAutoClaimManualAssets] =
    useState<Set<string>>(() => new Set());
  const [onchainPositionBalances, setOnchainPositionBalances] =
    useState<Map<string, number>>(new Map());

  const positionBalanceKey = useCallback(
    (position: PolymarketPosition) =>
      `${(position.proxyWallet || '').toLowerCase()}:${position.asset}`,
    [],
  );

  // Markets drill-down — null = bento overview; otherwise the panel renders
  // a category detail view (matches wireframe screen A2).
  type MarketsDrillDown =
    | { kind: 'sports'; sub: SportSubcategoryId }
    | { kind: 'category'; id: CategoryId }
    | null;
  const [drillDown, setDrillDown] = useState<MarketsDrillDown>(null);
  const [selectedSportsGame, setSelectedSportsGame] =
    useState<SportsGameGroup | null>(null);

  // Market detail navigation — stash the full market in the hand-off store
  // and push to /prediction/market/[id] (the page version of the old modal).
  const router = useRouter();
  const stashMarketDetail = useMarketDetailStore((s) => s.set);

  const sharesForMarket = useCallback(
    (market: PolymarketMarket) => {
      if (!positions) return { yesShares: 0, noShares: 0 };
      const tIds = market.clobTokenIds
        ? (JSON.parse(market.clobTokenIds) as string[])
        : [];
      const positionSize = (asset: string | undefined) => {
        if (!asset) return 0;
        const position = positions.find((p) => p.asset === asset);
        if (!position) return 0;
        return (
          onchainPositionBalances.get(positionBalanceKey(position)) ??
          position.size
        );
      };
      return {
        yesShares: positionSize(tIds[0]),
        noShares: positionSize(tIds[1]),
      };
    },
    [onchainPositionBalances, positionBalanceKey, positions],
  );

  const navigateToMarket = useCallback(
    (
      market: PolymarketMarket,
      opts: {
        initialOutcome?: 'yes' | 'no';
        outcomeLabels?: [string, string];
        yesShares?: number;
        noShares?: number;
      } = {},
    ) => {
      const key = marketRouteKey(market);
      if (!key) return;
      const positionsForMarket = sharesForMarket(market);
      stashMarketDetail(key, {
        market,
        initialOutcome: opts.initialOutcome,
        outcomeLabels: opts.outcomeLabels,
        yesShares: opts.yesShares ?? positionsForMarket.yesShares,
        noShares: opts.noShares ?? positionsForMarket.noShares,
      });
      router.push(`/prediction/market/${encodeURIComponent(key)}`);
    },
    [router, sharesForMarket, stashMarketDetail],
  );

  const handleBentoOutcomeClick = useCallback(
    (
      market: PolymarketMarket,
      _outcome: string,
      _price: number,
      tokenId: string,
    ) => {
      const ids = (() => {
        try {
          return JSON.parse(market.clobTokenIds ?? '[]') as string[];
        } catch {
          return [] as string[];
        }
      })();
      const yesTokenId = ids[0] ?? tokenId;
      navigateToMarket(market, {
        initialOutcome: tokenId === yesTokenId ? 'yes' : 'no',
      });
    },
    [navigateToMarket],
  );

  const navigateToPosition = useCallback(
    (p: PolymarketPosition) => {
      const market = positionToDetailMarket(p, teamsData);
      navigateToMarket(market, {
        yesShares: p.outcomeIndex === 0 ? p.size : 0,
        noShares: p.outcomeIndex === 1 ? p.size : 0,
      });
    },
    [navigateToMarket, teamsData],
  );

  // Sync pending verification against latest positions (mirrors the
  // PortfolioModal logic — once the on-chain state catches up, drop the
  // optimistic flag so the row refreshes).
  useEffect(() => {
    if (!positions || pendingVerification.size === 0) return;
    const stillPending = new Map<string, number>();
    pendingVerification.forEach((originalSize, asset) => {
      const current = positions.find((p) => p.asset === asset);
      if ((current?.size || 0) >= originalSize)
        stillPending.set(asset, originalSize);
    });
    if (stillPending.size !== pendingVerification.size)
      setPendingVerification(stillPending);
  }, [positions, pendingVerification]);

  useEffect(() => {
    let cancelled = false;

    async function loadOnchainPositionBalances() {
      if (!positions || positions.length === 0) {
        setOnchainPositionBalances(new Map());
        return;
      }

      const balanceEntries = await Promise.all(
        positions.map(async (position) => {
          const walletAddress = position.proxyWallet;
          const key = positionBalanceKey(position);
          if (!walletAddress) return [key, position.size] as const;

          try {
            const raw = await publicClient.readContract({
              address: CTF_ADDRESS,
              abi: ERC1155_BALANCE_OF_ABI,
              functionName: 'balanceOf',
              args: [
                walletAddress as `0x${string}`,
                BigInt(position.asset),
              ],
            });
            return [key, Number(raw) / 10 ** USDC_E_DECIMALS] as const;
          } catch (error) {
            console.warn(
              '[PredictionsPanel] Failed to read on-chain position balance',
              {
                walletAddress,
                asset: position.asset,
                error,
              },
            );
            return [key, position.size] as const;
          }
        }),
      );

      if (!cancelled) {
        setOnchainPositionBalances(new Map(balanceEntries));
      }
    }

    loadOnchainPositionBalances();
    return () => {
      cancelled = true;
    };
  }, [positionBalanceKey, positions, publicClient]);

  const activePositions = useMemo(() => {
    if (!positions) return [];
    return positions
      .map((p) => {
        const onchainSize = onchainPositionBalances.get(
          positionBalanceKey(p),
        );
        return onchainSize == null ? p : { ...p, size: onchainSize };
      })
      .filter((p) => isVisiblePortfolioPosition(p, DUST_THRESHOLD));
  }, [onchainPositionBalances, positionBalanceKey, positions]);

  const actionablePositions = useMemo(
    () => activePositions.filter((p) => !p.redeemable),
    [activePositions],
  );
  const redeemablePositions = useMemo(
    () => activePositions.filter((p) => p.redeemable),
    [activePositions],
  );
  const autoClaimablePositions = useMemo(
    () => redeemablePositions.filter((p) => hasRedeemablePayout(p)),
    [redeemablePositions],
  );

  useEffect(() => {
    setAutoClaimEnabled(
      safeLocalStorage.getItem(AUTO_CLAIM_STORAGE_KEY) === 'true',
    );
  }, []);

  const handleAutoClaimChange = useCallback((enabled: boolean) => {
    setAutoClaimEnabled(enabled);
    safeLocalStorage.setItem(
      AUTO_CLAIM_STORAGE_KEY,
      enabled ? 'true' : 'false',
    );
    if (enabled) {
      setAutoClaimAttemptedAssets(new Set());
      setAutoClaimManualAssets(new Set());
    }
  }, []);

  useEffect(() => {
    const currentAssets = new Set(
      autoClaimablePositions.map((position) => position.asset),
    );
    setAutoClaimAttemptedAssets((prev) => {
      if (prev.size === 0) return prev;
      const next = pruneAssetSet(prev, currentAssets);
      return next.size === prev.size ? prev : next;
    });
    setAutoClaimManualAssets((prev) => {
      if (prev.size === 0) return prev;
      const next = pruneAssetSet(prev, currentAssets);
      return next.size === prev.size ? prev : next;
    });
  }, [autoClaimablePositions]);

  const summary = useMemo(() => {
    const inOrdersValue = activeOrders
      .filter((o) => o.side === 'BUY')
      .reduce((s, o) => {
        const remaining =
          parseFloat(o.original_size) - parseFloat(o.size_matched);
        return s + remaining * parseFloat(o.price);
      }, 0);

    const deposited = netDeposits?.totalDeposited ?? 0;
    const withdrawn = netDeposits?.totalWithdrawn ?? 0;

    const openPositionsValue = activePositions
      .filter((p) => !p.redeemable)
      .reduce((s, p) => s + p.currentValue, 0);

    // Cash-flow P/L: what you'd have if you closed everything right now,
    // minus what you put in. Counts cash in your wallet, mark-to-market
    // value of open positions, and money you've already withdrawn.
    const totalPnl =
      totalUsdcBalance + openPositionsValue + withdrawn - deposited;

    const portfolioPct =
      deposited > 0 ? (totalPnl / deposited) * 100 : 0;

    return {
      inOrdersValue,
      totalPnl,
      portfolioPct,
      portfolioValue: totalUsdcBalance + openPositionsValue,
    };
  }, [activePositions, activeOrders, netDeposits, totalUsdcBalance]);
  const { data: liveGames = [], isLoading: isLoadingLiveGames } =
    useLiveSportsGames();
  const positionsRefreshFailedWithData =
    positionsRefreshError && (positions?.length ?? 0) > 0;
  const activeOrdersRefreshFailedWithData =
    activeOrdersRefreshError && activeOrders.length > 0;

  const handleMarketSell = useCallback(
    async (position: PolymarketPosition) => {
      setSellingAsset(position.asset);
      try {
        await submitOrder({
          tokenId: position.asset,
          conditionId: position.conditionId,
          size: position.size,
          acceptedPrice: position.curPrice,
          side: 'SELL',
          negRisk: position.negativeRisk,
          isMarketOrder: true,
        });
        setPendingVerification((prev) =>
          new Map(prev).set(position.asset, position.size),
        );
        queryClient.invalidateQueries({
          queryKey: ['polymarket-positions'],
        });
        createPollingInterval(
          () =>
            queryClient.invalidateQueries({
              queryKey: ['polymarket-positions'],
            }),
          POLLING_INTERVAL,
          POLLING_DURATION,
        );
        setTimeout(() => {
          setPendingVerification((prev) => {
            const n = new Map(prev);
            n.delete(position.asset);
            return n;
          });
        }, POLLING_DURATION);
      } catch (err) {
        console.error('Failed to sell position:', err);
      } finally {
        setSellingAsset(null);
      }
    },
    [submitOrder, queryClient],
  );

  const rememberPendingRedemption = useCallback(
    (
      position: PolymarketPosition,
      result?: { txId?: string; redeemedAmount?: number },
    ) => {
      const snapshot: PendingRedemptionSnapshot = {
        asset: position.asset,
        title: position.title,
        outcome: position.outcome,
        amount: result?.redeemedAmount ?? getRedeemablePayout(position),
        txId: result?.txId,
        submittedAt: Math.floor(Date.now() / 1000),
        position,
      };

      setPendingRedemptions((prev) => [
        snapshot,
        ...prev.filter((item) => item.asset !== position.asset),
      ]);
      setTimeout(() => {
        setPendingRedemptions((prev) =>
          prev.filter((item) => item.asset !== position.asset),
        );
      }, POLLING_DURATION);
    },
    [],
  );

  const handleRedeem: RedeemHandler = useCallback(
    async (position, options = {}) => {
      const isAuto = options.silentOnly === true;
      if (!canRedeem) {
        if (!isAuto) {
          toast.error(
            'Redeem wallet is still connecting. Try again in a moment.',
          );
        }
        return 'skipped';
      }

      const redeemValue = getRedeemablePayout(position);
      if (redeemValue <= 0) {
        if (!isAuto) {
          toast.error('No redeemable payout found for this position.');
        }
        return 'skipped';
      }

      const redeemWallet = resolveRedeemWallet(position, {
        safeAddress,
        depositWalletAddress,
        walletType,
      });
      if (!redeemWallet) {
        if (!isAuto) {
          toast.error(
            'Redeem wallet is still loading. Refresh and try again.',
          );
        }
        return 'skipped';
      }

      const { positionWallet, walletType: redeemWalletType } =
        redeemWallet;

      setRedeemingAsset(position.asset);
      const redeemToastId = isAuto
        ? undefined
        : toast.loading(`Redeeming $${redeemValue.toFixed(2)}...`);
      try {
        const balanceAddressCandidates: Array<{
          label: string;
          address?: string;
        }> = [
          {
            label: 'position.proxyWallet',
            address: position.proxyWallet,
          },
          {
            label: 'resolved redeem wallet',
            address: positionWallet,
          },
          { label: 'current safeAddress', address: safeAddress },
          {
            label: 'depositWalletAddress',
            address: depositWalletAddress,
          },
          ...portfolioAddresses.map((address, index) => ({
            label: `portfolioAddresses[${index}]`,
            address,
          })),
        ];
        const uniqueBalanceAddresses = Array.from(
          new Map(
            balanceAddressCandidates
              .filter(
                (
                  entry,
                ): entry is { label: string; address: string } =>
                  Boolean(entry.address),
              )
              .map((entry) => [entry.address.toLowerCase(), entry]),
          ).values(),
        );
        const balanceDebug = await Promise.all(
          uniqueBalanceAddresses.map(async ({ label, address }) => {
            try {
              const raw = await publicClient.readContract({
                address: CTF_ADDRESS,
                abi: ERC1155_BALANCE_OF_ABI,
                functionName: 'balanceOf',
                args: [
                  address as `0x${string}`,
                  BigInt(position.asset),
                ],
              });
              return {
                label,
                address,
                raw: raw.toString(),
                shares: Number(raw) / 1e6,
              };
            } catch (error) {
              return {
                label,
                address,
                error:
                  error instanceof Error
                    ? error.message
                    : String(error),
              };
            }
          }),
        );
        const resolvedWalletBalance = balanceDebug.find(
          (entry) =>
            entry.address.toLowerCase() ===
            positionWallet.toLowerCase(),
        );

        console.log('[PredictionsPanel Redeem] preflight', {
          session: {
            walletType,
            safeAddress,
            depositWalletAddress,
            portfolioAddresses,
          },
          resolved: {
            positionWallet,
            redeemWalletType,
            redeemDepositWalletAddress:
              redeemWallet.depositWalletAddress,
          },
          position: {
            proxyWallet: position.proxyWallet,
            conditionId: position.conditionId,
            asset: position.asset,
            outcome: position.outcome,
            outcomeIndex: position.outcomeIndex,
            oppositeAsset: position.oppositeAsset,
            negativeRisk: position.negativeRisk,
            size: position.size,
            redeemable: position.redeemable,
            redeemValue,
            currentValue: position.currentValue,
            cashPnl: position.cashPnl,
          },
          balanceOfAsset: balanceDebug,
        });
        if (
          resolvedWalletBalance &&
          'raw' in resolvedWalletBalance &&
          resolvedWalletBalance.raw === '0'
        ) {
          console.warn(
            '[PredictionsPanel Redeem] resolved wallet has zero ERC-1155 balance for this asset',
            {
              resolvedWalletBalance,
              allCheckedBalances: balanceDebug,
              asset: position.asset,
              conditionId: position.conditionId,
            },
          );
        }

        const result = await redeemPosition({
          conditionId: position.conditionId,
          asset: position.asset,
          outcomeIndex: position.outcomeIndex,
          negativeRisk: position.negativeRisk,
          size: position.size,
          safeAddress: positionWallet,
          depositWalletAddress: redeemWallet.depositWalletAddress,
          walletType: redeemWalletType,
          silentOnly: options.silentOnly,
        });
        rememberPendingRedemption(position, result);
        setAutoClaimManualAssets((prev) => {
          if (!prev.has(position.asset)) return prev;
          const next = new Set(prev);
          next.delete(position.asset);
          return next;
        });
        const redeemedAmount = result.redeemedAmount ?? redeemValue;
        const redeemedAmountLabel = redeemedAmount.toFixed(2);

        if (isAuto) {
          // Auto-claim stays quiet; balances and pending notices update after
          // the transaction confirms.
        } else if (result.normalizedCollateral) {
          toast.success(
            `Redeemed $${redeemedAmountLabel} and converted to pUSD.`,
            { id: redeemToastId },
          );
        } else if (result.normalizationError) {
          toast.success(
            `Redeemed $${redeemedAmountLabel}. Balance conversion will retry automatically.`,
            { id: redeemToastId },
          );
        } else {
          toast.success(`Redeemed $${redeemedAmountLabel}.`, {
            id: redeemToastId,
          });
        }

        queryClient.invalidateQueries({
          queryKey: ['polymarket-positions'],
        });
        queryClient.invalidateQueries({ queryKey: ['trade-activity'] });
        queryClient.invalidateQueries({ queryKey: ['pusdBalance'] });
        queryClient.invalidateQueries({ queryKey: ['legacyUsdcBalance'] });
        createPollingInterval(
          () => {
            queryClient.invalidateQueries({
              queryKey: ['polymarket-positions'],
            });
            queryClient.invalidateQueries({
              queryKey: ['trade-activity'],
            });
            queryClient.invalidateQueries({
              queryKey: ['pusdBalance'],
            });
            queryClient.invalidateQueries({
              queryKey: ['legacyUsdcBalance'],
            });
          },
          POLLING_INTERVAL,
          POLLING_DURATION,
        );
        return 'redeemed';
      } catch (err) {
        if (isZeroPositionBalanceRedeemError(err)) {
          queryClient.invalidateQueries({
            queryKey: ['polymarket-positions'],
          });
          if (!isAuto) {
            toast.success(formatRedeemError(err), { id: redeemToastId });
          }
          console.info(
            'Redeem skipped because the position balance is gone:',
            err,
          );
          return 'already-redeemed';
        }

        if (isAuto && isSilentRedeemUnavailableError(err)) {
          console.info(
            'Auto-claim requires manual redeem confirmation:',
            err,
          );
          return 'manual-required';
        } else {
          if (!isAuto) {
            toast.error(formatRedeemError(err), { id: redeemToastId });
          }
          console.error('Failed to redeem position:', err);
          return 'failed';
        }
      } finally {
        setRedeemingAsset(null);
      }
    },
    [
      canRedeem,
      safeAddress,
      depositWalletAddress,
      portfolioAddresses,
      walletType,
      publicClient,
      redeemPosition,
      queryClient,
      rememberPendingRedemption,
    ],
  );

  useEffect(() => {
    const pendingAssets = new Set([
      ...pendingRedemptions.map((item) => item.asset),
      ...Array.from(pendingVerification.keys()),
    ]);
    const nextPosition = selectNextAutoClaimPosition({
      enabled: autoClaimEnabled,
      canRedeem,
      busy: Boolean(redeemingAsset || isSubmitting),
      positions: autoClaimablePositions,
      attemptedAssets: autoClaimAttemptedAssets,
      pendingAssets,
      manualRequiredAssets: autoClaimManualAssets,
    });

    if (!nextPosition) return;

    setAutoClaimAttemptedAssets((prev) => {
      const next = new Set(prev);
      next.add(nextPosition.asset);
      return next;
    });
    void handleRedeem(nextPosition, { silentOnly: true }).then(
      (outcome) => {
        if (outcome === 'manual-required') {
          setAutoClaimManualAssets((prev) => {
            const next = new Set(prev);
            next.add(nextPosition.asset);
            return next;
          });
        }
        if (outcome !== 'manual-required' && outcome !== 'skipped') {
          return;
        }
        setAutoClaimAttemptedAssets((prev) => {
          const next = new Set(prev);
          next.delete(nextPosition.asset);
          return next;
        });
      },
    );
  }, [
    autoClaimAttemptedAssets,
    autoClaimEnabled,
    autoClaimManualAssets,
    autoClaimablePositions,
    canRedeem,
    handleRedeem,
    isSubmitting,
    pendingRedemptions,
    pendingVerification,
    redeemingAsset,
  ]);

  const handleCancelOrder = useCallback(
    async (orderId: string) => {
      setCancellingOrderId(orderId);
      try {
        await cancelOrder(orderId);
      } catch (err) {
        console.error('Failed to cancel order:', err);
      } finally {
        setCancellingOrderId(null);
      }
    },
    [cancelOrder],
  );

  // Format the balance with quieter cents (matches the wireframe).
  const [intPart, decPart] = useMemo(() => {
    const formatted = summary.portfolioValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const dotIdx = formatted.lastIndexOf('.');
    return dotIdx === -1
      ? [formatted, '00']
      : [formatted.slice(0, dotIdx), formatted.slice(dotIdx + 1)];
  }, [summary.portfolioValue]);

  // The header is intentionally minimal — just the back button. The
  // wireframe places drill-down chrome (page title + filters) inside the
  // body rather than in a sticky bar. Going back from a drill-down view
  // returns to 'main'; going back from 'main' closes the panel entirely.
  const goBack = useCallback(() => {
    if (view !== 'main') {
      setView('main');
      return;
    }
    if (drillDown !== null) {
      setDrillDown(null);
      return;
    }
    onClose();
  }, [view, drillDown, onClose]);

  return (
    <>
      <div
        className={
          embedded
            ? 'relative -m-6 min-h-[calc(100vh-6rem)] flex flex-col'
            : 'fixed inset-0 z-50 flex flex-col'
        }
        style={{ background: CANVAS }}
      >
        {/* ── Body (scrollable) — header is intentionally just an
             inline back button at the top of the content. ───────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1100px] mx-auto px-5 py-5 space-y-5">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-3.5 py-1.5 rounded-full border text-[12.5px] font-semibold text-gray-900 bg-white hover:bg-gray-50 transition-colors w-fit"
              style={{ borderColor: HAIR }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            {view === 'main' && drillDown === null && (
              <>
                <BentoHero
                  intPart={intPart}
                  decPart={decPart}
                  portfolioPct={summary.portfolioPct}
                  totalPnl={summary.totalPnl}
                  openBets={activePositions.length}
                  openOrders={activeOrders.length}
                  inOrdersValue={summary.inOrdersValue}
                  liveGames={liveGames}
                  isLoadingLiveGames={isLoadingLiveGames}
                  onDeposit={() => onOpenTransfer('deposit')}
                  onWithdraw={() => onOpenTransfer('withdraw')}
                  onOpenOrders={() => setView('orders')}
                  onMyBets={() => setView('bets')}
                  onHistory={() => setView('history')}
                  onLiveGameClick={(market) =>
                    navigateToMarket(market, { initialOutcome: 'yes' })
                  }
                />
                <BrowseMarketsBento
                  onMarketClick={(m) =>
                    navigateToMarket(m, { initialOutcome: 'yes' })
                  }
                  onSportsOutcomeClick={handleBentoOutcomeClick}
                  onSportsGameClick={setSelectedSportsGame}
                  onBrowseSports={(sub) =>
                    setDrillDown({ kind: 'sports', sub })
                  }
                  onBrowseCategory={(id) =>
                    setDrillDown({ kind: 'category', id })
                  }
                />
              </>
            )}

            {view === 'main' && drillDown !== null && (
              <CategoryDetailView
                drillDown={drillDown}
                onBack={() => setDrillDown(null)}
                onChangeDrillDown={setDrillDown}
              />
            )}

            {view === 'orders' && (
              <OpenOrdersView
                orders={activeOrders}
                onCancel={handleCancelOrder}
                cancellingOrderId={cancellingOrderId}
                inOrdersValue={summary.inOrdersValue}
                onSeeHistory={() => setView('history')}
                refreshError={activeOrdersRefreshFailedWithData}
              />
            )}

            {view === 'bets' && (
              <MyBetsView
                actionable={actionablePositions}
                redeemable={redeemablePositions}
                onRedeem={handleRedeem}
                onSell={handleMarketSell}
                onTitleClick={navigateToPosition}
                sellingAsset={sellingAsset}
                redeemingAsset={redeemingAsset}
                pendingVerification={pendingVerification}
                pendingRedemptions={pendingRedemptions}
                isSubmitting={isSubmitting}
                canTrade={!!clobClient}
                canRedeem={canRedeem}
                manualClaimAssets={autoClaimManualAssets}
                refreshError={positionsRefreshFailedWithData}
                autoClaimEnabled={autoClaimEnabled}
                onAutoClaimChange={handleAutoClaimChange}
                portfolioAddresses={portfolioAddresses}
                teamsMap={teamsData}
                onSeeHistory={() => setView('history')}
                onClaimedWinClick={(trade) =>
                  navigateToMarket(tradeToDetailMarket(trade), {
                    initialOutcome:
                      trade.outcomeIndex === 0 ? 'yes' : 'no',
                  })
                }
              />
            )}

            {view === 'history' && portfolioAddresses.length > 0 && (
              <BetHistoryView
                safeAddress={portfolioAddresses}
                teamsMap={teamsData}
                onMarketClick={(trade) =>
                  navigateToMarket(tradeToDetailMarket(trade), {
                    initialOutcome:
                      trade.outcomeIndex === 0 ? 'yes' : 'no',
                  })
                }
              />
            )}
            {view === 'history' &&
              portfolioAddresses.length === 0 && (
                <BentoEmpty
                  title="No history yet"
                  message="Your settled bets and order fills will appear here."
                />
              )}
          </div>
        </div>
      </div>
      {selectedSportsGame && (
        <SportsGameOddsSheet
          game={selectedSportsGame}
          onClose={() => setSelectedSportsGame(null)}
          onOutcomeClick={(market, outcome, price, tokenId) => {
            setSelectedSportsGame(null);
            handleBentoOutcomeClick(market, outcome, price, tokenId);
          }}
        />
      )}
    </>
  );
}

function SportsGameOddsSheet({
  game,
  onClose,
  onOutcomeClick,
}: {
  game: SportsGameGroup;
  onClose: () => void;
  onOutcomeClick: (
    market: PolymarketMarket,
    outcome: string,
    price: number,
    tokenId: string,
  ) => void;
}) {
  const marketRows = [
    { label: 'Moneyline', kind: 'ML', grouped: game.moneyline },
    { label: 'Spread', kind: 'Spread', grouped: game.spread },
    { label: 'Total', kind: 'Total', grouped: game.total },
  ].filter((row): row is { label: string; kind: string; grouped: GroupedMarket } =>
    Boolean(row.grouped),
  );
  const primaryMarket = getGamePrimaryMarket(game);
  const eventSlug = getMarketLiveEventSlug(primaryMarket);
  const fetchedScore = useLiveEventScore(eventSlug, Boolean(eventSlug));
  const embeddedScore = useMemo(
    () => getEmbeddedLiveScore(primaryMarket),
    [primaryMarket],
  );
  const scoreState = useMemo(
    () => mergeLiveScoreStates(fetchedScore, embeddedScore),
    [fetchedScore, embeddedScore],
  );
  const scoreA = pickLiveTeamScore(
    game.teamA,
    game.teamAMeta?.abbrev,
    scoreState.teams,
    0,
  );
  const scoreB = pickLiveTeamScore(
    game.teamB,
    game.teamBMeta?.abbrev,
    scoreState.teams,
    1,
  );
  const hasScore = scoreA != null && scoreB != null;
  const scoreClock =
    scoreState.period || scoreState.elapsed
      ? formatLiveGameClock(scoreState, primaryMarket)
      : scoreState.live
        ? 'Live'
        : scoreState.ended || scoreState.closed
          ? 'Final'
          : null;
  const gameTime = formatGameOddsStart(game.startDate);
  const metadataParts = [
    gameTime || 'TBD',
    scoreClock,
    hasScore ? `${scoreA}-${scoreB}` : null,
    `${marketRows.length} markets`,
  ].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${game.title} odds`}
        className="w-full max-w-[760px] overflow-hidden rounded-[24px] border bg-white shadow-[0_24px_80px_-40px_rgba(10,10,12,0.45)]"
        style={{ borderColor: HAIR }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-4 border-b px-5 py-4"
          style={{ borderColor: HAIR }}
        >
          <div className="min-w-0">
            <div
              className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-gray-500"
              style={{ fontFamily: MONO }}
            >
              Game odds
            </div>
            <h2 className="mt-1 text-[24px] font-semibold leading-tight tracking-[-0.8px] text-gray-950">
              {game.title}
            </h2>
            <div
              className="mt-1 text-[11px] font-semibold uppercase tracking-[0.8px] text-gray-500"
              style={{ fontFamily: MONO }}
            >
              {metadataParts.join(' · ')}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close game odds"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
            style={{ borderColor: HAIR }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="grid gap-3">
            {marketRows.map((row) => (
              <SportsGameOddsMarketRow
                key={row.kind}
                label={row.label}
                shortLabel={row.kind}
                grouped={row.grouped}
                onOutcomeClick={onOutcomeClick}
              />
            ))}
          </div>
        </div>

        <div
          className="flex items-center justify-between border-t px-5 py-3 text-[11px] font-medium text-gray-500"
          style={{ borderColor: HAIR, fontFamily: MONO }}
        >
          <span>Tap any odd to open the trade ticket</span>
          <span>self-custodied · swop book</span>
        </div>
      </div>
    </div>
  );
}

function SportsGameOddsMarketRow({
  label,
  shortLabel,
  grouped,
  onOutcomeClick,
}: {
  label: string;
  shortLabel: string;
  grouped: GroupedMarket;
  onOutcomeClick: (
    market: PolymarketMarket,
    outcome: string,
    price: number,
    tokenId: string,
  ) => void;
}) {
  return (
    <div
      className="rounded-2xl border bg-[#fafafa] p-3"
      style={{ borderColor: HAIR }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div
            className="text-[10px] font-bold uppercase tracking-[1.2px] text-gray-500"
            style={{ fontFamily: MONO }}
          >
            {shortLabel}
          </div>
          <div className="mt-0.5 truncate text-[14px] font-semibold tracking-[-0.25px] text-gray-950">
            {label}
          </div>
        </div>
        <div
          className="max-w-[55%] truncate text-right text-[10.5px] font-semibold text-gray-500"
          style={{ fontFamily: MONO }}
          title={grouped.market.question}
        >
          {grouped.market.question}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {grouped.outcomes.map((outcome) => (
          <SportsGameOddsButton
            key={`${outcome.tokenId}:${outcome.label}`}
            outcome={outcome}
            onClick={() =>
              onOutcomeClick(
                grouped.market,
                outcome.label,
                outcome.price,
                outcome.tokenId,
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function SportsGameOddsButton({
  outcome,
  onClick,
}: {
  outcome: ParsedOutcome;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 items-center justify-between rounded-xl border bg-white px-4 text-left transition hover:border-[#19a974]/45 hover:bg-[#19a974]/5 active:bg-[#19a974]/10"
      style={{ borderColor: HAIR }}
    >
      <span className="min-w-0 truncate text-[15px] font-semibold text-gray-950">
        {outcome.label}
      </span>
      <span
        className="shrink-0 text-[17px] font-bold tabular-nums text-[#19a974]"
        style={{ fontFamily: MONO }}
      >
        {formatGameOddsPrice(outcome.price)}
      </span>
    </button>
  );
}

function formatGameOddsPrice(price: number) {
  if (!Number.isFinite(price) || price <= 0 || price >= 1) return '—';
  return `${Math.round(price * 100)}%`;
}

function formatGameOddsStart(startDate?: string) {
  if (!startDate) return '';
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ────────────────────────────────────────────────────────────────────
// Drill-down views — match wireframes A4 (Open orders), A5 (Bet history)
// and the parallel "My bets" surface for active picks.
// ────────────────────────────────────────────────────────────────────

function PageTitle({
  eyebrow,
  title,
  caption,
  action,
}: {
  eyebrow?: string;
  title: string;
  caption?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <div
            className="text-[10.5px] font-bold tracking-[1.4px] uppercase text-gray-500"
            style={{ fontFamily: MONO }}
          >
            {eyebrow}
          </div>
        )}
        <h1 className="text-[26px] sm:text-[28px] font-bold tracking-[-0.6px] leading-tight text-gray-900 mt-2">
          {title}
        </h1>
        {caption && (
          <div className="text-[12.5px] text-gray-500 mt-1.5 tracking-[-0.1px]">
            {caption}
          </div>
        )}
      </div>
      {action && <div className="flex gap-1.5">{action}</div>}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11.5px] font-semibold whitespace-nowrap transition-colors border ${
        active
          ? 'bg-black text-white border-black'
          : 'bg-white text-gray-900 hover:bg-gray-50'
      }`}
      style={!active ? { borderColor: HAIR } : undefined}
    >
      {children}
    </button>
  );
}

function StaleRefreshNotice() {
  return (
    <div
      className="rounded-2xl border bg-white px-4 py-3 text-[12px] font-medium text-amber-700"
      style={{ borderColor: 'rgba(245,158,11,0.24)' }}
    >
      Couldn&apos;t refresh prediction data. Showing last update.
    </div>
  );
}

// ── A4 · Open orders ────────────────────────────────────────────────

interface OpenOrdersViewProps {
  orders: ReturnType<typeof useActiveOrders>['data'];
  onCancel: (id: string) => void;
  cancellingOrderId: string | null;
  inOrdersValue: number;
  onSeeHistory: () => void;
  refreshError?: boolean;
}

function OpenOrdersView({
  orders = [],
  onCancel,
  cancellingOrderId,
  inOrdersValue,
  onSeeHistory,
  refreshError = false,
}: OpenOrdersViewProps) {
  const activeCount = orders.length;
  return (
    <div className="space-y-4">
      <PageTitle
        eyebrow="Predictions"
        title="Open orders"
        caption={`${activeCount} active limit${
          activeCount === 1 ? '' : 's'
        } · $${inOrdersValue.toFixed(2)} reserved`}
        action={
          <>
            <FilterChip active>Active · {activeCount}</FilterChip>
            <FilterChip onClick={onSeeHistory}>Filled</FilterChip>
            <FilterChip onClick={onSeeHistory}>Cancelled</FilterChip>
          </>
        }
      />

      {refreshError && <StaleRefreshNotice />}

      {orders.length === 0 ? (
        <BentoEmpty
          title="No open orders"
          message="Limit orders you place will appear here with cancel and edit controls."
        />
      ) : (
        <div
          className="bg-white rounded-2xl border overflow-hidden"
          style={{ borderColor: HAIR }}
        >
          <div className="space-y-0">
            {orders.map((o, i) => (
              <div
                key={o.id}
                className={i === 0 ? '' : 'border-t'}
                style={i === 0 ? undefined : { borderColor: HAIR }}
              >
                <OrderCard
                  order={o}
                  onCancel={onCancel}
                  isCancelling={cancellingOrderId === o.id}
                />
              </div>
            ))}
          </div>
          <div
            className="px-4 py-3 flex items-center justify-between border-t"
            style={{
              borderColor: HAIR,
              background: '#fafafa',
            }}
          >
            <span className="text-[11.5px] text-gray-500">
              Filled and cancelled orders move to{' '}
              <span className="font-semibold text-gray-900">
                History
              </span>{' '}
              automatically.
            </span>
            <button
              onClick={onSeeHistory}
              className="inline-flex items-center gap-1 h-7 px-3 rounded-full border bg-white text-[11.5px] font-semibold text-gray-900 hover:bg-gray-50 transition"
              style={{ borderColor: HAIR }}
            >
              View history →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── My bets — A5-style table mirroring BetHistoryView ─────────────

type BetStatusKey = 'live' | 'pending' | 'redeemable' | 'settled';
type BetStatusFilter = BetStatusKey | 'all';
type ClaimedWinSideDisplay = PredictionSideDisplay | '—';

interface BetRow {
  position: PolymarketPosition;
  statusKey: BetStatusKey;
  statusLabel: string;
  side: PredictionSideDisplay;
  placedAt?: number;
  staked: number;
  value: number;
  pnl: number;
  pnlPct: number;
  isClaimable: boolean;
  redeemValue: number;
}

interface ClaimedWinRow {
  key: string;
  title: string;
  outcome: string;
  side: ClaimedWinSideDisplay;
  icon?: string;
  amount: number;
  timestamp?: number;
  source: 'pending' | 'activity';
  position?: PolymarketPosition;
  trade?: TradeActivity;
}

function predictionSideTone(side: PredictionSideDisplay) {
  if (side === 'YES') return { bg: POS_GREEN_SOFT, fg: POS_GREEN };
  if (side === 'NO') return { bg: NEG_RED_SOFT, fg: NEG_RED };
  return { bg: SURFACE2, fg: MUTED };
}

function normalizePredictionKey(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function finiteTimestamp(value: unknown): number | undefined {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : undefined;
}

function tradeMatchesPosition(
  trade: TradeActivity,
  position: PolymarketPosition,
): boolean {
  const tradeAsset = normalizePredictionKey(trade.asset);
  const positionAsset = normalizePredictionKey(position.asset);
  if (tradeAsset && positionAsset && tradeAsset === positionAsset) {
    return true;
  }

  const sameCondition =
    normalizePredictionKey(trade.conditionId) ===
    normalizePredictionKey(position.conditionId);
  if (!sameCondition) return false;

  if (
    Number.isFinite(trade.outcomeIndex) &&
    Number.isFinite(position.outcomeIndex)
  ) {
    return Number(trade.outcomeIndex) === Number(position.outcomeIndex);
  }

  return (
    normalizePredictionKey(trade.outcome) ===
    normalizePredictionKey(position.outcome)
  );
}

function placedTimestampForPosition(
  position: PolymarketPosition,
  trades: TradeActivity[],
): number | undefined {
  const buyTimestamps = trades
    .filter(
      (trade) =>
        trade.type === 'TRADE' &&
        trade.side === 'BUY' &&
        tradeMatchesPosition(trade, position),
    )
    .map((trade) => finiteTimestamp(trade.timestamp))
    .filter((timestamp): timestamp is number => timestamp != null);

  if (buyTimestamps.length > 0) {
    return Math.min(...buyTimestamps);
  }

  const matchingTimestamps = trades
    .filter((trade) => tradeMatchesPosition(trade, position))
    .map((trade) => finiteTimestamp(trade.timestamp))
    .filter((timestamp): timestamp is number => timestamp != null);

  return matchingTimestamps.length > 0
    ? Math.min(...matchingTimestamps)
    : undefined;
}

function compareBetRowsByPlacedAt(a: BetRow, b: BetRow): number {
  const aTime = a.placedAt ?? 0;
  const bTime = b.placedAt ?? 0;
  if (aTime !== bTime) return bTime - aTime;
  return 0;
}

function deriveBetRow(
  p: PolymarketPosition,
  teamsMap: TeamsMap | undefined,
  activityTrades: TradeActivity[] = [],
): BetRow {
  const claimable = hasRedeemablePayout(p);
  const redeemValue = getRedeemablePayout(p);
  let statusKey: BetStatusKey;
  let statusLabel: string;
  if (p.redeemable && claimable) {
    statusKey = 'redeemable';
    statusLabel = 'WON';
  } else if (p.redeemable) {
    statusKey = 'settled';
    statusLabel = p.cashPnl < -0.005 ? 'LOST' : 'SETTLED';
  } else if (p.marketResolutionPending || p.marketClosed) {
    statusKey = 'pending';
    statusLabel = 'FINAL';
  } else {
    statusKey = 'live';
    statusLabel = 'OPEN';
  }
  const side = displaySideForMarket(
    {
      title: p.title,
      outcome: p.outcome,
      eventSlug: p.eventSlug,
      teamsMap,
    },
    p.outcomeIndex,
  );
  const staked = p.initialValue || p.size * p.avgPrice;
  const value =
    p.redeemable && claimable ? redeemValue : p.currentValue;
  return {
    position: p,
    statusKey,
    statusLabel,
    side,
    placedAt: placedTimestampForPosition(p, activityTrades),
    staked,
    value,
    pnl: p.cashPnl,
    pnlPct: p.percentPnl,
    isClaimable: claimable,
    redeemValue,
  };
}

function tradeAmount(trade: TradeActivity): number {
  if (trade.usdcSize != null && Number.isFinite(trade.usdcSize)) {
    return Number(trade.usdcSize);
  }
  return Number(trade.size || 0) * Number(trade.price || 0);
}

function tradePnlCashFlow(trade: TradeActivity): number {
  const amount = tradeAmount(trade);
  if (trade.type === 'TRADE') {
    return trade.side === 'BUY' ? -amount : amount;
  }
  if (trade.type === 'REDEEM') return amount;
  return 0;
}

function pendingRedemptionAmountNotInTrades(
  pendingRedemptions: PendingRedemptionSnapshot[],
  claimedTrades: TradeActivity[],
): number {
  const tradeTxKeys = new Set<string>();
  const tradeAssetKeys = new Set<string>();
  claimedTrades.forEach((trade) => {
    if (trade.transactionHash) {
      tradeTxKeys.add(`tx:${trade.transactionHash.toLowerCase()}`);
    }
    if (trade.asset) {
      tradeAssetKeys.add(`asset:${trade.asset}`);
    }
  });

  return pendingRedemptions.reduce((sum, item) => {
    const txKey = item.txId ? `tx:${item.txId.toLowerCase()}` : null;
    const assetKey = `asset:${item.asset}`;
    if (
      (txKey && tradeTxKeys.has(txKey)) ||
      (item.asset && tradeAssetKeys.has(assetKey))
    ) {
      return sum;
    }
    return sum + item.amount;
  }, 0);
}

function claimedTradeRowKey(trade: TradeActivity): string {
  if (trade.transactionHash) {
    return `tx:${trade.transactionHash.toLowerCase()}`;
  }
  if (trade.conditionId) {
    return `redeem:${trade.conditionId}:${trade.outcomeIndex}:${trade.timestamp}:${tradeAmount(trade).toFixed(6)}`;
  }
  return `redeem:${trade.title}:${trade.outcome}:${trade.timestamp}:${tradeAmount(trade).toFixed(6)}`;
}

function deriveClaimedWinRows(
  pendingRedemptions: PendingRedemptionSnapshot[],
  claimedTrades: TradeActivity[],
  teamsMap: TeamsMap | undefined,
): ClaimedWinRow[] {
  const seenKeys = new Set<string>();
  const pendingTxKeys = new Set<string>();
  const pendingAssetKeys = new Set<string>();
  const rows: ClaimedWinRow[] = [];

  pendingRedemptions.forEach((item) => {
    const txKey = item.txId ? `tx:${item.txId.toLowerCase()}` : null;
    const assetKey = `asset:${item.asset}`;
    if (txKey) pendingTxKeys.add(txKey);
    if (item.asset) pendingAssetKeys.add(assetKey);
    seenKeys.add(txKey ?? assetKey);
    rows.push({
      key: txKey ?? assetKey,
      title: item.title,
      outcome: item.outcome,
      side: item.position
        ? displaySideForMarket(
            {
              title: item.title,
              outcome: item.outcome,
              eventSlug: item.position.eventSlug,
              teamsMap,
            },
            item.position.outcomeIndex,
          )
        : '—',
      amount: item.amount,
      timestamp: item.submittedAt,
      source: 'pending',
      position: item.position,
    });
  });

  claimedTrades.forEach((trade) => {
    const txKey = trade.transactionHash
      ? `tx:${trade.transactionHash.toLowerCase()}`
      : null;
    const assetKey = `asset:${trade.asset}`;
    const rowKey = claimedTradeRowKey(trade);
    if (seenKeys.has(rowKey)) return;
    if (
      (txKey && pendingTxKeys.has(txKey)) ||
      (trade.asset && pendingAssetKeys.has(assetKey))
    ) {
      return;
    }
    seenKeys.add(rowKey);

    rows.push({
      key: rowKey,
      title: trade.title,
      outcome: trade.outcome,
      side: displaySideForMarket(
        {
          title: trade.title,
          outcome: trade.outcome,
          eventSlug: trade.eventSlug,
          teamsMap,
        },
        trade.outcomeIndex,
      ),
      icon: trade.icon,
      amount: tradeAmount(trade),
      timestamp: trade.timestamp,
      source: 'activity',
      trade,
    });
  });

  return rows
    .sort((a, b) => {
      if (a.source !== b.source)
        return a.source === 'pending' ? -1 : 1;
      return (b.timestamp ?? 0) - (a.timestamp ?? 0);
    })
    .slice(0, 25);
}

function shareStatusForBetRow(row: BetRow): PredictionShareStatus {
  if (row.statusKey === 'live') return 'open';
  if (row.statusKey === 'pending') return 'pending';
  if (row.statusKey === 'redeemable') return 'redeemable';
  return 'closed';
}

function claimedWinSharePosition(
  row: ClaimedWinRow,
): PredictionSharePosition {
  if (row.position) return row.position;
  const outcome =
    row.outcome && !/^pick$/i.test(row.outcome)
      ? row.outcome
      : row.side !== '—'
        ? row.side
        : 'Redeemed';
  return {
    title: row.title,
    outcome,
    icon: row.icon,
    slug: row.trade?.slug,
    eventSlug: row.trade?.eventSlug,
    size: row.trade?.size,
    initialValue: 0,
    currentValue: row.amount,
    cashPnl: row.amount,
    percentPnl: 0,
    totalBought: row.trade?.size,
    realizedPnl: row.amount,
    percentRealizedPnl: 0,
    marketClosed: true,
  };
}

const BET_STATUS_TONE: Record<
  BetStatusKey,
  { bg: string; fg: string }
> = {
  live: { bg: SURFACE2, fg: MUTED },
  pending: { bg: 'rgba(245,158,11,0.12)', fg: '#b45309' },
  redeemable: { bg: POS_GREEN_SOFT, fg: POS_GREEN },
  settled: { bg: SURFACE2, fg: MUTED },
};

const BETS_GRID =
  '88px 124px minmax(0,1.45fr) 112px 70px 72px 110px 124px';
const BETS_MIN_WIDTH = 920;
const CLAIMED_WINS_GRID = '90px minmax(0,1.5fr) 118px 110px 110px';

function formatRedeemError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (isZeroPositionBalanceRedeemError(error)) {
    return 'This payout was already redeemed. Refreshing your bets.';
  }

  if (isSilentRedeemUnavailableError(error)) {
    return 'Redeem signing is not ready. Refresh and try again.';
  }

  if (message.startsWith('PRECHECK_SKIPPED: redeem skipped: ')) {
    return message.replace('PRECHECK_SKIPPED: redeem skipped: ', '');
  }

  return formatPolymarketError(error);
}

interface MyBetsViewProps {
  actionable: PolymarketPosition[];
  redeemable: PolymarketPosition[];
  onRedeem: RedeemHandler;
  onSell: (p: PolymarketPosition) => void;
  onTitleClick: (p: PolymarketPosition) => void;
  sellingAsset: string | null;
  redeemingAsset: string | null;
  pendingVerification: Map<string, number>;
  pendingRedemptions: PendingRedemptionSnapshot[];
  isSubmitting: boolean;
  canTrade: boolean;
  canRedeem: boolean;
  manualClaimAssets: Set<string>;
  refreshError?: boolean;
  autoClaimEnabled: boolean;
  onAutoClaimChange: (enabled: boolean) => void;
  portfolioAddresses: string[];
  teamsMap?: TeamsMap;
  onSeeHistory: () => void;
  onClaimedWinClick: (trade: TradeActivity) => void;
}

function MyBetsView({
  actionable,
  redeemable,
  onRedeem,
  onSell,
  onTitleClick,
  sellingAsset,
  redeemingAsset,
  pendingVerification,
  pendingRedemptions,
  isSubmitting,
  canTrade,
  canRedeem,
  manualClaimAssets,
  refreshError = false,
  autoClaimEnabled,
  onAutoClaimChange,
  portfolioAddresses,
  teamsMap,
  onSeeHistory,
  onClaimedWinClick,
}: MyBetsViewProps) {
  const [statusFilter, setStatusFilter] =
    useState<BetStatusFilter>('all');

  const {
    data: activityTrades = [],
    isLoading: isLoadingActivity,
    isError: activityRefreshError,
  } = useTradeActivity({
      user: portfolioAddresses,
      limit: 500,
      offset: 0,
      sort: 'DESC',
    });
  const showActivityRefreshError =
    activityRefreshError && activityTrades.length > 0;

  const claimedTrades = useMemo(
    () => activityTrades.filter((trade) => trade.type === 'REDEEM'),
    [activityTrades],
  );

  const rows = useMemo(
    () =>
      [...actionable, ...redeemable]
        .map((position) =>
          deriveBetRow(position, teamsMap, activityTrades),
        )
        .sort(compareBetRowsByPlacedAt),
    [actionable, activityTrades, redeemable, teamsMap],
  );

  const claimedWinRows = useMemo(
    () =>
      deriveClaimedWinRows(
        pendingRedemptions,
        claimedTrades,
        teamsMap,
      ),
    [claimedTrades, pendingRedemptions, teamsMap],
  );

  const counts = useMemo(() => {
    const c: Record<BetStatusKey, number> = {
      live: 0,
      pending: 0,
      redeemable: 0,
      settled: 0,
    };
    for (const r of rows) c[r.statusKey] += 1;
    return c;
  }, [rows]);

  const summary = useMemo(() => {
    const openRows = rows.filter((r) => r.statusKey === 'live');
    const pendingRows = rows.filter((r) => r.statusKey === 'pending');
    const claimableRows = rows.filter(
      (r) => r.statusKey === 'redeemable',
    );
    const settledRows = rows.filter((r) => r.statusKey === 'settled');
    const openValue = openRows.reduce((s, r) => s + r.value, 0);
    const claimableValue = claimableRows.reduce(
      (s, r) => s + r.redeemValue,
      0,
    );
    const claimedTotal = claimedWinRows.reduce(
      (s, r) => s + r.amount,
      0,
    );
    const positionsPnl = rows.reduce((s, r) => s + r.pnl, 0);
    const pendingClaimedValue = pendingRedemptionAmountNotInTrades(
      pendingRedemptions,
      claimedTrades,
    );
    const activityCashFlow = activityTrades.reduce(
      (s, trade) => s + tradePnlCashFlow(trade),
      0,
    );
    const netPnl =
      activityTrades.length > 0
        ? activityCashFlow + openValue + claimableValue + pendingClaimedValue
        : positionsPnl + pendingClaimedValue;
    return {
      total: rows.length,
      openCount: openRows.length,
      pendingCount: pendingRows.length,
      claimableCount: claimableRows.length,
      settledCount: settledRows.length,
      openValue,
      claimableValue,
      claimedTotal,
      netPnl,
    };
  }, [
    activityTrades,
    claimedTrades,
    claimedWinRows,
    pendingRedemptions,
    rows,
  ]);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows;
    return rows.filter((r) => r.statusKey === statusFilter);
  }, [rows, statusFilter]);

  return (
    <div className="space-y-4">
      <PageTitle
        eyebrow="Predictions"
        title="My bets"
        caption={`${summary.openCount} open${
          summary.pendingCount > 0
            ? ` · ${summary.pendingCount} finalizing`
            : ''
        } · ${summary.claimableCount} won to claim · ${
          claimedWinRows.length
        } claimed`}
      />

      <PendingRedemptionNotice redemptions={pendingRedemptions} />

      {(refreshError || showActivityRefreshError) && (
        <StaleRefreshNotice />
      )}

      {/* Summary tiles — 4 across on sm+, 2 across on mobile. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <HistorySummaryTile
          label="Open value"
          value={`$${summary.openValue.toFixed(2)}`}
        />
        <HistorySummaryTile
          label="To claim"
          value={`$${summary.claimableValue.toFixed(2)}`}
          tone={summary.claimableValue > 0.005 ? 'pos' : 'neutral'}
        />
        <HistorySummaryTile
          label="Claimed wins"
          value={`$${summary.claimedTotal.toFixed(2)}`}
          tone={summary.claimedTotal > 0.005 ? 'pos' : 'neutral'}
        />
        <HistorySummaryTile
          label="Net P&L"
          value={`${summary.netPnl >= 0 ? '+' : '−'}$${Math.abs(
            summary.netPnl,
          ).toFixed(2)}`}
          tone={
            summary.netPnl > 0.005
              ? 'pos'
              : summary.netPnl < -0.005
                ? 'neg'
                : 'neutral'
          }
        />
      </div>

      {/* Status filter chips. */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <FilterChip
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        >
          All · {summary.total}
        </FilterChip>
        <FilterChip
          active={statusFilter === 'live'}
          onClick={() => setStatusFilter('live')}
        >
          Open · {counts.live}
        </FilterChip>
        {counts.pending > 0 && (
          <FilterChip
            active={statusFilter === 'pending'}
            onClick={() => setStatusFilter('pending')}
          >
            Final · {counts.pending}
          </FilterChip>
        )}
        {counts.redeemable > 0 && (
          <FilterChip
            active={statusFilter === 'redeemable'}
            onClick={() => setStatusFilter('redeemable')}
          >
            Won · {counts.redeemable}
          </FilterChip>
        )}
        {counts.settled > 0 && (
          <FilterChip
            active={statusFilter === 'settled'}
            onClick={() => setStatusFilter('settled')}
          >
            Past · {counts.settled}
          </FilterChip>
        )}
        <label
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-full border bg-white px-3 text-[11.5px] font-semibold text-gray-900 shadow-sm"
          style={{ borderColor: HAIR }}
          title="Auto claim won predictions when this browser sees them."
        >
          <span>Auto claim</span>
          <Switch
            checked={autoClaimEnabled}
            onCheckedChange={onAutoClaimChange}
            aria-label="Auto claim won predictions"
            className="h-5 w-9 data-[state=checked]:bg-black data-[state=unchecked]:bg-gray-200 [&>span]:h-4 [&>span]:w-4 [&>span]:data-[state=checked]:translate-x-4"
          />
        </label>
      </div>

      {/* Bets table — header row + body rows on a shared grid. */}
      <div
        className="bg-white rounded-2xl border overflow-x-auto"
        style={{
          borderColor: HAIR,
          boxShadow:
            '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)',
        }}
      >
        <div
          className="grid gap-3 px-5 py-3 border-b text-[10.5px] font-bold uppercase tracking-[1.2px]"
          style={{
            gridTemplateColumns: BETS_GRID,
            minWidth: BETS_MIN_WIDTH,
            borderColor: HAIR2,
            color: MUTED,
            fontFamily: MONO,
          }}
        >
          <div>Status</div>
          <div>Placed</div>
          <div>Market</div>
          <div>Side</div>
          <div>Shares</div>
          <div>Avg</div>
          <div>Value</div>
          <div className="text-right">Action</div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <div className="text-[15px] font-semibold text-gray-900 mb-1">
              {statusFilter === 'all'
                ? 'No active bets'
                : 'Nothing matches that filter'}
            </div>
            <div className="text-[12.5px] text-gray-500 max-w-md mx-auto">
              {statusFilter === 'all'
                ? 'When you place a market or limit order, your active picks will appear here.'
                : 'Try switching back to All to see every position.'}
            </div>
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="mt-3 inline-flex items-center gap-1 h-7 px-3 rounded-full border bg-white text-[11.5px] font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                style={{ borderColor: HAIR }}
              >
                Show all
              </button>
            )}
          </div>
        ) : (
          filteredRows.map((row, i) => (
            <BetTableRow
              key={`${row.position.conditionId}-${row.position.outcomeIndex}`}
              row={row}
              isLast={i === filteredRows.length - 1}
              onRedeem={onRedeem}
              onSell={onSell}
              onTitleClick={onTitleClick}
              isSelling={sellingAsset === row.position.asset}
              isRedeeming={redeemingAsset === row.position.asset}
              isPending={pendingVerification.has(row.position.asset)}
              isSubmitting={isSubmitting}
              canTrade={canTrade}
              canRedeem={canRedeem}
              needsManualClaim={manualClaimAssets.has(
                row.position.asset,
              )}
            />
          ))
        )}
      </div>

      <ClaimedWinsSection
        rows={claimedWinRows}
        isLoading={isLoadingActivity}
        onSeeHistory={onSeeHistory}
        onRowClick={onClaimedWinClick}
      />
    </div>
  );
}

function ClaimedWinsSection({
  rows,
  isLoading,
  onSeeHistory,
  onRowClick,
}: {
  rows: ClaimedWinRow[];
  isLoading: boolean;
  onSeeHistory: () => void;
  onRowClick: (trade: TradeActivity) => void;
}) {
  const [shareRow, setShareRow] = useState<ClaimedWinRow | null>(
    null,
  );

  if (!isLoading && rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div
            className="text-[10.5px] font-bold uppercase tracking-[1.2px] text-gray-500"
            style={{ fontFamily: MONO }}
          >
            Claimed wins
          </div>
          <p className="mt-0.5 text-[12px] text-gray-500">
            Redeemed payouts from History are included in Net P&L.
          </p>
        </div>
        <button
          type="button"
          onClick={onSeeHistory}
          className="inline-flex h-7 items-center gap-1 rounded-full border bg-white px-3 text-[11.5px] font-semibold text-gray-900 transition hover:bg-gray-50"
          style={{ borderColor: HAIR }}
        >
          View history
        </button>
      </div>

      <div
        className="overflow-hidden rounded-2xl border bg-white"
        style={{
          borderColor: HAIR,
          boxShadow:
            '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)',
        }}
      >
        <div
          className="grid gap-3 border-b px-5 py-3 text-[10.5px] font-bold uppercase tracking-[1.2px]"
          style={{
            gridTemplateColumns: CLAIMED_WINS_GRID,
            borderColor: HAIR2,
            color: MUTED,
            fontFamily: MONO,
          }}
        >
          <div>Status</div>
          <div>Market</div>
          <div>Side</div>
          <div>Date</div>
          <div className="text-right">Payout</div>
        </div>

        {isLoading && rows.length === 0 ? (
          <div className="space-y-2 p-5">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-md bg-gray-50"
              />
            ))}
          </div>
        ) : (
          rows.map((row, i) => {
            const canOpen = Boolean(row.trade);
            return (
              <div
                key={row.key}
                onClick={() => {
                  if (row.trade) onRowClick(row.trade);
                }}
                className={`grid gap-3 px-5 py-3.5 items-center transition-colors ${
                  canOpen ? 'cursor-pointer hover:bg-gray-50' : ''
                } ${i === rows.length - 1 ? '' : 'border-b'}`}
                style={{
                  gridTemplateColumns: CLAIMED_WINS_GRID,
                  borderColor: HAIR2,
                }}
              >
                <div>
                  <span
                    className="inline-block rounded-full px-1.5 py-[3px] text-[9.5px] font-bold uppercase tracking-[0.6px]"
                    style={{
                      background:
                        row.source === 'pending'
                          ? 'rgba(245,158,11,0.12)'
                          : POS_GREEN_SOFT,
                      color:
                        row.source === 'pending' ? '#b45309' : POS_GREEN,
                      fontFamily: MONO,
                    }}
                  >
                    {row.source === 'pending' ? 'Pending' : 'Claimed'}
                  </span>
                </div>

                <div className="flex min-w-0 items-center gap-2.5">
                  {row.icon ? (
                    <img
                      src={row.icon}
                      alt=""
                      className="h-7 w-7 flex-shrink-0 rounded-md bg-gray-100 object-cover"
                    />
                  ) : (
                    <div className="h-7 w-7 flex-shrink-0 rounded-md bg-gray-200" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold tracking-[-0.1px] text-gray-900">
                      {row.title}
                    </div>
                    {row.outcome && (
                      <div
                        className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.4px]"
                        style={{ color: MUTED, fontFamily: MONO }}
                      >
                        {row.outcome}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="text-[11px] font-bold"
                  style={{ color: MUTED, fontFamily: MONO }}
                >
                  {row.side}
                </div>

                <div
                  className="text-[11px] tabular-nums"
                  style={{ color: MUTED, fontFamily: MONO }}
                >
                  {row.timestamp ? formatHistoryDate(row.timestamp) : 'Now'}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <span
                    className="text-right text-[12.5px] font-bold tabular-nums"
                    style={{ color: POS_GREEN, fontFamily: MONO }}
                  >
                    +${row.amount.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setShareRow(row);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full border bg-white text-gray-700 transition-colors hover:bg-gray-50"
                    style={{ borderColor: HAIR }}
                    title="Share redeemed prediction"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {shareRow && (
        <PositionShareModal
          position={claimedWinSharePosition(shareRow)}
          isOpen={!!shareRow}
          onClose={() => setShareRow(null)}
          statusOverride="redeemed"
          redeemedAmount={shareRow.amount}
        />
      )}
    </div>
  );
}

function BetTableRow({
  row,
  isLast,
  onRedeem,
  onSell,
  onTitleClick,
  isSelling,
  isRedeeming,
  isPending,
  isSubmitting,
  canTrade,
  canRedeem,
  needsManualClaim,
}: {
  row: BetRow;
  isLast: boolean;
  onRedeem: RedeemHandler;
  onSell: (p: PolymarketPosition) => void;
  onTitleClick: (p: PolymarketPosition) => void;
  isSelling: boolean;
  isRedeeming: boolean;
  isPending: boolean;
  isSubmitting: boolean;
  canTrade: boolean;
  canRedeem: boolean;
  needsManualClaim: boolean;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const {
    position: p,
    statusKey,
    statusLabel,
    side,
    value,
    pnl,
    pnlPct,
    isClaimable,
    redeemValue,
  } = row;
  const tone = BET_STATUS_TONE[statusKey];
  const sideStyle = predictionSideTone(side);
  const pnlColor =
    pnl > 0.005 ? POS_GREEN : pnl < -0.005 ? NEG_RED : MUTED;
  const pnlSign = pnl > 0.005 ? '+' : pnl < -0.005 ? '−' : '';
  const avgCents = (p.avgPrice * 100).toFixed(0);
  const shareStatus = shareStatusForBetRow(row);

  const renderAction = () => {
    if (statusKey === 'redeemable') {
      return (
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              void onRedeem(p);
            }}
            disabled={isRedeeming || !canRedeem || !isClaimable}
            className="inline-flex items-center justify-center h-7 px-3 rounded-full text-[11px] font-semibold text-white bg-[#19a974] hover:bg-[#149363] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {isRedeeming
              ? 'Redeeming…'
              : `Redeem $${redeemValue.toFixed(2)}`}
          </button>
          {needsManualClaim && (
            <span
              className="text-right text-[10px] font-semibold"
              style={{ color: '#b45309', fontFamily: MONO }}
            >
              Manual confirmation needed
            </span>
          )}
        </div>
      );
    }
    if (statusKey === 'live') {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSell(p);
          }}
          disabled={
            isSelling || isPending || isSubmitting || !canTrade
          }
          className="inline-flex items-center justify-center h-7 px-3 rounded-full text-[11px] font-semibold border bg-white text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          style={{ borderColor: HAIR }}
        >
          {isPending
            ? 'Processing…'
            : isSelling
              ? 'Selling…'
              : 'Cash out'}
        </button>
      );
    }
    if (statusKey === 'pending') {
      return (
        <span
          className="inline-flex items-center justify-center h-7 px-3 rounded-full text-[11px] font-semibold whitespace-nowrap"
          style={{
            background: 'rgba(245,158,11,0.12)',
            color: '#b45309',
          }}
        >
          Waiting to redeem
        </span>
      );
    }
    return (
      <span
        className="text-[11px]"
        style={{ color: MUTED, fontFamily: MONO }}
      >
        —
      </span>
    );
  };

  return (
    <>
      <div
        onClick={() => onTitleClick(p)}
        className={`grid gap-3 px-5 py-3.5 items-center transition-colors hover:bg-gray-50 cursor-pointer ${
          isLast ? '' : 'border-b'
        }`}
        style={{
          gridTemplateColumns: BETS_GRID,
          minWidth: BETS_MIN_WIDTH,
          borderColor: HAIR2,
        }}
      >
        <div>
          <span
            className="inline-block text-[9.5px] font-bold uppercase tracking-[0.6px] px-1.5 py-[3px] rounded-full"
            style={{
              background: tone.bg,
              color: tone.fg,
              fontFamily: MONO,
            }}
          >
            {statusLabel}
          </span>
        </div>

        <div
          className="text-[11px] tabular-nums"
          style={{ fontFamily: MONO, color: MUTED }}
        >
          {row.placedAt ? formatHistoryDate(row.placedAt) : '—'}
        </div>

      <div className="min-w-0 flex items-center gap-2.5">
        {p.icon ? (
          <img
            src={p.icon}
            alt=""
            className="w-7 h-7 rounded-md flex-shrink-0 object-cover bg-gray-100"
          />
        ) : (
          <div className="w-7 h-7 rounded-md flex-shrink-0 bg-gray-200" />
        )}
        <div className="min-w-0">
          <div className="text-[13px] font-semibold tracking-[-0.1px] text-gray-900 truncate">
            {p.title}
          </div>
          {p.outcome && (
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.4px] truncate mt-0.5"
              style={{ color: MUTED, fontFamily: MONO }}
            >
              {p.outcome}
            </div>
          )}
        </div>
      </div>

      <div>
        <span
          className="inline-block text-[10px] font-bold tracking-[0.6px] px-2 py-[3px] rounded-full"
          style={{
            background: sideStyle.bg,
            color: sideStyle.fg,
            fontFamily: MONO,
          }}
        >
          {side}
        </span>
      </div>

      <div
        className="text-[12.5px] font-semibold text-gray-900 tabular-nums"
        style={{ fontFamily: MONO }}
      >
        {p.size.toFixed(2)}
      </div>

      <div
        className="text-[12.5px] tabular-nums"
        style={{ fontFamily: MONO, color: MUTED }}
      >
        {avgCents}¢
      </div>

      <div className="tabular-nums" style={{ fontFamily: MONO }}>
        <div className="text-[12.5px] font-bold text-gray-900">
          ${value.toFixed(2)}
        </div>
        <div
          className="text-[10.5px] font-semibold mt-0.5"
          style={{ color: pnlColor }}
        >
          {pnlSign}${Math.abs(pnl).toFixed(2)} (
          {Math.abs(pnlPct).toFixed(1)}%)
        </div>
      </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setShareOpen(true);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full border bg-white text-gray-700 transition-colors hover:bg-gray-50"
            style={{ borderColor: HAIR }}
            title="Share prediction"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
          {renderAction()}
        </div>
      </div>

      <PositionShareModal
        position={p}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        statusOverride={shareStatus}
      />
    </>
  );
}

// ── A5 · Bet history ────────────────────────────────────────────────
// Mirrors wire-a5-history.jsx — back button (handled at panel level),
// page title with eyebrow + Export CSV, four summary tiles, a status
// filter row, and a single Card containing a header row + per-trade rows
// laid out on a fixed 6-column grid (Date / Market / Side / Shares /
// Price / Amount). Status badges are color-coded by activity outcome.

const PAGE_SIZE_HISTORY = 50;

type HistoryStatusKey = 'won' | 'sold' | 'bought' | 'other';
type HistoryStatusFilter = HistoryStatusKey | 'all';

interface HistoryRow {
  trade: TradeActivity;
  statusKey: HistoryStatusKey;
  statusLabel: string;
  side: PredictionSideDisplay;
  signedAmount: number;
  amount: number;
}

function deriveHistoryRow(
  trade: TradeActivity,
  teamsMap: TeamsMap | undefined,
): HistoryRow {
  const amount =
    trade.usdcSize != null && Number.isFinite(trade.usdcSize)
      ? Number(trade.usdcSize)
      : trade.size * trade.price;
  const isBuy = trade.side === 'BUY';
  let statusKey: HistoryStatusKey;
  let statusLabel: string;
  if (trade.type === 'REDEEM') {
    statusKey = 'won';
    statusLabel = 'WON';
  } else if (trade.type === 'TRADE' && !isBuy) {
    statusKey = 'sold';
    statusLabel = 'SOLD';
  } else if (trade.type === 'TRADE' && isBuy) {
    statusKey = 'bought';
    statusLabel = 'BOUGHT';
  } else {
    statusKey = 'other';
    statusLabel = trade.type;
  }
  // Cash-flow direction — buys are outflow, everything else is inflow.
  const signedAmount = isBuy ? -amount : amount;
  const side = displaySideForMarket(
    {
      title: trade.title,
      outcome: trade.outcome,
      eventSlug: trade.eventSlug,
      teamsMap,
    },
    trade.outcomeIndex,
  );
  return {
    trade,
    statusKey,
    statusLabel,
    side,
    signedAmount,
    amount,
  };
}

function formatHistoryDate(ts: number): string {
  const date = new Date(ts * 1000);
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (date >= startOfToday) return `Today · ${time}`;
  if (date >= startOfYesterday) return `Yesterday · ${time}`;

  const includeYear = date.getFullYear() !== now.getFullYear();
  const dateLabel = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' as const } : {}),
  });

  return `${dateLabel} · ${time}`;
}

const STATUS_TONE: Record<
  HistoryStatusKey,
  { bg: string; fg: string }
> = {
  won: { bg: POS_GREEN_SOFT, fg: POS_GREEN },
  sold: { bg: POS_GREEN_SOFT, fg: POS_GREEN },
  bought: { bg: SURFACE2, fg: MUTED },
  other: { bg: SURFACE2, fg: MUTED },
};

const HISTORY_GRID = '110px minmax(0,1.6fr) 118px 80px 90px 100px';

function BetHistoryView({
  safeAddress,
  teamsMap,
  onMarketClick,
}: {
  safeAddress: string | string[];
  teamsMap?: TeamsMap;
  onMarketClick: (trade: TradeActivity) => void;
}) {
  const [statusFilter, setStatusFilter] =
    useState<HistoryStatusFilter>('all');
  const [offset, setOffset] = useState(0);

  const { data: trades = [], isLoading, isError: refreshError } =
    useTradeActivity({
    user: safeAddress,
    limit: PAGE_SIZE_HISTORY,
    offset,
    sort: 'DESC',
  });
  const showRefreshError = refreshError && trades.length > 0;

  const rows = useMemo(
    () => trades.map((trade) => deriveHistoryRow(trade, teamsMap)),
    [trades, teamsMap],
  );

  const counts = useMemo(() => {
    const c: Record<HistoryStatusKey, number> = {
      won: 0,
      sold: 0,
      bought: 0,
      other: 0,
    };
    for (const r of rows) c[r.statusKey] += 1;
    return c;
  }, [rows]);

  const summary = useMemo(() => {
    const volume = rows.reduce((s, r) => s + r.amount, 0);
    const netFlow = rows.reduce((s, r) => s + r.signedAmount, 0);
    return {
      total: rows.length,
      volume,
      netFlow,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows;
    return rows.filter((r) => r.statusKey === statusFilter);
  }, [rows, statusFilter]);

  const canGoBack = offset > 0;
  const canLoadMore = trades.length === PAGE_SIZE_HISTORY;

  return (
    <div className="space-y-4">
      <PageTitle
        eyebrow="Predictions"
        title="Bet history"
        caption={`${summary.total} ${
          summary.total === 1 ? 'entry' : 'entries'
        } · last 30 days`}
        action={
          <FilterChip>
            <Download className="w-3 h-3" />
            Export CSV
          </FilterChip>
        }
      />

      {showRefreshError && <StaleRefreshNotice />}

      {/* Summary tiles — 4 across on sm+, 2 across on mobile. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <HistorySummaryTile
          label="Net flow"
          value={`${summary.netFlow >= 0 ? '+' : '−'}$${Math.abs(
            summary.netFlow,
          ).toFixed(2)}`}
          tone={
            summary.netFlow > 0.005
              ? 'pos'
              : summary.netFlow < -0.005
                ? 'neg'
                : 'neutral'
          }
        />
        <HistorySummaryTile
          label="Volume"
          value={`$${summary.volume.toFixed(0)}`}
        />
        <HistorySummaryTile
          label="Trades"
          value={String(summary.total)}
        />
        <HistorySummaryTile
          label="Activity"
          value={`${counts.bought}B · ${counts.sold + counts.won}S`}
        />
      </div>

      {/* Filter chips + sort/range placeholders pushed right. */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <FilterChip
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        >
          All · {summary.total}
        </FilterChip>
        <FilterChip
          active={statusFilter === 'won'}
          onClick={() => setStatusFilter('won')}
        >
          Won · {counts.won}
        </FilterChip>
        <FilterChip
          active={statusFilter === 'sold'}
          onClick={() => setStatusFilter('sold')}
        >
          Sold · {counts.sold}
        </FilterChip>
        <FilterChip
          active={statusFilter === 'bought'}
          onClick={() => setStatusFilter('bought')}
        >
          Bought · {counts.bought}
        </FilterChip>
        {counts.other > 0 && (
          <FilterChip
            active={statusFilter === 'other'}
            onClick={() => setStatusFilter('other')}
          >
            Other · {counts.other}
          </FilterChip>
        )}
        <span className="flex-1" />
        <FilterChip>
          30 days
          <ChevronDown className="w-3 h-3" />
        </FilterChip>
      </div>

      {/* History table — header row + body rows on a shared grid. */}
      <div
        className="bg-white rounded-2xl border overflow-hidden"
        style={{
          borderColor: HAIR,
          boxShadow:
            '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)',
        }}
      >
        <div
          className="grid gap-3 px-5 py-3 border-b text-[10.5px] font-bold uppercase tracking-[1.2px]"
          style={{
            gridTemplateColumns: HISTORY_GRID,
            borderColor: HAIR2,
            color: MUTED,
            fontFamily: MONO,
          }}
        >
          <div>Date</div>
          <div>Market</div>
          <div>Side</div>
          <div>Shares</div>
          <div>Price</div>
          <div className="text-right">Amount</div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-md bg-gray-50 animate-pulse"
              />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <div className="text-[15px] font-semibold text-gray-900 mb-1">
              {statusFilter === 'all'
                ? 'No history yet'
                : 'Nothing matches that filter'}
            </div>
            <div className="text-[12.5px] text-gray-500 max-w-md mx-auto">
              {statusFilter === 'all'
                ? 'Settled bets, fills and cancellations will appear here.'
                : 'Try switching back to All to see every trade.'}
            </div>
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="mt-3 inline-flex items-center gap-1 h-7 px-3 rounded-full border bg-white text-[11.5px] font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                style={{ borderColor: HAIR }}
              >
                Show all
              </button>
            )}
          </div>
        ) : (
          filteredRows.map((row, i) => (
            <HistoryTableRow
              key={`${row.trade.transactionHash}-${row.trade.asset}-${i}`}
              row={row}
              isLast={i === filteredRows.length - 1}
              onClick={() => onMarketClick(row.trade)}
            />
          ))
        )}
      </div>

      {/* Pagination — Prev/Next around a centered "Load older" chip. */}
      {(canGoBack || canLoadMore) && (
        <div className="flex justify-center items-center gap-2 pt-1">
          {canGoBack && (
            <FilterChip
              onClick={() =>
                setOffset((o) => Math.max(0, o - PAGE_SIZE_HISTORY))
              }
            >
              ← Newer
            </FilterChip>
          )}
          <span
            className="text-[11px] text-gray-500 tabular-nums"
            style={{ fontFamily: MONO }}
          >
            {trades.length === 0
              ? '0'
              : `${offset + 1}–${offset + trades.length}`}
          </span>
          {canLoadMore && (
            <FilterChip
              onClick={() => setOffset((o) => o + PAGE_SIZE_HISTORY)}
            >
              Load older →
            </FilterChip>
          )}
        </div>
      )}
    </div>
  );
}

function HistorySummaryTile({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'pos' | 'neg' | 'neutral';
}) {
  const color =
    tone === 'pos' ? POS_GREEN : tone === 'neg' ? NEG_RED : '#0a0a0c';
  return (
    <div
      className="bg-white rounded-2xl border p-4"
      style={{
        borderColor: HAIR,
        boxShadow:
          '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)',
      }}
    >
      <div
        className="text-[10.5px] uppercase tracking-[0.5px] font-semibold"
        style={{ color: MUTED }}
      >
        {label}
      </div>
      <div
        className="text-[20px] font-bold tracking-[-0.4px] mt-1.5 tabular-nums"
        style={{ fontFamily: MONO, color }}
      >
        {value}
      </div>
    </div>
  );
}

function HistoryTableRow({
  row,
  isLast,
  onClick,
}: {
  row: HistoryRow;
  isLast: boolean;
  onClick: () => void;
}) {
  const {
    trade,
    statusKey,
    statusLabel,
    side,
    signedAmount,
    amount,
  } = row;
  const tone = STATUS_TONE[statusKey];
  const sideStyle = predictionSideTone(side);
  const amountColor =
    signedAmount > 0.005
      ? POS_GREEN
      : signedAmount < -0.005
        ? NEG_RED
        : MUTED;
  const sign =
    signedAmount > 0.005 ? '+' : signedAmount < -0.005 ? '−' : '';

  return (
    <div
      onClick={onClick}
      className={`grid gap-3 px-5 py-3.5 items-center transition-colors hover:bg-gray-50 cursor-pointer ${
        isLast ? '' : 'border-b'
      }`}
      style={{
        gridTemplateColumns: HISTORY_GRID,
        borderColor: HAIR2,
        color: 'inherit',
      }}
    >
      <div
        className="text-[11px] tabular-nums"
        style={{ fontFamily: MONO, color: MUTED }}
      >
        {formatHistoryDate(trade.timestamp)}
      </div>

      <div className="min-w-0 flex items-center gap-2.5">
        {trade.icon ? (
          <img
            src={trade.icon}
            alt=""
            className="w-7 h-7 rounded-md flex-shrink-0 object-cover bg-gray-100"
          />
        ) : (
          <div className="w-7 h-7 rounded-md flex-shrink-0 bg-gray-200" />
        )}
        <div className="min-w-0">
          <div className="text-[13px] font-semibold tracking-[-0.1px] text-gray-900 truncate">
            {trade.title}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="text-[9.5px] font-bold uppercase tracking-[0.6px] px-1.5 py-[2px] rounded-full"
              style={{
                background: tone.bg,
                color: tone.fg,
                fontFamily: MONO,
              }}
            >
              {statusLabel}
            </span>
            {trade.outcome && (
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.4px] truncate"
                style={{ color: MUTED, fontFamily: MONO }}
              >
                {trade.outcome}
              </span>
            )}
          </div>
        </div>
      </div>

      <div>
        <span
          className="inline-block text-[10px] font-bold tracking-[0.6px] px-2 py-[3px] rounded-full"
          style={{
            background: sideStyle.bg,
            color: sideStyle.fg,
            fontFamily: MONO,
          }}
        >
          {side}
        </span>
      </div>

      <div
        className="text-[12.5px] font-semibold text-gray-900 tabular-nums"
        style={{ fontFamily: MONO }}
      >
        {trade.size.toFixed(2)}
      </div>

      <div
        className="text-[12.5px] tabular-nums"
        style={{ fontFamily: MONO, color: MUTED }}
      >
        {(trade.price * 100).toFixed(0)}¢
      </div>

      <div
        className="text-right text-[12.5px] font-bold tabular-nums"
        style={{ fontFamily: MONO, color: amountColor }}
      >
        {sign}${amount.toFixed(2)}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Bento helpers — match the wireframe screen 1 (A · Bento hero + feed).
// Apple-clean cream canvas with white cards; the dark "LIVE NOW" tile is
// the only inverted surface and lives inside the BentoHero.
// ────────────────────────────────────────────────────────────────────

function BentoEmpty({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div
      className="rounded-2xl bg-white border py-12 px-6 flex flex-col items-center justify-center text-center"
      style={{ borderColor: HAIR }}
    >
      <span className="text-[15px] font-semibold text-gray-900 mb-1">
        {title}
      </span>
      <span className="text-[12.5px] text-gray-500 max-w-md">
        {message}
      </span>
    </div>
  );
}

/**
 * Pill-shaped action chip used in the bento hero. Active state inverts to
 * solid black to match the "Deposit" chip in the wireframe.
 */
function HeroChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors border ${
        active
          ? 'bg-black text-white border-black hover:bg-gray-800'
          : 'bg-white text-gray-900 hover:bg-gray-50'
      }`}
      style={!active ? { borderColor: HAIR } : undefined}
    >
      {children}
    </button>
  );
}

/**
 * Sparkline reflecting the sign of cumulative PnL.
 */
function HeroSpark({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  const path =
    trend === 'down'
      ? 'M0,8 C20,14 35,10 50,18 C70,24 85,18 100,24 C120,30 135,26 150,32'
      : trend === 'flat'
        ? 'M0,20 C25,18 50,22 75,20 C100,18 125,22 150,20'
        : 'M0,30 C20,26 30,30 45,22 C60,14 75,20 90,12 C110,6 130,14 150,8';
  const color =
    trend === 'down'
      ? NEG_RED
      : trend === 'flat'
        ? '#9ca3af'
        : POS_GREEN;
  return (
    <svg
      viewBox="0 0 150 40"
      preserveAspectRatio="none"
      className="w-full h-12 block mt-3"
    >
      <defs>
        <linearGradient
          id={`predspark-${trend}`}
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L150,40 L0,40 Z`}
        fill={`url(#predspark-${trend})`}
      />
      <path
        d={path}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

type LiveScoreTeam = {
  name: string | null;
  abbreviation: string | null;
  logo?: string | null;
  color?: string | null;
  score: number | null;
};

type LiveScoreState = {
  live: boolean;
  ended?: boolean;
  closed?: boolean;
  period: string | null;
  elapsed: string | null;
  startTime?: string | null;
  teams: LiveScoreTeam[];
};

const EMPTY_LIVE_SCORE: LiveScoreState = {
  live: false,
  ended: false,
  closed: false,
  period: null,
  elapsed: null,
  startTime: null,
  teams: [],
};

function normalizeLiveEventSlug(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  return slug.replace(/-more-markets$/i, '');
}

function getMarketLiveEventSlug(
  market: PolymarketMarket | null | undefined,
): string | undefined {
  if (!market) return undefined;
  const explicit =
    market.eventSlug ||
    market.event?.slug ||
    market.events?.find?.((event: { slug?: string }) => event?.slug)?.slug;
  if (explicit) return normalizeLiveEventSlug(String(explicit));

  if (!market.slug || !market.gameStartTime || !market.eventTeams?.length) {
    return undefined;
  }

  return normalizeLiveEventSlug(
    String(market.slug)
      .replace(/-(moneyline|spread|total|totals|o-u|over-under).*$/i, '')
      .replace(/-(home|away|yes|no)-?[a-z0-9.]*$/i, ''),
  );
}

function parseLiveScorePair(raw: unknown): [number | null, number | null] {
  if (typeof raw !== 'string') return [null, null];
  const match = raw.match(/(\d+)\D+(\d+)/);
  if (!match) return [null, null];
  const first = Number(match[1]);
  const second = Number(match[2]);
  return [
    Number.isFinite(first) ? first : null,
    Number.isFinite(second) ? second : null,
  ];
}

function toLiveScoreNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getEmbeddedLiveScore(
  market: PolymarketMarket | null | undefined,
): LiveScoreState {
  if (!market) return EMPTY_LIVE_SCORE;
  const event = Array.isArray(market.events) ? market.events[0] : market.event;
  const [score0, score1] = parseLiveScorePair(
    event?.score ?? market.score ?? market.eventScore,
  );
  const rawTeams = Array.isArray(event?.teams)
    ? event.teams
    : Array.isArray(market.eventTeams)
      ? market.eventTeams
      : [];

  return {
    live: Boolean(market.eventLive || event?.live),
    ended: Boolean(
      market.eventEnded || event?.ended || event?.closed || market.closed,
    ),
    closed: Boolean(
      market.eventClosed || event?.closed || event?.ended || market.closed,
    ),
    period: market.eventPeriod ?? event?.period ?? null,
    elapsed: market.eventElapsed ?? event?.elapsed ?? null,
    startTime:
      market.eventStartDate ||
      event?.startDate ||
      event?.startTime ||
      market.gameStartTime ||
      null,
    teams: rawTeams.map(
      (
        team: LiveScoreTeam & { logo?: string | null; color?: string | null },
        index: number,
      ) => ({
        name: team?.name ?? null,
        abbreviation: team?.abbreviation ?? null,
        logo: team?.logo ?? null,
        color: team?.color ?? null,
        score:
          team?.score != null
            ? toLiveScoreNumber(team.score)
            : index === 0
              ? score0
              : index === 1
                ? score1
                : null,
      }),
    ),
  };
}

function mergeLiveScoreStates(
  fetched: LiveScoreState,
  embedded: LiveScoreState,
): LiveScoreState {
  const fetchedHasEventState =
    fetched.live ||
    fetched.ended ||
    fetched.closed ||
    fetched.period != null ||
    fetched.elapsed != null ||
    fetched.startTime != null ||
    fetched.teams.length > 0;
  const fetchedHasScores = fetched.teams.some((team) => team.score != null);
  const embeddedHasScores = embedded.teams.some((team) => team.score != null);
  const teams =
    fetched.teams.length && (fetchedHasScores || !embeddedHasScores)
      ? fetched.teams
      : embedded.teams;

  return {
    live: fetchedHasEventState ? fetched.live : embedded.live,
    ended: Boolean(fetched.ended || embedded.ended),
    closed: Boolean(fetched.closed || embedded.closed),
    period: fetched.period ?? embedded.period,
    elapsed: fetched.elapsed ?? embedded.elapsed,
    startTime: fetched.startTime ?? embedded.startTime,
    teams,
  };
}

function useLiveSportsGames() {
  return useQuery({
    queryKey: ['prediction-overview-live-games'],
    queryFn: async (): Promise<SportsGameGroup[]> => {
      const qs = new URLSearchParams({
        limit: '90',
        offset: '0',
        tag_id: String(getCategoryById('sports')?.tagId ?? 100639),
        live: 'true',
        kind: 'gamelines',
      });
      const response = await fetch(
        `/api/polymarket/desktop/markets?${qs.toString()}`,
      );
      if (!response.ok) throw new Error('Failed to load live games');

      const markets = (await response.json()) as PolymarketMarket[];
      const grouped = groupFlatMarketsIntoGames(markets)
        .filter(isValidGameCard)
        .sort(compareLiveSportsGames);

      const liveOnly = grouped.filter(isPolymarketLiveGame);
      const games = (liveOnly.length > 0 ? liveOnly : grouped).slice(0, 20);
      return enrichLiveSportsGames(games);
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

async function fetchLiveScoreForEvent(
  eventSlug: string,
): Promise<LiveScoreState | null> {
  try {
    const response = await fetch(
      `/api/polymarket/event-live?slug=${encodeURIComponent(eventSlug)}`,
    );
    if (!response.ok) return null;
    const json = (await response.json()) as LiveScoreState;
    return {
      live: Boolean(json.live),
      ended: Boolean(json.ended),
      closed: Boolean(json.closed),
      period: json.period ?? null,
      elapsed: json.elapsed ?? null,
      startTime: json.startTime ?? null,
      teams: Array.isArray(json.teams) ? json.teams : [],
    };
  } catch {
    return null;
  }
}

function liveScoreTeamKey(team: LiveScoreTeam) {
  return (
    team.name?.trim().toLowerCase() ||
    team.abbreviation?.trim().toLowerCase() ||
    ''
  );
}

function enrichMarketWithLiveScore(
  market: PolymarketMarket,
  liveScore: LiveScoreState,
): PolymarketMarket {
  const currentTeams = Array.isArray(market.eventTeams)
    ? market.eventTeams
    : [];
  const existingByKey = new Map(
    currentTeams
      .map((team) => {
        const key =
          team.name?.trim().toLowerCase() ||
          team.abbreviation?.trim().toLowerCase() ||
          '';
        return key ? [key, team] : null;
      })
      .filter((entry): entry is [string, (typeof currentTeams)[number]] =>
        Boolean(entry),
      ),
  );

  const eventTeams =
    liveScore.teams.length > 0
      ? liveScore.teams.map((team) => {
          const key = liveScoreTeamKey(team);
          const existing = key ? existingByKey.get(key) : undefined;
          return {
            ...existing,
            name: team.name ?? existing?.name,
            abbreviation:
              team.abbreviation ?? existing?.abbreviation,
            logo: team.logo ?? existing?.logo,
            color: team.color ?? existing?.color,
            score: team.score,
          };
        })
      : currentTeams;

  return {
    ...market,
    eventLive: liveScore.live || market.eventLive,
    eventPeriod: liveScore.period ?? market.eventPeriod,
    eventElapsed: liveScore.elapsed ?? market.eventElapsed,
    eventStartDate:
      liveScore.startTime ?? market.eventStartDate ?? null,
    gameStartTime:
      market.gameStartTime ?? liveScore.startTime ?? undefined,
    eventTeams,
  };
}

function enrichGroupedMarketWithLiveScore(
  grouped: GroupedMarket | null,
  liveScore: LiveScoreState,
): GroupedMarket | null {
  if (!grouped) return null;
  return {
    ...grouped,
    market: enrichMarketWithLiveScore(grouped.market, liveScore),
  };
}

async function enrichLiveSportsGames(
  games: SportsGameGroup[],
): Promise<SportsGameGroup[]> {
  return Promise.all(
    games.map(async (game) => {
      const eventSlug = getMarketLiveEventSlug(getGamePrimaryMarket(game));
      if (!eventSlug) return game;

      const liveScore = await fetchLiveScoreForEvent(eventSlug);
      if (!liveScore) return game;

      return {
        ...game,
        startDate: game.startDate ?? liveScore.startTime ?? undefined,
        moneyline: enrichGroupedMarketWithLiveScore(
          game.moneyline,
          liveScore,
        ),
        spread: enrichGroupedMarketWithLiveScore(
          game.spread,
          liveScore,
        ),
        total: enrichGroupedMarketWithLiveScore(game.total, liveScore),
      };
    }),
  );
}

function isPolymarketLiveGame(game: SportsGameGroup) {
  const market = getGamePrimaryMarket(game);
  return Boolean(market?.eventLive || market?.eventPeriod || market?.eventElapsed);
}

function getGameStartMs(game: SportsGameGroup) {
  const market = getGamePrimaryMarket(game);
  const raw =
    market?.gameStartTime ||
    market?.eventStartDate ||
    game.startDate ||
    null;
  if (!raw) return 0;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

function compareLiveSportsGames(a: SportsGameGroup, b: SportsGameGroup) {
  const aMarket = getGamePrimaryMarket(a);
  const bMarket = getGamePrimaryMarket(b);
  const aLive = aMarket?.eventLive ? 1 : 0;
  const bLive = bMarket?.eventLive ? 1 : 0;
  if (aLive !== bLive) return bLive - aLive;

  const aClock = aMarket?.eventPeriod || aMarket?.eventElapsed ? 1 : 0;
  const bClock = bMarket?.eventPeriod || bMarket?.eventElapsed ? 1 : 0;
  if (aClock !== bClock) return bClock - aClock;

  return getGameStartMs(b) - getGameStartMs(a);
}

function useLiveEventScore(
  eventSlug: string | undefined,
  enabled: boolean,
): LiveScoreState {
  const [state, setState] = useState<LiveScoreState>(EMPTY_LIVE_SCORE);

  useEffect(() => {
    if (!enabled || !eventSlug) {
      setState(EMPTY_LIVE_SCORE);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchOnce = async () => {
      try {
        const response = await fetch(
          `/api/polymarket/event-live?slug=${encodeURIComponent(eventSlug)}`,
        );
        if (!response.ok) return;
        const json = (await response.json()) as LiveScoreState;
        if (cancelled) return;
        setState({
          live: Boolean(json.live),
          ended: Boolean(json.ended),
          closed: Boolean(json.closed),
          period: json.period ?? null,
          elapsed: json.elapsed ?? null,
          startTime: json.startTime ?? null,
          teams: Array.isArray(json.teams) ? json.teams : [],
        });
        if (!cancelled && json.live) {
          timer = setTimeout(fetchOnce, 15_000);
        }
      } catch {
        // Keep the overview fast; rows fall back to event timing fields.
      }
    };

    fetchOnce();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [eventSlug, enabled]);

  return state;
}

function getGamePrimaryMarket(game: SportsGameGroup) {
  return (
    game.moneyline?.market ||
    game.spread?.market ||
    game.total?.market ||
    null
  );
}

function pickLiveTeamScore(
  outcomeLabel: string,
  outcomeAbbr: string | undefined,
  teams: LiveScoreTeam[],
  fallbackIndex: number,
): number | null {
  if (!teams.length) return null;
  const label = outcomeLabel.trim().toLowerCase();
  const abbr = (outcomeAbbr || '').trim().toLowerCase();
  const byName = teams.find((team) => {
    const name = (team.name || '').toLowerCase();
    return name === label || Boolean(name && (name.includes(label) || label.includes(name)));
  });
  if (byName?.score != null) return byName.score;

  if (abbr) {
    const byAbbr = teams.find(
      (team) => (team.abbreviation || '').toLowerCase() === abbr,
    );
    if (byAbbr?.score != null) return byAbbr.score;
  }

  return teams[fallbackIndex]?.score ?? null;
}

function formatLiveGameClock(
  liveScore: LiveScoreState,
  market?: PolymarketMarket | null,
) {
  const period = liveScore.period || market?.eventPeriod || null;
  const elapsed = liveScore.elapsed || market?.eventElapsed || null;
  return [period, elapsed].filter(Boolean).join(' ') || 'In play';
}

function LiveGameRow({
  game,
  isFirst,
  onClick,
}: {
  game: SportsGameGroup;
  isFirst: boolean;
  onClick: (market: PolymarketMarket) => void;
}) {
  const primaryMarket = getGamePrimaryMarket(game);
  const eventSlug = getMarketLiveEventSlug(primaryMarket);
  const liveScore = useLiveEventScore(eventSlug, Boolean(eventSlug));
  const embeddedScore = useMemo(
    () => getEmbeddedLiveScore(primaryMarket),
    [primaryMarket],
  );
  const scoreState = useMemo(
    () => mergeLiveScoreStates(liveScore, embeddedScore),
    [liveScore, embeddedScore],
  );
  const scoreA = pickLiveTeamScore(
    game.teamA,
    game.teamAMeta?.abbrev,
    scoreState.teams,
    0,
  );
  const scoreB = pickLiveTeamScore(
    game.teamB,
    game.teamBMeta?.abbrev,
    scoreState.teams,
    1,
  );
  const hasScore = scoreA != null && scoreB != null;
  const clock = formatLiveGameClock(scoreState, primaryMarket);

  return (
    <button
      type="button"
      disabled={!primaryMarket}
      onClick={() => {
        if (primaryMarket) onClick(primaryMarket);
      }}
      className={`w-full text-left py-2.5 ${
        isFirst ? '' : 'border-t border-white/5'
      } hover:bg-white/[0.02] disabled:cursor-default disabled:hover:bg-transparent transition-colors`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold tracking-tight">
              {game.teamA} vs. {game.teamB}
            </span>
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400"
              style={{ boxShadow: '0 0 0 3px rgba(255,90,95,0.16)' }}
            />
          </div>
          <div
            className="mt-0.5 flex min-w-0 items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wide"
            style={{ color: 'rgba(255,255,255,0.55)', fontFamily: MONO }}
          >
            <span className="shrink-0 tabular-nums text-red-300">
              {clock}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
            <span className="truncate">
              {game.moneyline ? 'moneyline' : game.spread ? 'spread' : 'total'}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right" style={{ fontFamily: MONO }}>
          {hasScore ? (
            <>
              <div className="text-[16px] font-bold tabular-nums">
                {scoreA} - {scoreB}
              </div>
              <div className="mt-0.5 text-[10px] font-semibold text-white/45">
                score
              </div>
            </>
          ) : (
            <>
              <div className="text-[12px] font-bold text-red-300">LIVE</div>
              <div className="mt-0.5 text-[10px] font-semibold text-white/45">
                odds live
              </div>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

interface BentoHeroProps {
  intPart: string;
  decPart: string;
  portfolioPct: number;
  totalPnl: number;
  openBets: number;
  openOrders: number;
  inOrdersValue: number;
  liveGames: SportsGameGroup[];
  isLoadingLiveGames: boolean;
  onDeposit: () => void;
  onWithdraw: () => void;
  onOpenOrders: () => void;
  onMyBets: () => void;
  onHistory: () => void;
  onLiveGameClick: (market: PolymarketMarket) => void;
}

/**
 * 1.35fr / 1fr bento — left card is the predictions balance hero (light),
 * right card is the dark "Active picks" tile listing live positions. Maps
 * directly to wire-a-feed.jsx WireA. The chip row at the bottom of the
 * left card is the panel's only navigation: Deposit / Withdraw open the
 * transfer modal, Open orders / My bets / History drill into A4/A5 views.
 */
function BentoHero({
  intPart,
  decPart,
  portfolioPct,
  totalPnl,
  openBets,
  openOrders,
  inOrdersValue,
  liveGames,
  isLoadingLiveGames,
  onDeposit,
  onWithdraw,
  onOpenOrders,
  onMyBets,
  onHistory,
  onLiveGameClick,
}: BentoHeroProps) {
  const isPctPositive = portfolioPct >= 0;
  const trend: 'up' | 'down' | 'flat' =
    totalPnl > 0.01 ? 'up' : totalPnl < -0.01 ? 'down' : 'flat';

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1.35fr_1fr] gap-3.5">
      {/* Left: balance hero */}
      <div
        className="bg-white rounded-2xl border p-6"
        style={{
          borderColor: HAIR,
          boxShadow:
            '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)',
        }}
      >
        <div className="flex items-start justify-between">
          <span className="text-[12.5px] text-gray-500 font-medium tracking-[-0.1px]">
            Predictions balance
          </span>
          {Number.isFinite(portfolioPct) && portfolioPct !== 0 && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold tabular-nums ${
                isPctPositive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-600'
              }`}
              style={{ fontFamily: MONO }}
            >
              <span className="text-[9px]">
                {isPctPositive ? '▲' : '▼'}
              </span>
              {isPctPositive ? '+' : ''}
              {portfolioPct.toFixed(2)}%
            </span>
          )}
        </div>

        <div className="mt-2 leading-none tabular-nums">
          <span className="text-[44px] font-semibold tracking-[-1.8px] text-gray-900">
            ${intPart}
          </span>
          <span className="text-[30px] font-semibold tracking-[-1px] text-gray-400">
            .{decPart}
          </span>
        </div>

        <HeroSpark trend={trend} />

        {/* P/L stat strip */}
        <div
          className="grid grid-cols-3 mt-4 pt-3.5 border-t"
          style={{ borderColor: HAIR }}
        >
          <StatCell
            label="Total P/L"
            value={`${totalPnl >= 0 ? '+' : '−'}$${Math.abs(totalPnl).toFixed(2)}`}
            tone={
              totalPnl >= 0 ? 'pos' : totalPnl < 0 ? 'neg' : 'neutral'
            }
          />
          <StatCell
            label="In orders"
            value={`$${inOrdersValue.toFixed(2)}`}
            divider
          />
          <StatCell
            label="Open bets"
            value={String(openBets)}
            sub={
              openOrders > 0 ? `· ${openOrders} orders` : undefined
            }
            divider
          />
        </div>

        {/* Action chip row — matches wire-a-feed.jsx WireA bento. */}
        <div className="flex flex-wrap gap-2 mt-4">
          <HeroChip active onClick={onDeposit}>
            <Plus className="w-3 h-3" />
            Deposit
          </HeroChip>
          <HeroChip onClick={onWithdraw}>
            <ArrowUpFromLine className="w-3 h-3" />
            Withdraw
          </HeroChip>
          <HeroChip onClick={onOpenOrders}>
            <ListOrdered className="w-3 h-3" />
            Open orders · {openOrders}
          </HeroChip>
          <HeroChip onClick={onMyBets}>
            <Clock3 className="w-3 h-3" />
            My bets · {openBets}
          </HeroChip>
          <HeroChip onClick={onHistory}>
            <History className="w-3 h-3" />
            History
          </HeroChip>
        </div>
      </div>

      {/* Right: dark live games tile (the only dark surface — matches
          the LIVE NOW tile from the wireframe). */}
      <div
        className="rounded-2xl overflow-hidden text-white"
        style={{
          background: '#0a0a0c',
          boxShadow:
            '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)',
        }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <span
            className="inline-flex items-center gap-1.5 text-[10px] tracking-[1.2px] font-bold"
            style={{ color: LIVE_RED, fontFamily: MONO }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: LIVE_RED,
                boxShadow: `0 0 0 3px rgba(255,90,95,0.18)`,
              }}
            />
            LIVE GAMES
          </span>
          <span
            className="text-[11px] font-semibold tabular-nums"
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontFamily: MONO,
            }}
          >
            {isLoadingLiveGames
              ? 'loading'
              : `${liveGames.length} ${liveGames.length === 1 ? 'game' : 'games'}`}
          </span>
        </div>
        <div className="max-h-[255px] overflow-y-auto px-5 py-2">
          {isLoadingLiveGames ? (
            <div className="space-y-2 py-2">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-[52px] animate-pulse rounded-xl bg-white/[0.04]"
                />
              ))}
            </div>
          ) : liveGames.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-white/60 font-medium">
                No live games right now
              </p>
              <button
                onClick={onMyBets}
                className="mt-2 text-xs text-white/90 underline-offset-4 hover:underline"
              >
                View my bets
              </button>
            </div>
          ) : (
            liveGames.map((game, i) => (
              <LiveGameRow
                key={game.eventId || game.title}
                game={game}
                isFirst={i === 0}
                onClick={onLiveGameClick}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Category drill-down view — wireframe screen A2 (Sports market depth)
// adapted to also handle non-sports categories.
//
// Layout (matches wire-a2-sports.jsx):
//   • Breadcrumb (Browse › <label>)
//   • Page title (32px, weight 600, tracking -1.1px) + stats subtitle
//     + right-side action chips (My picks · n / Filters)
//   • Single white card with vertical hairline-divided rows:
//       1. League / category tab row — pills with mono counts;
//          active pill = solid black.
//       2. Sub-filter row (#fafafa bg) — Game lines / Futures / Live
//          + "Sort" chip on the right.
//       3. Date strip — Today / Tomorrow / Tue … tile-pills.
//       4. Markets content (HighVolumeMarkets, internal tabs hidden).
// ────────────────────────────────────────────────────────────────────

type DrillDown =
  | { kind: 'sports'; sub: SportSubcategoryId }
  | { kind: 'category'; id: CategoryId };

interface CategoryDetailViewProps {
  drillDown: DrillDown;
  onBack: () => void;
  /** Lets the league/category tab row swap the active drill-down without
   *  bouncing back to the bento. */
  onChangeDrillDown: (next: DrillDown) => void;
}

/** Five rolling weekday tiles starting at "Today". Each tile carries the
 *  inclusive [start, end) ISO range so the backend can filter events whose
 *  startDate falls inside it. */
interface DateTileSpec {
  label: string;
  sub: string;
  /** Inclusive lower bound (ISO timestamp) — start of local day. */
  fromIso: string;
  /** Exclusive upper bound (ISO timestamp) — start of next local day. */
  toIso: string;
}

function buildDateStrip(count = 5): DateTileSpec[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(today);
    start.setDate(today.getDate() + i);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    const weekday = start.toLocaleDateString('en-US', {
      weekday: 'short',
    });
    const sub = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekday;
    return {
      label,
      sub,
      fromIso: start.toISOString(),
      toIso: end.toISOString(),
    };
  });
}

function CategoryDetailView({
  drillDown,
  onBack,
  onChangeDrillDown,
}: CategoryDetailViewProps) {
  const isSports = drillDown.kind === 'sports';
  const label = isSports
    ? (getSportSubcategoryById(drillDown.sub)?.label ?? 'Sports')
    : (getCategoryById(drillDown.id)?.label ?? 'Markets');

  // Filter state — wired to the backend through SportsTableView (sports)
  // or HighVolumeMarkets (other categories).
  // 0 → Game lines / All markets   (default — no extra filter)
  // 1 → Futures / Trending         (kind=futures for sports)
  // 2 → Live / Closing soon        (live=true for sports)
  const [filterIdx, setFilterIdx] = useState(0);
  const dateStrip = useMemo(() => buildDateStrip(5), []);
  // Default to "Today" — matches the A2 wireframe's active tile.
  const [activeDateIdx, setActiveDateIdx] = useState(0);

  // Resolve the live Polymarket tag ID for the active sport sub. Falls back
  // to the static constant when the live /sports endpoint hasn't responded.
  const { data: sportsMeta } = useSportsMeta();
  const sportTagId = useMemo(() => {
    if (!isSports) return undefined;
    if (drillDown.sub === 'all') {
      return (
        sportsMeta?.tagIdBySlug.get('sports') ??
        getCategoryById('sports')?.tagId ??
        100639
      );
    }
    const liveTagId = sportsMeta?.tagIdBySlug.get(
      drillDown.sub.toLowerCase(),
    );
    if (liveTagId != null) return liveTagId;
    return (
      getSportSubcategoryById(drillDown.sub)?.tagId ??
      getCategoryById('sports')?.tagId ??
      undefined
    );
  }, [isSports, drillDown, sportsMeta]);

  // Filter chip → backend params. Default ("Game lines") sends no kind so
  // the backend's market-level team detection handles every event. We only
  // narrow on explicit Futures or Live picks.
  const liveOnly = isSports && filterIdx === 2;
  const kind: 'futures' | undefined =
    isSports && filterIdx === 1 ? 'futures' : undefined;
  const showDateStrip = isSports && filterIdx === 0;
  const activeDate = dateStrip[activeDateIdx] ?? dateStrip[0];

  const titleText = isSports
    ? `${label === 'All Sports' ? 'Sports' : label} markets`
    : `${label} markets`;
  const subtitleText = isSports
    ? 'Moneyline · Spread · Totals · Live'
    : 'Tap any market for full odds, or any pill to bet directly.';

  return (
    <div className="space-y-4">
      {/* ── Breadcrumb ───────────────────────────────────────── */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Browse</span>
        <span style={{ color: '#d7d7d3' }}>›</span>
        <span className="font-semibold text-gray-900">{label}</span>
      </button>

      {/* ── Page title + action chips (matches A2) ──────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-1.1px] leading-[1.05] text-gray-900">
            {titleText}
          </h1>
          <div className="text-[13px] text-gray-500 mt-1.5">
            {subtitleText}
          </div>
        </div>
        <div className="flex gap-1.5">
          <FilterChip>My picks</FilterChip>
          <FilterChip>
            <SlidersHorizontal className="w-3 h-3" />
            Filters
          </FilterChip>
        </div>
      </div>

      {/* ── A2 card — chrome rows + markets content ────────── */}
      <div
        className="bg-white rounded-2xl border overflow-hidden"
        style={{
          borderColor: HAIR,
          boxShadow:
            '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)',
        }}
      >
        {/* Row 1 — League / category pill tabs */}
        <div
          className="flex gap-1 px-2.5 py-2 overflow-x-auto border-b"
          style={{ borderColor: HAIR }}
        >
          {isSports
            ? SPORT_SUBCATEGORIES.map((s) => (
                <LeaguePill
                  key={s.id}
                  active={drillDown.sub === s.id}
                  label={s.label === 'All Sports' ? 'All' : s.label}
                  onClick={() =>
                    onChangeDrillDown({ kind: 'sports', sub: s.id })
                  }
                />
              ))
            : CATEGORIES.filter((c) => c.id !== 'sports').map((c) => (
                <LeaguePill
                  key={c.id}
                  active={
                    drillDown.kind === 'category' &&
                    drillDown.id === c.id
                  }
                  label={c.label}
                  onClick={() =>
                    onChangeDrillDown({ kind: 'category', id: c.id })
                  }
                />
              ))}
        </div>

        {/* Row 2 — Sub-filter row (#fafafa bg) */}
        <div
          className="px-3.5 py-2.5 flex items-center justify-between gap-3 border-b"
          style={{ borderColor: HAIR, background: '#fafafa' }}
        >
          <div className="flex gap-1.5 flex-wrap">
            <SubFilterChip
              active={filterIdx === 0}
              onClick={() => setFilterIdx(0)}
            >
              {isSports ? 'Game lines' : 'All markets'}
            </SubFilterChip>
            <SubFilterChip
              active={filterIdx === 1}
              onClick={() => setFilterIdx(1)}
            >
              {isSports ? 'Futures' : 'Trending'}
            </SubFilterChip>
            <SubFilterChip
              active={filterIdx === 2}
              onClick={() => setFilterIdx(2)}
            >
              {isSports ? 'Live' : 'Closing soon'}
            </SubFilterChip>
          </div>
          <div className="flex items-center gap-2 text-[11.5px] text-gray-500 shrink-0">
            <span className="hidden sm:inline">Sort</span>
            <SubFilterChip>
              {isSports && filterIdx !== 1 ? 'Game time' : 'Volume'}
              <ChevronDown className="w-3 h-3" />
            </SubFilterChip>
          </div>
        </div>

        {/* Row 3 — Date strip. Futures and Live are cross-date feeds, so
              only dated game lines send a [from, to) range to the backend. */}
        {showDateStrip && (
          <div
            className="px-3.5 py-3 flex gap-1.5 overflow-x-auto border-b"
            style={{ borderColor: HAIR }}
          >
            {dateStrip.map((d, i) => (
              <DateTile
                key={i}
                label={d.label}
                sub={d.sub}
                active={i === activeDateIdx}
                onClick={() => setActiveDateIdx(i)}
              />
            ))}
          </div>
        )}

        {/* Row 4 — Sportsbook table (sports) or single-column markets list.
              Sports use the dedicated A2 SportsTableView so games render as
              MATCHUP / MONEYLINE / SPREAD / TOTAL rows; non-sports fall back
              to HighVolumeMarkets in single-column mode. */}
        {isSports ? (
          <SportsTableView
            tagId={sportTagId ?? null}
            liveOnly={liveOnly}
            kind={kind}
            dateFrom={showDateStrip ? activeDate.fromIso : undefined}
            dateTo={showDateStrip ? activeDate.toIso : undefined}
          />
        ) : (
          <div className="p-4 sm:p-5">
            <HighVolumeMarkets
              key={`cat-${drillDown.id}`}
              hideMainCategoryTabs
              hideSportSubTabs
              hideSearch
              hideSectionHeader
              singleColumn
              initialCategory={drillDown.id}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** League / category pill — A2 styling: solid black when active, pure
 *  white with hairline border otherwise. Mono-font count slot is left
 *  for future use once per-category counts are wired. */
function LeaguePill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 h-7 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
        active
          ? 'bg-black text-white'
          : 'bg-transparent text-gray-900 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}

/** Compact sub-filter pill used inside the #fafafa row. */
function SubFilterChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11.5px] font-semibold whitespace-nowrap transition-colors border ${
        active
          ? 'bg-black text-white border-black'
          : 'bg-white text-gray-900 hover:bg-gray-100'
      }`}
      style={!active ? { borderColor: HAIR } : undefined}
    >
      {children}
    </button>
  );
}

/** Date tile-pill matching A2's date strip. */
function DateTile({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl px-3.5 py-2 min-w-[88px] transition-colors border ${
        active
          ? 'bg-black text-white border-black'
          : 'bg-white text-gray-900 hover:bg-gray-50'
      }`}
      style={!active ? { borderColor: HAIR } : undefined}
    >
      <div className="text-[12px] font-semibold tracking-[-0.2px] leading-tight">
        {label}
      </div>
      <div
        className={`text-[10px] font-medium tabular-nums mt-0.5 ${
          active ? 'text-white/60' : 'text-gray-500'
        }`}
        style={{ fontFamily: MONO }}
      >
        {sub}
      </div>
    </button>
  );
}

function StatCell({
  label,
  value,
  sub,
  tone = 'neutral',
  divider,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'pos' | 'neg' | 'neutral';
  divider?: boolean;
}) {
  const color =
    tone === 'pos' ? POS_GREEN : tone === 'neg' ? NEG_RED : '#0a0a0c';
  return (
    <div
      className={divider ? 'pl-3.5' : ''}
      style={
        divider ? { borderLeft: `1px solid ${HAIR}` } : undefined
      }
    >
      <div className="text-[10.5px] uppercase tracking-[0.4px] text-gray-500 font-semibold">
        {label}
      </div>
      <div
        className="flex items-baseline gap-1 mt-1 tabular-nums"
        style={{ fontFamily: MONO }}
      >
        <span
          className="text-[16px] font-semibold tracking-[-0.3px]"
          style={{ color }}
        >
          {value}
        </span>
        {sub && (
          <span className="text-[10.5px] text-gray-500 font-medium">
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Build a best-effort PolymarketMarket from a trade activity row so a
 * clicked history row routes to the internal market-detail page instead
 * of polymarket.com. We only know the traded side (asset, price, outcome
 * label, outcomeIndex) — the opposite slot is left empty and the detail
 * view falls back to its Yes/No / 0.5 defaults.
 */
function tradeToDetailMarket(trade: TradeActivity): PolymarketMarket {
  const isYesTrade = trade.outcomeIndex === 0;
  const tradedOutcome = trade.outcome || (isYesTrade ? 'Yes' : 'No');
  const oppositeOutcome = isYesTrade ? 'No' : 'Yes';
  const tradedPrice = trade.price;
  const oppositePrice = Math.max(0, 1 - tradedPrice);
  const yesOutcomeName = isYesTrade ? tradedOutcome : oppositeOutcome;
  const noOutcomeName = isYesTrade ? oppositeOutcome : tradedOutcome;
  const yesTokenId = isYesTrade ? trade.asset : '';
  const noTokenId = isYesTrade ? '' : trade.asset;
  const yesPrice = isYesTrade ? tradedPrice : oppositePrice;
  const noPrice = isYesTrade ? oppositePrice : tradedPrice;
  const isClosed = trade.type === 'REDEEM';

  return {
    id: trade.conditionId,
    question: trade.title,
    slug: trade.slug,
    active: !isClosed,
    closed: isClosed,
    icon: trade.icon,
    eventSlug: trade.eventSlug,
    outcomes: JSON.stringify([yesOutcomeName, noOutcomeName]),
    outcomePrices: JSON.stringify([
      String(yesPrice),
      String(noPrice),
    ]),
    clobTokenIds: JSON.stringify([yesTokenId, noTokenId]),
    conditionId: trade.conditionId,
  };
}

type PositionEventTeamMeta = NonNullable<
  PolymarketMarket['eventTeams']
>[number];

function isBinaryPositionOutcome(label: string): boolean {
  return /^(yes|no)$/i.test(label.trim());
}

function resolvePositionTeamMeta(
  label: string,
  teamsMap: TeamsMap | undefined,
): PositionEventTeamMeta | undefined {
  if (!teamsMap || !label) return undefined;
  const lower = label.trim().toLowerCase();
  if (!lower) return undefined;
  const hit =
    teamsMap.byKey.get(lower) ||
    teamsMap.byKey.get(lower.split(/\s+/).pop() ?? '');
  if (!hit) return undefined;
  return {
    id: hit.id,
    name: hit.name,
    league: hit.sport,
    logo: hit.logoUrl,
    abbreviation: hit.abbreviation,
    color: typeof hit.color === 'string' ? hit.color : undefined,
  };
}

function positionLooksLikeSportsMatchup(
  position: PolymarketPosition,
  yesOutcomeName: string,
  noOutcomeName: string,
): boolean {
  if (!position.eventSlug) return false;
  if (
    isBinaryPositionOutcome(yesOutcomeName) ||
    isBinaryPositionOutcome(noOutcomeName)
  ) {
    return false;
  }
  return /\b(vs\.?|v\.?|at)\b|@/i.test(position.title);
}

function positionToDetailMarket(
  position: PolymarketPosition,
  teamsMap: TeamsMap | undefined,
): PolymarketMarket {
  const isYesPos = position.outcomeIndex === 0;
  const yesTokenId = isYesPos
    ? position.asset
    : position.oppositeAsset;
  const noTokenId = isYesPos
    ? position.oppositeAsset
    : position.asset;
  const yesOutcomeName = isYesPos
    ? position.outcome
    : position.oppositeOutcome;
  const noOutcomeName = isYesPos
    ? position.oppositeOutcome
    : position.outcome;
  const yesPrice = isYesPos
    ? position.curPrice
    : 1 - position.curPrice;
  const noPrice = isYesPos
    ? 1 - position.curPrice
    : position.curPrice;

  const yesTeam = resolvePositionTeamMeta(yesOutcomeName, teamsMap);
  const noTeam = resolvePositionTeamMeta(noOutcomeName, teamsMap);
  const eventTeams: PositionEventTeamMeta[] | undefined =
    yesTeam && noTeam
      ? [yesTeam, noTeam]
      : positionLooksLikeSportsMatchup(
            position,
            yesOutcomeName,
            noOutcomeName,
          )
        ? [
            yesTeam ?? { name: yesOutcomeName },
            noTeam ?? { name: noOutcomeName },
          ]
        : undefined;

  return {
    id: position.conditionId,
    conditionId: position.conditionId,
    question: position.title,
    slug: position.slug,
    active: !position.redeemable,
    closed: position.redeemable,
    icon: position.icon,
    eventSlug: position.eventSlug,
    outcomes: JSON.stringify([yesOutcomeName, noOutcomeName]),
    outcomePrices: JSON.stringify([
      String(yesPrice),
      String(noPrice),
    ]),
    clobTokenIds: JSON.stringify([yesTokenId, noTokenId]),
    negRisk: position.negativeRisk,
    endDateIso: position.endDate,
    eventTeams,
  };
}
