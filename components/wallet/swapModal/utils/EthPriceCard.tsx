import React from 'react';
import { TokenInfo } from '../types';
import { EthSwapQuote } from './handleEthSwap';
import { formatUSDEth } from './ethSwapUtils';

interface EthPriceCardProps {
    quote: EthSwapQuote;
    inputToken: TokenInfo;
    outputToken: TokenInfo;
    loading: boolean;
    slippageBps: number;
}

export default function EthPriceCard({
    quote,
    inputToken,
    outputToken,
    loading,
    slippageBps,
}: EthPriceCardProps) {
    if (!quote || loading) {
        return (
            <div className="bg-gray-100 rounded-lg p-3 space-y-2 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
        );
    }

    // Calculate price information
    const exchangeRate = parseFloat(quote.outputAmount) / parseFloat(quote.inputAmount);
    const formattedRate = exchangeRate.toFixed(6);

    // Calculate minimum output based on slippage
    const slippagePercent = slippageBps / 10000;
    const minOutput = parseFloat(quote.outputAmount) * (1 - slippagePercent);
    const formattedMinOutput = minOutput.toFixed(6);

    // Extract price impact percentage (remove % if present)
    const priceImpactValue = typeof quote.priceImpact === 'string' && quote.priceImpact.endsWith('%')
        ? parseFloat(quote.priceImpact.replace('%', ''))
        : parseFloat(quote.priceImpact);

    // Calculate USD values if prices are available
    const inputUsdValue = inputToken?.price
        ? formatUSDEth(inputToken.price, quote.inputAmount)
        : '—';

    const outputUsdValue = outputToken?.price
        ? formatUSDEth(outputToken.price, quote.outputAmount)
        : '—';

    return (
        <div className="bg-gray-100 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between items-center">
                <span className="text-gray-500">Rate</span>
                <span className="font-medium">
                    1 {inputToken?.symbol} = {formattedRate} {outputToken?.symbol}
                </span>
            </div>

            <div className="flex justify-between items-center">
                <span className="text-gray-500">Price Impact</span>
                <span className={`font-medium ${priceImpactValue > 5 ? 'text-red-500' :
                    priceImpactValue > 3 ? 'text-orange-500' : 'text-green-500'
                    }`}>
                    {quote.priceImpact}
                </span>
            </div>

            <div className="flex justify-between items-center">
                <span className="text-gray-500">Minimum Output</span>
                <span className="font-medium">
                    {formattedMinOutput} {outputToken?.symbol}
                </span>
            </div>

            <div className="flex justify-between items-center">
                <span className="text-gray-500">Network Fee</span>
                <span className="font-medium">
                    ~{quote.gasEstimate ?
                        `${(parseInt(quote.gasEstimate) / 1e9).toFixed(6)} ETH` :
                        'Calculating...'}
                </span>
            </div>

            {(inputUsdValue !== '—' || outputUsdValue !== '—') && (
                <div className="flex justify-between items-center border-t border-gray-200 pt-1 mt-1">
                    <span className="text-gray-500">Value</span>
                    <span className="font-medium">
                        ${inputUsdValue} → ${outputUsdValue}
                    </span>
                </div>
            )}
        </div>
    );
}