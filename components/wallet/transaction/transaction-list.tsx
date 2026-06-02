'use client';

import { useMultiChainTransactionData } from '@/lib/hooks/useTransaction';
import { Transaction } from '@/types/transaction';
import { AlertCircle, Loader2, Search, X } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import TransactionDetails from './transaction-details';
import TransactionItem from './transaction-item';
import { ChainType, TokenData } from '@/types/token';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

type Network = 'ETHEREUM' | 'POLYGON' | 'BASE' | 'SOLANA';

type FilterId = 'all' | 'received' | 'sent' | 'swaps' | 'pending';

const ITEMS_PER_PAGE = 20;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'received', label: 'Received' },
  { id: 'sent', label: 'Sent' },
  { id: 'swaps', label: 'Swaps' },
  { id: 'pending', label: 'Pending' },
];

type BucketKey = 'today' | 'yesterday' | 'earlier';

const BUCKET_ORDER: BucketKey[] = ['today', 'yesterday', 'earlier'];

const BUCKET_LABELS: Record<BucketKey, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

const bucketFor = (tx: Transaction, now: Date): BucketKey => {
  const ts = parseInt(tx.timeStamp, 10) * 1000;
  if (Number.isNaN(ts)) return 'earlier';
  const today = startOfDay(now);
  const yesterday = today - 86400000;
  if (ts >= today) return 'today';
  if (ts >= yesterday) return 'yesterday';
  return 'earlier';
};

const txMatchesFilter = (
  tx: Transaction,
  filter: FilterId,
  userIsOutgoing: (t: Transaction) => boolean,
) => {
  switch (filter) {
    case 'all':
      return true;
    case 'received':
      return !tx.isSwapped && !userIsOutgoing(tx);
    case 'sent':
      return !tx.isSwapped && userIsOutgoing(tx);
    case 'swaps':
      return !!tx.isSwapped;
    case 'pending':
      return (
        tx.status === 'pending' ||
        (tx.txreceipt_status === undefined && !tx.hash)
      );
  }
};

const usdValue = (tx: Transaction): number => {
  if (tx.isSwapped && tx.swapped) {
    const fromVal =
      parseFloat(tx.swapped.from.value) *
      (tx.swapped.from.price || 0);
    return Number.isFinite(fromVal) ? fromVal : 0;
  }
  const v = parseFloat(tx.value) * (tx.currentPrice || 0);
  return Number.isFinite(v) ? v : 0;
};

const formatNet = (net: number) => {
  if (Math.abs(net) < 0.01) return 'net $0.00';
  const sign = net >= 0 ? '+' : '−';
  const abs = Math.abs(net).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `net ${sign}$${abs}`;
};

const TransactionSkeleton = () => (
  <div className="space-y-px">
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className="grid grid-cols-[36px_1fr_auto] gap-3.5 items-center px-6 py-3 animate-pulse"
      >
        <div className="w-9 h-9 rounded-[10px] bg-zinc-100" />
        <div>
          <div className="h-3.5 w-32 bg-zinc-100 rounded mb-2" />
          <div className="h-2.5 w-44 bg-zinc-100 rounded" />
        </div>
        <div className="text-right">
          <div className="h-3.5 w-20 bg-zinc-100 rounded mb-2 ml-auto" />
          <div className="h-2.5 w-14 bg-zinc-100 rounded ml-auto" />
        </div>
      </div>
    ))}
  </div>
);

const ErrorMessage = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="bg-red-50 border border-red-100 mx-6 mt-3 px-3 py-2.5 rounded-xl flex items-center justify-between gap-3">
    <div className="flex items-center gap-2 min-w-0">
      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
      <p className="text-xs text-red-600 truncate">{message}</p>
    </div>
    <Button
      variant="outline"
      size="sm"
      onClick={onRetry}
      className="h-7 text-xs text-red-600 hover:text-red-700 border-red-200"
    >
      Try Again
    </Button>
  </div>
);

