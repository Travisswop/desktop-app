import { useModalStore } from '@/zustandStore/modalstore';
import type { DefiFeedContent } from './defiFeed';

export interface UpsertAavePositionFeedParams {
  token: string;
  userId: string;
  smartsiteId: string;
  content: DefiFeedContent;
  publishToFeed?: boolean;
}

export interface ReconcileAavePositionFeedParams {
  token: string;
  userId: string;
  smartsiteId: string;
  walletAddress: string;
  chain: string;
  activePositionKeys: string[];
  updatedAt?: string;
}

export async function upsertAavePositionFeed({
  token,
  userId,
  smartsiteId,
  content,
  publishToFeed = true,
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

  if (publishToFeed) {
    useModalStore.getState().publishCreatedFeedItem(data?.data || null);
  }

  return data;
}

export async function reconcileAavePositionFeed({
  token,
  userId,
  smartsiteId,
  walletAddress,
  chain,
  activePositionKeys,
  updatedAt,
}: ReconcileAavePositionFeedParams) {
  if (!token || !userId || !smartsiteId || !walletAddress || !chain) {
    const missingFields = [
      !token ? 'token' : null,
      !userId ? 'userId' : null,
      !smartsiteId ? 'smartsiteId' : null,
      !walletAddress ? 'walletAddress' : null,
      !chain ? 'chain' : null,
    ].filter(Boolean);

    console.warn(
      `Skipping Aave feed reconcile; missing ${missingFields.join(', ')}`,
    );
    return null;
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v2/feed/defi-position/reconcile`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        smartsiteId,
        userId,
        walletAddress,
        chain,
        activePositionKeys,
        updatedAt,
      }),
    },
  );

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      data?.message || `Failed to reconcile Aave feed cards (${response.status})`,
    );
  }

  if (Array.isArray(data?.data?.updatedPosts) && data.data.updatedPosts.length) {
    useModalStore.getState().triggerFeedRefetch();
  }

  return data;
}
