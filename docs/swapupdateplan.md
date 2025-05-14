# Software Development Plan – **Jupiter Swap dApp**

Below is a structured, step-by-step plan for building a Next.js dApp that integrates with Jupiter’s V6 API for token swaps.

---

## 1. Jupiter Integration & Infrastructure

### 1.1. Token List & Caching

- **Fetch Tokens**: Use SWR or axios to `GET https://quote-api.jup.ag/v6/tokens`.
- **Cache Tokens**: Store them in a global context or SWR cache for quick UI access.
- **Display Data**: Token name, symbol, icon URL, mint address.

### 1.2. Quote Endpoint

- **Params**:
  - `inputMint`, `outputMint`, `amount`, `slippageBps`, **`platformFeeBps=50`** (for 0.5% fee).
- **Helper Function**: `getQuote(params)` → returns best route(s) from Jupiter.

### 1.3. Build Swap Transaction

- **API Call**: `POST /swap` passing:
  - `route` (from `/quote`)
  - `userPublicKey` (wallet’s pubkey)
  - `platformFeeBps=50`
  - `feeAccount` (for fee revenue)
  - `wrapAndUnwrapSol` if applicable
- **Output**: `VersionedTransaction` or fallback to legacy if required (`asLegacyTransaction`).

### 1.4. Transaction Simulation & Priority Fees

- **Simulation**: Before sending, simulate the transaction to catch errors.
- **Priority Fees**: If desired, retry with `priorityLevelWithMaxLamports` (medium, high, veryHigh).
- **Utility Function**: Wrap simulation + retry logic in a function (e.g., `simulateTxAndRetry`).

---

## 2. UI Components

### 2.1. TokenSelector

- **Searchable List**: Show logo, symbol from the fetched token list.
- **Selection Handler**: On click, update the selected `inputToken` or `outputToken`.

### 2.2. AmountInput

- **Numeric Field**: Allow user to type the input amount.
- **MAX Button**: Fetch SPL balances, pre-fill max possible amount (minus SOL rent for fees if input token is SOL).

### 2.3. SlippageControl

- **Presets**: 0.1%, 0.5%, 1%.
- **Custom**: Let users type a custom percentage.
- **Convert to BPS**: 0.5% → 50 BPS, etc.

### 2.4. PriceCard

- **Live Quote Data**: Show expected rate, price impact, min-received, Jupiter routing info.
- **Network Fee**: Display estimated network fees from the Jupiter quote.

### 2.5. SwapButton

- **States**: Disabled if:
  - Wallet disconnected
  - No valid quote
  - Input amount zero
- **Spinner & Error Handling**: Indicate loading while building or sending transaction; show errors upon failure.

---

## 3. Core Swap Flow

### 3.1. Debounce & Quote Retrieval

- **OnChange Handlers**: Listen to changes in input amount, tokens, slippage.
- **Debounce**: 300–500ms before calling `getQuote(...)`.
- **State Management**: Store the resulting route(s) in React state.

### 3.2. Display Live Price & Route Details

- **Route Breakdown**: If multiple routes are returned, show the top route or a list to select from.
- **Real-time Updates**: Re-fetch quotes whenever user changes slippage or token amounts.

### 3.3. Execute Swap Transaction

- **Build Tx**: Call `buildSwapTx(route, publicKey, feeAccount)`.
- **Sign & Send**: `wallet.signAndSendTransaction(tx)`.
- **Error Handling**: Catch transaction errors, show user-friendly messages.

### 3.4. Poll Confirmation

- **Signature Status**: Use `connection.getSignatureStatus(signature)` or `confirmTransaction`.
- **Explorer Link**: Provide a link to Solscan or Explorer for user reference.
- **Timeout**: Handle rare network issues or timeouts gracefully.

### 3.5. Post-Swap Cleanup

- **Balance Refresh**: Update balances to reflect new token holdings.
- **Form Reset**: Clear or maintain user’s input for subsequent swaps.
- **Success Toast**: Provide success message with transaction confirmation.

---

## 4. Fee Handling (0.5%)

- **Quote Time**: Always pass `platformFeeBps=50` to `/quote`.
- **Swap Time**: Same `platformFeeBps` & `feeAccount` in `/swap`; Jupiter sends 0.5% to your account.
- **Jupiter’s Cut**: Jupiter automatically withholds 2.5% of the fee; net to you is ~0.4875%.

---

## 5. Advanced Options & Jupiter dApp Parity

### 5.1. Custom Priority Fees

- **Faster Confirmation**: Pass `priorityLevelWithMaxLamports` in `/swap`.
- **User Control**: Provide UI toggles (medium, high, veryHigh).

### 5.2. Alternate Routes

- **Multiple Routes**: Display top-N routes in a dropdown or list.
- **User Preference**: Let user pick route based on cost, speed, or reliability.

### 5.3. ExactOut Swaps

- **Swap Mode**: `swapMode=ExactOut` in the quote.
- **Min-Received**: Reverse logic from “input-based” to “output-based.”


---

## Actionable Next Steps

1. **Confirm .env Setup**: Validate `FEE_ACCOUNT` and RPC endpoints are correctly set.
2. **Implement Jupiter Service Layer**: Create `getQuote()` and `buildSwapTx()` helpers.
3. **Create UI Components**: TokenSelector, AmountInput, SlippageControl, PriceCard, SwapButton.
4. **Wire Up Swap Flow**: Debounce quotes, build transactions, handle sign-and-send.
5. **Test & Debug**: Simulate real swaps on devnet/mainnet, ensure 0.5% fee is credited.
6. **Deploy & Gather Feedback**: Release a staging version, collect user insights, iterate.

---

**By following this plan, you’ll have a robust, production-ready Next.js dApp that leverages Jupiter’s V6 API for seamless token swaps with built-in fee and slippage controls.**
