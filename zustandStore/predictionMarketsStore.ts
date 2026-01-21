/**
 * Prediction Markets Zustand Store
 *
 * Local state management for prediction markets UI state.
 * Server state (markets, positions) is managed via React Query.
 */

import { create } from 'zustand';
import { Market, Position } from '@/types/prediction-markets';

interface PredictionMarketsState {
  // UI State
  selectedMarket: Market | null;
  selectedPosition: Position | null;
  isTradeModalOpen: boolean;
  isPositionDetailsOpen: boolean;

  // Trade form state
  tradeAmount: string;
  tradeSide: 'buy' | 'sell';
  selectedOutcomeId: string | null;
  maxSlippage: number; // percentage (e.g., 1 = 1%)

  // Filters
  marketFilters: {
    category: string | null;
    search: string;
    status: 'all' | 'active' | 'settled' | 'closed';
    sortBy: 'volume' | 'createdAt' | 'endDate' | 'liquidity';
  };

  // View state
  currentView: 'markets' | 'positions' | 'history';
  positionsView: 'active' | 'redeemable' | 'all';

  // Actions
  setSelectedMarket: (market: Market | null) => void;
  setSelectedPosition: (position: Position | null) => void;
  openTradeModal: (market: Market, outcomeId: string, side?: 'buy' | 'sell') => void;
  closeTradeModal: () => void;
  openPositionDetails: (position: Position) => void;
  closePositionDetails: () => void;

  // Trade form actions
  setTradeAmount: (amount: string) => void;
  setTradeSide: (side: 'buy' | 'sell') => void;
  setSelectedOutcomeId: (outcomeId: string | null) => void;
  setMaxSlippage: (slippage: number) => void;
  resetTradeForm: () => void;

  // Filter actions
  setMarketCategory: (category: string | null) => void;
  setMarketSearch: (search: string) => void;
  setMarketStatus: (status: 'all' | 'active' | 'settled' | 'closed') => void;
  setMarketSortBy: (sortBy: 'volume' | 'createdAt' | 'endDate' | 'liquidity') => void;
  resetFilters: () => void;

  // View actions
  setCurrentView: (view: 'markets' | 'positions' | 'history') => void;
  setPositionsView: (view: 'active' | 'redeemable' | 'all') => void;
}

const DEFAULT_MAX_SLIPPAGE = 1; // 1%

export const usePredictionMarketsStore = create<PredictionMarketsState>((set) => ({
  // Initial UI state
  selectedMarket: null,
  selectedPosition: null,
  isTradeModalOpen: false,
  isPositionDetailsOpen: false,

  // Initial trade form state
  tradeAmount: '',
  tradeSide: 'buy',
  selectedOutcomeId: null,
  maxSlippage: DEFAULT_MAX_SLIPPAGE,

  // Initial filters
  marketFilters: {
    category: null,
    search: '',
    status: 'active',
    sortBy: 'volume',
  },

  // Initial view state
  currentView: 'markets',
  positionsView: 'active',

  // Actions
  setSelectedMarket: (market) => set({ selectedMarket: market }),

  setSelectedPosition: (position) => set({ selectedPosition: position }),

  openTradeModal: (market, outcomeId, side = 'buy') =>
    set({
      selectedMarket: market,
      selectedOutcomeId: outcomeId,
      tradeSide: side,
      isTradeModalOpen: true,
      tradeAmount: '', // Reset amount when opening modal
    }),

  closeTradeModal: () =>
    set({
      isTradeModalOpen: false,
      // Keep selectedMarket for potential re-opening
    }),

  openPositionDetails: (position) =>
    set({
      selectedPosition: position,
      isPositionDetailsOpen: true,
    }),

  closePositionDetails: () =>
    set({
      isPositionDetailsOpen: false,
      selectedPosition: null,
    }),

  // Trade form actions
  setTradeAmount: (amount) => set({ tradeAmount: amount }),

  setTradeSide: (side) => set({ tradeSide: side }),

  setSelectedOutcomeId: (outcomeId) => set({ selectedOutcomeId: outcomeId }),

  setMaxSlippage: (slippage) => set({ maxSlippage: slippage }),

  resetTradeForm: () =>
    set({
      tradeAmount: '',
      tradeSide: 'buy',
      maxSlippage: DEFAULT_MAX_SLIPPAGE,
    }),

  // Filter actions
  setMarketCategory: (category) =>
    set((state) => ({
      marketFilters: { ...state.marketFilters, category },
    })),

  setMarketSearch: (search) =>
    set((state) => ({
      marketFilters: { ...state.marketFilters, search },
    })),

  setMarketStatus: (status) =>
    set((state) => ({
      marketFilters: { ...state.marketFilters, status },
    })),

  setMarketSortBy: (sortBy) =>
    set((state) => ({
      marketFilters: { ...state.marketFilters, sortBy },
    })),

  resetFilters: () =>
    set({
      marketFilters: {
        category: null,
        search: '',
        status: 'active',
        sortBy: 'volume',
      },
    }),

  // View actions
  setCurrentView: (view) => set({ currentView: view }),

  setPositionsView: (view) => set({ positionsView: view }),
}));

export default usePredictionMarketsStore;
