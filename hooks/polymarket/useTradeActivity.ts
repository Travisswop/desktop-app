import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { mergeSettledArrays } from '@/lib/polymarket/stable-results';

export type ActivityType =
  | 'TRADE'
  | 'SPLIT'
  | 'MERGE'
  | 'REDEEM'
  | 'REWARD'
  | 'CONVERSION';

export type TradeActivity = {
  title: string;
  icon: string;
  slug: string;
  eventSlug: string;
  outcome: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  usdcSize: number;
  timestamp: number;
  transactionHash: string;
  conditionId: string;
  asset: string;
  outcomeIndex: number;
  proxyWallet: string;
  type: ActivityType;
};

export interface TradeActivityParams {
  user: string | string[] | undefined;
  limit?: number;
  offset?: number;
  type?: ActivityType | '';
  side?: 'BUY' | 'SELL' | '';
  start?: number;
  end?: number;
  sort?: 'ASC' | 'DESC';
}

function normalizeUsers(user: string | string[] | undefined): string[] {
  const users = Array.isArray(user) ? user : user ? [user] : [];
  return Array.from(
    new Map(
      users.filter(Boolean).map((walletAddress) => [
        walletAddress.toLowerCase(),
        walletAddress,
      ]),
    ).values(),
  );
}

export function useTradeActivity({
  user,
  limit = 100,
  offset = 0,
  type,
  side,
  start,
  end,
  sort = 'DESC',
}: TradeActivityParams) {
  const users = normalizeUsers(user);

  return useQuery({
    queryKey: [
      'trade-activity',
      users,
      limit,
      offset,
      type,
      side,
      start,
      end,
      sort,
    ],
    queryFn: async (): Promise<TradeActivity[]> => {
      if (!users.length) {
        throw new Error('Prediction activity wallet is not ready');
      }

      const activitySets = await Promise.allSettled(
        users.map(async (walletAddress) => {
          const params = new URLSearchParams({
            user: walletAddress,
            limit: String(limit + offset),
            offset: '0',
            sort,
          });
          if (type) params.set('type', type);
          if (side) params.set('side', side);
          if (start) params.set('start', String(start));
          if (end) params.set('end', String(end));

          const response = await fetch(
            `/api/polymarket/activity?${params}`,
          );
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.error || 'Failed to refresh prediction activity');
          }

          return Array.isArray(data) ? (data as TradeActivity[]) : [];
        }),
      );

      const combined = mergeSettledArrays(
        activitySets,
        'Failed to refresh prediction activity',
      );

      return combined
        .sort((a, b) =>
          sort === 'ASC'
            ? a.timestamp - b.timestamp
            : b.timestamp - a.timestamp,
        )
        .slice(offset, offset + limit);
    },
    enabled: users.length > 0,
    placeholderData: keepPreviousData,
    retry: 1,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
