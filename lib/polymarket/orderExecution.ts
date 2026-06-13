export type PolymarketOrderExecution = {
  price?: number;
  shares?: number;
  cost?: number;
  proceeds?: number;
  status?: string;
  tradeIds?: string[];
  transactionHashes?: string[];
};

export type PolymarketOrderResultLike = {
  status?: string;
  execution?: PolymarketOrderExecution | null;
  tradeIds?: string[];
  transactionHashes?: string[];
};

type PredictionFeedExecutionFallback = {
  side: 'BUY' | 'SELL';
  cost: number;
  potentialWin?: number;
  price: number;
  acceptedPrice?: number;
};

function finiteNumber(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function positiveNumber(value: unknown): number | undefined {
  const number = finiteNumber(value);
  return number !== undefined && number > 0 ? number : undefined;
}

export function resolvePredictionFeedExecution(
  result: PolymarketOrderResultLike | null | undefined,
  fallback: PredictionFeedExecutionFallback,
) {
  const execution = result?.execution || null;
  const executedPrice = positiveNumber(execution?.price);
  const executedShares = positiveNumber(execution?.shares);
  const executedCost = positiveNumber(execution?.cost);
  const executedProceeds = positiveNumber(execution?.proceeds);
  const price = executedPrice ?? fallback.price;
  const cost =
    fallback.side === 'SELL'
      ? executedProceeds ?? fallback.cost
      : executedCost ?? fallback.cost;
  const potentialWin =
    fallback.side === 'BUY'
      ? executedShares ?? fallback.potentialWin
      : fallback.potentialWin;

  return {
    cost,
    potentialWin,
    price,
    fields: {
      quotePrice: fallback.price,
      acceptedPrice: fallback.acceptedPrice ?? fallback.price,
      requestedCost: fallback.cost,
      requestedPotentialWin: fallback.potentialWin,
      executedPrice,
      executedShares,
      executedCost,
      executedProceeds,
      fillStatus: execution?.status || result?.status,
      tradeIds: execution?.tradeIds || result?.tradeIds,
      transactionHashes:
        execution?.transactionHashes || result?.transactionHashes,
    },
  };
}
