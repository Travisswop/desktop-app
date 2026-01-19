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
  flow?: string;
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
  data?: {
    token_bal_change?: Array<{
      address: string;
      change_type: string;
      change_amount: string;
      decimals: number;
      post_balance: string;
      pre_balance: string;
      token_address: string;
      owner: string;
      post_owner: string;
      pre_owner: string;
    }>;
    sol_bal_change?: Array<{
      address: string;
      pre_balance: string;
      post_balance: string;
      change_amount: string;
    }>;
    account_keys?: Array<{
      pubkey: string;
      signer: boolean;
      source: string;
      writable: boolean;
    }>;
    status?: number;
    block_time: number;
    tx_hash: string;
  };
  metadata?: {
    tokens?: {
      [key: string]: {
        token_address: string;
        token_name: string;
        token_symbol: string;
        token_icon?: string;
      };
    };
  };
  success: boolean;
}

export interface SolTransaction {
  data: SolTxDetails[];
}

export interface ChainConfig {
  baseUrl: string;
  accessToken: string | undefined;
  rpcUrl: string | undefined;
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
