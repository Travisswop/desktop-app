import { NextRequest, NextResponse } from 'next/server';

const GAMMA_MARKETS_URL = 'https://gamma-api.polymarket.com/markets';

type GammaMarket = Record<string, any>;

function enrichMarketFromEvent(market: GammaMarket): GammaMarket {
  const event = Array.isArray(market.events) ? market.events[0] : null;
  if (!event) return market;
  const gameTime =
    event.startTime || event.gameStartTime || event.endDate || event.startDate;

  return {
    ...market,
    eventTitle: market.eventTitle ?? event.title,
    eventSlug: market.eventSlug ?? event.slug,
    eventId: market.eventId ?? event.id,
    eventIcon: market.eventIcon ?? event.image ?? event.icon,
    eventTeams: market.eventTeams ?? event.teams,
    eventLive: Boolean(event.live && !event.ended && !event.closed),
    eventEnded: Boolean(event.ended),
    eventClosed: Boolean(event.closed || event.ended || event.active === false),
    eventPeriod: event.period ?? null,
    eventElapsed: event.elapsed ?? null,
    eventScore: event.score ?? null,
    eventStartDate: gameTime || null,
    gameStartTime: market.gameStartTime || gameTime || null,
    negRisk: event.negRisk || market.negRisk || false,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id =
    searchParams.get('id') ||
    searchParams.get('conditionId') ||
    searchParams.get('condition_id') ||
    searchParams.get('slug');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const gammaParams = new URLSearchParams();
  if (/^0x[a-f0-9]{64}$/i.test(id)) {
    gammaParams.set('condition_ids', id);
  } else if (/^\d+$/.test(id)) {
    gammaParams.set('id', id);
  } else {
    gammaParams.set('slug', id);
  }

  const fetchMarket = async (params: URLSearchParams) => {
    const response = await fetch(`${GAMMA_MARKETS_URL}?${params}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Gamma responded ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? (data[0] as GammaMarket | undefined) : null;
  };

  try {
    let market = await fetchMarket(gammaParams);
    if (!market) {
      const closedParams = new URLSearchParams(gammaParams);
      closedParams.set('closed', 'true');
      market = await fetchMarket(closedParams);
    }

    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }

    return NextResponse.json(enrichMarketFromEvent(market));
  } catch (error) {
    console.warn('Polymarket market lookup failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market' },
      { status: 502 },
    );
  }
}
