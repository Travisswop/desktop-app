'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, Plus } from 'lucide-react';
import type { HLMarket, HLPosition, OrderSide, OrderMode } from '@/services/hyperliquid/types';
import { formatPrice } from '@/services/hyperliquid/types';
import type {
  PlaceLimitOrderParams,
  PlaceTpSlOrderParams,
} from './hooks/useHyperliquidTrading';
import { OrderConfirmModal, type OrderConfirmDetails } from './OrderConfirmModal';
import {
  completeAgentActionFromHandoff,
  type AgentActionCompletion,
  type HyperliquidAgentOrderPrefill,
} from '@/lib/chat/agentActionHandoff';
import { useUser } from '@/lib/UserContext';
import {
  buildPerpsPositionKey,
  toPerpsFeedNumber,
  upsertPerpsPositionFeed,
  type PerpsPositionFeedEvent,
  type PerpsPositionFeedStatus,
} from '@/lib/perps/perpsFeed';

interface TradingFormProps {
  market: HLMarket | null;
  markPrice: string;
  existingPosition?: HLPosition;
  accountValue: string;
  availableMargin?: string;
  isAgentReady: boolean;
  isSubmitting: boolean;
  error: string | null;
  /** Bubble the chosen leverage to the parent so the account stats card can
   *  compute buying power consistently. */
  onLeverageChange?: (lev: number, isCross: boolean) => void;
  onPlaceMarket: (assetIndex: number, isBuy: boolean, size: string, markPrice: string) => Promise<unknown>;
  onPlaceLimit: (params: PlaceLimitOrderParams) => Promise<unknown>;
  onPlaceTpSl: (params: PlaceTpSlOrderParams) => Promise<unknown>;
  onUpdateLeverage: (assetIndex: number, leverage: number, isCross?: boolean) => Promise<unknown>;
  onClearError: () => void;
  onOpenDeposit: () => void;
  onAgentActionComplete?: (completion: AgentActionCompletion) => void;
  agentOrderPrefill?: HyperliquidAgentOrderPrefill | null;
  masterAddress?: string | null;
}

/**
 * TradingForm — order entry styled to match the bento dashboard's trade
 * ticket card. Long/Short pill toggle, mode tabs, mono USD size input,
 * leverage slider with risk callout, and a coloured submit pill.
 */
