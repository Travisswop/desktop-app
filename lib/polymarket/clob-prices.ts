/**
 * Chunked CLOB price fetching.
 *
 * The Polymarket CLOB /prices endpoint enforces a payload-size limit that is
 * easily exceeded when a full page of sports events is loaded (20 events × 3
 * markets × 2 tokens = up to 120 token IDs per side).  Sending them all in a
 * single POST triggers "Payload exceeds the limit" (HTTP 400).
 *
 * Solution: split the token list into fixed-size chunks, fire all chunks in
 * parallel for each side, then merge the results.
 */

import { Side } from '@polymarket/clob-client';

/** Maximum number of token IDs sent in one POST /prices request. */
const CHUNK_SIZE = 20;

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

/**
 * Fetch bid + ask prices for `tokenIds` using the given CLOB client,
 * automatically splitting into ≤ CHUNK_SIZE batches to stay under the API
 * payload limit.
 *
 * Returns a map of { tokenId → { bidPrice, askPrice, midPrice, spread } }.
 * Tokens with invalid / out-of-range prices are omitted.
 */
export async function fetchChunkedPrices(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clobClient: any,
  tokenIds: string[],
): Promise<PriceMap> {
  if (tokenIds.length === 0) return {};

  const chunks = chunkArray(tokenIds, CHUNK_SIZE);

  // Fetch all chunks for both sides in parallel
  const [bidChunks, askChunks] = await Promise.all([
    Promise.all(
      chunks.map((chunk) =>
        clobClient.getPrices(
          chunk.map((id: string) => ({ token_id: id, side: Side.SELL })),
        ),
      ),
    ),
    Promise.all(
      chunks.map((chunk) =>
        clobClient.getPrices(
          chunk.map((id: string) => ({ token_id: id, side: Side.BUY })),
        ),
      ),
    ),
  ]);

  // Merge chunk results into flat maps
  const bidFlat: Record<string, string> = Object.assign({}, ...bidChunks);
  const askFlat: Record<string, string> = Object.assign({}, ...askChunks);

  const priceMap: PriceMap = {};
  for (const tokenId of tokenIds) {
    const bid = parseFloat(bidFlat[tokenId] ?? '0');
    const ask = parseFloat(askFlat[tokenId] ?? '0');
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
