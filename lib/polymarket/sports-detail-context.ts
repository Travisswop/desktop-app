import type { PolymarketMarket } from '@/hooks/polymarket';
import {
  groupFlatMarketsIntoGames,
  isValidGameCard,
  type SportsGameGroup,
} from './sports-grouping';
import {
  getSportsGameMarketOutcomes,
  getSportsOutcomeSelection,
  samePolymarketMarket,
  type SportsOutcomeSelection,
} from './sports-selection';

export type SportsGameDetailContext = {
  market: PolymarketMarket;
  game: SportsGameGroup;
  selection: SportsOutcomeSelection;
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

function dedupeMarkets(markets: PolymarketMarket[]): PolymarketMarket[] {
  const seen = new Set<string>();
  const result: PolymarketMarket[] = [];

  for (const market of markets) {
    const key = String(
      market.conditionId || market.id || market.slug || market.question || '',
    ).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(market);
  }

  return result;
}

function gameContainsMarket(
  game: SportsGameGroup,
  market: PolymarketMarket,
): boolean {
  return [
    game.moneyline,
    game.spread,
    ...(game.spreadLines ?? []),
    game.total,
    ...(game.totalLines ?? []),
  ].some((group) => {
    if (!group) return false;
    if (samePolymarketMarket(group.market, market)) return true;
    return group.outcomes.some((outcome) =>
      samePolymarketMarket(outcome.market, market),
    );
  });
}

function selectedTokenIdForOutcome(
  market: PolymarketMarket,
  selectedOutcome: 'yes' | 'no',
): string {
  const tokenIds = parseJsonArray<string>(market.clobTokenIds);
  return tokenIds[selectedOutcome === 'no' ? 1 : 0] || tokenIds[0] || '';
}

function selectedOutcomeLabel(
  market: PolymarketMarket,
  tokenId: string,
  game: SportsGameGroup,
): string {
  const groupedOutcomes = getSportsGameMarketOutcomes(game, market);
  const groupedLabel = groupedOutcomes.find(
    (outcome) => outcome.tokenId === tokenId,
  )?.label;
  if (groupedLabel) return groupedLabel;

  const tokenIds = parseJsonArray<string>(market.clobTokenIds);
  const rawOutcomes = parseJsonArray<string>(market.outcomes, ['Yes', 'No']);
  const index = tokenIds.indexOf(tokenId);
  return rawOutcomes[index === 1 ? 1 : 0] || rawOutcomes[0] || 'Yes';
}

export function recoverSportsGameDetailContext(
  activeMarket: PolymarketMarket,
  relatedMarkets: PolymarketMarket[],
  selectedOutcome: 'yes' | 'no',
): SportsGameDetailContext | null {
  const markets = dedupeMarkets([activeMarket, ...relatedMarkets]);
  const recoveredMarket =
    markets.find((market) => samePolymarketMarket(market, activeMarket)) ??
    activeMarket;
  const game = groupFlatMarketsIntoGames(markets)
    .filter(isValidGameCard)
    .find((candidate) => gameContainsMarket(candidate, recoveredMarket));

  if (!game) return null;

  const tokenId = selectedTokenIdForOutcome(recoveredMarket, selectedOutcome);
  const selection = getSportsOutcomeSelection(
    recoveredMarket,
    selectedOutcomeLabel(recoveredMarket, tokenId, game),
    tokenId,
    getSportsGameMarketOutcomes(game, recoveredMarket),
    game,
  );

  return { market: recoveredMarket, game, selection };
}
