# Prediction Market Migration — AMM Architecture Todo

Migrate from Polymarket CLOB API to a native AMM-based prediction market.
Reference: `Swop_Ship_Fast_Prediction_Market_Architecture.pdf`

---

## Phase 1 — Smart Contracts (Deploy AMM + Basic Trade)

- [x] Write `YesNoToken.sol` — ERC20 outcome tokens (YES/NO) per market
- [x] Write `AMMPool.sol` — constant product formula (`x*y=k`) pool per market
- [x] Write `Router.sol` — entry point with `buyYes()`, `buyNo()`, `sellYes()`, `sellNo()` functions
- [x] Write `Resolution.sol` — settlement contract, finalizes outcome and enables redemption
- [x] Write `USDC approve(router)` flow in contracts
- [ ] Deploy contracts to Polygon testnet (Mumbai / Amoy)
- [ ] Verify contracts on Polygonscan
- [ ] Deploy contracts to Polygon mainnet
- [x] Export ABI files to frontend (`constants/polymarket/abis/`)

---

## Phase 2 — Remove CLOB Infrastructure (Frontend)

- [x] Delete `hooks/polymarket/useTradingSession.ts`
- [x] Delete `hooks/polymarket/useClobClient.ts`
- [x] Delete `hooks/polymarket/useClobOrder.ts`
- [x] Delete `hooks/polymarket/useClobHeartbeat.ts`
- [x] Delete `hooks/polymarket/useUserApiCredentials.ts`
- [x] Delete `hooks/polymarket/useRelayClient.ts`
- [x] Delete `hooks/polymarket/useSafeDeployment.ts`
- [x] Delete `hooks/polymarket/useTokenApprovals.ts`
- [x] Delete `hooks/polymarket/useUserOrdersChannel.ts`
- [x] Delete `hooks/polymarket/useGeoblock.ts`
- [x] Delete `components/wallet/polymarket/TradingSession/` (entire folder)
- [x] Delete `components/wallet/polymarket/GeoBlockedBanner.tsx`
- [x] Replace `components/wallet/polymarket/SafeWalletCard.tsx` — show plain EOA wallet address instead of Safe address
- [x] Remove `@polymarket/clob-client` and `@polymarket/builder-relayer-client` npm packages (run after contracts deployed)
- [x] Remove `GEOBLOCK_API_URL` from `constants/polymarket/api.ts`

---

## Phase 3 — Build AMM Hooks (Frontend)

- [x] Create `hooks/polymarket/useAMMPool.ts` — read pool reserves, calculate price from `x*y=k`
- [x] Create `hooks/polymarket/useAMMOrder.ts` — call `router.buyYes()` / `router.buyNo()` / `sellYes()` / `sellNo()` via wagmi/ethers
- [x] Create `hooks/polymarket/useUSDCApproval.ts` — check and set USDC allowance for AMM Router
- [x] Create `hooks/polymarket/useMarketResolution.ts` — check resolution status and call `redeem()`
- [x] Update `hooks/polymarket/useUserPositions.ts` — read YES/NO token balances from chain instead of CLOB API
- [x] Update `hooks/polymarket/usePolygonBalances.ts` — keep as-is (reads USDC balance, still valid)

---

## Phase 4 — Simplify Providers (Frontend)

- [x] Rewrite `providers/polymarket/TradingProvider.tsx` — remove session state, geo-block, relay/CLOB clients; expose AMM hook results only
- [x] Remove `isTradingSessionComplete`, `currentStep`, `sessionError`, `initializeTradingSession`, `endTradingSession` from context
- [x] Add `isUSDCApproved`, `approveUSDC`, `submitAMMOrder` to context
- [x] Update `providers/polymarket/index.tsx` exports to match new context shape
- [x] Remove `lib/polymarket/session.ts` (localStorage session — no longer needed)

---

## Phase 5 — Rewire UI Components (Frontend)

- [x] Update `components/wallet/polymarket/OrderModal/index.tsx` — replace `useClobOrder` submit with `useAMMOrder` contract call
- [x] Update `components/wallet/polymarket/OrderModal/AmountInput.tsx` — show AMM price impact instead of CLOB spread
- [x] Update `components/wallet/polymarket/OrderModal/ToWinDisplay.tsx` — calculate payout from AMM pool reserves
- [x] Remove `components/wallet/polymarket/OrderModal/SharesInput.tsx` (CLOB-specific shares concept) or adapt to AMM shares
- [x] Update `components/wallet/polymarket/PolymarketTab.tsx` — remove `GeoBlockedBanner`, remove session init `useEffect`, remove `sessionError` UI block
- [x] Update `components/wallet/polymarket/Markets/MarketCard.tsx` — remove `realtimePrices` from CLOB batch fetch, use AMM pool price instead
- [x] Update `components/wallet/polymarket/Positions/index.tsx` — use on-chain YES/NO token balances
- [x] Update `components/wallet/polymarket/Positions/PositionCard.tsx` — show redemption button when market is resolved

---

## Phase 6 — Backend (Lightweight Indexer)

- [x] Add indexer service in `swop-app-backend/src/services/predictionMarket/` to poll AMM pool reserves on-chain
- [x] Add `/api/v5/prediction-markets/quote` endpoint — return expected output and price impact for a given USDC amount
- [x] Update `/api/v5/prediction-markets/markets` endpoint — include AMM pool address per market
- [x] Add `/api/v5/prediction-markets/positions` endpoint — return user YES/NO token balances by wallet address
- [x] Add resolution event listener — monitor `Resolution.sol` events, update market status in DB
- [x] Add `/api/v5/prediction-markets/redeem` endpoint (or let frontend call contract directly)

---

## Phase 7 — Cleanup & Testing

- [x] Run `npm run lint` and fix all TypeScript errors from removed types
- [ ] Test USDC approve → buy flow on testnet (Polygon Amoy)
- [ ] Test sell flow on testnet
- [ ] Test resolution + redeem flow on testnet
- [ ] Test with US-based IP — confirm no geo-block error
- [ ] Test with non-US IP — confirm same experience
- [ ] Remove any remaining references to `@polymarket/clob-client` in types/
- [x] Run `npm run build` — confirm clean production build

---

## What Stays Unchanged

These files require **no changes**:

- `components/wallet/polymarket/Markets/CategoryTabs.tsx`
- `components/wallet/polymarket/Markets/OutcomeButtons.tsx`
- `components/wallet/polymarket/Orders/OrderCard.tsx`
- `components/wallet/polymarket/shared/` (all shared UI components)
- `components/wallet/polymarket/PolygonAssets.tsx`
- `components/wallet/polymarket/MarketTabs.tsx`
- `hooks/polymarket/useMarkets.ts` (fetches from own backend, not CLOB)
- `hooks/polymarket/useActiveOrders.ts` (adapt to read from indexer)
- `constants/polymarket/` (keep category/tag constants, remove API keys)
- `providers/polymarket/PolymarketWalletContext.tsx`
