function getExchangeRate({
  quote,
  amount,
  inputToken,
  outputToken,
}: {
  quote: any;
  amount: string;
  inputToken: any;
  outputToken: any;
}): string | null {
  if (!quote?.outAmount || !amount) return null;

  const normalizedInput = parseFloat(amount);
  const normalizedOutput = quote.outAmount / 10 ** (outputToken?.decimals || 6);
  const rate = normalizedOutput / normalizedInput;

  const formattedRate = rate.toFixed(4);
  const price = parseFloat(outputToken?.marketData?.price || "0");
  const formattedUSD = (rate * price).toFixed(2);


  return `1 ${inputToken?.symbol} = ${formattedRate} ${outputToken?.symbol} ($${formattedUSD})`;
}

export { getExchangeRate };
