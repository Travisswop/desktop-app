import type { PolymarketMarket } from '@/hooks/polymarket';
import type { ParsedOutcome, SportsGameGroup } from './sports-grouping';

export type SportsOutcomeSelection = {
  initialOutcome: 'yes' | 'no';
  outcomeLabels?: [string, string];
};

function parseJsonArray<T>(raw: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw !== 'string' || raw.length === 0) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeId(value: unknown): string {
  return String(value ?? '').trim();
}

export function samePolymarketMarket(
  a?: PolymarketMarket | null,
  b?: PolymarketMarket | null,
): boolean {
  if (!a || !b) return false;
  const keyPairs: Array<[unknown, unknown]> = [
    [a.conditionId, b.conditionId],
    [a.id, b.id],
    [a.slug, b.slug],
  ];
  return keyPairs.some(([left, right]) => {
    const l = normalizeId(left);
    const r = normalizeId(right);
    return l.length > 0 && r.length > 0 && l === r;
  });
}

function isYesNoPair(labels: string[]): boolean {
  return (
    labels.length >= 2 &&
    /^yes$/i.test(labels[0]?.trim() ?? '') &&
    /^no$/i.test(labels[1]?.trim() ?? '')
  );
}

function isPlainYesNo(label: string): boolean {
  return /^(yes|no)$/i.test(label.trim());
}

function normalizedTeamName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getOpponentTeamLabel(
  game: SportsGameGroup | undefined,
  teamLabel: string,
): string | null {
  if (!game) return null;
  const normalizedLabel = normalizedTeamName(teamLabel);
  if (!normalizedLabel) return null;

  const teams = [game.teamA, game.teamB].filter(Boolean);
  const exactMatch = teams.findIndex(
    (team) => normalizedTeamName(team) === normalizedLabel,
  );
  if (exactMatch !== -1) return teams[exactMatch === 0 ? 1 : 0] ?? null;

  const fuzzyMatch = teams.findIndex((team) => {
    const normalizedTeam = normalizedTeamName(team);
    return (
      normalizedTeam.includes(normalizedLabel) ||
      normalizedLabel.includes(normalizedTeam)
    );
  });
  return fuzzyMatch !== -1 ? teams[fuzzyMatch === 0 ? 1 : 0] ?? null : null;
}

export function getSportsGameMarketOutcomes(
  game: SportsGameGroup | undefined,
  market: PolymarketMarket,
): ParsedOutcome[] {
  if (!game) return [];

  const groups = [
    game.moneyline,
    game.spread,
    ...(game.spreadLines ?? []),
    game.total,
    ...(game.totalLines ?? []),
  ];
  const seen = new Set<string>();

  return groups.flatMap((group) => {
    if (!group) return [];
    const key = String(
      group.market.conditionId || group.market.id || group.market.slug || '',
    );
    if (key && seen.has(key)) return [];
    if (key) seen.add(key);
    const groupMarketMatches = samePolymarketMarket(group.market, market);
    return group.outcomes.filter((outcome) => {
      if (outcome.market) return samePolymarketMarket(outcome.market, market);
      return groupMarketMatches;
    });
  });
}

export function getSportsMoneylineDisplayOutcomes(
  game: SportsGameGroup | undefined,
): [ParsedOutcome, ParsedOutcome] | null {
  const outcomes =
    game?.moneyline?.outcomes.filter(
      (outcome) => !/^(draw|tie)$/i.test(outcome.label.trim()),
    ) ?? [];

  if (outcomes.length < 2) return null;
  return [outcomes[0], outcomes[1]];
}

export function getSportsOutcomeSelection(
  market: PolymarketMarket,
  outcomeLabel: string,
  tokenId: string,
  groupedOutcomes: ParsedOutcome[] = [],
  game?: SportsGameGroup,
): SportsOutcomeSelection {
  const tokenIds = parseJsonArray<string>(market.clobTokenIds);
  const rawOutcomes = parseJsonArray<string>(market.outcomes, ['Yes', 'No']);
  const selectedIndex = tokenIds.indexOf(tokenId);
  const selectedOutcome = selectedIndex === 1 ? 'no' : 'yes';
  const labels: [string, string] = [
    rawOutcomes[0] || 'Yes',
    rawOutcomes[1] || 'No',
  ];
  let hasMappedLabel = false;

  for (const outcome of groupedOutcomes) {
    const index = tokenIds.indexOf(outcome.tokenId);
    if (index !== 0 && index !== 1) continue;
    labels[index] = outcome.label;
    hasMappedLabel = true;
  }

  const clickedLabel = outcomeLabel.trim();
  if (!hasMappedLabel && clickedLabel && !isPlainYesNo(clickedLabel)) {
    labels[selectedIndex === 1 ? 1 : 0] = clickedLabel;
    hasMappedLabel = true;
  }

  if (hasMappedLabel && isYesNoPair(rawOutcomes)) {
    if (!isPlainYesNo(labels[0]) && /^no$/i.test(labels[1])) {
      labels[1] = getOpponentTeamLabel(game, labels[0]) ?? `Not ${labels[0]}`;
    } else if (/^yes$/i.test(labels[0]) && !isPlainYesNo(labels[1])) {
      labels[0] = getOpponentTeamLabel(game, labels[1]) ?? `Not ${labels[1]}`;
    }
  }

  return {
    initialOutcome: selectedOutcome,
    outcomeLabels: hasMappedLabel ? labels : undefined,
  };
}
