import { useQuery } from '@tanstack/react-query';

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
  user: string | undefined;
  limit?: number;
  offset?: number;
  type?: ActivityType | '';
  side?: 'BUY' | 'SELL' | '';
  start?: number;
  end?: number;
  sort?: 'ASC' | 'DESC';
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
  return useQuery({
    queryKey: [
      'trade-activity',
      user,
      limit,
      offset,
      type,
      side,
      start,
      end,
      sort,
    ],
    queryFn: async (): Promise<TradeActivity[]> => {
      if (!user) return [];

      const params = new URLSearchParams({
        user,
        limit: String(limit),
        offset: String(offset),
        sort,
      });
      if (type) params.set('type', type);
      if (side) params.set('side', side);
      if (start) params.set('start', String(start));
      if (end) params.set('end', String(end));

      const response = await fetch(
        `/api/polymarket/activity?${params}`,
      );
      if (!response.ok) return [];

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
