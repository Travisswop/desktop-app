import { NextRequest, NextResponse } from 'next/server';

import { POLYMARKET_BACKEND_URL } from '@/constants/polymarket';
import {
  reconcilePositionsWithEventLive,
  type EventLiveState,
  type PolymarketPositionLike,
} from '@/lib/polymarket/positions-reconciliation';

const PARTIAL_DATA_HEADER = 'x-polymarket-partial-data';

async function fetchEventLive(
  eventSlug: string,
): Promise<EventLiveState | null> {
  try {
    const response = await fetch(
      `${POLYMARKET_BACKEND_URL}/api/prediction-markets/events/live?slug=${encodeURIComponent(
        eventSlug,
      )}`,
      { cache: 'no-store' },
    );

    if (!response.ok) return null;
    return (await response.json()) as EventLiveState;
  } catch {
    return null;
  }
}

function shouldCheckEventResolution(position: PolymarketPositionLike) {
  if (position.redeemable) return false;
  if (!String(position.eventSlug || '').trim()) return false;

  const endMs = Date.parse(String(position.endDate || ''));
  if (!Number.isFinite(endMs)) return true;
  if (endMs <= Date.now()) return true;

  const curPrice = Number(position.curPrice);
  const currentValue = Number(position.currentValue);
  return (
    Number.isFinite(curPrice) &&
    curPrice <= 0.005 &&
    Number.isFinite(currentValue) &&
    currentValue <= 0.005
  );
}

async function reconcilePositions(
  positions: PolymarketPositionLike[],
) {
  const eventSlugs = Array.from(
    new Set(
      positions
        .filter(shouldCheckEventResolution)
        .map((position) => String(position.eventSlug || '').trim())
        .filter(Boolean),
    ),
  );

  if (eventSlugs.length === 0) return positions;

  const eventEntries = await Promise.all(
    eventSlugs.map(async (eventSlug) => [
      eventSlug,
      await fetchEventLive(eventSlug),
    ] as const),
  );

  return reconcilePositionsWithEventLive(
    positions,
    new Map(eventEntries),
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('user');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${POLYMARKET_BACKEND_URL}/api/prediction-markets/positions?user=${userAddress}`,
    );
    const data = await response.json().catch(() => null);
    const partialData = response.headers.get(PARTIAL_DATA_HEADER);

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            typeof data === 'object' &&
            data !== null &&
            'error' in data &&
            typeof data.error === 'string'
              ? data.error
              : 'Failed to fetch positions',
          failedAddresses:
            typeof data === 'object' &&
            data !== null &&
            'failedAddresses' in data &&
            Array.isArray(data.failedAddresses)
              ? data.failedAddresses
              : undefined,
          retryable: response.status >= 500,
        },
        { status: response.status },
      );
    }

    const positions = Array.isArray(data)
      ? await reconcilePositions(data)
      : data;

    const nextResponse = NextResponse.json(positions);
    if (partialData) {
      nextResponse.headers.set(PARTIAL_DATA_HEADER, partialData);
    }
    return nextResponse;
  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 },
    );
  }
}
