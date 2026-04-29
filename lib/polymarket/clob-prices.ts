import { POLYMARKET_BACKEND_URL } from '@/constants/polymarket';

const CHUNK_SIZE = 100;

export type PriceEntry = {
  bidPrice: number;
  askPrice: number;
  midPrice: number;
  spread: number;
};

export type PriceMap = Record<string, PriceEntry>;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function fetchChunkedPrices(tokenIds: string[]): Promise<PriceMap> {
  if (tokenIds.length === 0) return {};

  const backendUrl = `${POLYMARKET_BACKEND_URL}/api/prediction-markets/prices`;
  const chunks = chunkArray(tokenIds, CHUNK_SIZE);

  const chunkResults = await Promise.all(
    chunks.map(async (chunk) => {
      const res = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenIds: chunk }),
      });
      if (!res.ok) return {} as Record<string, { bid: number | null; ask: number | null }>;
      return res.json() as Promise<Record<string, { bid: number | null; ask: number | null }>>;
    }),
  );

  const merged: Record<string, { bid: number | null; ask: number | null }> = Object.assign({}, ...chunkResults);

  const priceMap: PriceMap = {};
  for (const tokenId of tokenIds) {
    const entry = merged[tokenId];
    if (!entry) continue;
    const bid = entry.bid ?? 0;
    const ask = entry.ask ?? 0;
    if (bid > 0 && bid < 1 && ask > 0 && ask < 1) {
      priceMap[tokenId] = {
        bidPrice: bid,
        askPrice: ask,
        midPrice: (bid + ask) / 2,
        spread: ask - bid,
      };
    }
  }
  return priceMap;
}
