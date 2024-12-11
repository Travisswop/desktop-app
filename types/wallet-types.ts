import { TokenData } from '@/types/token';
import { NFT } from '@/types/nft';
import { ReceiverData } from '@/types/wallet';

export type Network = 'ETHEREUM' | 'POLYGON' | 'BASE' | 'SOLANA';

export const CHAIN_ID = {
  ETHEREUM: 1,
  POLYGON: 137,
  BASE: 8453,
  SOLANA: 101,
} as const;

export interface SendFlowState {
  step:
    | 'amount'
    | 'recipient'
    | 'confirm'
    | 'success'
    | 'assets'
    | null;
  token: TokenData | null;
  amount: string;
  recipient: ReceiverData | null;
  nft: NFT | null;
  networkFee: string;
  network: Network;
  hash: string;
}
