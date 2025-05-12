import { PublicKey } from '@solana/web3.js';

export interface TokenInfo {
  symbol: string;
  address?: PublicKey;
  id?: PublicKey;
  icon?: string;
  logoURI?: string;
  decimals?: number;
  balance?: string;
  price?: string;
  usdPrice?: string;
  marketData?: {
    price?: string;
  };
  name?: string;
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

export interface SwapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToken: TokenInfo[];
}
