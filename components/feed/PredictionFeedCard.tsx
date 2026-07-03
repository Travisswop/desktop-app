'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useBtcUpDownMarket } from '@/hooks/polymarket/useBtcUpDownMarket';
import type { PolymarketMarket } from '@/hooks/polymarket';
import {
  fetchChunkedPrices,
  type PriceEntry,
} from '@/lib/polymarket/clob-prices';
import {
  marketRouteKey,
  useMarketDetailStore,
} from '@/zustandStore/marketDetailStore';
import { apiFetch } from '@/lib/api/apiFetch';
import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';
import AgentBadge, { type AgentBadgeAgent } from './AgentBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMeta {
  name?: string | null;
  abbreviation?: string | null;
  color?: string | null;
  logo?: string | null;
  score?: number | string | null;
}

interface LiveTeam {
  name: string | null;
  abbreviation: string | null;
  score: number | null;
}

export interface LiveScore {
  live: boolean;
  ended?: boolean;
  closed?: boolean;
  period: string | null;
  elapsed: string | null;
  teams: LiveTeam[];
  markets?: LiveMarket[];
}

interface LiveMarket {
  id: string | null;
  conditionId: string | null;
  question: string | null;
  closed: boolean;
  active: boolean;
  outcomePrices: string | string[] | number[] | null;
  outcomes: string | string[] | null;
  clobTokenIds: string | string[] | null;
}

export interface VerifiedFinalScoreSnapshot {
  source: 'polymarket-event-live';
  eventSlug: string;
  eventScore: string;
  yesScore: number;
  noScore: number;
  yesTeam: {
    name?: string | null;
    abbreviation?: string | null;
  };
  noTeam: {
    name?: string | null;
    abbreviation?: string | null;
  };
  period?: string | null;
  elapsed?: string | null;
  verifiedAt?: string | Date;
}

export interface PredictionContent {
  [key: string]: unknown;
  marketTitle: string;
  outcome: string; // the outcome the user picked
  side: 'BUY' | 'SELL';
  cost: number;
  potentialWin?: number;
  price: number; // decimal 0–1, price of the picked outcome
  quotePrice?: number | string;
  acceptedPrice?: number | string;
  requestedCost?: number | string;
  requestedPotentialWin?: number | string;
  executedPrice?: number | string;
  executedShares?: number | string;
  executedCost?: number | string;
  executedProceeds?: number | string;
  fillStatus?: string;
  tradeIds?: string[];
  transactionHashes?: string[];
  orderId?: string;
  orderType?: string;
  marketId?: string;
  marketType?: string;
  marketSlug?: string;
  eventScore?: string | null;
  verifiedFinalScore?: VerifiedFinalScoreSnapshot | null;
  scoreSettlementStatus?: 'verified' | 'conflict' | 'unknown';
  scoreSettlementPickedWon?: boolean;
  btcWindowStart?: number | string;
  btcWindowLabel?: string;
  eventSlug?: string;
  // Sports panel (optional – present only for sports markets)
  yesOutcome?: string; // "yes" outcome label, e.g., "Knicks"
  noOutcome?: string; // "no" outcome label, e.g., "Hawks"
  yesTokenId?: string;
  noTokenId?: string;
  yesPrice?: number; // decimal 0–1
  noPrice?: number; // decimal 0–1
  gameStartTime?: string; // ISO date string
  volume?: string; // pre-formatted, e.g., "$528.16K Vol."
  yesTeam?: TeamMeta;
  noTeam?: TeamMeta;
  status?: string;
  result?: string;
  resultStatus?: string;
  claimStatus?: string;
  redeemStatus?: string;
  claimed?: boolean;
  redeemed?: boolean;
  pnl?: number | string;
  realizedPnl?: number | string;
  cashPnl?: number | string;
  sellPnl?: number | string;
  profit?: number | string;
  profitAmount?: number | string;
  loss?: number | string;
  lossAmount?: number | string;
  currentPrice?: number | string;
  currentValue?: number | string;
  claimAmount?: number | string;
  redeemAmount?: number | string;
  payout?: number | string;
  payoutAmount?: number | string;
  saleAmount?: number | string;
}

interface PredictionFeedCardProps {
  content: PredictionContent;
  userName?: string;
  createdAt?: string | Date;
  feedPostId?: string;
  feedUserId?: string;
  accessToken?: string;
  onVerifiedFinalScore?: (content: PredictionContent) => void;
  agent?: AgentBadgeAgent | null;
  ownerHandle?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toAmericanOdds(price: number): string {
  if (price <= 0 || price >= 1) return '—';
  if (price >= 0.5) {
    return `-${Math.round((price / (1 - price)) * 100)}`;
  }
  return `+${Math.round(((1 - price) / price) * 100)}`;
}

function seededRand(seed: string, idx: number): number {
  let h = 5381;
  const s = seed + String(idx);
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 10000) / 10000;
}

function finiteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '')
    return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const n = finiteNumber(value);
    if (n !== undefined) return n;
  }
  return undefined;
}

