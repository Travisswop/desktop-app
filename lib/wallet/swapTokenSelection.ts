export const SOLANA_CHAIN_ID = '1151111081099710';
export const SWOP_TOKEN_MINT =
  'GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1';
export const LEGACY_SWOP_STOCK_MINT =
  'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB';

type SwapTokenLike = Record<string, any> | null | undefined;

const CHAIN_IDS: Record<string, string> = {
  SOLANA: SOLANA_CHAIN_ID,
  ETHEREUM: '1',
  BSC: '56',
  POLYGON: '137',
  ARBITRUM: '42161',
  BASE: '8453',
};

const normalize = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const stringField = (token: SwapTokenLike, field: string) =>
  token?.[field] === undefined || token?.[field] === null
    ? ''
    : String(token[field]);

export function getSwapTokenChainId(
  token: SwapTokenLike,
  fallback = '',
) {
  if (token?.chainId !== undefined && token?.chainId !== null) {
    return String(token.chainId);
  }

  const chain = String(token?.chain || token?.network || '')
    .trim()
    .toUpperCase();

  return CHAIN_IDS[chain] || fallback;
}

export function getSwapTokenAddressKey(token: SwapTokenLike) {
  return normalize(token?.address || token?.id || token?.mint);
}

function getSwapTokenOwnerKey(token: SwapTokenLike) {
  return normalize(
    token?.walletAddress ||
      token?.ownerAddress ||
      token?.accountAddress ||
      token?.owner ||
      token?.wallet?.address,
  );
}

function getSwapTokenIdentityKey(token: SwapTokenLike) {
  if (!token) return '';
  const addressKey = getSwapTokenAddressKey(token);
  const symbolKey = normalize(token.symbol);
  const decimalsKey = token.decimals ?? '';
  return [
    getSwapTokenChainId(token),
    addressKey || symbolKey,
    decimalsKey,
  ].join('|');
}

function isSolanaToken(token: SwapTokenLike) {
  return (
    getSwapTokenChainId(token) === SOLANA_CHAIN_ID ||
    String(token?.chain || '').toUpperCase() === 'SOLANA' ||
    String(token?.network || '').toUpperCase() === 'SOLANA'
  );
}

export function isCanonicalSwopMint(value: unknown) {
  return normalize(value) === normalize(SWOP_TOKEN_MINT);
}

function isSolanaSwopSelection(token: SwapTokenLike) {
  return normalize(token?.symbol) === 'swop' && isSolanaToken(token);
}

function findCanonicalSwopWalletToken(
  selectedToken: SwapTokenLike,
  walletTokens: SwapTokenLike[],
) {
  const solanaSwopTokens = walletTokens.filter(isSolanaSwopSelection);
  const selectedOwnerKey = getSwapTokenOwnerKey(selectedToken);
  const ownerMatchedTokens = selectedOwnerKey
    ? solanaSwopTokens.filter(
        (token) => getSwapTokenOwnerKey(token) === selectedOwnerKey,
      )
    : solanaSwopTokens;
  if (selectedOwnerKey && ownerMatchedTokens.length === 0) {
    return undefined;
  }

  return (
    ownerMatchedTokens.find((token) =>
      isCanonicalSwopMint(getSwapTokenAddressKey(token)),
    ) ||
    ownerMatchedTokens[0] ||
    solanaSwopTokens.find((token) =>
      isCanonicalSwopMint(getSwapTokenAddressKey(token)),
    ) ||
    solanaSwopTokens[0]
  );
}

function findWalletTokenMatch(
  selectedToken: SwapTokenLike,
  walletTokens: SwapTokenLike[],
) {
  if (isSolanaSwopSelection(selectedToken)) {
    const swopWalletToken = findCanonicalSwopWalletToken(
      selectedToken,
      walletTokens,
    );
    if (swopWalletToken) return swopWalletToken;
  }

  const selectedKey = getSwapTokenIdentityKey(selectedToken);
  if (!selectedKey) return undefined;
  const selectedOwnerKey = getSwapTokenOwnerKey(selectedToken);
  if (selectedOwnerKey) {
    const ownerMatchedToken = walletTokens.find(
      (walletToken) =>
        getSwapTokenIdentityKey(walletToken) === selectedKey &&
        getSwapTokenOwnerKey(walletToken) === selectedOwnerKey,
    );
    if (ownerMatchedToken) return ownerMatchedToken;
    return undefined;
  }

  return walletTokens.find(
    (walletToken) =>
      getSwapTokenIdentityKey(walletToken) === selectedKey,
  );
}

function mergeWalletToken(
  selectedToken: Record<string, any>,
  walletToken: Record<string, any>,
) {
  const nextChainId =
    walletToken.chainId ??
    getSwapTokenChainId(walletToken, getSwapTokenChainId(selectedToken));

  return {
    ...selectedToken,
    ...walletToken,
    address:
      walletToken.address ??
      walletToken.id ??
      walletToken.mint ??
      selectedToken.address,
    id:
      walletToken.id ??
      walletToken.address ??
      walletToken.mint ??
      selectedToken.id,
    chain: walletToken.chain ?? selectedToken.chain,
    chainId: nextChainId,
    decimals: walletToken.decimals ?? selectedToken.decimals,
    balance: walletToken.balance ?? selectedToken.balance,
    logoURI: walletToken.logoURI || selectedToken.logoURI,
    marketData: walletToken.marketData ?? selectedToken.marketData,
  };
}

function hasMeaningfulSelectionChange(
  currentToken: SwapTokenLike,
  nextToken: SwapTokenLike,
) {
  if (
    getSwapTokenIdentityKey(currentToken) !==
    getSwapTokenIdentityKey(nextToken)
  ) {
    return true;
  }

  return [
    'address',
    'id',
    'mint',
    'symbol',
    'name',
    'decimals',
    'balance',
    'chain',
    'chainId',
    'logoURI',
    'walletAddress',
  ].some(
    (field) =>
      stringField(currentToken, field) !== stringField(nextToken, field),
  );
}

export function reconcileSelectedSwapToken<
  T extends Record<string, any> | null | undefined,
>(selectedToken: T, walletTokens: Array<Record<string, any>> = []): T {
  if (!selectedToken || walletTokens.length === 0) return selectedToken;

  const walletToken = findWalletTokenMatch(selectedToken, walletTokens);
  if (!walletToken) return selectedToken;

  const nextToken = mergeWalletToken(selectedToken, walletToken);
  return hasMeaningfulSelectionChange(selectedToken, nextToken)
    ? (nextToken as unknown as T)
    : selectedToken;
}
