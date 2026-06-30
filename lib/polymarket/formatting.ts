export const formatAddress = (
  address: string,
  startChars = 6,
  endChars = 4,
) => `${address.slice(0, startChars)}...${address.slice(-endChars)}`;

export const formatPrice = (price: number) =>
  `${Math.round(price * 100)}%`;

export const formatCurrency = (value: number, decimals = 2) =>
  `$${value.toFixed(decimals)}`;

export const formatVolume = (volumeUSD: number) => {
  if (volumeUSD >= 1_000_000)
    return `$${(volumeUSD / 1_000_000).toFixed(2)}M`;
  if (volumeUSD >= 1_000)
    return `$${(volumeUSD / 1_000).toFixed(1)}K`;
  return `$${volumeUSD.toFixed(0)}`;
};

export const formatLiquidity = (liquidityUSD: number) => {
  if (liquidityUSD >= 1_000_000)
    return `$${(liquidityUSD / 1_000_000).toFixed(2)}M`;
  if (liquidityUSD >= 1_000)
    return `$${(liquidityUSD / 1_000).toFixed(0)}K`;
  return `$${liquidityUSD.toFixed(0)}`;
};

export const formatPercentage = (value: number, decimals = 1) =>
  `${value.toFixed(decimals)}%`;

export const formatShares = (shares: number, decimals = 2) =>
  shares.toFixed(decimals);

function normalizeOutcomeLabel(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function getTotalLineFromMarketTitle(marketTitle: string): string {
  const normalized = normalizeOutcomeLabel(marketTitle);
  const match =
    normalized.match(/\bO\/U\s*([+-]?\d+(?:\.\d+)?)/i) ??
    normalized.match(/\bOU\s+([+-]?\d+(?:\.\d+)?)/i) ??
    normalized.match(/\bOver\s*\/\s*Under\s*([+-]?\d+(?:\.\d+)?)/i) ??
    normalized.match(/\bTotal[^0-9+-]{0,32}([+-]?\d+(?:\.\d+)?)/i) ??
    normalized.match(/\b(?:Over|Under)\s+([+-]?\d+(?:\.\d+)?)/i);

  if (match?.[1]) return match[1];

  if (/(?:\bo\/?u\b|over\s*\/\s*under|\btotal\b)/i.test(normalized)) {
    return normalized.match(/([+-]?\d+(?:\.\d+)?)\??$/)?.[1] ?? '';
  }

  return '';
}

function getMarketPeriodLabel(marketTitle: string): string {
  const normalized = normalizeOutcomeLabel(marketTitle);
  const periodPatterns: Array<[RegExp, string]> = [
    [/\b(?:1H|H1)\b/i, '1H'],
    [/\b(?:2H|H2)\b/i, '2H'],
    [/\b(?:first|1st)\s+half\b/i, '1H'],
    [/\b(?:second|2nd)\s+half\b/i, '2H'],
    [/\b(?:1Q|Q1)\b/i, '1Q'],
    [/\b(?:2Q|Q2)\b/i, '2Q'],
    [/\b(?:3Q|Q3)\b/i, '3Q'],
    [/\b(?:4Q|Q4)\b/i, '4Q'],
    [/\b(?:first|1st)\s+quarter\b/i, '1Q'],
    [/\b(?:second|2nd)\s+quarter\b/i, '2Q'],
    [/\b(?:third|3rd)\s+quarter\b/i, '3Q'],
    [/\b(?:fourth|4th)\s+quarter\b/i, '4Q'],
    [/\b(?:1P|P1)\b/i, '1P'],
    [/\b(?:2P|P2)\b/i, '2P'],
    [/\b(?:3P|P3)\b/i, '3P'],
    [/\b(?:first|1st)\s+period\b/i, '1P'],
    [/\b(?:second|2nd)\s+period\b/i, '2P'],
    [/\b(?:third|3rd)\s+period\b/i, '3P'],
  ];

  return periodPatterns.find(([pattern]) => pattern.test(normalized))?.[1] ?? '';
}

function appendMarketPeriod(label: string, marketTitle: string): string {
  const period = getMarketPeriodLabel(marketTitle);
  if (!period) return label;
  if (new RegExp(`\\b${period}\\b`, 'i').test(label)) return label;
  return `${label} in ${period}`;
}

function expandCompactTotalLabel(label: string): string {
  const match = normalizeOutcomeLabel(label).match(/^([OU])\s+([+-]?\d+(?:\.\d+)?)$/i);
  if (!match) return normalizeOutcomeLabel(label);
  return `${match[1].toUpperCase() === 'O' ? 'Over' : 'Under'} ${match[2]}`;
}

function isGenericPredictionOutcome(label: string): boolean {
  return /^(over|under|yes|no)$/i.test(normalizeOutcomeLabel(label));
}

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
  const normalizedOutcome = normalizeOutcomeLabel(outcome);

  // Over/Under — matches "O/U 229.5", "OU 229.5", "Over/Under 239.5"
  const totalLine = getTotalLineFromMarketTitle(marketTitle);
  if (
    totalLine &&
    (/^over$/i.test(normalizedOutcome) || /^under$/i.test(normalizedOutcome))
  ) {
    const direction = /^over$/i.test(normalizedOutcome) ? 'Over' : 'Under';
    return appendMarketPeriod(`${direction} ${totalLine}`, marketTitle);
  }

  // Spread — title contains the word "Spread" and a value in parens like "(-10.5)"
  if (/\bspread\b/i.test(marketTitle)) {
    const spreadMatch = marketTitle.match(/\((-?\d+\.?\d*)\)/);
    if (spreadMatch && outcomeIndex !== undefined) {
      const spreadForYes = parseFloat(spreadMatch[1]);
      // outcomeIndex 0 = the team named in the title (the spread applies to them)
      // outcomeIndex 1 = the other team (invert the spread)
      const spread =
        outcomeIndex === 0 ? spreadForYes : -spreadForYes;
      const spreadStr = spread > 0 ? `+${spread}` : String(spread);
      return appendMarketPeriod(`${normalizedOutcome} ${spreadStr}`, marketTitle);
    }
  }

  return normalizedOutcome || outcome;
}

export function getPredictionReceiptSubject(
  outcome: string,
  marketTitle: string,
  options: {
    displayOutcome?: string;
    outcomeIndex?: number;
  } = {},
): string {
  const normalizedOutcome = normalizeOutcomeLabel(outcome);
  const normalizedDisplayOutcome = expandCompactTotalLabel(
    options.displayOutcome || ''
  );
  const normalizedMarketTitle = normalizeOutcomeLabel(marketTitle);
  const contextualOutcome = normalizedOutcome
    ? getOutcomeDisplayLabel(
        normalizedOutcome,
        normalizedMarketTitle,
        options.outcomeIndex,
      )
    : '';

  if (
    contextualOutcome &&
    contextualOutcome.toLowerCase() !== normalizedOutcome.toLowerCase()
  ) {
    return contextualOutcome;
  }

  if (
    normalizedDisplayOutcome &&
    normalizedDisplayOutcome.toLowerCase() !== normalizedOutcome.toLowerCase()
  ) {
    return appendMarketPeriod(normalizedDisplayOutcome, normalizedMarketTitle);
  }

  if (normalizedOutcome && !isGenericPredictionOutcome(normalizedOutcome)) {
    return normalizedOutcome;
  }

  return normalizedMarketTitle || normalizedOutcome || 'Prediction order';
}
