'use client';

/**
 * TradePanel Component
 *
 * Panel for buying/selling outcome tokens in a prediction market.
 * Shows quote, slippage controls, and executes trades.
 */

import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Select,
  SelectItem,
  Slider,
  Card,
  CardBody,
  Spinner,
  Chip,
} from '@nextui-org/react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Connection } from '@solana/web3.js';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { useToast } from '@/hooks/use-toast';
import { usePredictionMarketsStore } from '@/zustandStore/predictionMarketsStore';
import { useGetQuote, useExecuteTrade } from '@/lib/hooks/usePredictionMarkets';
import { Market, Quote } from '@/types/prediction-markets';

interface TradePanelProps {
  market: Market;
  solanaWalletAddress?: string;
}

export const TradePanel: React.FC<TradePanelProps> = ({
  market,
  solanaWalletAddress,
}) => {
  const { toast } = useToast();
  const { wallets: solanaWallets } = useSolanaWallets();
  const selectedWallet = solanaWallets[0];

  const {
    tradeAmount,
    tradeSide,
    selectedOutcomeId,
    maxSlippage,
    setTradeAmount,
    setTradeSide,
    setSelectedOutcomeId,
    setMaxSlippage,
    resetTradeForm,
  } = usePredictionMarketsStore();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const getQuoteMutation = useGetQuote();
  const executeTradeMutation = useExecuteTrade();

  const parsePrice = (v: unknown) => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const n = Number.parseFloat(v);
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  };

  const mid = (bid?: number, ask?: number) => {
    if (bid !== undefined && ask !== undefined) return (bid + ask) / 2;
    return bid ?? ask;
  };

  const yesBid = parsePrice((market as any)?.yesBid);
  const yesAsk = parsePrice((market as any)?.yesAsk);
  const noBid = parsePrice((market as any)?.noBid);
  const noAsk = parsePrice((market as any)?.noAsk);

  const yesMid = mid(yesBid, yesAsk);
  const noMid = mid(noBid, noAsk);

  // Set default outcome if not selected
  useEffect(() => {
    if (!selectedOutcomeId && market.outcomes.length > 0) {
      const first = market.outcomes[0];
      setSelectedOutcomeId((first as any).id ?? first.name);
    }
  }, [selectedOutcomeId, market.outcomes, setSelectedOutcomeId]);

  // Get quote when amount or side changes
  useEffect(() => {
    const amount = parseFloat(tradeAmount);
    if (
      !isNaN(amount) &&
      amount > 0 &&
      selectedOutcomeId &&
      solanaWalletAddress
    ) {
      const timer = setTimeout(() => {
        fetchQuote(amount);
      }, 500); // Debounce

      return () => clearTimeout(timer);
    } else {
      setQuote(null);
    }
  }, [tradeAmount, tradeSide, selectedOutcomeId]);

  const fetchQuote = async (amount: number) => {
    if (!selectedOutcomeId) return;

    setQuoteLoading(true);
    try {
      const quoteData = await getQuoteMutation.mutateAsync({
        marketId: market.id,
      outcomeId: selectedOutcomeId,
        amount,
        side: tradeSide,
      });
      setQuote(quoteData);
    } catch (error) {
      console.error('Error fetching quote:', error);
      toast({
        variant: 'destructive',
        title: 'Quote Error',
        description:
          error instanceof Error ? error.message : 'Failed to get quote',
      });
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleTrade = async () => {
    if (!quote || !selectedOutcomeId || !solanaWalletAddress || !selectedWallet) {
      toast({
        variant: 'destructive',
        title: 'Cannot Execute Trade',
        description: 'Please ensure you have a Solana wallet connected',
      });
      return;
    }

    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
      });
      return;
    }

    try {
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
      if (!rpcUrl) {
        throw new Error('Solana RPC URL not configured');
      }

      const connection = new Connection(rpcUrl, 'confirmed');

      const signature = await executeTradeMutation.mutateAsync({
        tradeParams: {
          marketId: market.id,
          outcomeId: selectedOutcomeId,
          side: tradeSide,
          amount,
          maxSlippage: maxSlippage / 100, // Convert percentage to decimal
          walletAddress: solanaWalletAddress,
        },
        wallet: selectedWallet,
        connection,
      });

      toast({
        title: 'Trade Successful',
        description: `Your ${tradeSide} order has been executed`,
      });

      // Reset form
      resetTradeForm();
      setQuote(null);
    } catch (error) {
      console.error('Trade execution error:', error);
      toast({
        variant: 'destructive',
        title: 'Trade Failed',
        description:
          error instanceof Error ? error.message : 'Failed to execute trade',
      });
    }
  };

  const selectedOutcome = market.outcomes.find(
    (o) => (o as any).id === selectedOutcomeId || o.name === selectedOutcomeId
  );

  const isTradeDisabled =
    !solanaWalletAddress ||
    !selectedOutcomeId ||
    !tradeAmount ||
    parseFloat(tradeAmount) <= 0 ||
    quoteLoading ||
    !quote ||
    executeTradeMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Buy/Sell Tabs */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          color={tradeSide === 'buy' ? 'success' : 'default'}
          variant={tradeSide === 'buy' ? 'solid' : 'bordered'}
          onPress={() => setTradeSide('buy')}
          startContent={<TrendingUp className="w-4 h-4" />}
        >
          Buy
        </Button>
        <Button
          color={tradeSide === 'sell' ? 'danger' : 'default'}
          variant={tradeSide === 'sell' ? 'solid' : 'bordered'}
          onPress={() => setTradeSide('sell')}
          startContent={<TrendingDown className="w-4 h-4" />}
        >
          Sell
        </Button>
      </div>

      {/* Outcome Selection */}
      <Select
        label="Select Outcome"
        placeholder="Choose an outcome"
        aria-label="Select outcome to trade"
        selectedKeys={selectedOutcomeId ? [selectedOutcomeId] : []}
        onChange={(e) => setSelectedOutcomeId(e.target.value)}
        variant="bordered"
      >
        {market.outcomes.map((outcome) => {
          const name = outcome.name;
          const isYes = name.toLowerCase() === 'yes';
          const isNo = name.toLowerCase() === 'no';
          const legacyProbability = parsePrice((outcome as any).probability);
          const legacyPrice = parsePrice((outcome as any).price);
          const quotePrice = isYes ? yesMid : isNo ? noMid : legacyPrice;
          const probability = legacyProbability ?? quotePrice ?? legacyPrice ?? 0;
          const displayText = `${name} - ${(probability * 100).toFixed(1)}%`;
          return (
            <SelectItem
              key={(outcome as any).id ?? name}
              value={(outcome as any).id ?? name}
              textValue={displayText}
            >
              {displayText}
            </SelectItem>
          );
        })}
      </Select>

      {/* Amount Input */}
      <Input
        type="number"
        label={`Amount (${tradeSide === 'buy' ? 'tokens to buy' : 'tokens to sell'})`}
        aria-label="Trade amount"
        placeholder="0.00"
        value={tradeAmount}
        onValueChange={setTradeAmount}
        variant="bordered"
        min="0"
        step="0.01"
      />

      {/* Slippage Control */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-700">
            Max Slippage
          </label>
          <span className="text-sm font-semibold text-gray-900">
            {maxSlippage}%
          </span>
        </div>
        <Slider
          label="Max Slippage"
          size="sm"
          step={0.1}
          minValue={0.1}
          maxValue={5}
          value={maxSlippage}
          onChange={(value) => setMaxSlippage(value as number)}
          className="w-full"
          color="success"
          aria-label="Max slippage percentage"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0.1%</span>
          <span>5%</span>
        </div>
      </div>

      {/* Quote Display */}
      {quoteLoading && (
        <Card>
          <CardBody className="flex items-center justify-center py-6">
            <Spinner size="sm" color="success" aria-label="Loading quote" />
            <p className="text-sm text-gray-600 mt-2">Getting quote...</p>
          </CardBody>
        </Card>
      )}

      {quote && !quoteLoading && (
        <Card className="bg-gray-50">
          <CardBody className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Price per token</span>
              <span className="font-semibold">${(quote.price ?? 0).toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {tradeSide === 'buy' ? 'Total Cost' : 'Total Proceeds'}
              </span>
              <span className="font-bold text-lg">
                ${(quote.total ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Fees</span>
              <span className="font-medium">${(quote.fees ?? 0).toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Price Impact</span>
              <span
                className={
                  (quote.priceImpact ?? 0) > 1 ? 'text-red-600' : 'text-green-600'
                }
              >
                {(quote.priceImpact ?? 0).toFixed(2)}%
              </span>
            </div>
            {(quote.priceImpact ?? 0) > 2 && (
              <div className="flex items-start gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>High price impact. Consider reducing amount.</span>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Wallet Warning */}
      {!solanaWalletAddress && (
        <div className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Please connect your Solana wallet to trade</span>
        </div>
      )}

      {/* Trade Button */}
      <Button
        color={tradeSide === 'buy' ? 'success' : 'danger'}
        size="lg"
        className="w-full font-semibold"
        onPress={handleTrade}
        isDisabled={isTradeDisabled}
        isLoading={executeTradeMutation.isPending}
      >
        {executeTradeMutation.isPending
          ? 'Executing...'
          : `${tradeSide === 'buy' ? 'Buy' : 'Sell'} ${selectedOutcome?.name || 'Outcome'}`}
      </Button>

      {/* Success Message */}
      {executeTradeMutation.isSuccess && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg">
          <CheckCircle2 className="w-4 h-4" />
          <span>Trade executed successfully!</span>
        </div>
      )}
    </div>
  );
};

export default TradePanel;
