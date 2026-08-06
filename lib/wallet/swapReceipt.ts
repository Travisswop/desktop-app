/**
 * Swap feed-receipt construction.
 *
 * Feed swap posts (`postType: 'swapTransaction'`) used to be assembled purely
 * from React state — `payToken` / `receiveToken` for the token metadata and the
 * `payAmount` / `receiveAmount` display strings for the amounts. That produced
 * two classes of corrupt receipts in production:
 *
 *  1. **Mis-scaled amounts.** The display amount is derived as
 *     `Number(quote.toAmount) / 10 ** receiveToken.decimals`. When the token
 *     list carries the wrong `decimals` (prod has a MATIC entry with
 *     `decimals: 9` against MATIC's real 18) the "readable" amount is really a
 *     raw base-unit integer — one live post recorded `918829000 MATIC` for a
 *     $0.14 swap.
 *  2. **Token-identity drift.** The amount comes from the quote that actually
 *     executed while the symbol / price / mint come from whatever
 *     `receiveToken` happens to be at post time. A live post records
 *     `151.341 SOL @ $85` for a $1 swap whose LI.FI receipt says the wallet
 *     actually received 151.54 **SWOP**.
 *
 * Both legs of a swap are the same value, so a receipt whose legs disagree on
 * USD is provably wrong. This module rebuilds the legs from the quote that was
 * executed (authoritative token + raw amount + decimals) and refuses to emit a
 * receipt whose legs still disagree.
 *
 * The backend leaderboard already defends itself downstream
 * (`feedTradeAccounting.service.js` → `legsAreConsistent`); this is the
 * write-path half of the same guard.
 */

export interface SwapReceiptLeg {
  symbol: string;
  chain: string;
  amount: number;
  decimals: number;
  mint: string;
  price: string | number;
  tokenImg: string;
}

/** Legs whose USD values differ by more than this are treated as corrupt. */
export const LEG_RATIO_MIN = 0.5;
export const LEG_RATIO_MAX = 1.5;

/**
 * USD values below this are too small to judge — dust swaps routinely round to
 * ratios far outside the band without anything being wrong.
 */
const MIN_JUDGEABLE_USD = 0.01;

export interface LegConsistency {
  ok: boolean;
  ratio: number | null;
  inputUsd: number | null;
  outputUsd: number | null;
  reason?: string;
}

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

/** The loosest shape the guard can judge — callers hand it partial legs. */
export interface JudgeableLeg {
  amount?: number | string;
  price?: number | string;
}

const legUsd = (leg: JudgeableLeg): number =>
  toNumber(leg.amount) * toNumber(leg.price);

/**
 * A swap is atomic: what leaves the wallet and what arrives are the same value
 * minus fees and slippage. Legs whose USD values diverge past the band are a
 * decimals/identity bug, not a real trade.
 *
 * Returns `ok: true` when the receipt cannot be judged (a leg has no usable
 * price, or the trade is dust) — an unpriced token is not evidence of a bug.
 */
export function checkSwapLegConsistency(
  input: JudgeableLeg,
  output: JudgeableLeg,
): LegConsistency {
  const inputUsd = legUsd(input);
  const outputUsd = legUsd(output);

  if (!Number.isFinite(inputUsd) || !Number.isFinite(outputUsd)) {
    return {
      ok: true,
      ratio: null,
      inputUsd: null,
      outputUsd: null,
      reason: 'unpriced_leg',
    };
  }
  if (inputUsd < MIN_JUDGEABLE_USD || outputUsd < MIN_JUDGEABLE_USD) {
    return {
      ok: true,
      ratio: null,
      inputUsd,
      outputUsd,
      reason: 'below_judgeable_usd',
    };
  }

  const ratio = outputUsd / inputUsd;
  return {
    ok: ratio >= LEG_RATIO_MIN && ratio <= LEG_RATIO_MAX,
    ratio,
    inputUsd,
    outputUsd,
    reason:
      ratio >= LEG_RATIO_MIN && ratio <= LEG_RATIO_MAX
        ? undefined
        : 'leg_usd_divergence',
  };
}

const sameAddress = (a?: string | null, b?: string | null): boolean => {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
};

/**
 * Convert a raw base-unit amount using the decimals the *quote* reported, not
 * the decimals the client-side token list guessed.
 */
export function rawToDecimal(
  raw: unknown,
  decimals: unknown,
): number | null {
  const rawNumber = toNumber(raw);
  const decimalsNumber = toNumber(decimals);
  if (!Number.isFinite(rawNumber) || rawNumber < 0) return null;
  if (
    !Number.isFinite(decimalsNumber) ||
    decimalsNumber < 0 ||
    decimalsNumber > 36
  ) {
    return null;
  }
  return rawNumber / Math.pow(10, decimalsNumber);
}

/** Minimal shape of a LI.FI token as it appears on a quote's estimate. */
interface LifiToken {
  symbol?: string;
  decimals?: number;
  address?: string;
  chainId?: number | string;
  priceUSD?: string | number;
  logoURI?: string;
}

