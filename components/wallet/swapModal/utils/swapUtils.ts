export const getTokenInfoBySymbol = (
  symbol: string,
  userToken: any[],
  tokenMetaData: any[]
) => {
  const baseToken = tokenMetaData?.find((t) => t.symbol === symbol);
  const userHeldToken = userToken?.find((t: any) => t.symbol === symbol);
  if (!baseToken) return null;

  return {
    ...baseToken,
    balance: userHeldToken?.balance || "0",
    marketData: userHeldToken?.marketData || null,
  };
};

export const formatUSD = (price: string, amount: string): string => {
  const numAmount = parseFloat(amount);
  const priceNum = parseFloat(price);
  return (numAmount * priceNum).toFixed(4);
};
