import { TokenData } from '@/types/token';
import { NFT } from '@/types/nft';
import { ReceiverData } from '@/types/wallet';

export type Network =
  | 'ETHEREUM'
  | 'POLYGON'
  | 'BASE'
  | 'SOLANA'
  | 'SEPOLIA';

export const CHAIN_ID = {
  ETHEREUM: 1,
  POLYGON: 137,
  BASE: 8453,
  SOLANA: 101,
  SEPOLIA: 11155111,
} as const;

export interface SendFlowState {
  step:
    | 'amount'
    | 'recipient'
    | 'confirm'
    | 'success'
    | 'assets'
    | 'select-method'
    | 'bank-assets'
    | 'bank-amount'
    | 'bank-recipient'
    | 'bank-confirm'
    | null;
  token: TokenData | null;
  amount: string;
  isUSD: boolean;
  recipient: ReceiverData | null;
  nft: NFT | null;
  networkFee?: string;
  network: Network;
  hash?: string;
  isOrder?: boolean;
}
