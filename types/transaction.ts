export interface Transaction {
  hash: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  networkFee: string;
  txreceipt_status?: string;
  contractAddress?: string;
  status?: string;
  tokenName?: string;
  tokenDecimal?: number;
  tokenSymbol?: string;
  network: string;
  isSwapped?: boolean;
  isRedeemable?: boolean;
  redeemLink?: string;
  isClaimed?: boolean;
  tokenPrice?: number;
  swapped?: {
    from: TokenSwapInfo;
    to: TokenSwapInfo;
  };
  currentPrice: number;
  nativeTokenPrice: number;
  isNew?: boolean;
}

interface TokenSwapInfo {
  symbol: string;
  decimal: number;
  value: string;
  price: number;
}

interface SolanaTransfer {
  source: string;
  destination: string;
  amount: number;
}

interface TokenBalance {
  token: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface ParsedInstruction {
  programId: string;
  type: string;
  extra?: {
    sourceOwner: string;
    destinationOwner: string;
    amount: number;
  };
}

export interface SolTxDetails {
  blockTime: number;
  slot: number;
  txHash: string;
  fee: number;
  status: string;
  parsedInstruction: ParsedInstruction[];
  logMessage: string[];
  solTransfers: SolanaTransfer[];
  tokenBalances?: TokenBalance[];
}

export interface ChainConfig {
  baseUrl: string;
  accessToken: string | undefined;
  alchemyUrl: string | undefined;
  decimal: number;
  name: string;
  symbol: string;
  type: 'evm' | 'solana';
}

export interface ERC20ApiResponse {
  status: string;
  message: string;
  result: Transaction[];
}
