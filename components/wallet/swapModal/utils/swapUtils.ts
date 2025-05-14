import { TokenInfo } from '../types';

export const getTokenInfoBySymbol = (
  symbol: string,
  userToken: TokenInfo[],
  tokenMetaData: TokenInfo[]
): TokenInfo => {
  const baseToken =
    tokenMetaData && Array.isArray(tokenMetaData)
      ? tokenMetaData.find((t) => t.symbol === symbol)
      : undefined;

  const userHeldToken =
    userToken && Array.isArray(userToken)
      ? userToken.find((t) => t.symbol === symbol)
      : undefined;

  // Ensure a valid symbol is returned even if tokens aren't found
  const result: TokenInfo = {
    symbol: symbol,
    balance: userHeldToken?.balance || '0',
    ...(baseToken || {}),
    ...(userHeldToken?.marketData || {}),
    ...(userHeldToken || {}),
  };

  return result;
};

export const formatUSD = (price: string, amount: string): string => {
  const numAmount = parseFloat(amount);
  const priceNum = parseFloat(price);

  return (numAmount * priceNum).toFixed(4);
};

export const TOKEN_ADDRESSES = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  mSOL: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
  PYTH: 'FsSM8FCNugKjM2XbqZrMyCz5KhXb1F5s9k1hDfKTZ5No',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  ORCA: 'orcaDUFxE73ZjqKWVFYvS5MZ8JcNfLMz9rApUvdjRUa',
  LDO: 'HZxvDwM4JC9qTAcW3FbymZzjzJePdrUyzEGCJjcpaJJd',
  C98: '5L5vV7hU8kMn1Wv5PAELyd4p9BA6rTN37xS7QeYF5eEb',
  WBTC: '8FQo7Ao5jZPxhSh53PE3H5MaS5bAfeLmtc7hu2GF36nZ',
  ETH: '2ojXQdFxk2YcZC8FfR4Yu8Zz3mRoPqExMAzgaZKJorJT',
  GMT: '7fC8QxvQkTbmu6vb5Ed5XPBNCP5ZdZ2gQ6AnNbu2DspU',
  APT: '4zzBDzSSBBZ1z4MdqVWyAZWWVdAihrJdZTf2iTDPq8L8',
  HNT: 'hntyVP7QxKHZAVzYZH9oH1qVM7iwS9Gn6zkGiYyNwA8',
  STARS: 'HCgybxq5Upy8Mccihrp7EsmwwFqYZtrHrsmsKwtGXLgW',
  ACS: 'AcsFzbpE57Fvu8btCeKh3wKHGoS1tazNkqBTaHUnN6kp',
  SAMO: '7xKXwBPtESqFzT3b8Az2cTn9PH3vabVz1od7D6XWcP6V',
  JITOSOL: 'JitoSOL1UfZTr9GdUfzj6ZtLZgKsYoDrA8c6Fex9FES7',
};
