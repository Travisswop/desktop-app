import { useQuery } from '@tanstack/react-query';
import { useTrading } from '@/providers/polymarket';
import { pmApi } from '@/lib/polymarket/polymarketApi';

export type PolymarketOrder = {
  id: string;
  status: string;
  owner: string;
  maker_address: string;
  market: string;
  asset_id: string;
  side: 'BUY' | 'SELL';
  original_size: string;
  size_matched: string;
  price: string;
  associate_trades: string[];
  outcome: string;
  created_at: number;
  expiration: string;
  order_type: string;
};

const OPEN_STATUSES = new Set(['LIVE', 'MATCHED', 'DELAYED']);

export function useActiveOrders(walletAddress: string | undefined) {
  const { tradingSession } = useTrading();

  return useQuery({
    queryKey: [
      'active-orders',
      walletAddress,
      tradingSession?.apiCredentials?.key,
    ],
    queryFn: async (): Promise<PolymarketOrder[]> => {
      if (!tradingSession?.safeAddress || !tradingSession?.apiCredentials) {
        return [];
      }

      const apiCreds = encodeURIComponent(
        JSON.stringify(tradingSession.apiCredentials),
      );
      const { orders } = await pmApi<{ orders: PolymarketOrder[] }>(
        `/orders/active?safeAddress=${tradingSession.safeAddress}&apiCreds=${apiCreds}`,
      );

      return (orders || []).filter((o) => OPEN_STATUSES.has(o.status));
    },
    enabled: !!walletAddress && !!tradingSession?.apiCredentials,
    staleTime: 2_000,
    refetchInterval: 3_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}