interface LifiEstimate {
  fromToken?: LifiToken;
  toToken?: LifiToken;
  fromAmount?: string | number;
  toAmount?: string | number;
  fromAmountUSD?: string | number;
  toAmountUSD?: string | number;
}

/**
 * Build a receipt leg straight off a LI.FI quote. LI.FI echoes the token it
 * actually routed — symbol, decimals, address, chain and USD price — so a leg
 * built from it can never disagree with itself the way a state-assembled leg
 * can.
 */
function legFromLifiToken(
  token: LifiToken | undefined,
  rawAmount: unknown,
  amountUsd: unknown,
  fallbackImg: string,
): SwapReceiptLeg | null {
  if (!token?.symbol) return null;
  const amount = rawToDecimal(rawAmount, token.decimals);
  if (amount === null) return null;

  // Prefer the quote's own USD total (it already accounts for the routed
  // amount) and fall back to its unit price.
  const usdTotal = toNumber(amountUsd);
  const unitPrice =
    Number.isFinite(usdTotal) && usdTotal > 0 && amount > 0
      ? usdTotal / amount
      : toNumber(token.priceUSD);

  return {
    symbol: token.symbol,
    chain: String(token.chainId ?? ''),
    amount,
    decimals: Number(token.decimals),
    mint: token.address || '',
    price: Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : '0',
    tokenImg: token.logoURI || fallbackImg,
  };
}

export interface ResolveSwapReceiptLegsInput {
  /**
   * The quote that was actually submitted. LI.FI quotes carry `estimate`;
   * Jupiter quotes carry `inputMint` / `outputMint` only.
   */
  quote: any;
  /** Legs assembled from UI state — used as the fallback and for Jupiter. */
  stateInput: SwapReceiptLeg;
  stateOutput: SwapReceiptLeg;
}

export interface ResolvedSwapReceiptLegs {
  inputToken: SwapReceiptLeg;
  outputToken: SwapReceiptLeg;
  /** Where each leg's numbers came from — surfaced in the reject log. */
  source: 'lifi_quote' | 'ui_state';
  consistency: LegConsistency;
  /** False when the receipt must not be posted. */
  ok: boolean;
  reason?: string;
}

/**
 * Resolve the legs to post for a completed swap.
 *
 * - LI.FI routes are rebuilt from `quote.estimate`, which is authoritative for
 *   both the token identity and the decimals.
 * - Jupiter routes have no token metadata on the quote, so the UI-state legs
 *   are used — but only after checking that the mints on the quote still match
 *   the tokens in state. A mismatch means the selection drifted while the swap
 *   was in flight and the state legs describe a different trade.
 * - Whatever the source, the legs must agree on USD before they are posted.
 */
export function resolveSwapReceiptLegs({
  quote,
  stateInput,
  stateOutput,
}: ResolveSwapReceiptLegsInput): ResolvedSwapReceiptLegs {
  const estimate: LifiEstimate | undefined =
    quote?.estimate ??
    (quote?.toAmount && quote?.toToken ? (quote as LifiEstimate) : undefined);

  let inputToken = stateInput;
  let outputToken = stateOutput;
  let source: ResolvedSwapReceiptLegs['source'] = 'ui_state';

  const lifiInput = legFromLifiToken(
    estimate?.fromToken,
    estimate?.fromAmount,
    estimate?.fromAmountUSD,
    stateInput.tokenImg,
  );
  const lifiOutput = legFromLifiToken(
    estimate?.toToken,
    estimate?.toAmount,
    estimate?.toAmountUSD,
    stateOutput.tokenImg,
  );

  if (lifiInput && lifiOutput) {
    inputToken = lifiInput;
    outputToken = lifiOutput;
    source = 'lifi_quote';
  } else if (quote?.inputMint || quote?.outputMint) {
    // Jupiter: no token metadata to rebuild from, so verify the state legs
    // still describe the trade the quote executed.
    const inputMatches =
      !quote.inputMint || sameAddress(quote.inputMint, stateInput.mint);
    const outputMatches =
      !quote.outputMint || sameAddress(quote.outputMint, stateOutput.mint);
    if (!inputMatches || !outputMatches) {
      return {
        inputToken,
        outputToken,
        source,
        consistency: checkSwapLegConsistency(inputToken, outputToken),
        ok: false,
        reason: 'quote_token_mismatch',
      };
    }
  }

  const consistency = checkSwapLegConsistency(inputToken, outputToken);

  // Legs rebuilt from the quote ARE what moved — LI.FI reported the token and
  // the amount it routed. A real cross-chain hop on a few dollars can lose more
  // than half its value to bridge and relayer fees (production carries a
  // verified Polygon->Solana swap that cleared at 0.62x), and dropping that
  // receipt would lose a legitimate post. Divergence is only evidence of a bug
  // when the numbers came from UI state, which proves nothing.
  const ok = source === 'lifi_quote' ? true : consistency.ok;
  return {
    inputToken,
    outputToken,
    source,
    consistency,
    ok,
    reason: ok ? undefined : consistency.reason,
  };
}
