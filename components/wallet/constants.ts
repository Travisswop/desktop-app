import { ChainType } from '@/types/token';

// Default chains supported by the wallet
export const SUPPORTED_CHAINS: ChainType[] = [
  'ETHEREUM',
  'POLYGON',
  'BASE',
  'SOLANA',
] as const;

// export const SUPPORTED_CHAINS_TRANSACTIONS: ChainType[] = [
//   'POLYGON',
// ] as const;

// Error messages
export const ERROR_MESSAGES = {
  MISSING_TRANSACTION_INFO: 'Missing transaction information',
  TRANSACTION_FAILED: 'Transaction failed',
  SEND_TRANSACTION_FAILED: 'Failed to send transaction',
  SERVER_ERROR: 'Server error',
  UNKNOWN_ERROR: 'Unknown error',
} as const;

// Point types
export const POINT_TYPES = {
  USING_SWOP_ID: 'Using Swop.ID for Transactions',
} as const;

// Action keys
export const ACTION_KEYS = {
  LAUNCH_SWOP: 'launch-swop',
} as const;
