type TokenMarketLike = {
  address?: unknown;
  contractAddress?: unknown;
  tokenAddress?: unknown;
  mint?: unknown;
  id?: unknown;
  chain?: unknown;
  chainId?: unknown;
  network?: unknown;
  blockchain?: unknown;
  symbol?: unknown;
  price?: unknown;
  usdPrice?: unknown;
  nativeTokenPrice?: unknown;
  marketData?: {
    price?: unknown;
    currentPrice?: unknown;
    usdPrice?: unknown;
  } | null;
} | null | undefined;

const CHAIN_ALIASES: Record<string, string> = {
  "1": "ethereum",
  eth: "ethereum",
  ethereum: "ethereum",
  ethmainnet: "ethereum",
  ethereummainnet: "ethereum",
  mainnet: "ethereum",

  "137": "polygon",
  matic: "polygon",
  maticnetwork: "polygon",
  polygon: "polygon",
  polygonpos: "polygon",

  "8453": "base",
  base: "base",
  basemainnet: "base",

  "42161": "arbitrum",
  arb: "arbitrum",
  arbitrum: "arbitrum",
  arbitrumone: "arbitrum",

  "1151111081099710": "solana",
  "101": "solana",
  "501": "solana",
  sol: "solana",
  solana: "solana",
  solanamainnet: "solana",
};

const NATIVE_ADDRESS_ALIASES = new Set([
  "native",
  "null",
  "undefined",
  "0x0",
  "0x0000000000000000000000000000000000000000",
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "11111111111111111111111111111111",
  "so11111111111111111111111111111111111111112",
]);

const STABLECOIN_SYMBOLS = new Set([
  "USDC",
  "USDC.E",
  "USDT",
  "DAI",
  "FRAX",
  "LUSD",
  "PYUSD",
  "USDE",
  "USD",
  "PUSD",
]);

function normalizeAliasKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]/g, "");
}

export function parseMarketPrice(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function normalizeMarketChain(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  let raw = String(value).trim();
  if (!raw) return null;

  const caipMatch = raw.match(/^eip155:(\d+)$/i);
  if (caipMatch?.[1]) raw = caipMatch[1];

  if (/^0x[0-9a-f]+$/i.test(raw)) {
    raw = String(Number.parseInt(raw, 16));
  }

  return CHAIN_ALIASES[normalizeAliasKey(raw)] ?? null;
}

export function getTokenMarketChain(token: TokenMarketLike): string | null {
  const explicitChain =
    normalizeMarketChain(token?.chain) ??
    normalizeMarketChain(token?.chainId) ??
    normalizeMarketChain(token?.network) ??
    normalizeMarketChain(token?.blockchain);

  if (explicitChain) return explicitChain;

  const symbol = String(token?.symbol ?? "").trim().toUpperCase();
  const address =
    token?.mint ??
    token?.address ??
    token?.contractAddress ??
    token?.tokenAddress ??
    null;

  const hasAddress = address !== null && address !== undefined;
  if (symbol === "SOL" || (hasAddress && isNativeTokenAddress(address))) {
    return "solana";
  }
  if (symbol === "MATIC" || symbol === "POL") return "polygon";
  if (symbol === "ETH") return "ethereum";

  return null;
}

export function isNativeTokenAddress(address: unknown): boolean {
  if (address === null || address === undefined) return true;
  const raw = String(address).trim();
  if (!raw) return true;
  return NATIVE_ADDRESS_ALIASES.has(raw.toLowerCase());
}

function cleanMarketAddress(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw || isNativeTokenAddress(raw)) return null;

  // Some older feed records stored symbols in address-like fields.
  if (/^[a-z.]{2,10}$/i.test(raw)) return null;

  return raw;
}

function looksLikeContractAddress(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const raw = String(value).trim();
  return (
    /^0x[a-fA-F0-9]{40}$/.test(raw) ||
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(raw)
  );
}

export function getTokenMarketAddress(token: TokenMarketLike): string | null {
  const directAddress =
    cleanMarketAddress(token?.mint) ??
    cleanMarketAddress(token?.address) ??
    cleanMarketAddress(token?.contractAddress) ??
    cleanMarketAddress(token?.tokenAddress);

  if (directAddress) return directAddress;

  return looksLikeContractAddress(token?.id)
    ? cleanMarketAddress(token?.id)
    : null;
}

export function isStablecoinSymbol(symbol: unknown): boolean {
  if (symbol === null || symbol === undefined) return false;
  return STABLECOIN_SYMBOLS.has(String(symbol).trim().toUpperCase());
}

export function isNativeSymbolForChain(
  symbol: unknown,
  chain: string | null,
): boolean {
  if (symbol === null || symbol === undefined || !chain) return false;
  const normalizedSymbol = String(symbol).trim().toUpperCase();

  switch (chain) {
    case "solana":
      return normalizedSymbol === "SOL";
    case "polygon":
      return normalizedSymbol === "MATIC" || normalizedSymbol === "POL";
    case "ethereum":
    case "base":
    case "arbitrum":
      return normalizedSymbol === "ETH";
    default:
      return false;
  }
}

export function isNativeMarketToken(token: TokenMarketLike): boolean {
  const chain = getTokenMarketChain(token);
  const rawAddress =
    token?.mint ??
    token?.address ??
    token?.contractAddress ??
    token?.tokenAddress ??
    null;

  return isNativeTokenAddress(rawAddress) && isNativeSymbolForChain(token?.symbol, chain);
}

export function getTokenFallbackPrice(token: TokenMarketLike): number | null {
  return (
    parseMarketPrice(token?.price) ??
    parseMarketPrice(token?.usdPrice) ??
    parseMarketPrice(token?.nativeTokenPrice) ??
    parseMarketPrice(token?.marketData?.price) ??
    parseMarketPrice(token?.marketData?.currentPrice) ??
    parseMarketPrice(token?.marketData?.usdPrice) ??
    (isStablecoinSymbol(token?.symbol) ? 1 : null)
  );
}

export function extractPriceFromMarketResponse(
  payload: unknown,
  address: string | null,
): number | null {
  const prices = (payload as any)?.data?.prices;
  if (!prices || typeof prices !== "object") return null;

  const key = address ? address.toLowerCase() : "native";
  const keyedPrice = parseMarketPrice(prices[key]?.price);
  if (keyedPrice) return keyedPrice;

  const nativePrice = parseMarketPrice(prices.native?.price);
  if (nativePrice) return nativePrice;

  const first = Object.values(prices)[0] as any;
  return parseMarketPrice(first?.price);
}

export function getNativeMarketId(chain: string | null): string | null {
  switch (chain) {
    case "solana":
      return "solana";
    case "polygon":
      return "matic-network";
    case "ethereum":
    case "base":
    case "arbitrum":
      return "ethereum";
    default:
      return null;
  }
}
