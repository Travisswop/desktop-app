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

export interface PlacePositionTpSlOrderParams {
  assetIndex: number;
  isLong: boolean;
  size: string;
  stopLossPrice?: string;
  takeProfitPrice?: string;
}

export interface TradingState {
  isSubmitting: boolean;
  lastOrderResult: unknown | null;
  error: string | null;
}

const STALE_AGENT_MESSAGE =
  'Your Hyperliquid trading key expired or was replaced. Enable trading again, then retry this order.';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isMissingApiWalletError(message: string) {
  return /user\s+or\s+api\s+wallet/i.test(message) && /does\s+not\s+exist/i.test(message);
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
/**
 * Rounds a price to Hyperliquid's required precision.
 *
 * HL enforces a maximum of 6 significant figures per price. The number of
 * allowed decimal places depends on how many digits are before the decimal:
 *
 *   price       digits  allowed decimals
 *   $0.40          0        6
 *   $3.50          1        5
 *   $145           3        3
 *   $3,200         4        2
 *   $84,000        5        1
 *   $100,000+      6        0
 *
 * Formula: decimals = max(0, 5 - floor(log10(price)))
 */
function roundPrice(price: number): string {
  if (price <= 0) return '0';
  const decimals = Math.max(0, 4 - Math.floor(Math.log10(price)));
  return price.toFixed(decimals);
}

export function useHyperliquidTrading(
  agentClient: hl.ExchangeClient | null,
  onAgentInvalid?: (message: string) => void,
) {
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

  const handleTradingError = (error: unknown, fallback: string) => {
    const rawMsg = errorMessage(error, fallback);
    const msg = isMissingApiWalletError(rawMsg)
      ? STALE_AGENT_MESSAGE
      : rawMsg;

    if (msg === STALE_AGENT_MESSAGE) onAgentInvalid?.(msg);
    setError(msg);
    return new Error(msg);
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
        if (!priceMark) throw new Error('Mark price unavailable — please wait for market data to load.');
        const limitPx = isBuy
          ? roundPrice(priceMark * 1.01)
          : roundPrice(priceMark * 0.99);

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
        throw handleTradingError(err, 'Market order failed');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentClient, invalidate, onAgentInvalid],
  );

  // ─── Limit Order (GTC) ──────────────────────────────────────────────

  const placeLimitOrder = useCallback(
    async (params: PlaceLimitOrderParams) => {
      assertAgent();
      setSubmitting(true);

      try {
        const priceNum = parseFloat(params.price);
        if (!priceNum) throw new Error('Limit price is invalid or zero.');
        const result = await agentClient!.order({
          orders: [
            {
              a: params.assetIndex,
              b: params.isBuy,
              p: roundPrice(priceNum),
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
        throw handleTradingError(err, 'Limit order failed');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentClient, invalidate, onAgentInvalid],
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
        const entryPx  = roundPrice(parseFloat(params.entryPrice));
        const slPx     = roundPrice(parseFloat(params.stopLossPrice));
        const tpPx     = roundPrice(parseFloat(params.takeProfitPrice));

        const result = await agentClient!.order({
          grouping: 'normalTpsl',
          orders: [
            // 1. Entry limit
            {
              a: params.assetIndex,
              b: params.isBuy,
              s: params.size,
              p: entryPx,
              r: false,
              t: { limit: { tif: 'Gtc' } },
            },
            // 2. Stop-loss (opposite direction, reduce-only)
            {
              a: params.assetIndex,
              b: !params.isBuy,
              s: params.size,
              p: slPx,
              r: true,
              t: { trigger: { isMarket: true, tpsl: 'sl', triggerPx: slPx } },
            },
            // 3. Take-profit (opposite direction, reduce-only)
            {
              a: params.assetIndex,
              b: !params.isBuy,
              s: params.size,
              p: tpPx,
              r: true,
              t: { trigger: { isMarket: true, tpsl: 'tp', triggerPx: tpPx } },
            },
          ],
        });

        setState({ isSubmitting: false, lastOrderResult: result, error: null });
        invalidate();
        return result;
      } catch (err) {
        throw handleTradingError(err, 'TP/SL order failed');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentClient, invalidate, onAgentInvalid],
  );

  // ─── TP/SL For Existing Position (positionTpsl grouping) ─────────────

  /**
   * Places reduce-only trigger orders against an already-open position.
   * This does not submit a new entry order.
   */
  const placePositionTpSlOrder = useCallback(
    async (params: PlacePositionTpSlOrderParams) => {
      assertAgent();
      setSubmitting(true);

      try {
        const slPx = params.stopLossPrice
          ? roundPrice(parseFloat(params.stopLossPrice))
          : '';
        const tpPx = params.takeProfitPrice
          ? roundPrice(parseFloat(params.takeProfitPrice))
          : '';
        const orders: Array<{
          a: number;
          b: boolean;
          s: string;
          p: string;
          r: boolean;
          t: { trigger: { isMarket: boolean; tpsl: 'tp' | 'sl'; triggerPx: string } };
        }> = [];

        if (slPx) {
          orders.push({
            a: params.assetIndex,
            b: !params.isLong,
            s: params.size,
            p: slPx,
            r: true,
            t: { trigger: { isMarket: true, tpsl: 'sl', triggerPx: slPx } },
          });
        }

        if (tpPx) {
          orders.push({
            a: params.assetIndex,
            b: !params.isLong,
            s: params.size,
            p: tpPx,
            r: true,
            t: { trigger: { isMarket: true, tpsl: 'tp', triggerPx: tpPx } },
          });
        }

        if (!orders.length) {
          throw new Error('Add a take-profit or stop-loss trigger price.');
        }

        const result = await agentClient!.order({
          grouping: 'positionTpsl',
          orders,
        });

        setState({ isSubmitting: false, lastOrderResult: result, error: null });
        invalidate();
        return result;
      } catch (err) {
        throw handleTradingError(err, 'Position TP/SL order failed');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentClient, invalidate, onAgentInvalid],
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
        throw handleTradingError(err, 'Leverage update failed');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentClient, invalidate, onAgentInvalid],
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
        if (!priceMark) throw new Error('Mark price unavailable — please wait for market data to load.');
        // Close long = sell below market | Close short = buy above market
        const limitPx = isLong
          ? roundPrice(priceMark * 0.99)
          : roundPrice(priceMark * 1.01);

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
        throw handleTradingError(err, 'Close position failed');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentClient, invalidate, onAgentInvalid],
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
        throw handleTradingError(err, 'TWAP order failed');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentClient, onAgentInvalid],
  );

  // ─── Cancel Order ────────────────────────────────────────────────────

  /**
   * Cancels a single open order by asset index + order id.
   * Works for limit orders and trigger orders (TP/SL).
   */
  const cancelOrder = useCallback(
    async (assetIndex: number, orderId: number) => {
      assertAgent();
      setSubmitting(true);

      try {
        const result = await agentClient!.cancel({
          cancels: [{ a: assetIndex, o: orderId }],
        });

        setState({ isSubmitting: false, lastOrderResult: result, error: null });
        invalidate();
        return result;
      } catch (err) {
        throw handleTradingError(err, 'Cancel order failed');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentClient, invalidate, onAgentInvalid],
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
    placePositionTpSlOrder,
    updateLeverage,
    closePosition,
    placeTwapOrder,
    cancelOrder,
    clearError,
  };
}