export default function TransactionList({
  solWalletAddress,
  evmWalletAddress,
  chains,
  tokens,
  newTransactions,
  onClose,
}: {
  solWalletAddress: string;
  evmWalletAddress: string;
  chains: ChainType[];
  tokens: TokenData[];
  newTransactions: any;
  onClose?: () => void;
}) {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [displayLimit, setDisplayLimit] = useState(ITEMS_PER_PAGE);
  const [filter, setFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');

  const { transactions, loading, error, refetch } =
    useMultiChainTransactionData(
      solWalletAddress,
      evmWalletAddress,
      chains,
      { limit: 10000, offset: 0 },
    );

  const isSpamToken = useCallback(
    (tokenSymbol?: string, tokenName?: string): boolean => {
      if (!tokenSymbol && !tokenName) return false;
      const spamIndicators = [
        /visit|claim|voucher|airdrop|\.io|\.com|\.me|\.do|t\.me|telegram/i,
        /^✅/,
        /^\$[A-Z]+.*claim/i,
        /distribution/i,
      ];
      const textToCheck = `${tokenSymbol || ''} ${tokenName || ''}`;
      return spamIndicators.some((p) => p.test(textToCheck));
    },
    [],
  );

  const userIsOutgoing = useCallback(
    (tx: Transaction) => {
      if (tx.flow) return tx.flow === 'out';
      const from = tx.from?.toLowerCase() || '';
      const sol = solWalletAddress?.toLowerCase() || '';
      const evm = evmWalletAddress?.toLowerCase() || '';
      return from === sol || from === evm;
    },
    [solWalletAddress, evmWalletAddress],
  );

  const processedTransactions = useMemo(() => {
    const priceBySymbol = new Map<string, number>();
    const tokenByAddress = new Map<string, TokenData>();
    const tokenBySymbol = new Map<string, TokenData>();
    const tokenBySymbolAndChain = new Map<string, TokenData>();

    const normalizeChain = (chain?: string) =>
      chain?.toUpperCase() === 'SOLANA'
        ? 'SOLANA'
        : chain?.toUpperCase();

    const tokenIcon = (token?: TokenData) =>
      token?.logoURI || token?.marketData?.iconUrl || '';

    tokens.forEach((t: TokenData) => {
      const price = t.marketData?.price
        ? parseFloat(t.marketData.price)
        : 0;
      priceBySymbol.set(t.symbol.toUpperCase(), price);

      if (t.address) {
        tokenByAddress.set(t.address.toLowerCase(), t);
      }

      tokenBySymbol.set(t.symbol.toUpperCase(), t);
      tokenBySymbolAndChain.set(
        `${t.chain}:${t.symbol.toUpperCase()}`,
        t,
      );
    });

    const getPrice = (symbol?: string): number =>
      symbol ? (priceBySymbol.get(symbol.toUpperCase()) ?? 0) : 0;

    const findToken = (tx: Transaction, symbol?: string) => {
      const contractAddress = tx.contractAddress?.toLowerCase();
      if (contractAddress && tokenByAddress.has(contractAddress)) {
        return tokenByAddress.get(contractAddress);
      }

      if (!symbol) return undefined;

      const chain = normalizeChain(tx.network);
      const symbolKey = symbol.toUpperCase();
      return (
        tokenBySymbolAndChain.get(`${chain}:${symbolKey}`) ??
        tokenBySymbol.get(symbolKey)
      );
    };

    const findNativeToken = (tx: Transaction) => {
      const chain = normalizeChain(tx.network);
      return tokens.find(
        (t: TokenData) =>
          t.isNative === true &&
          (!chain || normalizeChain(t.chain) === chain),
      );
    };

    const all = [...transactions, ...newTransactions];

    return all.reduce<Transaction[]>((acc, tx) => {
      if (isSpamToken(tx.tokenSymbol, tx.tokenName)) return acc;
      if (tx.isError === '1' || tx.txreceipt_status === '0')
        return acc;

      const token = findToken(tx, tx.tokenSymbol);
      const nativeToken = findNativeToken(tx);
      const currentPrice = token?.marketData?.price
        ? parseFloat(token.marketData.price)
        : getPrice(tx.tokenSymbol);
      const nativeTokenPrice = nativeToken?.marketData?.price
        ? parseFloat(nativeToken.marketData.price)
        : currentPrice || 1;

      if (!tx.tokenSymbol || tx.tokenSymbol === '') {
        if (nativeToken) {
          acc.push({
            ...tx,
            currentPrice: nativeToken.marketData?.price
              ? parseFloat(nativeToken.marketData.price)
              : 0,
            nativeTokenPrice,
            tokenLogo: tx.tokenLogo || tokenIcon(nativeToken),
          });
        }
        return acc;
      }

      const enrichedTx: Transaction = {
        ...tx,
        currentPrice,
        nativeTokenPrice,
        tokenLogo: tx.tokenLogo || tokenIcon(token),
        swapped: tx.swapped
          ? {
              from: {
                ...tx.swapped.from,
                price: getPrice(tx.swapped.from.symbol),
                logo:
                  tx.swapped.from.logo ||
                  tokenIcon(findToken(tx, tx.swapped.from.symbol)),
              },
              to: {
                ...tx.swapped.to,
                price: getPrice(tx.swapped.to.symbol),
                logo:
                  tx.swapped.to.logo ||
                  tokenIcon(findToken(tx, tx.swapped.to.symbol)),
              },
            }
          : undefined,
      };

      acc.push(enrichedTx);
      return acc;
    }, []);
  }, [isSpamToken, newTransactions, tokens, transactions]);

  const filteredTransactions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return processedTransactions.filter((tx) => {
      if (!txMatchesFilter(tx, filter, userIsOutgoing)) return false;
      if (!q) return true;
      return (
        tx.hash?.toLowerCase().includes(q) ||
        tx.from?.toLowerCase().includes(q) ||
        tx.to?.toLowerCase().includes(q) ||
        tx.tokenSymbol?.toLowerCase().includes(q) ||
        tx.tokenName?.toLowerCase().includes(q) ||
        tx.swapped?.from.symbol?.toLowerCase().includes(q) ||
        tx.swapped?.to.symbol?.toLowerCase().includes(q)
      );
    });
  }, [processedTransactions, filter, query, userIsOutgoing]);

  const displayedTransactions = useMemo(
    () => filteredTransactions.slice(0, displayLimit),
    [filteredTransactions, displayLimit],
  );

  const groupedDisplayed = useMemo(() => {
    const now = new Date();
    const groups: Record<BucketKey, Transaction[]> = {
      today: [],
      yesterday: [],
      earlier: [],
    };
    displayedTransactions.forEach((tx) =>
      groups[bucketFor(tx, now)].push(tx),
    );
    return groups;
  }, [displayedTransactions]);

  const groupNets = useMemo(() => {
    const out = { today: 0, yesterday: 0, earlier: 0 } as Record<
      BucketKey,
      number
    >;
    (Object.keys(groupedDisplayed) as BucketKey[]).forEach((k) => {
      out[k] = groupedDisplayed[k].reduce((acc, tx) => {
        const v = usdValue(tx);
        return acc + (userIsOutgoing(tx) && !tx.isSwapped ? -v : v);
      }, 0);
    });
    return out;
  }, [groupedDisplayed, userIsOutgoing]);

  const pendingCount = useMemo(
    () =>
      processedTransactions.filter(
        (tx) =>
          tx.status === 'pending' ||
          (tx.txreceipt_status === undefined && !tx.hash),
      ).length,
    [processedTransactions],
  );

  const hasMoreToDisplay = displayLimit < filteredTransactions.length;

  const loadMore = useCallback(
    () => setDisplayLimit((p) => p + ITEMS_PER_PAGE),
    [],
  );
  const handleTransactionSelect = useCallback(
    (transaction: Transaction) => setSelectedTransaction(transaction),
    [],
  );
  const handleCloseDetails = useCallback(
    () => setSelectedTransaction(null),
    [],
  );

  return (
    <>
      <section className="w-full h-full flex flex-col overflow-hidden bg-white">
        {/* Header */}
        <div className="px-6 pt-4 pb-3.5 border-b border-black/[0.06]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10.5px] font-bold tracking-[1.4px] uppercase text-zinc-500 font-mono">
                Activity
              </span>
              <div className="text-[17px] font-semibold tracking-[-0.3px] mt-1 text-[#0a0a0c] flex items-center gap-2">
                All transactions
                {loading && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                )}
              </div>
              <div className="text-[11.5px] text-zinc-500 mt-0.5">
                {processedTransactions.length.toLocaleString()}{' '}
                records
                {pendingCount > 0 && ` · ${pendingCount} pending`}
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-lg bg-zinc-50 border border-black/[0.06] inline-flex items-center justify-center hover:bg-zinc-100 shrink-0"
              >
                <X className="w-3.5 h-3.5 text-[#0a0a0c]" />
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-6 pt-3.5">
          <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] border border-black/[0.06] bg-zinc-50">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search address, hash, asset…"
              className="w-full bg-transparent outline-none text-[12.5px] text-[#0a0a0c] placeholder:text-zinc-400"
            />
          </label>
        </div>

        {/* Filter chips */}
        <div className="px-6 py-3 flex gap-1.5 flex-wrap border-b border-black/[0.06]">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`h-7 px-2.5 rounded-full text-[12px] font-medium tracking-[-0.1px] inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#0a0a0c] text-white border border-[#0a0a0c]'
                    : 'bg-white text-[#0a0a0c] border border-black/[0.06] hover:bg-zinc-50'
                }`}
              >
                {f.label}
                {f.id === 'pending' && pendingCount > 0 && (
                  <span
                    className={`px-1.5 py-px rounded-full text-[9.5px] font-bold leading-none ${
                      active
                        ? 'bg-white text-[#0a0a0c]'
                        : 'bg-[#0a0a0c] text-white'
                    }`}
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <ErrorMessage
            message="Failed to load transactions. Please try again."
            onRetry={refetch}
          />
        )}

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {loading && displayedTransactions.length === 0 ? (
            <TransactionSkeleton />
          ) : (
            <ScrollArea className="h-full">
              {BUCKET_ORDER.map((bucket) => {
                const rows = groupedDisplayed[bucket];
                if (rows.length === 0) return null;
                const net = groupNets[bucket];
                return (
                  <div key={bucket}>
                    <div className="px-6 py-2.5 flex items-center justify-between bg-zinc-50 border-t border-black/[0.06] first:border-t-0">
                      <span className="text-[10.5px] font-bold tracking-[1.2px] uppercase text-zinc-500 font-mono">
                        {BUCKET_LABELS[bucket]}
                      </span>
                      <span className="text-[10.5px] text-zinc-500 font-mono">
                        {bucket === 'earlier'
                          ? `${rows.length} transactions`
                          : formatNet(net)}
                      </span>
                    </div>
                    {rows.map((tx) => (
                      <TransactionItem
                        key={
                          tx.hash ||
                          `${tx.timeStamp}-${tx.from}-${tx.to}-${tx.value}`
                        }
                        transaction={tx}
                        isOutgoing={userIsOutgoing(tx)}
                        onSelect={handleTransactionSelect}
                      />
                    ))}
                  </div>
                );
              })}

              {displayedTransactions.length === 0 && !loading && (
                <div className="text-center py-12 text-zinc-500 text-sm">
                  No transactions found
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        {processedTransactions.length > 0 && (
          <div className="px-6 py-3.5 border-t border-black/[0.06] bg-zinc-50 flex items-center justify-between gap-3">
            <span className="text-[11.5px] text-zinc-500">
              Showing {displayedTransactions.length} of{' '}
              {filteredTransactions.length}
            </span>
            {hasMoreToDisplay && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="h-7 px-2.5 rounded-full text-[12px] font-medium bg-white text-[#0a0a0c] border border-black/[0.06] inline-flex items-center gap-1.5 hover:bg-zinc-100 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading
                  </>
                ) : (
                  'Load more'
                )}
              </button>
            )}
          </div>
        )}
      </section>

      <TransactionDetails
        transaction={selectedTransaction}
        userAddress={
          selectedTransaction?.network === 'SOLANA'
            ? solWalletAddress
            : evmWalletAddress
        }
        network={
          (selectedTransaction?.network || 'SOLANA') as Network
        }
        isOpen={!!selectedTransaction}
        onClose={handleCloseDetails}
      />
    </>
  );
}
