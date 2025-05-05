import { PublicKey } from "@solana/web3.js";

export const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
export const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
export const SWOP_MINT = new PublicKey("GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1");

export const KNOWN_TOKENS = [
  {
    symbol: "SOL",
    mint: SOL_MINT,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png",
    decimals: 9,
  },
  {
    symbol: "USDC",
    mint: USDC_MINT,
    logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
    decimals: 6,
  },
  {
    symbol: "SWOP",
    mint: SWOP_MINT,
    logoURI: "https://swop.fi/logo.svg",
    decimals: 6,
  },
  {
    symbol: "USDT",
    mint: new PublicKey("Es9vMFrzaCERngt7T9yDg8K97Ed1iXy3Kcz7GnKxFQ2j"),
    logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERngt7T9yDg8K97Ed1iXy3Kcz7GnKxFQ2j/logo.png",
    decimals: 6,
  },
];

export const getTokenInfoBySymbol = (
  symbol: string,
  userToken: any[]
): {
  symbol: string;
  mint: PublicKey;
  logoURI: string;
  decimals: number;
  balance: string;
  marketData: any;
} | null => {
  const baseToken = KNOWN_TOKENS.find((t) => t.symbol === symbol);
  const userHeldToken = userToken.find((t: any) => t.symbol === symbol);
  if (!baseToken) return null;

  return {
    ...baseToken,
    balance: userHeldToken?.balance || "0",
    marketData: userHeldToken?.marketData || null,
    
  };
};

export const formatUSD = (
  price: string,
  amount: string,
  decimals: number = 9
): string => {
  const numAmount = parseFloat(amount);
  const priceNum = parseFloat(price);
  return (numAmount * priceNum).toFixed(4);
};
