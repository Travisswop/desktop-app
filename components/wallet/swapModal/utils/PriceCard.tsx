import React from 'react';
import { QuoteResponse, TokenInfo } from '../types';
import { ArrowRight, Info } from 'lucide-react';

interface PriceCardProps {
  quote: QuoteResponse | null;
  inputToken: TokenInfo | null;
  outputToken: TokenInfo | null;
  loading: boolean;
  slippageBps: number;
}

export default function PriceCard({
  quote,
  inputToken,
  outputToken,
  loading,
  slippageBps,
}: PriceCardProps) {
  if (!quote || !inputToken || !outputToken || loading) {
    return null;
  }

  // Calculate minimum received based on slippage
  const outAmount = quote.outAmount;
  const minReceived = outAmount - (outAmount * slippageBps) / 10000;
  const formattedMinReceived = (
    minReceived /
    10 ** (outputToken.decimals || 9)
  ).toFixed(6);

  // Format price impact
  const priceImpact = parseFloat(quote.priceImpactPct);
  const priceImpactFormatted = (priceImpact * 100).toFixed(2);

  // Determine price impact severity
  let priceImpactClass = 'text-green-500';
  if (priceImpact > 0.05) priceImpactClass = 'text-yellow-500';
  if (priceImpact > 0.1) priceImpactClass = 'text-orange-500';
  if (priceImpact > 0.2) priceImpactClass = 'text-red-500';

  return (
    <div className="bg-[#F7F7F7] rounded-xl p-3 my-3 text-sm">
      <div className="flex justify-between mb-2">
        <span className="text-gray-500 flex items-center gap-1">
          Rate
          <Info className="w-3 h-3" />
        </span>
        <span className="font-medium">
          1 {inputToken.symbol} ≈{' '}
          {(
            quote.outAmount /
            10 ** (outputToken.decimals || 9) /
            (quote.inAmount / 10 ** (inputToken.decimals || 9))
          ).toFixed(6)}{' '}
          {outputToken.symbol}
        </span>
      </div>

      <div className="flex justify-between mb-2">
        <span className="text-gray-500 flex items-center gap-1">
          Price Impact
          <Info className="w-3 h-3" />
        </span>
        <span className={`font-medium ${priceImpactClass}`}>
          {priceImpactFormatted}%
        </span>
      </div>

      <div className="flex justify-between mb-2">
        <span className="text-gray-500 flex items-center gap-1">
          Minimum Received
          <Info className="w-3 h-3" />
        </span>
        <span className="font-medium">
          {formattedMinReceived} {outputToken.symbol}
        </span>
      </div>

      {quote.routePlan && quote.routePlan.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-200">
          <div className="text-gray-500 mb-1">Route</div>
          <div className="flex items-center flex-wrap gap-1">
            {quote.routePlan.map((step: any, index: number) => (
              <React.Fragment key={index}>
                <span className="bg-white px-2 py-1 rounded-md text-xs">
                  {step.swapInfo?.label || 'Direct'}
                </span>
                {index < quote.routePlan.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="flex justify-between">
          <span className="text-gray-500">Network Fee (est.)</span>
          <span className="font-medium">~0.0005 SOL</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Platform Fee</span>
          <span className="font-medium">0.5%</span>
        </div>
      </div>
    </div>
  );
}
