'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePolymarketWallet } from '@/providers/polymarket';
import { useToast } from '@/hooks/use-toast';
import {
  getPolymarketOrderPrefill,
  readAgentActionHandoff,
  type PolymarketAgentOrderPrefill,
} from '@/lib/chat/agentActionHandoff';
import type { PolymarketMarket } from '@/hooks/polymarket';
import {
  marketRouteKey,
  useMarketDetailStore,
} from '@/zustandStore/marketDetailStore';
import TransferModal from './TransferModal';
import PredictionsPanel, {
  type PredictionsPanelView,
} from './PredictionsPanel';

type TransferTab = 'deposit' | 'withdraw';

const VALID_VIEWS: PredictionsPanelView[] = [
  'main',
  'orders',
  'bets',
  'history',
];

const CANVAS = '#ecebe6';

/**
 * Standalone host for the predictions experience at the /prediction
 * route. Equivalent of the wallet-page modal flow, but rendered as a
 * dedicated page so drill-downs (View all / Browse) live on a real URL.
 */
export default function PredictionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const {
    authenticated,
    isReady,
    isInitializing,
    hasWallet,
    retryInitialization,
  } = usePolymarketWallet();

  const viewParam = searchParams?.get('view') as PredictionsPanelView | null;
  const initialView: PredictionsPanelView =
    viewParam && VALID_VIEWS.includes(viewParam) ? viewParam : 'main';

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTab, setTransferTab] = useState<TransferTab>('deposit');
  const handledAgentActionRef = useRef<string | null>(null);
  const setMarketDetail = useMarketDetailStore((s) => s.set);

  const handleTransfer = useCallback((tab: TransferTab) => {
    setTransferTab(tab);
    setTransferModalOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    router.push('/wallet');
  }, [router]);

  const openApprovedPredictionAction = useCallback(async () => {
    const handoff = readAgentActionHandoff();
    const prefill = getPolymarketOrderPrefill(handoff);
    if (!prefill) return;

    const actionKey =
      prefill.proposalNonce || prefill.proposalId || JSON.stringify(prefill);
    if (handledAgentActionRef.current === actionKey) return;
    handledAgentActionRef.current = actionKey;

    const market = await findMarketForAgentPrefill(prefill);
    if (!market) {
      toast({
        title: 'Agent proposal approved',
        description:
          'Open the matching prediction market to review and sign the action.',
      });
      return;
    }

    const key = marketRouteKey(market);
    const outcome = prefill.outcome || inferOutcomeFromToken(market, prefill.tokenId);
    setMarketDetail(key, {
      market,
      initialOutcome: outcome,
      initialAmount: prefill.amount,
      initialSide: prefill.side,
      initialOrderType: prefill.orderType,
      initialLimitPrice: prefill.limitPrice,
    });

    const query = new URLSearchParams();
    query.set('agentAction', 'approved');
    if (prefill.proposalId) query.set('proposalId', prefill.proposalId);
    if (outcome) query.set('outcome', outcome);
    if (prefill.amount) query.set('amount', prefill.amount);
    if (prefill.side) query.set('side', prefill.side);
    if (prefill.orderType) query.set('orderType', prefill.orderType);
    if (prefill.limitPrice) query.set('limitPrice', prefill.limitPrice);

    router.push(`/prediction/market/${encodeURIComponent(key)}?${query.toString()}`);
    toast({
      title: 'Agent proposal approved',
      description: 'Review the prediction trade before signing.',
    });
  }, [router, setMarketDetail, toast]);

  useEffect(() => {
    const fundsParam = searchParams?.get('funds') || searchParams?.get('addFunds');
    if (fundsParam === 'deposit' || fundsParam === '1') {
      handleTransfer('deposit');
    }
  }, [handleTransfer, searchParams]);

  useEffect(() => {
    if (!authenticated || !isReady || !hasWallet) return undefined;

    openApprovedPredictionAction();
    window.addEventListener(
      'swop:agent-approved-action',
      openApprovedPredictionAction,
    );

    return () => {
      window.removeEventListener(
        'swop:agent-approved-action',
        openApprovedPredictionAction,
      );
    };
  }, [authenticated, hasWallet, isReady, openApprovedPredictionAction]);

  if (!authenticated || isInitializing || !hasWallet) {
    return (
      <div
        className="relative -m-6 min-h-[calc(100vh-6rem)] flex items-center justify-center"
        style={{ background: CANVAS }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">
            Loading predictions...
          </p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div
        className="relative -m-6 min-h-[calc(100vh-6rem)] flex items-center justify-center"
        style={{ background: CANVAS }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-gray-600 font-medium">
            Wallet found but could not initialize.
          </p>
          <button
            onClick={retryInitialization}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Retry wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PredictionsPanel
        initialView={initialView}
        onClose={handleClose}
        onOpenTransfer={handleTransfer}
        embedded
      />
      <TransferModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        defaultTab={transferTab}
      />
    </>
  );
}

async function findMarketForAgentPrefill(
  prefill: PolymarketAgentOrderPrefill,
): Promise<PolymarketMarket | null> {
  if (!prefill.marketRouteKey && !prefill.tokenId) return null;

  const response = await fetch('/api/polymarket/desktop/markets?limit=100&offset=0');
  if (!response.ok) return null;

  const markets = (await response.json().catch(() => [])) as PolymarketMarket[];
  return markets.find((market) => marketMatchesPrefill(market, prefill)) || null;
}

function marketMatchesPrefill(
  market: PolymarketMarket,
  prefill: PolymarketAgentOrderPrefill,
): boolean {
  const keys = [
    market.conditionId,
    market.id,
    market.slug,
  ].filter(Boolean);

  if (prefill.marketRouteKey && keys.includes(prefill.marketRouteKey)) {
    return true;
  }

  if (!prefill.tokenId || !market.clobTokenIds) return false;

  try {
    const tokenIds = JSON.parse(market.clobTokenIds) as string[];
    return tokenIds.map(String).includes(prefill.tokenId);
  } catch {
    return false;
  }
}

function inferOutcomeFromToken(
  market: PolymarketMarket,
  tokenId?: string,
): 'yes' | 'no' | undefined {
  if (!tokenId || !market.clobTokenIds) return undefined;

  try {
    const tokenIds = JSON.parse(market.clobTokenIds) as string[];
    const index = tokenIds.map(String).indexOf(tokenId);
    if (index === 0) return 'yes';
    if (index === 1) return 'no';
  } catch {
    return undefined;
  }

  return undefined;
}
