import { NextRequest, NextResponse } from 'next/server';

const GAMMA_EVENTS_URL = 'https://gamma-api.polymarket.com/events';

type GammaEvent = Record<string, any>;
type GammaMarket = Record<string, any>;

function normalizeEventSlug(value: string): string {
  return value.trim().toLowerCase();
}

function marketsFromEvent(event: GammaEvent): GammaMarket[] {
  const markets = Array.isArray(event.markets) ? event.markets : [];
  const gameTime =
    event.startTime || event.gameStartTime || event.endDate || event.startDate;

  return markets.map((market) => ({
    ...market,
    eventTitle: event.title,
    eventSlug: event.slug,
    eventId: event.id,
    eventIcon: event.image || event.icon,
    eventTeams: Array.isArray(event.teams)
      ? event.teams
      : Array.isArray(market.teams)
        ? market.teams
        : undefined,
    eventLive: Boolean(event.live && !event.ended && !event.closed),
    eventEnded: Boolean(event.ended),
    eventClosed: Boolean(event.closed || event.ended || event.active === false),
    eventPeriod: event.period ?? null,
    eventElapsed: event.elapsed ?? null,
    eventScore: event.score ?? null,
    eventStartDate: gameTime || null,
    gameStartTime: market.gameStartTime || gameTime || null,
    negRisk: event.negRisk || market.negRisk || false,
  }));
}

async function fetchEventMarketsBySlug(
  slug: string,
  closedOnly: boolean,
): Promise<GammaMarket[]> {
  // Gamma's `closed` param is a FILTER, not "include closed": closed=true
  // returns only closed events, so an active event yields nothing. Query
  // without it first (active/live events), then fall back to closed=true
  // for just-settled events.
  const params = new URLSearchParams({ slug: normalizeEventSlug(slug) });
  if (closedOnly) params.set('closed', 'true');
  const response = await fetch(`${GAMMA_EVENTS_URL}?${params}`, {
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) return [];

  const data = await response.json();
  const events = Array.isArray(data)
    ? data
    : Array.isArray(data?.events)
      ? data.events
      : Array.isArray(data?.data)
        ? data.data
        : [];
  const event = events.find(
    (candidate: GammaEvent) =>
      normalizeEventSlug(String(candidate?.slug ?? '')) ===
      normalizeEventSlug(slug),
  );

  return event ? marketsFromEvent(event) : [];
}

async function fetchEventMarkets(slug: string): Promise<GammaMarket[]> {
  const active = await fetchEventMarketsBySlug(slug, false);
  if (active.length > 0) return active;
  return fetchEventMarketsBySlug(slug, true);
}

async function fetchEventMarketsById(id: string): Promise<GammaMarket[]> {
  const response = await fetch(
    `${GAMMA_EVENTS_URL}/${encodeURIComponent(id)}`,
    {
      signal: AbortSignal.timeout(8000),
    },
  );

  if (!response.ok) return [];

  const event = (await response.json()) as GammaEvent;
  return event ? marketsFromEvent(event) : [];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');

  if (!slug && !id) {
    return NextResponse.json(
      { error: 'slug or id is required' },
      { status: 400 },
    );
  }

  try {
    const markets = id
      ? await fetchEventMarketsById(id)
      : await fetchEventMarkets(slug!);
    return NextResponse.json(markets);
  } catch (error) {
    console.warn('Polymarket event markets lookup failed:', error);
    return NextResponse.json([], { status: 200 });
  }
}
