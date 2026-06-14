import { POLYMARKET_BACKEND_PROXY_URL } from '@/constants/polymarket';

const CHUNK_SIZE = 100;

export type PriceEntry = {
  bidPrice?: number;
  askPrice?: number;
  midPrice?: number;
  spread?: number;
};

export type PriceMap = Record<string, PriceEntry>;
type RawPriceEntry = {
  bid?: number | string | null;
  ask?: number | string | null;
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function parseProbabilityPrice(value: number | string | null | undefined) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 && price < 1 ? price : null;
}

export async function fetchChunkedPrices(tokenIds: string[]): Promise<PriceMap> {
  if (tokenIds.length === 0) return {};

  const backendUrl = `${POLYMARKET_BACKEND_PROXY_URL}/prices`;
  const chunks = chunkArray(tokenIds, CHUNK_SIZE);

  const chunkResults = await Promise.all(
    chunks.map(async (chunk) => {
      const res = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenIds: chunk }),
      });
      if (!res.ok) return {} as Record<string, RawPriceEntry>;
      return res.json() as Promise<Record<string, RawPriceEntry>>;
    }),
  );

  const merged: Record<string, RawPriceEntry> = Object.assign({}, ...chunkResults);

  const priceMap: PriceMap = {};
  for (const tokenId of tokenIds) {
    const entry = merged[tokenId];
    if (!entry) continue;
    const bid = parseProbabilityPrice(entry.bid);
    const ask = parseProbabilityPrice(entry.ask);
    const hasBid = bid != null;
    const hasAsk = ask != null;
    if (hasBid || hasAsk) {
      priceMap[tokenId] = {
        ...(hasBid ? { bidPrice: bid } : {}),
        ...(hasAsk ? { askPrice: ask } : {}),
        ...(hasBid && hasAsk
          ? {
              midPrice: (bid + ask) / 2,
              spread: ask - bid,
            }
          : {}),
      };
    }
  }
  return priceMap;
}
