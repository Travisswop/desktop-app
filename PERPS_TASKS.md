# Perps Tasks

Tasks to complete for the Hyperliquid perps integration.
Each task is self-contained and can be handed directly to the perps-implementer agent.

---

## Task 1 — Cancel Open Orders

**Problem:** `OpenOrderRow` in `PositionsList.tsx` shows open limit/trigger orders in the Orders tab but has no cancel button. `useHyperliquidTrading.ts` also has no `cancelOrder` method. Users currently cannot cancel a pending limit order from the UI.

**What to build:**
1. Add `cancelOrder(oid: number, coin: string)` to `useHyperliquidTrading.ts` using `agentClient.cancel({ cancels: [{ a: assetIndex, o: oid }] })`. After success, call `invalidate()` so the orders list refreshes.
2. Add a cancel button to `OpenOrderRow` in `PositionsList.tsx`. Show a confirm step (similar to `PositionCard`) before actually cancelling. Show a spinner while cancelling.
3. Wire the cancel handler from `PerpsPanel.tsx` down through `PositionsList` → `OpenOrderRow`.

**Files to touch:**
- `components/wallet/perps/hooks/useHyperliquidTrading.ts`
- `components/wallet/perps/PositionsList.tsx`
- `components/wallet/perps/PerpsPanel.tsx`

---

## Task 2 — Withdrawal Flow (Hyperliquid → Arbitrum)

**Problem:** Users can deposit USDC from Arbitrum to Hyperliquid via `DepositModal`, but there is no way to withdraw funds back. The withdraw action requires the **master client** (not the agent), so it will trigger one MetaMask popup per withdrawal.

**What to build:**
1. Add `withdraw(amount: string)` to a new hook `useHyperliquidWithdraw.ts`. Use `masterClient.withdraw3({ destination: masterAddress, amount, nonce: Date.now() })`. This needs the master `ExchangeClient` from `useHyperliquidAgent`.
2. Create `WithdrawModal.tsx` mirroring the structure of `DepositModal.tsx`:
   - Amount input with MAX button (reads current `withdrawable` balance from `useHyperliquidPositions`)
   - Step indicator: Enter amount → Confirm in wallet → Done
   - Success state with Arbiscan link
   - Warning that withdrawal takes ~2–5 minutes to appear on Arbitrum
3. Add a "Withdraw" button to `PerpsPanel.tsx` top bar (next to the existing Deposit button). It should only be visible when `isInitialized` is true (agent is set up, so master client is available).

**Files to touch / create:**
- `components/wallet/perps/hooks/useHyperliquidWithdraw.ts` (new)
- `components/wallet/perps/WithdrawModal.tsx` (new)
- `components/wallet/perps/PerpsPanel.tsx`
- `components/wallet/perps/index.ts` (export new modal)
- `components/wallet/WalletContent.tsx` (mount new modal at root level like DepositModal)

---

## Task 3 — Partial Close Position

**Problem:** `PositionCard.tsx` only has a full-close button (`Confirm Close` → closes 100% of the position at market). There is no way to close a partial amount, which is a standard feature in any trading interface.

**What to build:**
1. Add a size input inside the expanded `PositionCard` section (appears after clicking the chevron). The input should default to the full position size and accept any value up to that max.
2. Add percentage buttons (25%, 50%, 75%, 100%) below the input to quickly set partial close amounts.
3. The existing `onClose` prop currently accepts the full `HLPosition`. Change its signature to also accept an optional `partialSize: string` override. In `PerpsPanel.tsx`, the `handleClosePosition` function already calls `closePosition(index, Math.abs(parseFloat(position.szi)), ...)` — update it to pass the user-selected partial size instead when provided.

**Files to touch:**
- `components/wallet/perps/PositionCard.tsx`
- `components/wallet/perps/PositionsList.tsx` (update `onClosePosition` prop type)
- `components/wallet/perps/PerpsPanel.tsx` (update `handleClosePosition`)

---

## Task 4 — Trade History Tab

**Problem:** `PositionsList.tsx` has a `positions` tab and an `orders` tab but no history tab. The `useUserFills` WebSocket hook in `useHyperliquidWebSocket.ts` already fires a callback on every fill event, but nothing displays fill history to the user.

