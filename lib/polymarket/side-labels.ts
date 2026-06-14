import type { TeamsMap } from '@/hooks/polymarket';
import { findTeam } from './sports-teams';

export type PredictionSideLabel = 'YES' | 'NO';
export type PredictionSideDisplay =
  | PredictionSideLabel
  | 'TEAM SELECTED';

export function sideFromOutcomeIndex(
  outcomeIndex: number,
): PredictionSideLabel {
  return outcomeIndex === 0 ? 'YES' : 'NO';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textContainsPhrase(text: string, phrase: string): boolean {
  const trimmed = phrase.trim();
  if (trimmed.length < 3) return false;
  return new RegExp(
    `(^|[^a-z0-9])${escapeRegExp(trimmed)}([^a-z0-9]|$)`,
    'i',
  ).test(text);
}

function teamMentionCount(
  text: string,
  teamsMap: TeamsMap | undefined,
): number {
  if (!teamsMap || !text.trim()) return 0;
  const found = new Set<string>();

  teamsMap.teams.forEach((team) => {
    const labels = new Set<string>();

    if (team.name) {
      labels.add(team.name);

      const words = team.name.trim().split(/\s+/);
      if (words.length > 1) {
        labels.add(words[words.length - 1]);
        if (words.length > 2) {
          labels.add(words.slice(-2).join(' '));
        }
      }
    }

    if (team.abbreviation && team.abbreviation.length >= 3) {
      labels.add(team.abbreviation);
    }

    const matched = Array.from(labels).some((label) =>
      textContainsPhrase(text, label),
    );
    if (matched) {
      found.add(String(team.id ?? team.name ?? team.abbreviation));
    }
  });

  return found.size;
}

function staticTeamMentionCount(title: string, outcome?: string): number {
  const found = new Set<string>();
  const addTeam = (value: string | undefined) => {
    if (!value) return;
    const team = findTeam(
      value
        .replace(/^spread:\s*/i, '')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\b[+-]\d+(?:\.\d+)?\b/g, ' ')
        .trim(),
    );
    if (team) found.add(team.abbrev);
  };

  if (/\b(vs\.?|v\.?|at)\b|@/i.test(title)) {
    title
      .split(/\s+(?:vs\.?|v\.?|at)\s+|@/i)
      .forEach((part) => addTeam(part));
  } else {
    addTeam(title);
  }

  addTeam(outcome);
  return found.size;
}

function hasSportsEventHint(eventSlug?: string): boolean {
  return /\b(nba|nfl|nhl|mlb|wnba|ncaaf?|ncaab?|epl|mls|uefa|fifa|ufc|mma|tennis|golf|nascar|formula|f1|soccer|hockey|basketball|baseball|football)\b/i.test(
    (eventSlug ?? '').replace(/[-_]/g, ' '),
  );
}

export function isTeamSelectionSportsMarket({
  title,
  outcome,
  eventSlug,
  teamsMap,
}: {
  title: string;
  outcome?: string;
  eventSlug?: string;
  teamsMap?: TeamsMap;
}): boolean {
  const searchableText = `${title} ${outcome ?? ''}`.trim();
  if (!searchableText) return false;

  const isTotalMarket =
    /\b(o\/u|over\s*\/?\s*under|total|totals)\b/i.test(
      searchableText,
    );
  if (isTotalMarket) return false;

  const isSpreadMarket = /\bspread\b/i.test(searchableText);
  const hasMatchupTitle = /\b(vs\.?|v\.?|at)\b|@/i.test(title);
  if (!isSpreadMarket && !hasMatchupTitle) return false;

  const teamCount = teamMentionCount(searchableText, teamsMap);
  if (teamCount >= (isSpreadMarket ? 1 : 2)) return true;

  const staticTeamCount = staticTeamMentionCount(title, outcome);
  if (staticTeamCount >= (isSpreadMarket ? 1 : 2)) return true;

  return hasSportsEventHint(eventSlug);
}

export function displaySideForMarket(
  params: {
    title: string;
    outcome?: string;
    eventSlug?: string;
    teamsMap?: TeamsMap;
  },
  outcomeIndex: number,
): PredictionSideDisplay {
  if (isTeamSelectionSportsMarket(params)) return 'TEAM SELECTED';
  return sideFromOutcomeIndex(outcomeIndex);
}
