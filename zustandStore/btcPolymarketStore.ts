/**
 * btcPolymarketStore
 *
 * Holds the CLOB token IDs for the dynamically-discovered BTC 5-minute
 * backing market so that both the Markets panel (writer) and the Positions
 * panel (reader) can share this information without prop-drilling.
 *
 * Writer: components/wallet/polymarket/Markets/index.tsx
 * Reader: components/wallet/polymarket/Positions/index.tsx
 */

import { create } from 'zustand';

interface BtcPolymarketState {
  /** Token ID for the "Up" (yes / first) outcome of the BTC 5-min market. */
  btcUpTokenId: string;
  /** Token ID for the "Down" (no / second) outcome of the BTC 5-min market. */
  btcDownTokenId: string;
  /** Store the token IDs once the backing market is found. */
  setBtcTokenIds: (upTokenId: string, downTokenId: string) => void;
}

export const useBtcPolymarketStore = create<BtcPolymarketState>((set) => ({
  btcUpTokenId: '',
  btcDownTokenId: '',
  setBtcTokenIds: (upTokenId, downTokenId) =>
    set({ btcUpTokenId: upTokenId, btcDownTokenId: downTokenId }),
}));