function formatUsd(value: number | undefined): string {
  if (value === undefined) return '—';
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function sameId(a: unknown, b: unknown): boolean {
  if (!a || !b) return false;
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function parseScorePair(raw: unknown): [number | null, number | null] {
  if (raw == null) return [null, null];
  const match = String(raw).match(/(\d+)\D+(\d+)/);
  if (!match) return [null, null];
  const first = Number(match[1]);
  const second = Number(match[2]);
  return [
    Number.isFinite(first) ? first : null,
    Number.isFinite(second) ? second : null,
  ];
}

function toLiveScoreNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function slugifySportsToken(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferredSportsSlugSuffixes(value: unknown): string[] {
  const slug = slugifySportsToken(value);
  if (!slug) return [];

  const parts = slug.split('-').filter(Boolean);
  const suffixes = new Set<string>([slug]);
  if (parts.length === 1 && parts[0].length >= 3) {
    suffixes.add(parts[0].slice(0, 3));
  }
  if (parts.length > 1) {
    const initials = parts
      .map((part) => part[0])
      .filter(Boolean)
      .join('');
    if (initials.length >= 2) suffixes.add(initials);
  }

  return [...suffixes].filter((suffix) => suffix.length >= 2);
}

function stripKnownSportsMarketSuffix(
  slug: string,
  content: PredictionContent,
): string {
  let base = slug
    .replace(/-(moneyline|spread|total|totals|o-u|over-under).*$/i, '')
    .replace(/-(draw|tie)$/i, '');
  const suffixes = [
    ...inferredSportsSlugSuffixes(content.yesTeam?.abbreviation),
    ...inferredSportsSlugSuffixes(content.noTeam?.abbreviation),
    ...inferredSportsSlugSuffixes(content.yesOutcome),
    ...inferredSportsSlugSuffixes(content.noOutcome),
  ];

  if (suffixes.length) {
    const uniqueSuffixes = Array.from(new Set(suffixes)).sort(
      (a, b) => b.length - a.length,
    );
    const suffixPattern = new RegExp(
      `-(${uniqueSuffixes.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`,
      'i',
    );
    base = base.replace(suffixPattern, '');
  }

  return base;
}

export function resolvePredictionLiveEventSlug(
  content: PredictionContent,
): string | undefined {
  const explicit = firstText(content.eventSlug);
  const slug = firstText(explicit, content.marketSlug);
  if (!slug) return undefined;
  const normalized = stripKnownSportsMarketSuffix(slug, content);
  return normalized || slug;
}

export function embeddedPredictionLiveScore(
  content: PredictionContent,
): LiveScore | null {
  const [score0, score1] = parseScorePair(
    content.eventScore ?? (content as { score?: unknown }).score,
  );
  const rawTeams = [
    content.yesTeam
      ? {
          name: content.yesTeam.name ?? content.yesOutcome ?? null,
          abbreviation: content.yesTeam.abbreviation ?? null,
          score:
            toLiveScoreNumber(content.yesTeam.score) ??
            score0,
        }
      : content.yesOutcome
        ? {
            name: content.yesOutcome,
            abbreviation: null,
            score: score0,
          }
        : null,
    content.noTeam
      ? {
          name: content.noTeam.name ?? content.noOutcome ?? null,
          abbreviation: content.noTeam.abbreviation ?? null,
          score:
            toLiveScoreNumber(content.noTeam.score) ??
            score1,
        }
      : content.noOutcome
        ? {
            name: content.noOutcome,
            abbreviation: null,
            score: score1,
          }
        : null,
  ].filter((team): team is LiveTeam => Boolean(team));
  const hasState =
    Boolean(content.status) ||
    Boolean(content.result) ||
    Boolean(content.resultStatus) ||
    Boolean(content.claimStatus) ||
    Boolean(content.redeemStatus) ||
    Boolean(content.claimed) ||
    Boolean(content.redeemed) ||
    rawTeams.some((team) => team.score != null);

  if (!hasState && !rawTeams.length) return null;

  const terminal = Boolean(
    content.claimed ||
      content.redeemed ||
      content.claimStatus ||
      content.redeemStatus ||
    /^(won|lost|claimed|redeemed|closed|settled)$/i.test(
      String(content.result || content.resultStatus || content.status || ''),
    ),
  );

  return {
    live: false,
    ended: terminal,
    closed: terminal,
    period: null,
    elapsed: null,
    teams: rawTeams,
  };
}

export function mergePredictionLiveScores(
  fetched: LiveScore | null,
  embedded: LiveScore | null,
): LiveScore | null {
  if (!fetched) return embedded;
  if (!embedded) return fetched;

  const fetchedHasScores = fetched.teams.some((team) => team.score != null);
  const embeddedHasScores = embedded.teams.some((team) => team.score != null);

  return {
    live: fetched.live,
    ended: Boolean(fetched.ended || embedded.ended),
    closed: Boolean(fetched.closed || embedded.closed),
    period: fetched.period ?? embedded.period,
    elapsed: fetched.elapsed ?? embedded.elapsed,
    teams:
      fetched.teams.length && (fetchedHasScores || !embeddedHasScores)
        ? fetched.teams
        : embedded.teams,
    markets: fetched.markets,
  };
}

function matchLiveScoreTeam(
  teams: LiveTeam[],
  outcome: string | undefined,
  teamMeta: TeamMeta | undefined,
  fallbackIdx: number,
): {
  score: number;
  team: { name?: string | null; abbreviation?: string | null };
} | null {
  const outcomeLower = String(outcome || '').toLowerCase();
  const metaNameLower = String(teamMeta?.name || '').toLowerCase();
  const metaAbbrLower = String(teamMeta?.abbreviation || '').toLowerCase();
  const matched = teams.find((team) => {
    const name = String(team.name || '').toLowerCase();
    const abbr = String(team.abbreviation || '').toLowerCase();
    return (
      (name &&
        ((outcomeLower &&
          (name.includes(outcomeLower) || outcomeLower.includes(name))) ||
          (metaNameLower &&
            (name.includes(metaNameLower) ||
              metaNameLower.includes(name))))) ||
      (abbr && metaAbbrLower && abbr === metaAbbrLower)
    );
  });

  const team = matched ?? teams[fallbackIdx];
  const score = toLiveScoreNumber(team?.score);
  if (score == null) return null;

  return {
    score,
    team: {
      name: firstText(team?.name, teamMeta?.name, outcome) ?? null,
      abbreviation:
        firstText(team?.abbreviation, teamMeta?.abbreviation) ?? null,
    },
  };
}

export function resolveVerifiedFinalScoreSnapshot({
  content,
  liveScore,
  eventSlug,
}: {
  content: PredictionContent;
  liveScore: LiveScore | null;
  eventSlug?: string;
}): VerifiedFinalScoreSnapshot | null {
  if (!eventSlug || !liveScore || (!liveScore.ended && !liveScore.closed)) {
    return null;
  }
  if (!Array.isArray(liveScore.teams) || liveScore.teams.length < 2) {
    return null;
  }

  const yes = matchLiveScoreTeam(
    liveScore.teams,
    content.yesOutcome,
    content.yesTeam,
    0,
  );
  const no = matchLiveScoreTeam(
    liveScore.teams,
    content.noOutcome,
    content.noTeam,
    1,
  );
  if (!yes || !no) return null;

  return {
    source: 'polymarket-event-live',
    eventSlug,
    eventScore: `${yes.score}-${no.score}`,
    yesScore: yes.score,
    noScore: no.score,
    yesTeam: yes.team,
    noTeam: no.team,
    period: liveScore.period,
    elapsed: liveScore.elapsed,
  };
}

export function formatSpreadOutcomeLabel({
  marketTitle,
  pickedOutcome,
  yesOutcome,
  noOutcome,
}: {
  marketTitle: string;
  pickedOutcome: string;
  yesOutcome: string;
  noOutcome: string;
}): string {
  const picked = pickedOutcome.trim();
  if (!picked || /(?:^|\s)[+-]\d+(?:\.\d+)?$/u.test(picked)) {
    return pickedOutcome;
  }

  const match = marketTitle.match(
    /\bspread\s*:\s*(.+?)\s*\(([+-]?\d+(?:\.\d+)?)\)/i,
  );
  if (!match) return pickedOutcome;

  const subject = match[1].trim();
  const line = Number(match[2]);
  if (!Number.isFinite(line)) return pickedOutcome;

  const same = (a: string, b: string) =>
    a.trim().toLowerCase() === b.trim().toLowerCase();
  const normalizedPicked = picked.toLowerCase();
  const effectivePicked =
    normalizedPicked === 'yes'
      ? yesOutcome
      : normalizedPicked === 'no'
        ? noOutcome
        : picked;
  let selectedLine: number | null = null;
  if (same(effectivePicked, subject)) {
    selectedLine = line;
  } else if (same(effectivePicked, yesOutcome) && same(yesOutcome, subject)) {
    selectedLine = line;
  } else if (same(effectivePicked, noOutcome) && same(yesOutcome, subject)) {
    selectedLine = -line;
  } else if (same(effectivePicked, yesOutcome) && same(noOutcome, subject)) {
    selectedLine = -line;
  } else if (same(effectivePicked, noOutcome) && same(noOutcome, subject)) {
    selectedLine = line;
  }

  if (selectedLine == null) return pickedOutcome;
  const formattedLine =
    selectedLine > 0 ? `+${selectedLine}` : String(selectedLine);
  return `${effectivePicked} ${formattedLine}`;
}

function spreadLineForOutcome({
  marketTitle,
  pickedOutcome,
  yesOutcome,
  noOutcome,
}: {
  marketTitle: string;
  pickedOutcome: string;
  yesOutcome: string;
  noOutcome: string;
}): number | null {
  const match = marketTitle.match(
    /\bspread\s*:\s*(.+?)\s*\(([+-]?\d+(?:\.\d+)?)\)/i,
  );
  if (!match) return null;

  const subject = match[1].trim();
  const line = Number(match[2]);
  if (!Number.isFinite(line)) return null;

  const same = (a: string, b: string) =>
    a.trim().toLowerCase() === b.trim().toLowerCase();
  const normalizedPicked = pickedOutcome.trim().toLowerCase();
  const effectivePicked =
    normalizedPicked === 'yes'
      ? yesOutcome
      : normalizedPicked === 'no'
        ? noOutcome
        : pickedOutcome;

  if (same(effectivePicked, subject)) return line;
  if (same(effectivePicked, yesOutcome) && same(yesOutcome, subject)) {
    return line;
  }
  if (same(effectivePicked, noOutcome) && same(yesOutcome, subject)) {
    return -line;
  }
  if (same(effectivePicked, yesOutcome) && same(noOutcome, subject)) {
    return -line;
  }
  if (same(effectivePicked, noOutcome) && same(noOutcome, subject)) {
    return line;
  }
  return null;
}

export function resolveSportsScorePickedWon({
  marketTitle,
  pickedOutcome,
  yesOutcome,
  noOutcome,
  yesScore,
  noScore,
}: {
  marketTitle: string;
  pickedOutcome: string;
  yesOutcome?: string;
  noOutcome?: string;
  yesScore: number | undefined;
  noScore: number | undefined;
}): boolean | undefined {
  if (
    yesScore === undefined ||
    noScore === undefined ||
    yesScore === noScore ||
    !yesOutcome ||
    !noOutcome
  ) {
    return undefined;
  }

  const pickedLower = pickedOutcome.trim().toLowerCase();
  const pickedIsYes =
    pickedLower === 'yes' || pickedLower === yesOutcome.toLowerCase();
  const pickedIsNo =
    pickedLower === 'no' || pickedLower === noOutcome.toLowerCase();
  if (!pickedIsYes && !pickedIsNo) return undefined;

  const spreadLine = spreadLineForOutcome({
    marketTitle,
    pickedOutcome,
    yesOutcome,
    noOutcome,
  });
  if (spreadLine != null) {
    const pickedScore = pickedIsYes ? yesScore : noScore;
    const opponentScore = pickedIsYes ? noScore : yesScore;
    return pickedScore + spreadLine > opponentScore;
  }

  return pickedIsYes ? yesScore > noScore : noScore > yesScore;
}

export function formatSportsGameClockLabel({
  hasScores,
  yesScore,
  noScore,
  liveScore,
  gameStartTime,
}: {
  hasScores: boolean;
  yesScore: number | null;
  noScore: number | null;
  liveScore: LiveScore | null;
  gameStartTime?: string;
}): string {
  if (hasScores && (liveScore?.ended || liveScore?.closed)) {
    return `${yesScore}-${noScore}`;
  }
  if (hasScores) {
    return [liveScore?.period, liveScore?.elapsed]
      .filter(Boolean)
      .join(' · ') || 'GAME';
  }
  return formatGameCenter(gameStartTime);
}

function teamMetaToEventTeam(team: TeamMeta | undefined, fallbackName: string) {
  return {
    name: firstText(team?.name) || fallbackName,
    logo: firstText(team?.logo),
    abbreviation: firstText(team?.abbreviation),
    color: firstText(team?.color),
  };
}

function quoteForPrice(price: number | undefined) {
  if (price === undefined) return undefined;
  const value = clampProbability(price);
  return {
    bidPrice: value,
    askPrice: value,
    midPrice: value,
  };
}

function buildPredictionDetailMarket(
  content: PredictionContent,
  options: {
    marketTitle?: string;
    yesOutcome?: string;
    noOutcome?: string;
    yesTokenId?: string;
    noTokenId?: string;
    yesPrice?: number;
    noPrice?: number;
    closed?: boolean;
  },
): PolymarketMarket | null {
  const marketTitle = firstText(options.marketTitle, content.marketTitle);
  if (!marketTitle) return null;

  const yesOutcome = firstText(options.yesOutcome, content.yesOutcome) || 'Yes';
  const noOutcome = firstText(options.noOutcome, content.noOutcome) || 'No';
  const yesTokenId = firstText(options.yesTokenId, content.yesTokenId) || '';
  const noTokenId = firstText(options.noTokenId, content.noTokenId) || '';
  const yesPrice = clampProbability(
    options.yesPrice ??
      finiteNumber(content.yesPrice) ??
      finiteNumber(content.price) ??
      0.5,
  );
  const noPrice = clampProbability(
    options.noPrice ?? finiteNumber(content.noPrice) ?? 1 - yesPrice,
  );
  const marketId = firstText(content.marketId);
  const slug = firstText(content.marketSlug, content.eventSlug, marketId);
  const id = firstText(marketId, slug, marketTitle);
  if (!id) return null;

  const realtimePrices: PolymarketMarket['realtimePrices'] = {};
  const yesQuote = quoteForPrice(yesPrice);
  const noQuote = quoteForPrice(noPrice);
  if (yesTokenId && yesQuote) realtimePrices[yesTokenId] = yesQuote;
  if (noTokenId && noQuote) realtimePrices[noTokenId] = noQuote;

  const closed = Boolean(options.closed);
  const eventTeams =
    content.yesTeam || content.noTeam
      ? [
          teamMetaToEventTeam(content.yesTeam, yesOutcome),
          teamMetaToEventTeam(content.noTeam, noOutcome),
        ]
      : undefined;

  return {
    id,
    conditionId: marketId || id,
    question: marketTitle,
    slug: slug || id,
    active: !closed,
    closed,
    outcomes: JSON.stringify([yesOutcome, noOutcome]),
    outcomePrices: JSON.stringify([yesPrice, noPrice]),
    clobTokenIds: JSON.stringify([yesTokenId, noTokenId]),
    eventSlug: firstText(content.eventSlug),
    gameStartTime: firstText(content.gameStartTime),
    volume: firstText(content.volume),
    eventTeams,
    realtimePrices,
  };
}

function resolveInitialOutcome(
  content: PredictionContent,
  yesOutcome: string,
  noOutcome: string,
): 'yes' | 'no' | undefined {
  const outcome = content.outcome.toLowerCase();
  if (outcome === 'yes' || outcome === yesOutcome.toLowerCase()) return 'yes';
  if (outcome === 'no' || outcome === noOutcome.toLowerCase()) return 'no';
  return undefined;
}

function usePredictionMarketNavigation(
  content: PredictionContent,
  options: Parameters<typeof buildPredictionDetailMarket>[1],
) {
  const router = useRouter();
  const stashMarketDetail = useMarketDetailStore((state) => state.set);
  const market = useMemo(
    () => buildPredictionDetailMarket(content, options),
    [
      content,
      options.closed,
      options.marketTitle,
      options.noOutcome,
      options.noPrice,
      options.noTokenId,
      options.yesOutcome,
      options.yesPrice,
      options.yesTokenId,
    ],
  );
  const marketKey = market ? marketRouteKey(market) : '';
  const marketHref = marketKey
    ? `/prediction/market/${encodeURIComponent(marketKey)}`
    : undefined;
  const yesOutcome = firstText(options.yesOutcome, content.yesOutcome) || 'Yes';
  const noOutcome = firstText(options.noOutcome, content.noOutcome) || 'No';
  const defaultInitialOutcome = resolveInitialOutcome(
    content,
    yesOutcome,
    noOutcome,
  );

  const onMarketClick = useCallback(
    (
      event: React.MouseEvent<HTMLAnchorElement>,
      initialOutcome?: 'yes' | 'no',
    ) => {
      event.preventDefault();
      event.stopPropagation();
      if (!market || !marketKey || !marketHref) return;

      stashMarketDetail(marketKey, {
        market,
        initialOutcome: initialOutcome ?? defaultInitialOutcome,
        outcomeLabels: [yesOutcome, noOutcome],
      });
      router.push(marketHref);
    },
    [
      defaultInitialOutcome,
      market,
      marketHref,
      marketKey,
      noOutcome,
      router,
      stashMarketDetail,
      yesOutcome,
    ],
  );

  return {
    marketHref,
    onMarketClick,
  };
}

function isBtcFiveMinutePrediction(content: PredictionContent): boolean {
  const source = [
    content.marketType,
    content.marketTitle,
    content.marketSlug,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    source.includes('btc5m') ||
    ((source.includes('btc') || source.includes('bitcoin')) &&
      (source.includes('5 minute') ||
        source.includes('5-minute') ||
        source.includes('5m')) &&
      (source.includes('up') || source.includes('down')))
  );
}

function currentBtcWindowStart(): number {
  return Math.floor(Date.now() / 1000 / 300) * 300;
}

function useCurrentBtcWindowStart(): number {
  const [windowStart, setWindowStart] = useState(currentBtcWindowStart);

  useEffect(() => {
    const id = setInterval(() => {
      setWindowStart(currentBtcWindowStart());
    }, 1_000);
    return () => clearInterval(id);
  }, []);

  return windowStart;
}

function windowStartFromDate(value: string | Date | undefined): number | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  if (!Number.isFinite(time)) return null;
  return Math.floor(time / 1000 / 300) * 300;
}

function resolveBtcWindowStart(
  content: PredictionContent,
  createdAt?: string | Date,
): number {
  const explicit = firstNumber(content.btcWindowStart);
  if (explicit && explicit > 0) return Math.floor(explicit / 300) * 300;

  const slugWindow = String(content.marketSlug || '').match(/(\d{10})$/);
  if (slugWindow) {
    const parsed = Number(slugWindow[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return windowStartFromDate(createdAt) ?? currentBtcWindowStart();
}

function parseBtcFeedMarket(raw: Record<string, unknown> | null): {
  conditionId?: string;
  slug?: string;
  question?: string;
  upTokenId?: string;
  downTokenId?: string;
  yesPrice?: number;
  noPrice?: number;
  closed: boolean;
} | null {
  if (!raw) return null;

  const tokenIds = parseList(raw.clobTokenIds);
  const prices = parseList(raw.outcomePrices)
    .map(Number)
    .filter(
      (price) => Number.isFinite(price) && price >= 0 && price <= 1,
    );

  return {
    conditionId: String(raw.conditionId || raw.condition_id || ''),
    slug: String(raw.slug || ''),
    question: String(raw.question || raw.title || ''),
    upTokenId: tokenIds[0],
    downTokenId: tokenIds[1],
    yesPrice: prices[0],
    noPrice: prices[1],
    closed: Boolean(raw.closed || raw.active === false),
  };
}

function inferBtcWinnerFromPrices(
  yesPrice: number | undefined,
  noPrice: number | undefined,
): 'Up' | 'Down' | null {
  if (yesPrice === undefined || noPrice === undefined) return null;
  if (Math.abs(yesPrice - noPrice) < 0.01) return null;
  return yesPrice > noPrice ? 'Up' : 'Down';
}

function inferBtcWinnerFromSettledPrices(
  yesPrice: number | undefined,
  noPrice: number | undefined,
): 'Up' | 'Down' | null {
  if (yesPrice === undefined || noPrice === undefined) return null;
  if (yesPrice >= 0.99 && noPrice <= 0.01) return 'Up';
  if (noPrice >= 0.99 && yesPrice <= 0.01) return 'Down';
  return null;
}

export function resolveBtcSettledWinner({
  yesPrice,
  noPrice,
  candleWinner,
}: {
  yesPrice: number | undefined;
  noPrice: number | undefined;
  candleWinner: 'Up' | 'Down' | null;
}): 'Up' | 'Down' | null {
  return (
    inferBtcWinnerFromSettledPrices(yesPrice, noPrice) ??
    candleWinner ??
    inferBtcWinnerFromPrices(yesPrice, noPrice)
  );
}

function resolveMarketState(
  content: PredictionContent,
  liveScore: LiveScore | null,
): ResolvedMarketState {
  const markets = liveScore?.markets ?? [];
  const matched = markets.find((market) => {
    const tokenIds = parseList(market.clobTokenIds);
    return (
      sameId(market.id, content.marketId) ||
      sameId(market.conditionId, content.marketId) ||
      tokenIds.some(
        (tokenId) =>
          sameId(tokenId, content.yesTokenId) ||
          sameId(tokenId, content.noTokenId),
      )
    );
  });

  const outcomePrices = parseList(matched?.outcomePrices)
    .map(Number)
    .filter(
      (price) => Number.isFinite(price) && price >= 0 && price <= 1,
    );
  const tokenIds = parseList(matched?.clobTokenIds);
  const outcomes = parseList(matched?.outcomes);

  const yesIdx = tokenIds.findIndex((id) =>
    sameId(id, content.yesTokenId),
  );
  const noIdx = tokenIds.findIndex((id) =>
    sameId(id, content.noTokenId),
  );
  const pickedIdx = outcomes.findIndex(
    (label) => label.toLowerCase() === content.outcome.toLowerCase(),
  );

  const yesPrice =
    yesIdx >= 0
      ? outcomePrices[yesIdx]
      : (outcomePrices[0] ?? undefined);
  const noPrice =
    noIdx >= 0
      ? outcomePrices[noIdx]
      : (outcomePrices[1] ?? undefined);
  const pickedPrice =
    pickedIdx >= 0
      ? outcomePrices[pickedIdx]
      : content.outcome.toLowerCase() ===
          content.yesOutcome?.toLowerCase()
        ? yesPrice
        : content.outcome.toLowerCase() ===
            content.noOutcome?.toLowerCase()
          ? noPrice
          : undefined;
  const scoreForOutcome = (
    outcomeLabel: string | undefined,
    fallbackIdx: number,
  ): number | undefined => {
    if (!outcomeLabel || !liveScore?.teams?.length) return undefined;
    const lower = outcomeLabel.toLowerCase();
    const found = liveScore.teams.find((team) => {
      const name = (team.name ?? '').toLowerCase();
      const abbr = (team.abbreviation ?? '').toLowerCase();
      return (
        (name && (name.includes(lower) || lower.includes(name))) ||
        (abbr && lower.includes(abbr))
      );
    });
    const score = (found ?? liveScore.teams[fallbackIdx])?.score;
    return score == null ? undefined : score;
  };
  const yesScore = scoreForOutcome(content.yesOutcome, 0);
  const noScore = scoreForOutcome(content.noOutcome, 1);
  const pickedWon = resolveSportsScorePickedWon({
    marketTitle: content.marketTitle,
    pickedOutcome: content.outcome,
    yesOutcome: content.yesOutcome,
    noOutcome: content.noOutcome,
    yesScore,
    noScore,
  });

  return {
    closed: Boolean(
      liveScore?.ended ||
      liveScore?.closed ||
      matched?.closed ||
      matched?.active === false,
    ),
    yesPrice,
    noPrice,
    pickedPrice,
    pickedWon,
  };
}

type FeedTradeState =
  | 'live'
  | 'won'
  | 'lost'
  | 'sold-profit'
  | 'sold-loss'
  | 'sold'
  | 'open';

export interface TradeStateMeta {
  state: FeedTradeState;
  label: string;
  detail: string;
  tone: 'green' | 'red' | 'blue' | 'gray';
  amount?: number;
}

export interface ResolvedMarketState {
  closed: boolean;
  yesPrice?: number;
  noPrice?: number;
  pickedPrice?: number;
  pickedWon?: boolean;
}

interface LivePredictionPrices {
  yesPrice?: number;
  noPrice?: number;
}

const LIVE_SCORE_POLL_MS = 10_000;
const OPEN_SCORE_POLL_MS = 30_000;
const LIVE_PRICE_POLL_MS = 10_000;
const RETRY_POLL_MS = 30_000;

export function resolveTradeState(
  content: PredictionContent,
  isLive: boolean,
  marketState: ResolvedMarketState,
): TradeStateMeta {
  const side = content.side;
  const statusText = [
    content.resultStatus,
    content.result,
    content.status,
    content.claimStatus,
    content.redeemStatus,
  ]
    .filter((value) => value !== undefined && value !== null)
    .map(String)
    .join(' ')
    .toLowerCase();

  const realizedPnl = firstNumber(
    content.realizedPnl,
    content.cashPnl,
    content.pnl,
  );
  const explicitProfit = firstNumber(
    content.profit,
    content.profitAmount,
  );
  const explicitLoss = firstNumber(content.loss, content.lossAmount);
  const sellPnl = firstNumber(
    content.sellPnl,
    realizedPnl,
    explicitProfit,
    explicitLoss !== undefined ? -Math.abs(explicitLoss) : undefined,
  );
  const pnl =
    realizedPnl ??
    explicitProfit ??
    (explicitLoss !== undefined
      ? -Math.abs(explicitLoss)
      : undefined);
  const payoutAmount = firstNumber(
    content.redeemAmount,
    content.claimAmount,
    content.payoutAmount,
    content.payout,
    content.currentValue,
  );
  const potentialPayout = firstNumber(content.potentialWin);
  const winPnl =
    pnl ??
    (payoutAmount !== undefined
      ? payoutAmount - content.cost
      : potentialPayout !== undefined
        ? potentialPayout - content.cost
        : undefined);

  if (
    statusText.includes('won') ||
    statusText.includes('win') ||
    statusText.includes('redeem') ||
    statusText.includes('claim') ||
    content.redeemed === true ||
    content.claimed === true
  ) {
    return {
      state: 'won',
      label: 'Won',
      detail: 'The pick settled in profit',
      tone: 'green',
      amount: winPnl,
    };
  }

  if (
    statusText.includes('lost') ||
    statusText.includes('loss') ||
    statusText.includes('lose')
  ) {
    return {
      state: 'lost',
      label: 'Lost',
      detail: 'The pick settled at a loss',
      tone: 'red',
      amount: pnl ?? -Math.abs(content.cost),
    };
  }

  const sold =
    side === 'SELL' ||
    statusText.includes('sold') ||
    statusText.includes('sell') ||
    statusText.includes('closed');

  if (sold) {
    if (sellPnl !== undefined && sellPnl > 0) {
      return {
        state: 'sold-profit',
        label: 'Sold for profit',
        detail: 'Position closed above cost',
        tone: 'green',
        amount: sellPnl,
      };
    }
    if (sellPnl !== undefined && sellPnl < 0) {
      return {
        state: 'sold-loss',
        label: 'Sold for loss',
        detail: 'Position closed below cost',
        tone: 'red',
        amount: sellPnl,
      };
    }
    return {
      state: 'sold',
      label: 'Sold',
      detail: 'Position closed',
      tone: 'blue',
      amount: firstNumber(content.saleAmount, content.cost),
    };
  }

  if (isLive) {
    return {
      state: 'live',
      label: 'Live',
      detail: 'Game in progress',
      tone: 'blue',
    };
  }

  if (marketState.closed) {
    if (marketState.pickedWon === true) {
      return {
        state: 'won',
        label: 'Won',
        detail: 'The market is closed',
        tone: 'green',
        amount: winPnl,
      };
    }
    if (marketState.pickedWon === false) {
      return {
        state: 'lost',
        label: 'Lost',
        detail: 'The market is closed',
        tone: 'red',
        amount: pnl ?? -Math.abs(content.cost),
      };
    }

    if (marketState.pickedPrice !== undefined) {
      if (marketState.pickedPrice >= 0.99) {
        return {
          state: 'won',
          label: 'Won',
          detail: 'The market is closed',
          tone: 'green',
          amount: winPnl,
        };
      }
      if (marketState.pickedPrice <= 0.01) {
        return {
          state: 'lost',
          label: 'Lost',
          detail: 'The market is closed',
          tone: 'red',
          amount: pnl ?? -Math.abs(content.cost),
        };
      }
    }

    return {
      state: 'sold',
      label: 'Closed',
      detail: 'The market is no longer open',
      tone: 'blue',
      amount: pnl,
    };
  }

  return {
    state: 'open',
    label: 'Open pick',
    detail: 'Waiting for the market to settle',
    tone: 'gray',
  };
}

// ─── Live score hook ──────────────────────────────────────────────────────────

function shouldPollLiveScore(score: LiveScore | null): boolean {
  if (!score) return true;
  return !score.ended && !score.closed;
}

function nextLiveScorePollMs(score: LiveScore | null): number {
  if (!score) return RETRY_POLL_MS;
  return score.live ? LIVE_SCORE_POLL_MS : OPEN_SCORE_POLL_MS;
}

function useLiveScore(eventSlug: string | undefined): LiveScore | null {
  const [score, setScore] = useState<LiveScore | null>(null);

  useEffect(() => {
    if (!eventSlug) {
      setScore(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const controller = new AbortController();

    const scheduleNextFetch = (nextScore: LiveScore | null) => {
      if (cancelled || !shouldPollLiveScore(nextScore)) return;
      timer = setTimeout(fetchScore, nextLiveScorePollMs(nextScore));
    };

    const fetchScore = async () => {
      try {
        const res = await fetch(
          `/api/polymarket/event-live?slug=${encodeURIComponent(
            eventSlug,
          )}&_=${Date.now()}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );
        if (!res.ok || cancelled) {
          scheduleNextFetch(null);
          return;
        }
        const data: LiveScore = await res.json();
        if (cancelled) return;
        setScore(data);
        scheduleNextFetch(data);
      } catch {
        scheduleNextFetch(null);
      }
    };

    fetchScore();
    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [eventSlug]);

  return score;
}

function useVerifiedFinalScorePersistence({
  content,
  liveScore,
  eventSlug,
  feedPostId,
  feedUserId,
  accessToken,
  onVerifiedFinalScore,
}: {
  content: PredictionContent;
  liveScore: LiveScore | null;
  eventSlug?: string;
  feedPostId?: string;
  feedUserId?: string;
  accessToken?: string;
  onVerifiedFinalScore?: (content: PredictionContent) => void;
}) {
  const attemptedKeyRef = useRef<string | null>(null);
  const snapshot = useMemo(
    () =>
      resolveVerifiedFinalScoreSnapshot({
        content,
        liveScore,
        eventSlug,
      }),
    [content, eventSlug, liveScore],
  );

  useEffect(() => {
    if (!snapshot || !feedPostId || !feedUserId) return;

    const existing = content.verifiedFinalScore;
    if (
      existing?.eventSlug === snapshot.eventSlug &&
      existing?.eventScore === snapshot.eventScore
    ) {
      return;
    }

    const key = `${feedPostId}:${snapshot.eventSlug}:${snapshot.eventScore}`;
    if (attemptedKeyRef.current === key) return;
    attemptedKeyRef.current = key;

    const controller = new AbortController();
    const persist = async () => {
      try {
        const response = await apiFetch(
          buildSwopApiUrl(`/api/v2/feed/prediction/${encodeURIComponent(
            feedPostId,
          )}/verified-score`),
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken
                ? { authorization: `Bearer ${accessToken}` }
                : {}),
            },
            body: JSON.stringify({
              userId: feedUserId,
              eventSlug: snapshot.eventSlug,
            }),
            signal: controller.signal,
          },
        );
        const data = await response.json().catch(() => null);
        if (!response.ok) return;
        const updatedContent = data?.data?.content;
        if (updatedContent) {
          onVerifiedFinalScore?.(updatedContent);
        }
      } catch (error) {
        if ((error as DOMException)?.name !== 'AbortError') {
          console.warn('Failed to persist verified prediction score:', error);
        }
      }
    };

    persist();
    return () => controller.abort();
  }, [
    accessToken,
    content.verifiedFinalScore,
    feedPostId,
    feedUserId,
    onVerifiedFinalScore,
    snapshot,
  ]);
}

function priceFromEntry(entry: PriceEntry | undefined): number | undefined {
  const price = firstNumber(
    entry?.midPrice,
    entry?.askPrice,
    entry?.bidPrice,
  );
  return price !== undefined && price >= 0 && price <= 1
    ? price
    : undefined;
}

function useLivePredictionPrices(
  yesTokenId: string | undefined,
  noTokenId: string | undefined,
  enabled: boolean,
): LivePredictionPrices {
  const [prices, setPrices] = useState<LivePredictionPrices>({});

  useEffect(() => {
    if (!enabled || (!yesTokenId && !noTokenId)) {
      setPrices({});
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchPrices = async () => {
      try {
        const tokenIds = [yesTokenId, noTokenId].filter(
          (tokenId): tokenId is string => Boolean(tokenId),
        );
        const priceMap = await fetchChunkedPrices(tokenIds);
        if (cancelled) return;
        const nextPrices = {
          yesPrice: priceFromEntry(
            yesTokenId ? priceMap[yesTokenId] : undefined,
          ),
          noPrice: priceFromEntry(
            noTokenId ? priceMap[noTokenId] : undefined,
          ),
        };
        setPrices((prev) =>
          prev.yesPrice === nextPrices.yesPrice &&
          prev.noPrice === nextPrices.noPrice
            ? prev
            : nextPrices,
        );
      } catch {
        // Keep the last known prices; event-live/Gamma prices remain fallback.
      } finally {
        if (!cancelled) {
          timer = setTimeout(fetchPrices, LIVE_PRICE_POLL_MS);
        }
      }
    };

    fetchPrices();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, yesTokenId, noTokenId]);

  return prices;
}

// ─── Price history hook ───────────────────────────────────────────────────────

interface HistoryPoint {
  t: number;
  p: number;
}

function usePriceHistory(
  yesTokenId: string | undefined,
  noTokenId: string | undefined,
  enabled: boolean,
): {
  yesHistory: HistoryPoint[];
  noHistory: HistoryPoint[];
  loading: boolean;
} {
  const [yesHistory, setYesHistory] = useState<HistoryPoint[]>([]);
  const [noHistory, setNoHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !yesTokenId || !noTokenId) return;
    let cancelled = false;
    setLoading(true);

    const fetchOne = (id: string) =>
      fetch(
        `/api/polymarket/prices-history?tokenId=${encodeURIComponent(
          id,
        )}&interval=max&fidelity=30`,
      )
        .then((r) => (r.ok ? r.json() : { history: [] }))
        .then((j) => {
          const raw = Array.isArray(j?.history) ? j.history : [];
          return raw
            .map((pt: { t?: number; p?: number | string }) => ({
              t: Number(pt.t),
              p: Number(pt.p),
            }))
            .filter(
              (pt: HistoryPoint) =>
                isFinite(pt.t) &&
                isFinite(pt.p) &&
                pt.p >= 0 &&
                pt.p <= 1,
            );
        })
        .catch(() => [] as HistoryPoint[]);

    Promise.all([fetchOne(yesTokenId), fetchOne(noTokenId)]).then(
      ([y, n]) => {
        if (cancelled) return;
        setYesHistory(y);
        setNoHistory(n);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [enabled, yesTokenId, noTokenId]);

  return { yesHistory, noHistory, loading };
}

function useHistoricalBtcFeedMarket(
  windowStart: number,
  enabled: boolean,
) {
  const [market, setMarket] = useState<ReturnType<
    typeof parseBtcFeedMarket
  >>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !windowStart) return;
    let cancelled = false;
    setLoading(true);

    fetch(`/api/polymarket/btc5m-market?window_start=${windowStart}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((raw) => {
        if (cancelled) return;
        setMarket(parseBtcFeedMarket(raw));
      })
      .catch(() => {
        if (!cancelled) setMarket(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, windowStart]);

  return { market, loading };
}

function useBtcWindowWinner(
  windowStart: number,
  enabled: boolean,
): 'Up' | 'Down' | null {
  const [winner, setWinner] = useState<'Up' | 'Down' | null>(null);

  useEffect(() => {
    if (!enabled || !windowStart) return;
    let cancelled = false;
    setWinner(null);

    const startTime = windowStart * 1000;
    fetch(
      `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=5m&startTime=${startTime}&limit=1`,
      { cache: 'no-store' },
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const candle = Array.isArray(data) ? data[0] : null;
        const open = Number(candle?.[1]);
        const close = Number(candle?.[4]);
        if (!Number.isFinite(open) || !Number.isFinite(close)) return;
        if (close > open) setWinner('Up');
        else if (close < open) setWinner('Down');
        else setWinner(null);
      })
      .catch(() => {
        if (!cancelled) setWinner(null);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, windowStart]);

  return winner;
}

// ─── Chart path builder ───────────────────────────────────────────────────────

function historyToPath(
  series: HistoryPoint[],
  tMin: number,
  tMax: number,
  plotX: number,
  plotY: number,
  plotW: number,
  plotH: number,
): string {
  if (series.length < 2) return '';
  const span = Math.max(1, tMax - tMin);
  const pts = series.map((pt) => ({
    x: plotX + ((pt.t - tMin) / span) * plotW,
    y: plotY + (1 - pt.p) * plotH,
  }));
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const cx = ((a.x + b.x) / 2).toFixed(2);
    d += ` C ${cx} ${a.y.toFixed(2)}, ${cx} ${b.y.toFixed(2)}, ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  }
  return d;
}

function clampProbability(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

function formatPercent(price: number): string {
  return `${Math.round(clampProbability(price) * 100)}%`;
}

function formatSignedUsd(value: number | undefined): string {
  if (value === undefined) return '—';
  return `${value >= 0 ? '+' : ''}${formatUsd(value)}`;
}

export function resolvePredictionDisplayPnl({
  entryIsEstimate,
  isOpen,
  tradeState,
  liveDelta,
}: {
  entryIsEstimate?: boolean;
  isOpen: boolean;
  tradeState: { amount?: number };
  liveDelta?: number;
}): number | undefined {
  if (entryIsEstimate) return undefined;
  return isOpen
    ? (liveDelta ?? tradeState.amount)
    : (tradeState.amount ?? liveDelta);
}

function resolvePredictionSummaryValue({
  entryIsEstimate,
  isOpen,
  cost,
  currentValue,
  selectedPnl,
}: {
  entryIsEstimate?: boolean;
  isOpen: boolean;
  cost: number;
  currentValue?: number;
  selectedPnl?: number;
}) {
  if (entryIsEstimate) return undefined;
  if (!isOpen && selectedPnl !== undefined) return cost + selectedPnl;
  return (
    currentValue ??
    (selectedPnl !== undefined ? cost + selectedPnl : undefined)
  );
}

function formatShares(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 100 ? 0 : value >= 10 ? 1 : 2,
  }).format(value);
}

function formatEntrySummary({
  cost,
  shares,
  entryPriceLabel,
  entryIsEstimate,
}: {
  cost: number;
  shares: number | undefined;
  entryPriceLabel: string;
  entryIsEstimate?: boolean;
}) {
  if (entryIsEstimate) {
    return `${formatUsd(cost)} · pre-fill quote @ ${entryPriceLabel}`;
  }

  return `${formatUsd(cost)} · ${formatShares(shares)} sh @ ${entryPriceLabel}`;
}

function resolveExecutedPredictionPosition(content: PredictionContent) {
  const executedPrice = firstNumber(content.executedPrice);
  const executedShares = firstNumber(content.executedShares);
  const executedCost = firstNumber(content.executedCost);
  const executedProceeds = firstNumber(content.executedProceeds);
  const derivedExecutedPrice =
    executedShares && executedShares > 0
      ? content.side === 'SELL'
        ? executedProceeds !== undefined
          ? executedProceeds / executedShares
          : undefined
        : executedCost !== undefined
          ? executedCost / executedShares
          : undefined
      : undefined;
  const quotedPrice = firstNumber(content.price, content.acceptedPrice);
  const entryPrice = clampProbability(
    executedPrice ?? derivedExecutedPrice ?? quotedPrice ?? 0,
  );
  const cost =
    content.side === 'SELL'
      ? firstNumber(executedProceeds, content.saleAmount, content.cost) ??
        content.cost
      : firstNumber(executedCost, content.cost) ?? content.cost;
  const shares =
    executedShares ??
    firstNumber(content.potentialWin, content.requestedPotentialWin);

  return {
    cost,
    entryPrice,
    shares,
    hasExecutedFill:
      executedPrice !== undefined ||
      executedShares !== undefined ||
      executedCost !== undefined ||
      executedProceeds !== undefined,
  };
}

function hasSubmittedPredictionOrder(content: PredictionContent): boolean {
  const orderId =
    typeof content.orderId === 'string'
      ? content.orderId.trim()
      : content.orderId;
  const fillStatus =
    typeof content.fillStatus === 'string'
      ? content.fillStatus.trim()
      : content.fillStatus;

  return Boolean(
    orderId ||
      fillStatus ||
      (Array.isArray(content.tradeIds) && content.tradeIds.length > 0) ||
      (Array.isArray(content.transactionHashes) &&
        content.transactionHashes.length > 0),
  );
}

function isPredictionEntryEstimate(
  content: PredictionContent,
  executedPosition: ReturnType<typeof resolveExecutedPredictionPosition>,
): boolean {
  return (
    !executedPosition.hasExecutedFill &&
    !hasSubmittedPredictionOrder(content)
  );
}

function initials(value?: string): string {
  if (!value) return 'AS';
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const next = parts.length >= 2
    ? `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`
    : value.slice(0, 2);
  return next.toUpperCase();
}

function formatClock(date: Date, includeMeridiem = true): string {
  const formatted = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return includeMeridiem ? formatted : formatted.replace(/\s?[AP]M$/i, '');
}

function formatGameCenter(gameStartTime?: string): string {
  if (!gameStartTime) return 'Market open';
  const date = new Date(gameStartTime);
  if (Number.isNaN(date.getTime())) return 'Market open';
  const day = date
    .toLocaleDateString([], { weekday: 'short' })
    .toUpperCase();
  return `${day} · ${formatClock(date)}`;
}

function inferLeagueLabel(
  marketTitle: string,
  eventSlug?: string,
): string {
  const source = `${marketTitle} ${eventSlug ?? ''}`.toLowerCase();
  const leagues = [
    'nba',
    'wnba',
    'nfl',
    'mlb',
    'nhl',
    'ncaab',
    'ncaaf',
    'epl',
    'mls',
    'ipl',
  ];
  const found = leagues.find((league) =>
    new RegExp(`(^|[^a-z])${league}([^a-z]|$)`).test(source),
  );
  return found ? found.toUpperCase() : 'SPORTS';
}

function inferMarketKind(marketTitle: string): string {
  const lower = marketTitle.toLowerCase();
  if (lower.includes('spread')) return 'SPREAD';
  if (lower.includes('total') || lower.includes('over/under'))
    return 'TOTAL';
  return 'MONEYLINE';
}

function statusPill(
  tradeState: TradeStateMeta,
  liveScore: LiveScore | null,
  gameStartTime?: string,
): {
  label: string;
  className: string;
  dotClassName?: string;
} {
  if (liveScore?.live) {
    const suffix = liveScore.period || liveScore.elapsed;
    return {
      label: suffix ? `LIVE · ${suffix}` : 'LIVE',
      className: 'bg-red-50 text-red-500 border-red-100',
      dotClassName: 'bg-red-400',
    };
  }

  if (
    liveScore?.ended ||
    liveScore?.closed ||
    tradeState.state === 'won' ||
    tradeState.state === 'lost'
  ) {
    return {
      label: 'FINAL',
      className: 'bg-gray-50 text-gray-500 border-gray-100',
    };
  }

  if (
    tradeState.state === 'sold' ||
    tradeState.state === 'sold-profit' ||
    tradeState.state === 'sold-loss'
  ) {
    return {
      label: 'SOLD',
      className: 'bg-blue-50 text-blue-600 border-blue-100',
    };
  }

  if (gameStartTime) {
    const date = new Date(gameStartTime);
    if (!Number.isNaN(date.getTime()) && date.getTime() > Date.now()) {
      return {
        label: `TIP-OFF ${formatClock(date, false)}`,
        className: 'bg-amber-50 text-amber-600 border-amber-100',
      };
    }
  }

  return {
    label: 'OPEN',
    className: 'bg-gray-50 text-gray-500 border-gray-100',
  };
}

function predictionStatusPill(tradeState: TradeStateMeta): {
  label: string;
  className: string;
} {
  if (tradeState.state === 'won') {
    return {
      label: 'Won',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    };
  }
  if (tradeState.state === 'lost') {
    return {
      label: 'Lost',
      className: 'bg-red-50 text-red-600 border-red-100',
    };
  }
  if (
    tradeState.state === 'sold' ||
    tradeState.state === 'sold-profit' ||
    tradeState.state === 'sold-loss'
  ) {
    return {
      label: tradeState.label,
      className: 'bg-blue-50 text-blue-600 border-blue-100',
    };
  }
  if (tradeState.state === 'live') {
    return {
      label: 'Live',
      className: 'bg-red-50 text-red-500 border-red-100',
    };
  }
  return {
    label: 'Open',
    className: 'bg-gray-50 text-gray-500 border-gray-100',
  };
}

function splitProbabilities(yesPrice: number, noPrice: number) {
  const yes = clampProbability(yesPrice);
  const no = clampProbability(noPrice);
  const total = yes + no;
  if (total <= 0) {
    return { yes: 50, no: 50 };
  }
  return {
    yes: (yes / total) * 100,
    no: (no / total) * 100,
  };
}

function TeamMark({
  team,
  abbr,
}: {
  team?: TeamMeta;
  abbr: string;
}) {
  const color = team?.color || '#374151';
  const logo = team?.logo;
  const displayAbbr = team?.abbreviation || abbr;

  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-[0_4px_10px_rgba(15,23,42,0.16)]"
      style={{ backgroundColor: color }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={displayAbbr}
          className="h-7 w-7 object-contain"
        />
      ) : (
        <span className="font-mono text-[10px] font-black text-white">
          {displayAbbr}
        </span>
      )}
    </div>
  );
}

// ─── Sports mini panel ────────────────────────────────────────────────────────

function SportsMiniPanel({
  marketTitle,
  eventSlug,
  yesOutcome,
  noOutcome,
  yesPrice: yP,
  noPrice: nP,
  yesTeam,
  noTeam,
  gameStartTime,
  yesTokenId,
  noTokenId,
  liveScore,
  pickedOutcome,
  userName,
  side,
  cost,
  entryPrice,
  positionShares,
  entryIsEstimate,
  tradeState,
  marketHref,
  onMarketClick,
  agent,
  ownerHandle,
}: {
  marketTitle: string;
  eventSlug?: string;
  yesOutcome: string;
  noOutcome: string;
  yesPrice: number;
  noPrice: number;
  yesTeam?: TeamMeta;
  noTeam?: TeamMeta;
  gameStartTime?: string;
  yesTokenId?: string;
  noTokenId?: string;
  liveScore: LiveScore | null;
  pickedOutcome: string;
  userName?: string;
  side: 'BUY' | 'SELL';
  cost: number;
  entryPrice: number;
  positionShares?: number;
  entryIsEstimate?: boolean;
  tradeState: TradeStateMeta;
  marketHref?: string;
  onMarketClick?: (
    event: React.MouseEvent<HTMLAnchorElement>,
    initialOutcome?: 'yes' | 'no',
  ) => void;
  agent?: AgentBadgeAgent | null;
  ownerHandle?: string | null;
}) {
  const { yesHistory, noHistory, loading } = usePriceHistory(
    yesTokenId,
    noTokenId,
    true,
  );

  // Chart geometry - tuned for the compact card in the feed.
  const VB_W = 300;
  const VB_H = 72;
  const PLOT_X = 2;
  const PLOT_Y = 8;
  const PLOT_W = VB_W - PLOT_X * 2;
  const PLOT_H = 48;
  const BASELINE_Y = PLOT_Y + PLOT_H + 6;

  const seed = (yesTokenId || yesOutcome) + 'feedseed';

  const { yesSeries, noSeries, tMin, tMax } = useMemo(() => {
    const hasHistory =
      yesHistory.length >= 2 && noHistory.length >= 2;

    if (hasHistory) {
      const allTs = [
        ...yesHistory.map((p) => p.t),
        ...noHistory.map((p) => p.t),
      ];
      const min = Math.min(...allTs);
      const max = Math.max(...allTs);
      return {
        yesSeries: yesHistory,
        noSeries: noHistory,
        tMin: min,
        tMax: max,
      };
    }

    // Fallback: synthesised sparklines so the panel still looks populated
    const now = Math.floor(Date.now() / 1000);
    const start = now - 24 * 60 * 60;
    const N = 20;
    const synth = (endP: number, s: string): HistoryPoint[] => {
      const startP = 0.47 + seededRand(s, 999) * 0.06;
      return Array.from({ length: N }, (_, i) => {
        const ratio = i / (N - 1);
        const base = startP + (endP - startP) * ratio;
        const noise =
          (seededRand(s, i) - 0.5) * 0.08 * (1 - ratio * 0.6) * 2;
        const p = Math.max(0.02, Math.min(0.98, base + noise));
        return { t: start + Math.round((now - start) * ratio), p };
      });
    };
    const ys = synth(yP, seed + 'y');
    const ns = synth(nP, seed + 'n');
    return {
      yesSeries: ys,
      noSeries: ns,
      tMin: start,
      tMax: now,
    };
  }, [yesHistory, noHistory, yP, nP, seed]);

  const pickedIsYes =
    pickedOutcome.toLowerCase() === yesOutcome.toLowerCase();
  const pickedSeries = pickedIsYes ? yesSeries : noSeries;
  const chartPath = historyToPath(
    pickedSeries,
    tMin,
    tMax,
    PLOT_X,
    PLOT_Y,
    PLOT_W,
    PLOT_H,
  );
  const latestPoint = pickedSeries[pickedSeries.length - 1];
  const latestPointX = latestPoint
    ? PLOT_X +
      ((latestPoint.t - tMin) / Math.max(1, tMax - tMin)) * PLOT_W
    : PLOT_X + PLOT_W;
  const latestPointY = latestPoint
    ? PLOT_Y + (1 - latestPoint.p) * PLOT_H
    : PLOT_Y + PLOT_H / 2;
  const chartAreaPath = chartPath
    ? `${chartPath} L ${latestPointX.toFixed(2)} ${BASELINE_Y} L ${PLOT_X} ${BASELINE_Y} Z`
    : '';

  const showScores = Boolean(
    liveScore &&
      (liveScore.live || liveScore.ended || liveScore.closed) &&
      liveScore.teams.length >= 2,
  );
  const matchScore = (
    teamName: string,
    teamAbbr: string,
    fallbackIdx: number,
  ): number | null => {
    if (!showScores || !liveScore) return null;
    const lower = teamName.toLowerCase();
    const abbr = teamAbbr.toLowerCase();
    const found = liveScore.teams.find((t) => {
      const n = (t.name ?? '').toLowerCase();
      const a = (t.abbreviation ?? '').toLowerCase();
      return (
        (n && (n.includes(lower) || lower.includes(n))) ||
        (a && a === abbr)
      );
    });
    return (found ?? liveScore.teams[fallbackIdx])?.score ?? null;
  };

  const yesAbbr = (
    yesTeam?.abbreviation || yesOutcome.slice(0, 3)
  ).toUpperCase();
  const noAbbr = (
    noTeam?.abbreviation || noOutcome.slice(0, 3)
  ).toUpperCase();
  const yesScore = matchScore(yesOutcome, yesAbbr, 0);
  const noScore = matchScore(noOutcome, noAbbr, 1);
  const hasScores = yesScore != null && noScore != null;
  const gameClockLabel = formatSportsGameClockLabel({
    hasScores,
    yesScore,
    noScore,
    liveScore,
    gameStartTime,
  });
  const displayPickedOutcome = formatSpreadOutcomeLabel({
    marketTitle,
    pickedOutcome,
    yesOutcome,
    noOutcome,
  });
  const displayYesOutcome = formatSpreadOutcomeLabel({
    marketTitle,
    pickedOutcome: yesOutcome,
    yesOutcome,
    noOutcome,
  });
  const displayNoOutcome = formatSpreadOutcomeLabel({
    marketTitle,
    pickedOutcome: noOutcome,
    yesOutcome,
    noOutcome,
  });
  const pickedCurrentPrice =
    pickedIsYes ? yP : nP;
  const impliedShares =
    positionShares !== undefined && Number.isFinite(positionShares)
      ? positionShares
      : !entryIsEstimate && entryPrice > 0
        ? cost / entryPrice
        : undefined;
  const currentValue =
    !entryIsEstimate && impliedShares !== undefined
      ? impliedShares * pickedCurrentPrice
      : undefined;
  const currentDelta =
    currentValue !== undefined && Number.isFinite(currentValue)
      ? currentValue - cost
      : undefined;
  const open =
    tradeState.state === 'open' || tradeState.state === 'live';
  const selectedPnl = resolvePredictionDisplayPnl({
    entryIsEstimate,
    isOpen: open,
    tradeState,
    liveDelta: currentDelta,
  });
  const summaryValue = resolvePredictionSummaryValue({
    entryIsEstimate,
    isOpen: open,
    cost,
    currentValue,
    selectedPnl,
  });
  const filterId = `feed-shadow-${String(yesTokenId || yesOutcome)
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48)}`;
  const gradientId = `${filterId}-trend`;
  const split = splitProbabilities(yP, nP);
  const pill = statusPill(tradeState, liveScore, gameStartTime);
  const chartColor =
    tradeState.tone === 'red'
      ? '#E85D5D'
      : tradeState.tone === 'green'
        ? '#51AD7D'
        : pickedIsYes
          ? '#20242D'
          : '#2F7ED8';
  const pnlTone =
    selectedPnl === undefined
      ? 'text-gray-400'
      : selectedPnl >= 0
        ? 'text-[#51AD7D]'
        : 'text-[#E85D5D]';
  const positionVerb =
    entryIsEstimate
      ? 'Quote shown for'
      : side === 'SELL'
      ? 'You sold'
      : open
        ? "You're on"
        : 'You backed';
  const isWonResult = !open && tradeState.state === 'won';
  const payoutDisplayValue =
    !entryIsEstimate && isWonResult && summaryValue !== undefined
      ? summaryValue
      : undefined;
  const resultDisplay = entryIsEstimate
    ? '—'
    : formatSignedUsd(selectedPnl);
  const resultSubcopy =
    payoutDisplayValue !== undefined
      ? `${formatUsd(payoutDisplayValue)} payout`
      : undefined;
  const positionKicker = entryIsEstimate
    ? 'QUOTE'
    : open
    ? selectedPnl === undefined
      ? 'LIVE'
      : selectedPnl >= 0
        ? 'UP'
        : 'DOWN'
    : isWonResult || tradeState.state === 'lost'
      ? 'RESULT'
      : tradeState.label.toUpperCase();
  const entryPriceLabel = `${Math.round(clampProbability(entryPrice) * 100)}¢`;

  const buttonForOutcome = (
    label: string,
    price: number,
    selected: boolean,
    initialOutcome: 'yes' | 'no',
  ) => {
    const odds = toAmericanOdds(price);
    const classes = `flex h-11 min-w-0 items-center justify-between gap-3 rounded-xl border px-3 text-[13px] font-extrabold transition-colors ${
      selected
        ? 'border-[#2F7ED8] bg-[#2F7ED8] text-white shadow-[0_8px_18px_rgba(47,126,216,0.24)]'
        : 'border-gray-100 bg-white text-gray-900 hover:border-gray-200 hover:bg-gray-50'
    }`;

    if (marketHref) {
      return (
        <a
          href={marketHref}
          onClick={(event) => onMarketClick?.(event, initialOutcome)}
          className={classes}
          title={`Open ${label} market`}
        >
          <span className="truncate">{label}</span>
          <span
            className={`shrink-0 font-mono text-[12px] ${
              selected ? 'text-white' : 'text-[#2F7ED8]'
            }`}
          >
            {odds}
          </span>
        </a>
      );
    }

    return (
      <button
        type="button"
        disabled
        className={`${classes} opacity-60`}
      >
        <span className="truncate">{label}</span>
        <span className="shrink-0 font-mono text-[12px]">{odds}</span>
      </button>
    );
  };

  return (
    <div className="mt-2 w-full max-w-[430px] overflow-hidden rounded-[24px] border border-[#ECECEB] bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.10)]">
      {/* Agent badge — only for trades auto-posted by a user's agent */}
      {agent?.isAgentTrade && (
        <div className="mb-3 flex justify-end">
          <AgentBadge agent={agent} ownerHandle={ownerHandle} />
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[13px] font-black text-gray-950">
            {inferLeagueLabel(marketTitle, eventSlug)}
          </span>
          <span className="h-1 w-1 shrink-0 rounded-full bg-gray-300" />
          <span className="truncate font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            {inferMarketKind(marketTitle)}
          </span>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] ${pill.className}`}
        >
          {pill.dotClassName && (
            <span
              className={`h-1.5 w-1.5 rounded-full ${pill.dotClassName} animate-pulse`}
            />
          )}
          {pill.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <TeamMark team={yesTeam} abbr={yesAbbr} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-extrabold text-gray-950">
              {yesOutcome}
            </p>
            {hasScores && (
              <p className="font-mono text-[28px] font-black leading-none text-gray-950">
                {yesScore}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 min-w-[76px] text-center">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
            {gameClockLabel}
          </p>
        </div>

        <div className="flex min-w-0 items-start justify-end gap-2 text-right">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-extrabold text-gray-950">
              {noOutcome}
            </p>
            {hasScores && (
              <p className="font-mono text-[28px] font-black leading-none text-gray-400">
                {noScore}
              </p>
            )}
          </div>
          <TeamMark team={noTeam} abbr={noAbbr} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-[3px] bg-[#20242D]" />
          <span className="truncate text-[12px] font-extrabold text-gray-900">
            {yesOutcome}
          </span>
        </div>
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
          {open ? 'WIN PROB' : 'FINAL'}
        </p>
        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <span className="truncate text-right text-[12px] font-extrabold text-gray-900">
            {noOutcome}
          </span>
          <span className="h-2 w-2 shrink-0 rounded-[3px] bg-[#2F7ED8]" />
        </div>
      </div>

      <div className="relative mt-2 h-[74px] overflow-hidden rounded-[20px] bg-[#20242D] shadow-inner">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-b from-[#3A404B] to-[#1E222B]"
          style={{ width: `${split.yes}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-gradient-to-b from-[#5BA2F1] to-[#2F7ED8]"
          style={{ width: `${split.no}%` }}
        />
        <div className="absolute inset-y-0 left-0 flex items-center px-4 text-white">
          <div>
            <p className="font-mono text-[10px] font-black uppercase text-white/70">
              {yesAbbr}
            </p>
            <p className="font-mono text-[26px] font-black leading-none">
              {formatPercent(yP)}
            </p>
          </div>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center px-4 text-right text-white">
          <div>
            <p className="font-mono text-[10px] font-black uppercase text-white/70">
              {noAbbr}
            </p>
            <p className="font-mono text-[26px] font-black leading-none">
              {formatPercent(nP)}
            </p>
          </div>
        </div>
        {split.yes > 6 && split.yes < 94 && (
          <div
            className="absolute top-0 h-full w-px bg-white/40"
            style={{ left: `${split.yes}%` }}
          >
            <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_8px_18px_rgba(15,23,42,0.20)]">
              <span className="mr-0.5 h-3 w-[2px] rounded-full bg-gray-300" />
              <span className="h-3 w-[2px] rounded-full bg-gray-300" />
            </span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            Win Prob · Timeline
          </p>
          <p className="truncate text-right font-mono text-[10px] font-black text-gray-400">
            {entryIsEstimate ? 'quoted' : 'backing'} {displayPickedOutcome}
          </p>
        </div>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="mt-1 block h-[72px] w-full"
          role="img"
          aria-label={`${displayPickedOutcome} probability timeline`}
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={chartColor}
                stopOpacity="0.20"
              />
              <stop
                offset="100%"
                stopColor={chartColor}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <line
            x1={PLOT_X}
            x2={PLOT_X + PLOT_W}
            y1={PLOT_Y + PLOT_H / 2}
            y2={PLOT_Y + PLOT_H / 2}
            stroke="#E5E7EB"
            strokeDasharray="3 5"
            strokeWidth={1}
          />
          {chartAreaPath && (
            <path d={chartAreaPath} fill={`url(#${gradientId})`} />
          )}
          {chartPath && (
            <path
              d={chartPath}
              fill="none"
              stroke={chartColor}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              opacity={loading ? 0.55 : 1}
            />
          )}
          <circle
            cx={latestPointX}
            cy={latestPointY}
            r={4.5}
            fill="white"
            stroke={chartColor}
            strokeWidth={2.5}
          />
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-black text-[#2F7ED8]">
            {initials(userName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-extrabold text-gray-950">
              {positionVerb}{' '}
              <span className="text-[#2F7ED8]">{displayPickedOutcome}</span>
            </p>
            <p className="mt-0.5 truncate font-mono text-[11px] font-bold text-gray-400">
              {formatEntrySummary({
                cost,
                shares: impliedShares,
                entryPriceLabel,
                entryIsEstimate,
              })}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
            {positionKicker}
          </p>
          <p className={`font-mono text-[22px] font-black ${pnlTone}`}>
            {resultDisplay}
          </p>
          {resultSubcopy && (
            <p className="mt-0.5 font-mono text-[10px] font-black text-gray-400">
              {resultSubcopy}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {open ? (
          <>
            {buttonForOutcome(displayYesOutcome, yP, pickedIsYes, 'yes')}
            {buttonForOutcome(displayNoOutcome, nP, !pickedIsYes, 'no')}
          </>
        ) : (
          <>
            {marketHref ? (
              <a
                href={marketHref}
                onClick={(event) => onMarketClick?.(event)}
                className="flex h-11 items-center justify-center rounded-xl border border-gray-100 bg-white px-3 text-[13px] font-extrabold text-gray-900 transition-colors hover:border-gray-200 hover:bg-gray-50"
              >
                Market →
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex h-11 items-center justify-center rounded-xl border border-gray-100 bg-white px-3 text-[13px] font-extrabold text-gray-400"
              >
                Market →
              </button>
            )}
            <a
              href="/prediction"
              onClick={(e) => e.stopPropagation()}
              className="flex h-11 items-center justify-center rounded-xl bg-gray-950 px-3 text-[13px] font-extrabold text-white transition-colors hover:bg-black"
            >
              View Predictions
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function PredictionPositionPanel({
  marketTitle,
  outcome,
  yesOutcome,
  noOutcome,
  side,
  cost,
  entryPrice,
  positionShares,
  entryIsEstimate,
  currentPrice,
  yesPrice,
  noPrice,
  tradeState,
  marketHref,
  onMarketClick,
  userName,
  agent,
  ownerHandle,
}: {
  marketTitle: string;
  outcome: string;
  yesOutcome?: string;
  noOutcome?: string;
  side: 'BUY' | 'SELL';
  cost: number;
  entryPrice: number;
  positionShares?: number;
  entryIsEstimate?: boolean;
  currentPrice: number;
  yesPrice?: number;
  noPrice?: number;
  tradeState: TradeStateMeta;
  marketHref?: string;
  onMarketClick?: (
    event: React.MouseEvent<HTMLAnchorElement>,
    initialOutcome?: 'yes' | 'no',
  ) => void;
  userName?: string;
  agent?: AgentBadgeAgent | null;
  ownerHandle?: string | null;
}) {
  const shares =
    positionShares !== undefined && Number.isFinite(positionShares)
      ? positionShares
      : !entryIsEstimate && entryPrice > 0
        ? cost / entryPrice
        : undefined;
  const currentValue =
    !entryIsEstimate && shares !== undefined
      ? shares * currentPrice
      : undefined;
  const delta =
    currentValue !== undefined && Number.isFinite(currentValue)
      ? currentValue - cost
      : undefined;
  const deltaPct =
    delta !== undefined && cost > 0
      ? (delta / cost) * 100
      : undefined;
  const open =
    tradeState.state === 'open' || tradeState.state === 'live';
  const selectedPnl = resolvePredictionDisplayPnl({
    entryIsEstimate,
    isOpen: open,
    tradeState,
    liveDelta: delta,
  });
  const summaryValue = resolvePredictionSummaryValue({
    entryIsEstimate,
    isOpen: open,
    cost,
    currentValue,
    selectedPnl,
  });
  const status = predictionStatusPill(tradeState);
  const yesLabel = yesOutcome || 'Yes';
  const noLabel = noOutcome || 'No';
  const normalizedOutcome = outcome.toLowerCase();
  const pickedIsYes =
    normalizedOutcome === yesLabel.toLowerCase() ||
    normalizedOutcome === 'yes';
  const resolvedYesPrice = clampProbability(
    yesPrice ?? (pickedIsYes ? currentPrice : 1 - currentPrice),
  );
  const resolvedNoPrice = clampProbability(
    noPrice ?? (pickedIsYes ? 1 - currentPrice : currentPrice),
  );
  const split = splitProbabilities(resolvedYesPrice, resolvedNoPrice);
  const chartColor =
    tradeState.tone === 'red'
      ? '#E85D5D'
      : tradeState.tone === 'green'
        ? '#51AD7D'
        : pickedIsYes
          ? '#20242D'
          : '#2F7ED8';
  const pnlTone =
    selectedPnl === undefined
      ? 'text-gray-400'
      : selectedPnl >= 0
        ? 'text-[#07976B]'
        : 'text-[#E85D5D]';
  const positionVerb =
    entryIsEstimate
      ? 'Quote shown for'
      : side === 'SELL'
      ? 'You sold'
      : open
        ? "You're on"
        : 'You backed';
  const isWonResult = !open && tradeState.state === 'won';
  const payoutDisplayValue =
    !entryIsEstimate && isWonResult && summaryValue !== undefined
      ? summaryValue
      : undefined;
  const resultDisplay = entryIsEstimate
    ? '—'
    : formatSignedUsd(selectedPnl);
  const resultSubcopy =
    payoutDisplayValue !== undefined
      ? `${formatUsd(payoutDisplayValue)} payout`
      : undefined;
  const positionKicker = entryIsEstimate
    ? 'QUOTE'
    : open
    ? selectedPnl === undefined
      ? 'OPEN'
      : selectedPnl >= 0
        ? 'UP'
        : 'DOWN'
    : isWonResult || tradeState.state === 'lost'
      ? 'RESULT'
      : tradeState.label.toUpperCase();
  const deltaSummary =
    delta !== undefined && deltaPct !== undefined
      ? `${formatSignedUsd(delta)} (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%)`
      : undefined;

  const VB_W = 300;
  const VB_H = 72;
  const PLOT_X = 2;
  const PLOT_Y = 8;
  const PLOT_W = VB_W - PLOT_X * 2;
  const PLOT_H = 48;
  const BASELINE_Y = PLOT_Y + PLOT_H + 6;
  const chartSeries = useMemo<HistoryPoint[]>(() => {
    const startP = clampProbability(entryPrice || currentPrice);
    const endP = clampProbability(currentPrice || entryPrice);
    const now = Math.floor(Date.now() / 1000);
    const start = now - 24 * 60 * 60;
    const count = 20;
    const seed = `${marketTitle}-${outcome}`;

    return Array.from({ length: count }, (_, index) => {
      const ratio = index / Math.max(1, count - 1);
      const base = startP + (endP - startP) * ratio;
      const wave = Math.sin(index * 1.15) * 0.018;
      const noise = (seededRand(seed, index) - 0.5) * 0.055;
      const p = clampProbability(base + wave + noise * (1 - ratio * 0.45));
      return {
        t: start + Math.round((now - start) * ratio),
        p,
      };
    });
  }, [currentPrice, entryPrice, marketTitle, outcome]);
  const tMin = chartSeries[0]?.t ?? 0;
  const tMax = chartSeries[chartSeries.length - 1]?.t ?? 1;
  const chartPath = historyToPath(
    chartSeries,
    tMin,
    tMax,
    PLOT_X,
    PLOT_Y,
    PLOT_W,
    PLOT_H,
  );
  const latestPoint = chartSeries[chartSeries.length - 1];
  const latestPointX = latestPoint
    ? PLOT_X +
      ((latestPoint.t - tMin) / Math.max(1, tMax - tMin)) * PLOT_W
    : PLOT_X + PLOT_W;
  const latestPointY = latestPoint
    ? PLOT_Y + (1 - latestPoint.p) * PLOT_H
    : PLOT_Y + PLOT_H / 2;
  const chartAreaPath = chartPath
    ? `${chartPath} L ${latestPointX.toFixed(2)} ${BASELINE_Y} L ${PLOT_X} ${BASELINE_Y} Z`
    : '';
  const gradientId = `prediction-trend-${String(marketTitle + outcome)
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48)}`;
  const marketKind =
    yesLabel.toLowerCase() === 'yes' && noLabel.toLowerCase() === 'no'
      ? 'BINARY'
      : 'MARKET';
  const formatPredictionPrice = (price: number) =>
    `${Math.round(clampProbability(price) * 100)}¢`;
  const entryPriceLabel = formatPredictionPrice(entryPrice);
  const buttonForOutcome = (
    label: string,
    price: number,
    selected: boolean,
    initialOutcome: 'yes' | 'no',
  ) => {
    const classes = `flex h-11 min-w-0 items-center justify-between gap-3 rounded-xl border px-3 text-[13px] font-extrabold transition-colors ${
      selected
        ? 'border-[#2F7ED8] bg-[#2F7ED8] text-white shadow-[0_8px_18px_rgba(47,126,216,0.24)]'
        : 'border-gray-100 bg-white text-gray-900 hover:border-gray-200 hover:bg-gray-50'
    }`;

    if (marketHref) {
      return (
        <a
          href={marketHref}
          onClick={(event) => onMarketClick?.(event, initialOutcome)}
          className={classes}
          title={`Open ${label} market`}
        >
          <span className="truncate">{label}</span>
          <span
            className={`shrink-0 font-mono text-[12px] ${
              selected ? 'text-white' : 'text-[#2F7ED8]'
            }`}
          >
            {formatPredictionPrice(price)}
          </span>
        </a>
      );
    }

    return (
      <button
        type="button"
        disabled
        className={`${classes} opacity-60`}
      >
        <span className="truncate">{label}</span>
        <span className="shrink-0 font-mono text-[12px]">
          {formatPredictionPrice(price)}
        </span>
      </button>
    );
  };

  return (
    <div className="mt-2 w-full max-w-[430px] overflow-hidden rounded-[24px] border border-[#ECECEB] bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.10)]">
      {/* Agent badge — only for trades auto-posted by a user's agent */}
      {agent?.isAgentTrade && (
        <div className="mb-3 flex justify-end">
          <AgentBadge agent={agent} ownerHandle={ownerHandle} />
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[13px] font-black text-gray-950">
            PREDICTION
          </span>
          <span className="h-1 w-1 shrink-0 rounded-full bg-gray-300" />
          <span className="truncate font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            {marketKind}
          </span>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[12px] font-extrabold ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <p className="mt-4 line-clamp-2 text-[17px] font-black leading-snug text-gray-950">
        {marketTitle}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-black text-[#2F7ED8]">
            {initials(userName)}
          </span>
          <p className="min-w-0 truncate text-[14px] font-extrabold text-gray-950">
            {(userName || 'Someone').split(' ')[0]}{' '}
            {side === 'BUY' ? 'picked' : 'sold'}{' '}
            <span className="text-[#2F7ED8]">{outcome}</span>
          </p>
        </div>
        {deltaSummary && (
          <span className={`shrink-0 font-mono text-[11px] font-black ${pnlTone}`}>
            {deltaSummary}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-[3px] bg-[#20242D]" />
          <span className="truncate text-[12px] font-extrabold text-gray-900">
            {yesLabel}
          </span>
        </div>
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
          {open ? 'CHANCE' : 'FINAL'}
        </p>
        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <span className="truncate text-right text-[12px] font-extrabold text-gray-900">
            {noLabel}
          </span>
          <span className="h-2 w-2 shrink-0 rounded-[3px] bg-[#2F7ED8]" />
        </div>
      </div>

      <div className="relative mt-2 h-[74px] overflow-hidden rounded-[20px] bg-[#20242D] shadow-inner">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-b from-[#3A404B] to-[#1E222B]"
          style={{ width: `${split.yes}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-gradient-to-b from-[#5BA2F1] to-[#2F7ED8]"
          style={{ width: `${split.no}%` }}
        />
        <div className="absolute inset-y-0 left-0 flex items-center px-4 text-white">
          <div>
            <p className="font-mono text-[10px] font-black uppercase text-white/70">
              {yesLabel}
            </p>
            <p className="font-mono text-[26px] font-black leading-none">
              {formatPercent(resolvedYesPrice)}
            </p>
          </div>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center px-4 text-right text-white">
          <div>
            <p className="font-mono text-[10px] font-black uppercase text-white/70">
              {noLabel}
            </p>
            <p className="font-mono text-[26px] font-black leading-none">
              {formatPercent(resolvedNoPrice)}
            </p>
          </div>
        </div>
        {split.yes > 6 && split.yes < 94 && (
          <div
            className="absolute top-0 h-full w-px bg-white/40"
            style={{ left: `${split.yes}%` }}
          >
            <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_8px_18px_rgba(15,23,42,0.20)]">
              <span className="mr-0.5 h-3 w-[2px] rounded-full bg-gray-300" />
              <span className="h-3 w-[2px] rounded-full bg-gray-300" />
            </span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            Price · Timeline
          </p>
          <p className="truncate text-right font-mono text-[10px] font-black text-gray-400">
            {entryIsEstimate ? 'quoted' : 'backing'} {outcome}
          </p>
        </div>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="mt-1 block h-[72px] w-full"
          role="img"
          aria-label={`${outcome} probability timeline`}
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={chartColor}
                stopOpacity="0.20"
              />
              <stop
                offset="100%"
                stopColor={chartColor}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <line
            x1={PLOT_X}
            x2={PLOT_X + PLOT_W}
            y1={PLOT_Y + PLOT_H / 2}
            y2={PLOT_Y + PLOT_H / 2}
            stroke="#E5E7EB"
            strokeDasharray="3 5"
            strokeWidth={1}
          />
          {chartAreaPath && (
            <path d={chartAreaPath} fill={`url(#${gradientId})`} />
          )}
          {chartPath && (
            <path
              d={chartPath}
              fill="none"
              stroke={chartColor}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
            />
          )}
          <circle
            cx={latestPointX}
            cy={latestPointY}
            r={4.5}
            fill="white"
            stroke={chartColor}
            strokeWidth={2.5}
          />
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-extrabold text-gray-950">
            {positionVerb}{' '}
            <span className="text-[#2F7ED8]">{outcome}</span>
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] font-bold text-gray-400">
            {formatEntrySummary({
              cost,
              shares,
              entryPriceLabel,
              entryIsEstimate,
            })}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
            {positionKicker}
          </p>
          <p className={`font-mono text-[22px] font-black ${pnlTone}`}>
            {resultDisplay}
          </p>
          {resultSubcopy && (
            <p className="mt-0.5 font-mono text-[10px] font-black text-gray-400">
              {resultSubcopy}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {open ? (
          <>
            {buttonForOutcome(yesLabel, resolvedYesPrice, pickedIsYes, 'yes')}
            {buttonForOutcome(noLabel, resolvedNoPrice, !pickedIsYes, 'no')}
          </>
        ) : (
          <>
            {marketHref ? (
              <a
                href={marketHref}
                onClick={(event) => onMarketClick?.(event)}
                className="flex h-11 items-center justify-center rounded-xl border border-gray-100 bg-white px-3 text-[13px] font-extrabold text-gray-900 transition-colors hover:border-gray-200 hover:bg-gray-50"
              >
                Market →
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex h-11 items-center justify-center rounded-xl border border-gray-100 bg-white px-3 text-[13px] font-extrabold text-gray-400"
              >
                Market →
              </button>
            )}
            <a
              href="/prediction"
              onClick={(e) => e.stopPropagation()}
              className="flex h-11 items-center justify-center rounded-xl bg-gray-950 px-3 text-[13px] font-extrabold text-white transition-colors hover:bg-black"
            >
              View Predictions
            </a>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

function RegularPredictionFeedCard({
  content,
  userName,
  feedPostId,
  feedUserId,
  accessToken,
  onVerifiedFinalScore,
  agent,
  ownerHandle,
}: PredictionFeedCardProps) {
  const {
    outcome,
    side,
    price,
    eventSlug,
    yesOutcome,
    noOutcome,
    yesPrice,
    noPrice,
    yesTeam,
    noTeam,
    gameStartTime,
    yesTokenId,
    noTokenId,
  } = content;
  const executedPosition = resolveExecutedPredictionPosition(content);
  const entryPrice = executedPosition.entryPrice || price;
  const displayCost = executedPosition.cost;
  const displayContent: PredictionContent = {
    ...content,
    cost: displayCost,
    price: entryPrice,
    potentialWin: executedPosition.shares ?? content.potentialWin,
  };
  const entryIsEstimate = isPredictionEntryEstimate(
    content,
    executedPosition,
  );

  const liveEventSlug = useMemo(
    () => resolvePredictionLiveEventSlug(content),
    [content],
  );
  const fetchedLiveScore = useLiveScore(liveEventSlug);
  const embeddedLiveScore = useMemo(
    () => embeddedPredictionLiveScore(content),
    [content],
  );
  const liveScore = useMemo(
    () => mergePredictionLiveScores(fetchedLiveScore, embeddedLiveScore),
    [embeddedLiveScore, fetchedLiveScore],
  );
  useVerifiedFinalScorePersistence({
    content,
    liveScore,
    eventSlug: liveEventSlug,
    feedPostId,
    feedUserId,
    accessToken,
    onVerifiedFinalScore,
  });

  // Show sports panel when at least yesOutcome + noOutcome + some sports signal present
  const isYesNoBinary =
    yesOutcome?.toLowerCase() === 'yes' &&
    noOutcome?.toLowerCase() === 'no';
  const isSports = Boolean(
    yesOutcome &&
    noOutcome &&
    !isYesNoBinary &&
    (yesTeam || noTeam || liveScore?.teams?.length),
  );

  const marketState = resolveMarketState(content, liveScore);
  const livePrices = useLivePredictionPrices(
    yesTokenId,
    noTokenId,
    !marketState.closed,
  );
  const pickedIsYes =
    outcome.toLowerCase() === yesOutcome?.toLowerCase() ||
    outcome.toLowerCase() === 'yes';
  const livePickedPrice = pickedIsYes
    ? livePrices.yesPrice
    : livePrices.noPrice;
  const resolvedMarketState: ResolvedMarketState = {
    ...marketState,
    yesPrice: livePrices.yesPrice ?? marketState.yesPrice,
    noPrice: livePrices.noPrice ?? marketState.noPrice,
    pickedPrice: livePickedPrice ?? marketState.pickedPrice,
  };
  const resolvedYesPrice =
    resolvedMarketState.yesPrice ?? yesPrice ?? entryPrice;
  const resolvedNoPrice =
    resolvedMarketState.noPrice ?? noPrice ?? 1 - entryPrice;
  const tradeState = resolveTradeState(
    displayContent,
    liveScore?.live === true,
    resolvedMarketState,
  );
  const currentPrice = firstNumber(
    resolvedMarketState.pickedPrice,
    content.currentPrice,
  );
  const currentDisplayPrice =
    currentPrice !== undefined &&
    currentPrice >= 0 &&
    currentPrice <= 1
      ? currentPrice
      : entryPrice;
  const { marketHref, onMarketClick } = usePredictionMarketNavigation(
    displayContent,
    {
      marketTitle: content.marketTitle,
      yesOutcome,
      noOutcome,
      yesTokenId,
      noTokenId,
      yesPrice: resolvedYesPrice,
      noPrice: resolvedNoPrice,
      closed: resolvedMarketState.closed,
    },
  );

  return (
    <div className="mt-2">
      {/* ── Sports panel: team badges + probability chart ───────────────────── */}
      {isSports && (
        <SportsMiniPanel
          marketTitle={content.marketTitle}
          eventSlug={liveEventSlug ?? eventSlug}
          yesOutcome={yesOutcome!}
          noOutcome={noOutcome!}
          yesPrice={resolvedYesPrice}
          noPrice={resolvedNoPrice}
          yesTeam={yesTeam}
          noTeam={noTeam}
          gameStartTime={gameStartTime}
          yesTokenId={yesTokenId}
          noTokenId={noTokenId}
          liveScore={liveScore}
          pickedOutcome={outcome}
          userName={userName}
          side={side}
          cost={displayCost}
          entryPrice={entryPrice}
          positionShares={executedPosition.shares}
          entryIsEstimate={entryIsEstimate}
          tradeState={tradeState}
          marketHref={marketHref}
          onMarketClick={onMarketClick}
          agent={agent}
          ownerHandle={ownerHandle}
        />
      )}

      {!isSports && (
        <PredictionPositionPanel
          marketTitle={content.marketTitle}
          outcome={outcome}
          yesOutcome={yesOutcome}
          noOutcome={noOutcome}
          side={side}
          cost={displayCost}
          entryPrice={entryPrice}
          positionShares={executedPosition.shares}
          entryIsEstimate={entryIsEstimate}
          currentPrice={currentDisplayPrice}
          yesPrice={resolvedYesPrice}
          noPrice={resolvedNoPrice}
          tradeState={tradeState}
          marketHref={marketHref}
          onMarketClick={onMarketClick}
          userName={userName}
          agent={agent}
          ownerHandle={ownerHandle}
        />
      )}

      {/* ── Live scoreboard (fallback for older posts without sports panel data) */}
      {!isSports &&
        liveScore?.live &&
        liveScore.teams.length >= 2 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-gray-900 uppercase tracking-wide">
                {liveScore.teams[0]?.abbreviation ||
                  (liveScore.teams[0]?.name ?? '')
                    .slice(0, 3)
                    .toUpperCase()}
              </span>
              <span className="font-bold text-2xl tabular-nums text-gray-900">
                {liveScore.teams[0]?.score ?? '—'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live
              </span>
              {(liveScore.elapsed || liveScore.period) && (
                <p className="text-[10px] text-gray-500 tabular-nums text-center leading-none">
                  {[liveScore.elapsed, liveScore.period]
                    .filter(Boolean)
                    .join(' ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-2xl tabular-nums text-gray-900">
                {liveScore.teams[1]?.score ?? '—'}
              </span>
              <span className="font-bold text-sm text-gray-900 uppercase tracking-wide">
                {liveScore.teams[1]?.abbreviation ||
                  (liveScore.teams[1]?.name ?? '')
                    .slice(0, 3)
                    .toUpperCase()}
              </span>
            </div>
          </div>
        )}
    </div>
  );
}

function normalizeBtcOutcome(outcome: string | undefined): 'Up' | 'Down' {
  return String(outcome || '').toLowerCase().includes('up')
    ? 'Up'
    : 'Down';
}

function btcEntryPrices(content: PredictionContent) {
  const outcome = normalizeBtcOutcome(content.outcome);
  const entry = clampProbability(finiteNumber(content.price) ?? 0.5);
  return {
    yesPrice: clampProbability(
      finiteNumber(content.yesPrice) ?? (outcome === 'Up' ? entry : 1 - entry),
    ),
    noPrice: clampProbability(
      finiteNumber(content.noPrice) ?? (outcome === 'Down' ? entry : 1 - entry),
    ),
  };
}

function LiveBtcFiveMinutePredictionFeedCard({
  content,
  userName,
  agent,
  ownerHandle,
}: PredictionFeedCardProps) {
  const { upProbability } = useBtcUpDownMarket();
  const outcome = normalizeBtcOutcome(content.outcome);
  const executedPosition = resolveExecutedPredictionPosition(content);
  const entryIsEstimate = isPredictionEntryEstimate(
    content,
    executedPosition,
  );
  const yesPrice = clampProbability(upProbability / 100);
  const noPrice = clampProbability(1 - yesPrice);
  const currentPrice = outcome === 'Up' ? yesPrice : noPrice;
  const marketState: ResolvedMarketState = {
    closed: false,
    yesPrice,
    noPrice,
    pickedPrice: currentPrice,
  };
  const liveContent: PredictionContent = {
    ...content,
    marketTitle: content.marketTitle || 'BTC 5-Minute Up or Down',
    outcome,
    cost: executedPosition.cost,
    price: executedPosition.entryPrice || content.price,
    potentialWin: executedPosition.shares ?? content.potentialWin,
    yesOutcome: 'Up',
    noOutcome: 'Down',
    yesPrice,
    noPrice,
    currentPrice,
  };
  const tradeState = resolveTradeState(liveContent, false, marketState);
  const { marketHref, onMarketClick } = usePredictionMarketNavigation(
    liveContent,
    {
      marketTitle: liveContent.marketTitle,
      yesOutcome: 'Up',
      noOutcome: 'Down',
      yesTokenId: liveContent.yesTokenId,
      noTokenId: liveContent.noTokenId,
      yesPrice,
      noPrice,
      closed: false,
    },
  );

  return (
    <div className="mt-2">
      <PredictionPositionPanel
        marketTitle={liveContent.marketTitle}
        outcome={outcome}
        yesOutcome="Up"
        noOutcome="Down"
        side={content.side}
        cost={executedPosition.cost}
        entryPrice={executedPosition.entryPrice || content.price}
        positionShares={executedPosition.shares}
        entryIsEstimate={entryIsEstimate}
        currentPrice={currentPrice}
        yesPrice={yesPrice}
        noPrice={noPrice}
        tradeState={tradeState}
        marketHref={marketHref}
        onMarketClick={onMarketClick}
        userName={userName}
        agent={agent}
        ownerHandle={ownerHandle}
      />
    </div>
  );
}

function HistoricalBtcFiveMinutePredictionFeedCard({
  content,
  userName,
  createdAt,
  agent,
  ownerHandle,
}: PredictionFeedCardProps) {
  const windowStart = resolveBtcWindowStart(content, createdAt);
  const { market } = useHistoricalBtcFeedMarket(windowStart, true);
  const outcome = normalizeBtcOutcome(content.outcome);
  const executedPosition = resolveExecutedPredictionPosition(content);
  const entryIsEstimate = isPredictionEntryEstimate(
    content,
    executedPosition,
  );
  const entryPrices = btcEntryPrices(content);
  const isExpired = Date.now() / 1000 >= windowStart + 300;
  const candleWinner = useBtcWindowWinner(windowStart, isExpired);
  const finalYesPrice = clampProbability(
    market?.yesPrice ?? entryPrices.yesPrice,
  );
  const finalNoPrice = clampProbability(
    market?.noPrice ?? entryPrices.noPrice,
  );
  const resolvedWinner = resolveBtcSettledWinner({
    yesPrice: finalYesPrice,
    noPrice: finalNoPrice,
    candleWinner,
  });
  const yesPrice =
    isExpired && resolvedWinner
      ? resolvedWinner === 'Up'
        ? 1
        : 0
      : finalYesPrice;
  const noPrice =
    isExpired && resolvedWinner
      ? resolvedWinner === 'Down'
        ? 1
        : 0
      : finalNoPrice;
  const currentPrice = outcome === 'Up' ? yesPrice : noPrice;
  const entryPrice = clampProbability(
    executedPosition.entryPrice ||
      (finiteNumber(content.price) ??
        (outcome === 'Up' ? entryPrices.yesPrice : entryPrices.noPrice)),
  );
  const shares =
    executedPosition.shares !== undefined &&
    Number.isFinite(executedPosition.shares)
      ? executedPosition.shares
      : entryPrice > 0
        ? executedPosition.cost / entryPrice
        : undefined;
  const payoutValue =
    shares !== undefined && Number.isFinite(shares)
      ? shares * currentPrice
      : undefined;
  const pnl =
    payoutValue !== undefined && Number.isFinite(payoutValue)
      ? payoutValue - executedPosition.cost
      : undefined;
  const marketState: ResolvedMarketState = {
    closed: Boolean(market?.closed || isExpired),
    yesPrice,
    noPrice,
    pickedPrice: currentPrice,
    pickedWon: resolvedWinner ? outcome === resolvedWinner : undefined,
  };
  const resolvedTitle =
    content.marketTitle || market?.question || 'BTC 5-Minute Up or Down';
  const historicalContent: PredictionContent = {
    ...content,
    marketTitle: resolvedTitle,
    cost: executedPosition.cost,
    price: entryPrice,
    potentialWin: shares ?? content.potentialWin,
    marketId: content.marketId || market?.conditionId,
    marketSlug: content.marketSlug || market?.slug,
    outcome,
    yesOutcome: 'Up',
    noOutcome: 'Down',
    yesTokenId: content.yesTokenId || market?.upTokenId,
    noTokenId: content.noTokenId || market?.downTokenId,
    yesPrice,
    noPrice,
    currentPrice,
    pnl,
  };
  const tradeState = resolveTradeState(
    historicalContent,
    false,
    marketState,
  );
  const { marketHref, onMarketClick } = usePredictionMarketNavigation(
    historicalContent,
    {
      marketTitle: resolvedTitle,
      yesOutcome: 'Up',
      noOutcome: 'Down',
      yesTokenId: historicalContent.yesTokenId,
      noTokenId: historicalContent.noTokenId,
      yesPrice,
      noPrice,
      closed: marketState.closed,
    },
  );

  return (
    <div className="mt-2">
      <PredictionPositionPanel
        marketTitle={resolvedTitle}
        outcome={outcome}
        yesOutcome="Up"
        noOutcome="Down"
        side={content.side}
        cost={executedPosition.cost}
        entryPrice={entryPrice}
        positionShares={shares}
        entryIsEstimate={entryIsEstimate}
        currentPrice={currentPrice}
        yesPrice={yesPrice}
        noPrice={noPrice}
        tradeState={tradeState}
        marketHref={marketHref}
        onMarketClick={onMarketClick}
        userName={userName}
        agent={agent}
        ownerHandle={ownerHandle}
      />
    </div>
  );
}

function BtcFiveMinutePredictionFeedCard(props: PredictionFeedCardProps) {
  const windowStart = resolveBtcWindowStart(props.content, props.createdAt);
  const activeWindowStart = useCurrentBtcWindowStart();

  if (windowStart === activeWindowStart) {
    return <LiveBtcFiveMinutePredictionFeedCard {...props} />;
  }

  return <HistoricalBtcFiveMinutePredictionFeedCard {...props} />;
}

export default function PredictionFeedCard(props: PredictionFeedCardProps) {
  if (isBtcFiveMinutePrediction(props.content)) {
    return <BtcFiveMinutePredictionFeedCard {...props} />;
  }

  return <RegularPredictionFeedCard {...props} />;
}