export function TradingForm({
  market,
  markPrice,
  existingPosition,
  accountValue,
  availableMargin,
  isAgentReady,
  isSubmitting,
  error,
  onLeverageChange,
  onPlaceMarket,
  onPlaceLimit,
  onPlaceTpSl,
  onUpdateLeverage,
  onClearError,
  onOpenDeposit,
  onAgentActionComplete,
  agentOrderPrefill,
  masterAddress,
}: TradingFormProps) {
  const { accessToken, user, primaryMicrosite } = useUser();
  const [side, setSide] = useState<OrderSide>('long');
  const [mode, setMode] = useState<OrderMode>('market');
  const [size, setSize] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [leverage, setLeverage] = useState(10);
  const [isCross, setIsCross] = useState(true);

  // Pending order details snapshot — populated when the user clicks the
  // primary CTA, drives the OrderConfirmModal. Kept as a separate piece of
  // state (rather than computed at render) so the modal continues to show the
  // order the user actually requested even if mark price drifts mid-confirm.
  const [pendingOrder, setPendingOrder] = useState<OrderConfirmDetails | null>(null);
  const appliedAgentPrefillKey = useRef<string | null>(null);

  const isBuy = side === 'long';
  const markNum = parseFloat(markPrice) || 0;
  const accountNum = parseFloat(accountValue) || 0;
  const availableMarginNum =
    parseFloat(availableMargin ?? accountValue) || 0;
  const maxLev = Math.max(1, market?.maxLeverage ?? 50);
  const safeLeverage = Math.min(Math.max(1, leverage), maxLev);
  const leveragePct =
    maxLev > 1 ? ((safeLeverage - 1) / (maxLev - 1)) * 100 : 100;
  const leverageThumbLeft = `calc(${leveragePct}% - ${
    (leveragePct / 100) * 16
  }px + 8px)`;

  const sizeInCoins = useMemo(() => {
    const sizeUsd = parseFloat(size);
    if (!sizeUsd || !markNum) return '0';
    return (sizeUsd / markNum).toFixed(market?.szDecimals ?? 4);
  }, [size, markNum, market?.szDecimals]);

  const minOrderUsd = useMemo(() => {
    if (!markNum || !market) return 10;
    const szDecimals = market.szDecimals ?? 4;
    const step = Math.pow(10, -szDecimals);
    const minSteps = Math.ceil(10 / (markNum * step));
    return minSteps * step * markNum;
  }, [markNum, market]);

  const sizeUsdNum = parseFloat(size) || 0;
  const isBelowMinimum = sizeUsdNum > 0 && sizeUsdNum < minOrderUsd;
  const marginRequired =
    sizeUsdNum > 0 ? sizeUsdNum / Math.max(1, safeLeverage) : 0;
  const hasInsufficientMargin =
    sizeUsdNum > 0 && marginRequired > availableMarginNum;
  const marginShortfall = Math.max(0, marginRequired - availableMarginNum);

  useEffect(() => {
    if (!agentOrderPrefill) {
      appliedAgentPrefillKey.current = null;
      return;
    }

    const key = [
      agentOrderPrefill.proposalId,
      agentOrderPrefill.proposalNonce,
      agentOrderPrefill.coin,
    ]
      .filter(Boolean)
      .join(':');

    const usdSize =
      agentOrderPrefill.sizeUsd ||
      (agentOrderPrefill.sizeCoins && markNum
        ? (parseFloat(agentOrderPrefill.sizeCoins) * markNum).toFixed(2)
        : '');

    if (agentOrderPrefill.sizeCoins && !agentOrderPrefill.sizeUsd && !markNum) {
      return;
    }

    if (appliedAgentPrefillKey.current === key) return;

    if (agentOrderPrefill.side) setSide(agentOrderPrefill.side);
    if (agentOrderPrefill.orderMode) setMode(agentOrderPrefill.orderMode);
    if (usdSize) setSize(usdSize);
    if (agentOrderPrefill.price) setLimitPrice(agentOrderPrefill.price);
    if (agentOrderPrefill.leverage) {
      const nextLeverage = Math.min(
        Math.max(1, agentOrderPrefill.leverage),
        maxLev,
      );
      setLeverage(nextLeverage);
      onLeverageChange?.(
        nextLeverage,
        agentOrderPrefill.isCross ?? isCross,
      );
    }
    if (agentOrderPrefill.isCross !== undefined) {
      setIsCross(agentOrderPrefill.isCross);
    }
    setTakeProfit(agentOrderPrefill.takeProfitPrice || '');
    setStopLoss(agentOrderPrefill.stopLossPrice || '');
    setPendingOrder(null);
    appliedAgentPrefillKey.current = key;
  }, [agentOrderPrefill, isCross, markNum, maxLev, onLeverageChange]);

  useEffect(() => {
    if (leverage === safeLeverage) return;

    setLeverage(safeLeverage);
    onLeverageChange?.(safeLeverage, isCross);
  }, [isCross, leverage, onLeverageChange, safeLeverage]);

  const setPercent = useCallback(
    (pct: number) => {
      const usd = (accountNum * pct * safeLeverage) / 100;
      setSize(usd.toFixed(2));
    },
    [accountNum, safeLeverage],
  );

  const estLiqPrice = useMemo(() => {
    if (!markNum || !safeLeverage) return null;
    const liqBuffer = 1 / safeLeverage;
    return isBuy
      ? (markNum * (1 - liqBuffer)).toFixed(2)
      : (markNum * (1 + liqBuffer)).toFixed(2);
  }, [markNum, safeLeverage, isBuy]);

  const estFee = useMemo(() => {
    if (!sizeUsdNum) return null;
    return (sizeUsdNum * 0.0007).toFixed(2);
  }, [sizeUsdNum]);

  // Step 1: user clicks the CTA → snapshot the order details and open the modal
  const requestConfirm = useCallback(() => {
    if (!market) return;
    if (hasInsufficientMargin) return;
    const sizeNum = parseFloat(sizeInCoins);
    if (!sizeNum || sizeNum <= 0) return;
    if (mode === 'limit' && !limitPrice) return;
    if (mode === 'tpsl' && !takeProfit && !stopLoss) return;

    onClearError();

    const entryPxNum =
      mode === 'market' ? markNum : parseFloat(limitPrice) || markNum;
    const liqNum = entryPxNum
      ? isBuy
        ? entryPxNum * (1 - 1 / safeLeverage)
        : entryPxNum * (1 + 1 / safeLeverage)
      : 0;
    const liqDistancePct = entryPxNum
      ? Math.abs((entryPxNum - liqNum) / entryPxNum) * 100
      : 0;
    const sizeUsd = sizeNum * entryPxNum;
    const fee = sizeUsd * 0.0007;
    const margin = sizeUsd / safeLeverage;

    const modeLabel = `${
      mode === 'market' ? 'Market' : mode === 'limit' ? 'Limit' : 'TP/SL'
    } order · ${isCross ? 'Cross' : 'Isolated'} margin`;

    setPendingOrder({
      side,
      coin: market.coin,
      modeLabel,
      leverage: safeLeverage,
      isCross,
      sizeCoins: sizeInCoins,
      sizeUsd: formatUsd(sizeUsd),
      entryPrice: formatPrice(entryPxNum.toFixed(2)),
      entrySub: mode === 'market' ? 'Mark · slip < 0.05%' : undefined,
      liquidationPrice: formatPrice(liqNum.toFixed(2)),
      liquidationDistance: `${liqDistancePct.toFixed(1)}%`,
      estFees: fee.toFixed(2),
      marginRequired: margin.toFixed(2),
      isLimit: mode !== 'market',
    });
  }, [
    market, hasInsufficientMargin, mode, isBuy, sizeInCoins, limitPrice, markNum,
    takeProfit, stopLoss, side, safeLeverage, isCross, onClearError,
  ]);

  // Step 2: modal confirm → actually fire the order to Hyperliquid
  const handleConfirmedSubmit = useCallback(async () => {
    if (!market) return;
    const sizeNum = parseFloat(sizeInCoins);
    if (!sizeNum || sizeNum <= 0) return;

    try {
      let orderResult: unknown = null;
      if (mode === 'market') {
        orderResult = await onPlaceMarket(market.index, isBuy, sizeInCoins, markPrice);
      } else if (mode === 'limit') {
        if (!limitPrice) return;
        orderResult = await onPlaceLimit({
          assetIndex: market.index,
          isBuy,
          size: sizeInCoins,
          price: limitPrice,
        });
      } else if (mode === 'tpsl') {
        const entryPx = limitPrice || markPrice;
        if (!takeProfit && !stopLoss) return;
        orderResult = await onPlaceTpSl({
          assetIndex: market.index,
          isBuy,
          size: sizeInCoins,
          entryPrice: entryPx,
          stopLossPrice: stopLoss || (isBuy
            ? String((markNum * 0.95).toFixed(2))
            : String((markNum * 1.05).toFixed(2))),
          takeProfitPrice: takeProfit || (isBuy
            ? String((markNum * 1.05).toFixed(2))
            : String((markNum * 0.95).toFixed(2))),
        });
      }

      const orderId = extractHyperliquidOrderId(orderResult);
      const entryPxNum =
        mode === 'market' ? markNum : parseFloat(limitPrice) || markNum;
      const notionalUsd = sizeNum * entryPxNum;
      const marginUsd = notionalUsd / Math.max(1, safeLeverage);
      const existingSizeCoins = Math.abs(
        toPerpsFeedNumber(existingPosition?.szi),
      );
      const existingSide =
        existingPosition && toPerpsFeedNumber(existingPosition.szi) < 0
          ? 'short'
          : existingPosition
            ? 'long'
            : null;
      const isReducingExistingPosition = Boolean(
        existingSide && existingSide !== side,
      );
      const nextSizeCoins =
        existingSide && existingSide === side
          ? existingSizeCoins + sizeNum
          : isReducingExistingPosition
            ? Math.max(0, existingSizeCoins - sizeNum)
            : sizeNum;
      const event: PerpsPositionFeedEvent =
        existingSide && existingSide === side
          ? 'add'
          : isReducingExistingPosition && nextSizeCoins <= 0
            ? 'close'
            : isReducingExistingPosition
              ? 'reduce'
              : 'open';
      const status: PerpsPositionFeedStatus =
        event === 'close' ? 'closed' : 'open';
      const feedSide = existingSide || side;
      const weightedEntry =
        event === 'add' && existingSizeCoins > 0
          ? (toPerpsFeedNumber(existingPosition?.entryPx) * existingSizeCoins +
              entryPxNum * sizeNum) /
            Math.max(existingSizeCoins + sizeNum, 1)
          : existingPosition
            ? toPerpsFeedNumber(existingPosition.entryPx, entryPxNum)
            : entryPxNum;
      const existingMarginUsd = toPerpsFeedNumber(existingPosition?.marginUsed);
      const existingNotionalUsd = toPerpsFeedNumber(
        existingPosition?.positionValue,
      );
      const remainingRatio =
        existingSizeCoins > 0 ? nextSizeCoins / existingSizeCoins : 0;
      const feedSizeCoins = status === 'closed' ? existingSizeCoins : nextSizeCoins;
      const feedCollateralUsd =
        status === 'closed'
          ? existingMarginUsd
          : event === 'add'
            ? existingMarginUsd + marginUsd
            : isReducingExistingPosition
              ? existingMarginUsd * remainingRatio
              : marginUsd;
      const feedNotionalUsd =
        status === 'closed'
          ? existingNotionalUsd
          : event === 'add'
            ? existingNotionalUsd + notionalUsd
            : isReducingExistingPosition
              ? nextSizeCoins * entryPxNum
              : notionalUsd;
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
            coin: market.coin,
          }),
          coin: market.coin,
          side: feedSide,
          status,
          event,
          leverage: safeLeverage,
          marginMode: isCross ? 'cross' : 'isolated',
          entryPrice: weightedEntry,
          markPrice: entryPxNum,
          exitPrice: status === 'closed' ? entryPxNum : undefined,
          liquidationPrice: estLiqPrice ? parseFloat(estLiqPrice) : null,
          collateralUsd: feedCollateralUsd,
          notionalUsd: feedNotionalUsd,
          sizeCoins: feedSizeCoins,
          returnPct:
            toPerpsFeedNumber(existingPosition?.returnOnEquity) * 100,
          unrealizedPnl: toPerpsFeedNumber(existingPosition?.unrealizedPnl),
          feeUsd: notionalUsd * 0.0007,
          orderId,
          masterAddress,
          updatedAt: timestamp,
          openedAt: existingPosition ? undefined : timestamp,
          closedAt: status === 'closed' ? timestamp : undefined,
        },
      }).catch((feedError) => {
        console.warn('Failed to update perps feed card:', feedError);
      });

      if (agentOrderPrefill?.proposalId) {
        try {
          const completion = await completeAgentActionFromHandoff({
            proposalId: agentOrderPrefill.proposalId,
            status: 'executed',
            provider: 'hyperliquid',
            title: `${market.coin}-PERP`,
            subtitle: `${side} ${mode} · ${safeLeverage}x ${
              isCross ? 'cross' : 'isolated'
            }`,
            subject: `${market.coin}-PERP`,
            side,
            stake: parseFloat(pendingOrder?.marginRequired || '0') || 0,
            payout: parseFloat(pendingOrder?.sizeUsd?.replace(/,/g, '') || '0') || 0,
            placedAt: new Date().toISOString(),
            orderId,
            explorerLabel: 'View order',
            executionResult: {
              orderResult: summarizeExecutionResult(orderResult),
              coin: market.coin,
              side,
              mode,
              leverage: safeLeverage,
              isCross,
              sizeCoins: sizeInCoins,
              sizeUsd: pendingOrder?.sizeUsd,
              entryPrice: pendingOrder?.entryPrice,
            },
          });
          if (completion) {
            onAgentActionComplete?.(completion);
          }
        } catch (completionError) {
          console.error(
            'Failed to report Hyperliquid agent completion:',
            completionError,
          );
        }
      }

      setPendingOrder(null);
      setSize('');
      setLimitPrice('');
      setTakeProfit('');
      setStopLoss('');
    } catch {
      // surfaced via parent error prop — leave modal open so the user can retry
    }
  }, [
    agentOrderPrefill?.proposalId, isCross, safeLeverage, market, mode, isBuy,
    sizeInCoins, limitPrice, markPrice, takeProfit, stopLoss, markNum,
    onAgentActionComplete, onPlaceMarket, onPlaceLimit, onPlaceTpSl,
    pendingOrder?.entryPrice, pendingOrder?.marginRequired, pendingOrder?.sizeUsd,
    side, accessToken, user?._id, user?.primaryMicrosite, primaryMicrosite,
    masterAddress, existingPosition, estLiqPrice,
  ]);

  const cancelConfirm = useCallback(() => {
    if (isSubmitting) return;
    setPendingOrder(null);
  }, [isSubmitting]);

  const handleLeverageChange = useCallback(
    (newLev: number) => {
      const nextLeverage = Math.min(Math.max(1, newLev), maxLev);
      setLeverage(nextLeverage);
      onLeverageChange?.(nextLeverage, isCross);
    },
    [maxLev, onLeverageChange, isCross],
  );

  const handleLeverageCommit = useCallback(
    async (newLev: number) => {
      const nextLeverage = Math.min(Math.max(1, newLev), maxLev);
      if (market && isAgentReady) {
        await onUpdateLeverage(market.index, nextLeverage, isCross).catch(() => {});
      }
    },
    [market, isAgentReady, isCross, maxLev, onUpdateLeverage],
  );

  const toggleMargin = useCallback(() => {
    const next = !isCross;
    setIsCross(next);
    onLeverageChange?.(safeLeverage, next);
  }, [isCross, safeLeverage, onLeverageChange]);

  if (!market) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400 p-6 text-center">
        Select a market to start trading
      </div>
    );
  }

  const submitDisabled =
    !isAgentReady ||
    isSubmitting ||
    !size ||
    parseFloat(size) <= 0 ||
    isBelowMinimum ||
    hasInsufficientMargin;

  const sideStyles = isBuy
    ? {
        btn: 'bg-emerald-500 hover:bg-emerald-600',
        shadow: '0 6px 18px -6px rgba(25,169,116,0.5)',
      }
    : {
        btn: 'bg-red-500 hover:bg-red-600',
        shadow: '0 6px 18px -6px rgba(229,72,77,0.5)',
      };

  return (
    <div className="flex flex-col h-full">
      {/* Long / Short toggle */}
      {agentOrderPrefill && (
        <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11.5px] font-medium text-blue-700">
          Agent proposal loaded. Review every field before confirming.
        </div>
      )}

      {/* Long / Short toggle */}
      <div className="grid grid-cols-2 gap-1 p-[3px] bg-[#f2f2f0] rounded-xl mb-3.5">
        <button
          onClick={() => setSide('long')}
          className={`py-2.5 rounded-[9px] text-[13.5px] font-semibold transition-all ${
            side === 'long'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Long
        </button>
        <button
          onClick={() => setSide('short')}
          className={`py-2.5 rounded-[9px] text-[13.5px] font-semibold transition-all ${
            side === 'short'
              ? 'bg-red-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Short
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-3.5 text-[12px] font-medium pb-2 mb-3.5 border-b border-black/[0.06]">
        {(['market', 'limit', 'tpsl'] as OrderMode[]).map((m) => {
          const label = m === 'market' ? 'Market' : m === 'limit' ? 'Limit' : 'TP/SL';
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`pb-2 -mb-[9px] transition-colors ${
                active
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Limit price */}
      {(mode === 'limit' || mode === 'tpsl') && (
        <div className="mb-3.5">
          <Label>{mode === 'tpsl' ? 'ENTRY PRICE (USD)' : 'LIMIT PRICE (USD)'}</Label>
          <input
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            placeholder={`≈ $${formatPrice(markPrice)}`}
            className="mt-1.5 w-full px-3.5 py-3 text-[16px] font-mono font-semibold tabular-nums bg-[#fafafa] border border-black/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <p className="text-[10.5px] text-gray-500 mt-1 font-mono">
            Mark ${formatPrice(markPrice)}
          </p>
        </div>
      )}

      {/* Size */}
      <Label>SIZE (USD)</Label>
      <input
        type="number"
        min="0"
        step="1"
        value={size}
        onChange={(e) => setSize(e.target.value)}
        placeholder="$0.00"
        className="mt-1.5 w-full px-3.5 py-3 text-[18px] font-mono font-semibold tabular-nums tracking-tight bg-[#fafafa] border border-black/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30"
      />

      {/* Quick % */}
      <div className="grid grid-cols-4 gap-1.5 mt-2">
        {[25, 50, 75, 100].map((p) => (
          <button
            key={p}
            onClick={() => setPercent(p)}
            className={`py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
              p === 50
                ? 'bg-gray-900 text-white'
                : 'bg-[#f2f2f0] text-gray-900 hover:bg-gray-100'
            }`}
          >
            {p === 100 ? 'Max' : `${p}%`}
          </button>
        ))}
      </div>

      {sizeInCoins !== '0' && (
        <p className="text-[11px] text-gray-400 mt-1 font-mono">
          ≈ {sizeInCoins} {market.coin}
        </p>
      )}

      {isBelowMinimum && (
        <div className="flex items-start gap-1.5 text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          <span>
            Min order ${minOrderUsd.toFixed(2)} ({(minOrderUsd / markNum).toFixed(market?.szDecimals ?? 4)} {market.coin})
          </span>
        </div>
      )}

      {hasInsufficientMargin && (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="mt-px h-3.5 w-3.5 flex-shrink-0" />
            <span>
              Add funds first. This order needs about ${marginRequired.toFixed(2)} margin;
              available margin is ${availableMarginNum.toFixed(2)}
              {marginShortfall > 0 ? ` (${marginShortfall.toFixed(2)} short).` : '.'}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenDeposit}
            className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg bg-gray-900 px-3 text-[11px] font-semibold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Add funds
          </button>
        </div>
      )}

      {/* Leverage */}
      <div className="mt-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-[11px] text-gray-500 font-medium">Leverage</span>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMargin}
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors ${
                isCross
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-orange-100 text-orange-600'
              }`}
            >
              {isCross ? 'Cross' : 'Isolated'}
            </button>
            <span className="font-mono text-[18px] font-semibold tabular-nums text-amber-600">
              {safeLeverage}×
            </span>
          </div>
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-[#f2f2f0]">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-amber-600"
            style={{ width: `${leveragePct}%` }}
          />
          <input
            type="range"
            min={1}
            max={maxLev}
            step={1}
            value={safeLeverage}
            onChange={(e) => handleLeverageChange(parseInt(e.target.value))}
            onMouseUp={(e) => handleLeverageCommit(parseInt((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleLeverageCommit(parseInt((e.target as HTMLInputElement).value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
        <div className="relative h-4">
          <div
            className="absolute -top-[13px] h-4 w-4 rounded-full border-2 border-amber-600 bg-white shadow"
            style={{ left: leverageThumbLeft }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-gray-400 font-mono">
          <span>1×</span>
          <span>{Math.round(maxLev / 5)}×</span>
          <span>{Math.round(maxLev / 2)}×</span>
          <span>{maxLev}×</span>
        </div>
      </div>

      {/* High-leverage warning */}
      {safeLeverage > 20 && (
        <div className="mt-3.5 p-3 rounded-[10px] bg-[#fff8eb] border border-[#f6d999] flex items-start gap-2 text-[11.5px] text-[#78451d]">
          <span className="text-amber-600 leading-none">⚠</span>
          <span>High leverage increases liquidation risk significantly.</span>
        </div>
      )}

      {/* TP/SL */}
      {mode === 'tpsl' && (
        <div className="mt-3 space-y-2 p-3 rounded-xl bg-[#fafafa] border border-black/[0.06]">
          <p className="text-[11px] font-semibold text-gray-700">Take Profit / Stop Loss</p>
          <input
            type="number"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            placeholder={`TP ≈ $${(markNum * (isBuy ? 1.1 : 0.9)).toFixed(0)}`}
            className="w-full px-3 py-2 text-[13px] font-mono tabular-nums bg-white border border-emerald-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            placeholder={`SL ≈ $${(markNum * (isBuy ? 0.95 : 1.05)).toFixed(0)}`}
            className="w-full px-3 py-2 text-[13px] font-mono tabular-nums bg-white border border-red-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500/30"
          />
        </div>
      )}

      {/* Summary rows */}
      <div className="mt-3 space-y-1 text-[12px]">
        {markNum > 0 && (
          <SummaryRow
            label="Entry price"
            value={`$${formatPrice(mode === 'limit' && limitPrice ? parseFloat(limitPrice) : markNum)}`}
          />
        )}
        {estLiqPrice && (
          <SummaryRow label="Est. liquidation" value={`$${formatPrice(estLiqPrice)}`} valueColor="text-red-500" />
        )}
        {estFee && <SummaryRow label="Fees" value={`$${estFee}`} />}
      </div>

      {existingPosition && (
        <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-[11px] text-blue-700">
          <span>
            You have an open {parseFloat(existingPosition.szi) > 0 ? 'LONG' : 'SHORT'} position
            ({Math.abs(parseFloat(existingPosition.szi)).toFixed(4)} {market.coin}).
          </span>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-[11px] text-red-600">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={requestConfirm}
        disabled={submitDisabled}
        className={`mt-3.5 w-full py-3.5 rounded-2xl text-[14.5px] font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${sideStyles.btn}`}
        style={{ boxShadow: submitDisabled ? undefined : sideStyles.shadow }}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Placing order…
          </>
        ) : !isAgentReady ? (
          'Connect Agent First'
        ) : (
          `${isBuy ? 'Buy / Long' : 'Sell / Short'} ${market.coin}`
        )}
      </button>

      <OrderConfirmModal
        isOpen={!!pendingOrder}
        details={pendingOrder}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmedSubmit}
        onClose={cancelConfirm}
      />
    </div>
  );
}

function formatUsd(value: number): string {
  if (value >= 1_000) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return value.toFixed(2);
}

function summarizeExecutionResult(value: unknown) {
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  return {
    status: record.status,
    response: record.response,
    data: record.data,
  };
}

function extractHyperliquidOrderId(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const text = JSON.stringify(value);
  const oidMatch = text.match(/"oid"\s*:\s*"?([0-9A-Za-z_-]+)"?/);
  if (oidMatch?.[1]) return oidMatch[1];
  const orderIdMatch = text.match(/"orderId"\s*:\s*"?([0-9A-Za-z_-]+)"?/);
  return orderIdMatch?.[1];
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10.5px] font-bold tracking-[0.14em] text-gray-500 font-mono uppercase">
      {children}
    </span>
  );
}

function SummaryRow({
  label,
  value,
  valueColor = 'text-gray-900',
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex justify-between items-center text-gray-500">
      <span>{label}</span>
      <span className={`font-mono font-semibold tabular-nums ${valueColor}`}>
        {value}
      </span>
    </div>
  );
}
