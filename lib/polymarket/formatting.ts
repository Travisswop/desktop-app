export const formatAddress = (address: string, startChars = 6, endChars = 4) =>
  `${address.slice(0, startChars)}...${address.slice(-endChars)}`;

export const formatPrice = (price: number) => `${Math.round(price * 100)}¢`;

export const formatCurrency = (value: number, decimals = 2) =>
  `$${value.toFixed(decimals)}`;

export const formatVolume = (volumeUSD: number) => {
  if (volumeUSD >= 1_000_000) return `$${(volumeUSD / 1_000_000).toFixed(2)}M`;
  if (volumeUSD >= 1_000) return `$${(volumeUSD / 1_000).toFixed(1)}K`;
  return `$${volumeUSD.toFixed(0)}`;
};

export const formatLiquidity = (liquidityUSD: number) => {
  if (liquidityUSD >= 1_000_000)
    return `$${(liquidityUSD / 1_000_000).toFixed(2)}M`;
  if (liquidityUSD >= 1_000) return `$${(liquidityUSD / 1_000).toFixed(0)}K`;
  return `$${liquidityUSD.toFixed(0)}`;
};

export const formatPercentage = (value: number, decimals = 1) =>
  `${value.toFixed(decimals)}%`;

export const formatShares = (shares: number, decimals = 2) =>
  shares.toFixed(decimals);

/**
 * Returns a contextual outcome label for sports prediction markets.
 * - Over/Under markets: appends the threshold  (e.g. "Over 229.5")
 * - Spread markets: appends the spread line    (e.g. "Mavericks +10.5")
 * Falls back to the raw outcome name when no context can be parsed.
 *
 * @param outcome      Raw outcome name ("Over", "Under", "Mavericks", …)
 * @param marketTitle  Full market question ("Grizzlies vs. 76ers: O/U 229.5")
 * @param outcomeIndex 0 = Yes/first outcome, 1 = No/second outcome
 */
export function getOutcomeDisplayLabel(
  outcome: string,
  marketTitle: string,
  outcomeIndex?: number,
): string {
  // Over/Under — matches "O/U 229.5", "OU 229.5", "Over/Under 239.5"
  const ouMatch = marketTitle.match(/\bO\/U\s+(\d+\.?\d*)/i);
  if (ouMatch && (outcome === 'Over' || outcome === 'Under')) {
    return `${outcome} ${ouMatch[1]}`;
  }

  // Spread — title contains the word "Spread" and a value in parens like "(-10.5)"
  if (/\bspread\b/i.test(marketTitle)) {
    const spreadMatch = marketTitle.match(/\((-?\d+\.?\d*)\)/);
    if (spreadMatch && outcomeIndex !== undefined) {
      const spreadForYes = parseFloat(spreadMatch[1]);
      // outcomeIndex 0 = the team named in the title (the spread applies to them)
      // outcomeIndex 1 = the other team (invert the spread)
      const spread = outcomeIndex === 0 ? spreadForYes : -spreadForYes;
      const spreadStr = spread > 0 ? `+${spread}` : String(spread);
      return `${outcome} ${spreadStr}`;
    }
  }

  return outcome;
}
