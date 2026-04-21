import { NextRequest, NextResponse } from 'next/server';

const GAMMA_API = 'https://gamma-api.polymarket.com';

type GammaTeam = {
  id?: number | string;
  name?: string;
  abbreviation?: string;
  logo?: string;
  color?: string;
};

type GammaEvent = {
  slug?: string;
  id?: string | number;
  live?: boolean;
  ended?: boolean;
  score?: string;
  period?: string;
  elapsed?: string;
  startTime?: string;
  gameId?: string | number;
  teams?: GammaTeam[];
};

export type LiveEventResponse = {
  live: boolean;
  ended: boolean;
  period: string | null;
  elapsed: string | null;
  startTime: string | null;
  teams: Array<{
    name: string | null;
    abbreviation: string | null;
    logo: string | null;
    color: string | null;
    score: number | null;
  }>;
};

function parseScorePair(raw: string | undefined): [number | null, number | null] {
  if (!raw) return [null, null];
  const parts = raw.split(/[-–—:]/).map((s) => s.trim());
  if (parts.length !== 2) return [null, null];
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  return [isFinite(a) ? a : null, isFinite(b) ? b : null];
}

/**
 * GET /api/polymarket/event-live?slug=<event-slug>
 *
 * Proxies the Gamma /events endpoint and extracts the live-score fields
 * (score, period, elapsed, teams) that our internal markets proxy does not
 * currently forward. Used by the MarketDetailModal to render a live
 * scoreboard between the two TeamBadgeBlocks while the game is in progress.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json(
      { error: 'Missing required query param: slug' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `${GAMMA_API}/events?slug=${encodeURIComponent(slug)}`,
      {
        headers: { Accept: 'application/json' },
        // Keep fresh while a game is live — cache briefly so rapid
        // poll intervals (15–30s) don't hammer Gamma per client.
        next: { revalidate: 10 },
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Gamma API returned an error', status: res.status },
        { status: res.status },
      );
    }

    const data = (await res.json()) as GammaEvent[];
    const ev = Array.isArray(data) ? data[0] : undefined;

    if (!ev) {
      return NextResponse.json(
        {
          live: false,
          ended: false,
          period: null,
          elapsed: null,
          startTime: null,
          teams: [],
        } satisfies LiveEventResponse,
      );
    }

    const [score0, score1] = parseScorePair(ev.score);
    const teams: LiveEventResponse['teams'] = (ev.teams ?? []).map(
      (t, i) => ({
        name: t?.name ?? null,
        abbreviation: t?.abbreviation ?? null,
        logo: t?.logo ?? null,
        color: t?.color ?? null,
        score: i === 0 ? score0 : i === 1 ? score1 : null,
      }),
    );

    const payload: LiveEventResponse = {
      live: Boolean(ev.live),
      ended: Boolean(ev.ended),
      period: ev.period ?? null,
      elapsed: ev.elapsed ?? null,
      startTime: ev.startTime ?? null,
      teams,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error('[polymarket/event-live] Fetch error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
