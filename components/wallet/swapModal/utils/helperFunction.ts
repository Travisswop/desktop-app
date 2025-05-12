import { TokenInfo, QuoteResponse } from '../types';

function getExchangeRate({
  quote,
  amount,
  inputToken,
  outputToken,
}: {
  quote: QuoteResponse | null;
  amount: string;
  inputToken: TokenInfo | null;
  outputToken: TokenInfo | null;
}): string | null {
  if (!quote?.outAmount || !amount || !inputToken || !outputToken)
    return null;

  try {
    const normalizedInput = parseFloat(amount);
    const normalizedOutput =
      quote.outAmount / 10 ** (outputToken?.decimals || 6);
    const rate = normalizedOutput / normalizedInput;

    const formattedRate = rate.toFixed(4);
    const price = parseFloat(
      outputToken?.marketData?.price ||
        outputToken?.price ||
        outputToken?.usdPrice ||
        '0'
    );
    const formattedUSD = (rate * price).toFixed(2);

    return `1 ${inputToken?.symbol} = ${formattedRate} ${
      outputToken?.symbol
    } ($${Number(
      inputToken?.price || inputToken?.usdPrice || 0
    ).toFixed(4)})`;
  } catch (error) {
    console.error('Error calculating exchange rate:', error);
    return null;
  }
}

export { getExchangeRate };