**What to build:**
1. Add a `'history'` tab to the `Tab` type in `PositionsList.tsx`.
2. In `PerpsPanel.tsx`, collect fills from `useUserFills` into a `useState<HLTradeData[]>` array (prepend each new fill, cap at 50 entries).
3. Pass the fills array down to `PositionsList` as a new `fills` prop.
4. Render a fills table in the history tab: Time | Market | Side (Buy/Short) | Size | Price | PnL. Style Buy rows emerald, Sell rows red, matching the existing pattern in `OpenOrderRow`.

**Files to touch:**
- `components/wallet/perps/PositionsList.tsx`
- `components/wallet/perps/PerpsPanel.tsx`
- `@/services/hyperliquid/types` (verify `HLTradeData` shape matches what `useUserFills` emits)

---

## Task 5 — Favourites / Watchlist in Market Selector

**Problem:** `MarketSelector.tsx` has `showFavourites` state hardcoded to `false` and already shows a Star icon for featured coins, but there is no user-controlled favourites system. Users cannot pin their own markets.

**What to build:**
1. Add a favourites toggle button in the `MarketSelector` header (a Star icon) that, when active, filters the list to only show favourited coins.
2. Store favourite coins in `localStorage` under key `hl-favourite-markets` (array of coin strings). Read on mount, write on toggle.
3. Add a star icon button to each market row. Click toggles that coin's favourite status and updates `localStorage` immediately.
4. When `showFavourites` is true and the list is empty, show a helpful empty state: "No favourites yet — click the ★ next to any market to pin it."
5. Favourited coins should always appear first in the full list (above `FEATURED_COINS`), sorted alphabetically among themselves.

**Files to touch:**
- `components/wallet/perps/MarketSelector.tsx`

---

## Task 6 — TWAP Order UI

**Problem:** `useHyperliquidTrading.ts` already has a working `placeTwapOrder` method, but `TradingForm.tsx` has no UI for it. The order type is completely inaccessible to users.

**What to build:**
1. Add a `'twap'` option to the `OrderMode` type in `@/services/hyperliquid/types`.
2. Add a `TWAP` tab to the order mode tabs row in `TradingForm.tsx` (after Market / Limit / TP-SL).
3. In TWAP mode, show:
   - Size input (same as other modes)
   - Duration input: "Execute over X minutes" (number input, min 5, max 1440)
   - Randomize toggle: checkbox "Randomize intervals (reduces market impact)"
   - Info callout explaining what TWAP does: "Splits your order into smaller pieces executed over the selected time window."
4. On submit, call `onPlaceTwap(assetIndex, isBuy, sizeInCoins, durationMinutes, randomize)`.
5. Add `onPlaceTwap` prop to `TradingForm` and wire it through `PerpsPanel`.

**Files to touch:**
- `@/services/hyperliquid/types` (add `'twap'` to `OrderMode`)
- `components/wallet/perps/TradingForm.tsx`
- `components/wallet/perps/PerpsPanel.tsx`

---

## Task 7 — Agent Session Persistence

**Problem:** `useHyperliquidAgent.ts` stores the `ExchangeClient` instances in `useRef`. On every page reload, the ref is cleared and users must re-approve the agent via MetaMask. While `approveAgent` is idempotent on Hyperliquid, it still triggers an unnecessary MetaMask popup every session.

**What to build:**
1. After a successful `initializeAgent()`, store the agent address in `sessionStorage` under key `hl-agent-initialized` (not `localStorage` — clears on tab close for security).
2. On hook mount, if `sessionStorage` has the key and the embedded wallet address matches, skip the `approveAgent` call and reconstruct both clients directly (no MetaMask popup). The embedded wallet is still accessible via Privy so no private key is stored anywhere.
3. Add a `resetAgent()` call that also clears `sessionStorage` (already exists, just add the storage clear).
4. Update `AgentSetupModal.tsx` to not show if the session key is already present and the embedded wallet matches — the panel should just mark itself as initialized silently.

**Files to touch:**
- `components/wallet/perps/hooks/useHyperliquidAgent.ts`
- `components/wallet/perps/AgentSetupModal.tsx`
- `components/wallet/perps/PerpsPanel.tsx`
