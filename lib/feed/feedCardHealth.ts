'use client';

type FeedCardHealthPayload = {
  surface: 'perps' | 'prediction' | 'defi';
  fingerprint: string;
  positionKeys?: string[];
  coins?: string[];
  context?: Record<string, unknown>;
};

export async function logFeedCardHealth(payload: FeedCardHealthPayload) {
  try {
    await fetch('/api/feed/card-health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn('Failed to log feed card health event:', error);
  }
}
