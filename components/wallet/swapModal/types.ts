import { PublicKey } from "@solana/web3.js";

export interface TokenInfo {
  symbol: string;
  address?: PublicKey | string;
  id?: PublicKey;
  icon?: string;
  logoURI?: string;
  decimals?: number;
  balance?: string;
  price?: string;
  usdPrice?: string;
  marketData?: {
    price?: string;
    iconUrl?: string;
  };
  name?: string;
  chainId?: number;
  isERC20?: boolean;
}

export interface QuoteResponse {
  inAmount: number;
  outAmount: number;
  inputMint: string;
  outputMint: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: any[];
  contextSlot: number;
}

export interface EthQuoteResponse {
  inputAmount: string;
  outputAmount: string;
  priceImpact: string;
  inputToken: string;
  outputToken: string;
  fee: number;
  amountOutMin: string;
  gasEstimate: string;
}

export interface SwapModalProps {
  // open: boolean;
  // onOpenChange: (open: boolean) => void;
  userToken: TokenInfo[];
  accessToken: string;
  initialInputToken?: string;
  initialOutputToken?: string;
  initialAmount?: string;
  onTokenRefresh?: () => void;
  chain?: "solana" | "ethereum";
}
