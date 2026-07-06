'use client';

type FeedCardHealthPayload = {
  surface: 'perps' | 'prediction' | 'defi';
  fingerprint: string;
  positionKeys?: string[];
  coins?: string[];
  context?: Record<string, unknown>;
};

export async function logFeedCardHealth(
  payload: FeedCardHealthPayload,
  accessToken?: string | null,
) {
  if (!accessToken) {
    console.warn('Skipped feed card health event without an access token.');
    return;
  }

  try {
    const response = await fetch('/api/feed/card-health', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`feed-card-health ${response.status}`);
    }
  } catch (error) {
    console.warn('Failed to log feed card health event:', error);
  }
}
