import { useQuery } from '@tanstack/react-query';

const COIN_RANKING_API_KEY =
  process.env.NEXT_PUBLIC_COIN_RANKING_API_KEY;

async function fetchTimeSeriesData(uuid: string, period: string) {
  const response = await fetch(
    `https://api.coinranking.com/v2/coin/${uuid}/history?timePeriod=${period}`,
    {
      headers: {
        'x-access-token': COIN_RANKING_API_KEY || '',
      },
    }
  );

  if (!response.ok)
    throw new Error('Failed to fetch time series data');

  const { data } = await response.json();

  const { change, history } = data;

  const sparklineData = history
    .map((data: { price: string | null; timestamp: number }) => {
      const price =
        data.price !== null ? parseFloat(data.price) : null;

      return price !== null
        ? { timestamp: data.timestamp, value: price }
        : null;
    })
    .filter(Boolean);

  return {
    change: change,
    sparklineData: sparklineData,
  };
}

export function useTokenTimeSeries(
  uuid: string | undefined,
  period: string
) {
  return useQuery({
    queryKey: ['tokenTimeSeries', uuid, period],
    queryFn: () => fetchTimeSeriesData(uuid!, period),
    enabled: !!uuid,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
