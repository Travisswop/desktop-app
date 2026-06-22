import { useModalStore } from '@/zustandStore/modalstore';
import type { DefiFeedContent } from './defiFeed';

export interface UpsertAavePositionFeedParams {
  token: string;
  userId: string;
  smartsiteId: string;
  content: DefiFeedContent;
}

export async function upsertAavePositionFeed({
  token,
  userId,
  smartsiteId,
  content,
}: UpsertAavePositionFeedParams) {
  if (!token || !userId || !smartsiteId || !content.positionKey) {
    const missingFields = [
      !token ? 'token' : null,
      !userId ? 'userId' : null,
      !smartsiteId ? 'smartsiteId' : null,
      !content.positionKey ? 'positionKey' : null,
    ].filter(Boolean);

    console.warn(`Skipping Aave feed sync; missing ${missingFields.join(', ')}`);
    return null;
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v2/feed/defi-position`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postType: 'defiPosition',
        smartsiteId,
        userId,
        content,
      }),
    },
  );

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      data?.message || `Failed to update Aave feed card (${response.status})`,
    );
  }

  useModalStore.getState().publishCreatedFeedItem(data?.data || null);

  return data;
}
