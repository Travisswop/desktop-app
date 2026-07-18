'use client';

import { useEffect, useState } from 'react';

export interface EventLiveTeam {
  name: string | null;
  abbreviation: string | null;
  score: number | null;
}

export interface EventLiveScore {
  live: boolean;
  ended?: boolean;
  closed?: boolean;
  period: string | null;
  elapsed: string | null;
  teams: EventLiveTeam[];
}

const LIVE_POLL_MS = 15_000;
const OPEN_POLL_MS = 60_000;

/**
 * Poll `/api/polymarket/event-live` for a Gamma event's scoreboard while the
 * caller is mounted. Stops polling once the event has ended/closed. Returns
 * null until the first successful fetch (callers hide the score UI then).
 * Lightweight sibling of the feed card's useLiveScore, for order surfaces
 * that only need score + period.
 */
export function useEventLiveScore(
  eventSlug: string | undefined,
): EventLiveScore | null {
  const [score, setScore] = useState<EventLiveScore | null>(null);

  useEffect(() => {
    if (!eventSlug) {
      setScore(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const controller = new AbortController();

    const schedule = (latest: EventLiveScore | null) => {
      if (cancelled || latest?.ended || latest?.closed) return;
      timer = setTimeout(
        fetchScore,
        latest?.live ? LIVE_POLL_MS : OPEN_POLL_MS,
      );
    };

    const fetchScore = async () => {
      try {
        const res = await fetch(
          `/api/polymarket/event-live?slug=${encodeURIComponent(
            eventSlug,
          )}&_=${Date.now()}`,
          { cache: 'no-store', signal: controller.signal },
        );
        if (!res.ok || cancelled) {
          schedule(null);
          return;
        }
        const data: EventLiveScore = await res.json();
        if (cancelled) return;
        setScore(data);
        schedule(data);
      } catch {
        if (!cancelled) schedule(null);
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
