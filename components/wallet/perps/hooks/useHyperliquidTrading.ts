'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as hl from '@nktkas/hyperliquid';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PlaceLimitOrderParams {
  assetIndex: number;
  isBuy: boolean;
  size: string;
  price: string;
  reduceOnly?: boolean;
}

export interface PlaceTpSlOrderParams {
  assetIndex: number;
  isBuy: boolean;          // true = opening long, false = opening short
  size: string;
  entryPrice: string;      // limit entry price
  stopLossPrice: string;   // trigger price for SL
  takeProfitPrice: string; // trigger price for TP
}

export interface TradingState {
  isSubmitting: boolean;
  lastOrderResult: unknown | null;
  error: string | null;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useHyperliquidTrading
 *
 * All order actions go through the AGENT client (silent Privy embedded signing).
 * No wallet popups. Automatically invalidates position cache after each order.
 *
 * Supported order types:
 *  - Market order  (IOC limit with 1% slippage buffer)
 *  - Limit order   (GTC)
 *  - TP/SL linked  (normalTpsl grouping — 3 linked orders)
 *  - Update leverage (cross or isolated)
 *  - Close position  (reduce-only market order)
 *  - TWAP order
 */
export function useHyperliquidTrading(agentClient: hl.ExchangeClient | null) {
  const queryClient = useQueryClient();

  const [state, setState] = useState<TradingState>({
    isSubmitting: false,
    lastOrderResult: null,
    error: null,
  });

  const setSubmitting = (v: boolean) =>
    setState((prev) => ({ ...prev, isSubmitting: v, error: v ? null : prev.error }));

  const setError = (error: string) =>
    setState((prev) => ({ ...prev, isSubmitting: false, error }));

  // Invalidate positions + open orders after any order action
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['hl-positions'] });
  }, [queryClient]);

  const assertAgent = () => {
    if (!agentClient) throw new Error('Agent not initialized. Please connect your wallet and set up trading first.');
  };

  // ─── Market Order (IOC) ─────────────────────────────────────────────

  /**
   * Places a market order using IOC (Immediate-Or-Cancel) with a 1% slippage buffer.
   * Buy: price = markPrice * 1.01  |  Sell: price = markPrice * 0.99
   */
  const placeMarketOrder = useCallback(
    async (
      assetIndex: number,
      isBuy: boolean,
      size: string,
      markPrice: string,
    ) => {
      assertAgent();
      setSubmitting(true);

      try {
        const priceMark = parseFloat(markPrice);
        const limitPx = isBuy
          ? String((priceMark * 1.01).toFixed(2))
          : String((priceMark * 0.99).toFixed(2));

        const result = await agentClient!.order({
          orders: [
            {
              a: assetIndex,
              b: isBuy,
              p: limitPx,
              s: size,
              r: false,
              t: { limit: { tif: 'Ioc' } },
            },
          ],
          grouping: 'na',
        });

        setState({ isSubmitting: false, lastOrderResult: result, error: null });
        invalidate();
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Market order failed';
        setError(msg);
        throw err;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentClient, invalidate],
  );

  // ─── Limit Order (GTC) ──────────────────────────────────────────────

  const placeLimitOrder = useCallback(
    async (params: PlaceLimitOrderParams) => {
      assertAgent();
      setSubmitting(true);

      try {
        const result = await agentClient!.order({
          orders: [
            {
              a: params.assetIndex,
              b: params.isBuy,
              p: params.price,
              s: params.size,
              r: params.reduceOnly ?? false,
              t: { limit: { tif: 'Gtc' } },
            },
          ],
          grouping: 'na',
        });

        setState({ isSubmitting: false, lastOrderResult: result, error: null });
        invalidate();
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Limit order failed';
        setError(msg);
        throw err;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentClient, invalidate],
  );

  // ─── TP/SL Linked Orders (normalTpsl grouping) ───────────────────────

  /**
   * Places 3 linked orders atomically:
   *  1. Entry limit order
   *  2. Stop-loss trigger (reduce-only, closes position)
   *  3. Take-profit trigger (reduce-only, closes position)
   *
   * Uses `grouping: "normalTpsl"` as required by Hyperliquid.
   */
  const placeTpSlOrder = useCallback(
    async (params: PlaceTpSlOrderParams) => {
      assertAgent();
      setSubmitting(true);

      try {
        const result = await agentClient!.order({
          grouping: 'normalTpsl',
          orders: [
            // 1. Entry limit
            {
              a: params.assetIndex,
              b: params.isBuy,
              s: params.size,
              p: params.entryPrice,
              r: false,
              t: { limit: { tif: 'Gtc' } },
            },
            // 2. Stop-loss (opposite direction, reduce-only)
            {
              a: params.assetIndex,
              b: !params.isBuy,
              s: params.size,
              p: params.stopLossPrice,
              r: true,
              t: {
                trigger: {
                  isMarket: true,
                  tpsl: 'sl',
                  triggerPx: params.stopLossPrice,
                },
              },
            },
            // 3. Take-profit (opposite direction, reduce-only)
            {
              a: params.assetIndex,
              b: !params.isBuy,
              s: params.size,
              p: params.takeProfitPrice,
              r: true,
              t: {
                trigger: {
                  isMarket: true,
                  tpsl: 'tp',
                  triggerPx: params.takeProfitPrice,
                },
              },
            },
          ],
        });

        setState({ isSubmitting: false, lastOrderResult: result, error: null });
        invalidate();
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'TP/SL order failed';
        setError(msg);
        throw err;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentClient, invalidate],
  );

  // ─── Update Leverage ────────────────────────────────────────────────

  const updateLeverage = useCallback(
    async (assetIndex: number, leverage: number, isCross = true) => {
      assertAgent();
      setSubmitting(true);

      try {
        const result = await agentClient!.updateLeverage({
          asset: assetIndex,
          isCross,
          leverage,
        });

        setState({ isSubmitting: false, lastOrderResult: result, error: null });
        invalidate();
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Leverage update failed';
        setError(msg);
        throw err;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentClient, invalidate],
  );

  // ─── Close Position (Market) ────────────────────────────────────────

  /**
   * Closes an open position at market price.
   * Automatically uses reduce-only IOC in the opposite direction.
   */
  const closePosition = useCallback(
    async (
      assetIndex: number,
      size: string,
      isLong: boolean,
      markPrice: string,
    ) => {
      assertAgent();
      setSubmitting(true);

      try {
        const priceMark = parseFloat(markPrice);
        // Close long = sell below market | Close short = buy above market
        const limitPx = isLong
          ? String((priceMark * 0.99).toFixed(2))
          : String((priceMark * 1.01).toFixed(2));

        const result = await agentClient!.order({
          orders: [
            {
              a: assetIndex,
              b: !isLong, // opposite of current position direction
              p: limitPx,
              s: size,
              r: true, // reduce-only — will never open a new position
              t: { limit: { tif: 'Ioc' } },
            },
          ],
          grouping: 'na',
        });

        setState({ isSubmitting: false, lastOrderResult: result, error: null });
        invalidate();
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Close position failed';
        setError(msg);
        throw err;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentClient, invalidate],
  );

  // ─── TWAP Order ─────────────────────────────────────────────────────

  /**
   * Splits a large order into smaller pieces over `durationMinutes`.
   * Optionally randomizes timing intervals to reduce market impact.
   */
  const placeTwapOrder = useCallback(
    async (
      assetIndex: number,
      isBuy: boolean,
      totalSize: string,
      durationMinutes: number,
      randomize = false,
    ) => {
      assertAgent();
      setSubmitting(true);

      try {
        const result = await agentClient!.twapOrder({
          twap: {
            a: assetIndex,
            b: isBuy,
            s: totalSize,
            r: false,
            m: durationMinutes,
            t: randomize,
          },
        });

        setState({ isSubmitting: false, lastOrderResult: result, error: null });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'TWAP order failed';
        setError(msg);
        throw err;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentClient],
  );

  // ─── Clear Error ─────────────────────────────────────────────────────

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    placeMarketOrder,
    placeLimitOrder,
    placeTpSlOrder,
    updateLeverage,
    closePosition,
    placeTwapOrder,
    clearError,
  };
}
