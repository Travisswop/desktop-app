export const ONDO_GLOBAL_MARKETS_SOURCE = 'ondo-global-markets';

export const ONDO_GLOBAL_MARKETS_TOKEN_LIST_URL =
  'https://raw.githubusercontent.com/ondoprotocol/ondo-global-markets-token-list/main/tokenlist.json';

export const JUPITER_VERIFIED_TOKEN_TAG_URL =
  'https://api.jup.ag/tokens/v2/tag?query=verified';

const SOLANA_CHAIN_ID = '1151111081099710';

type RawToken = Record<string, any>;

export type OndoGlobalMarketsToken = {
  symbol: string;
  name: string;
  address: string;
  id?: string;
  decimals: number;
  chain: string;
  chainId: string;
  network: string;
  logoURI?: string;
  icon?: string;
  tags: string[];
  source: typeof ONDO_GLOBAL_MARKETS_SOURCE;
  isVerified: true;
  tokenProgram?: string;
  usdPrice?: number;
  marketData?: {
    price?: number;
    change24h?: number;
  };
};

const EVM_ONDO_CHAIN_MAP: Record<
  string,
  { chain: string; network: string }
> = {
  '1': { chain: 'ETHEREUM', network: 'ethereum' },
};

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback;
}

function asTags(value: unknown) {
  return Array.isArray(value)
    ? value.map((tag) => String(tag).toLowerCase())
    : [];
}

function isSolanaOndoToken(token: RawToken) {
  const id = asString(token.id).toLowerCase();
  const name = asString(token.name);
  const icon = asString(token.icon);
  return (
    id.endsWith('ondo') ||
    /\(Ondo Tokenized\)/i.test(name) ||
    icon.startsWith('https://cdn.ondo.finance/tokens/logos/')
  );
}

function isOndoStockOrEtfSymbol(symbol: string) {
  const normalized = symbol.toLowerCase();
  return normalized.endsWith('on') && normalized !== 'usdon';
}

export function normalizeOndoTokenListToken(
  token: RawToken,
): OndoGlobalMarketsToken | null {
  const chainId = String(token?.chainId ?? '');
  const chain = EVM_ONDO_CHAIN_MAP[chainId];
  const address = asString(token?.address);
  const symbol = asString(token?.symbol);

  if (!chain || !address || !symbol || !isOndoStockOrEtfSymbol(symbol)) {
    return null;
  }

  return {
    symbol,
    name: asString(token?.name) || symbol,
    address,
    decimals: asNumber(token?.decimals, 18),
    chain: chain.chain,
    chainId,
    network: chain.network,
    logoURI: asString(token?.logoURI) || undefined,
    tags: Array.from(
      new Set([
        ...asTags(token?.tags),
        'ondo',
        ONDO_GLOBAL_MARKETS_SOURCE,
        'stock',
      ]),
    ),
    source: ONDO_GLOBAL_MARKETS_SOURCE,
    isVerified: true,
  };
}

export function normalizeJupiterOndoToken(
  token: RawToken,
): OndoGlobalMarketsToken | null {
  if (!isSolanaOndoToken(token)) return null;

  const id = asString(token?.id);
  const symbol = asString(token?.symbol);
  if (!id || !symbol || !isOndoStockOrEtfSymbol(symbol)) return null;

  const price = asNumber(token?.usdPrice, Number.NaN);
  const change24h = asNumber(
    token?.stats24h?.priceChange,
    Number.NaN,
  );

  return {
    symbol,
    name: asString(token?.name) || symbol,
    address: id,
    id,
    decimals: asNumber(token?.decimals, 9),
    chain: 'SOLANA',
    chainId: SOLANA_CHAIN_ID,
    network: 'solana',
    logoURI: asString(token?.icon) || undefined,
    icon: asString(token?.icon) || undefined,
    tags: ['ondo', ONDO_GLOBAL_MARKETS_SOURCE, 'stock'],
    source: ONDO_GLOBAL_MARKETS_SOURCE,
    isVerified: true,
    tokenProgram: asString(token?.tokenProgram) || undefined,
    usdPrice: Number.isFinite(price) ? price : undefined,
    marketData:
      Number.isFinite(price) || Number.isFinite(change24h)
        ? {
            ...(Number.isFinite(price) ? { price } : {}),
            ...(Number.isFinite(change24h)
              ? { change24h }
              : {}),
          }
        : undefined,
  };
}

export function dedupeOndoGlobalMarketsTokens(
  tokens: OndoGlobalMarketsToken[],
) {
  const seen = new Set<string>();
  const deduped: OndoGlobalMarketsToken[] = [];

  tokens.forEach((token) => {
    const key = `${token.chainId}:${token.address.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(token);
  });

  return deduped;
}

export function buildOndoGlobalMarketsStockAddressSet(
  tokens: Array<{ address?: string; id?: string }>,
) {
  return new Set(
    tokens
      .map((token) => asString(token.address || token.id).toLowerCase())
      .filter(Boolean),
  );
}
