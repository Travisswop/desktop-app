/**
 * TypeScript type definitions for Privy SDK
 * These types provide type safety for Privy wallet and account interactions
 */

export type ChainType = 'ethereum' | 'solana';
export type WalletClientType = 'privy' | 'metamask' | 'phantom' | 'coinbase_wallet' | string;
export type ConnectorType = 'embedded' | 'injected' | string;
export type AccountType =
  | 'wallet'
  | 'email'
  | 'phone'
  | 'google'
  | 'twitter'
  | 'discord'
  | 'github'
  | 'linkedin'
  | 'tiktok'
  | 'apple'
  | 'farcaster';

/**
 * Base interface for all Privy linked accounts
 */
export interface PrivyLinkedAccount {
  type: AccountType;
  verifiedAt?: number;
}

/**
 * Wallet account interface
 */
export interface PrivyWalletAccount extends PrivyLinkedAccount {
  type: 'wallet';
  address: string;
  chainType: ChainType;
  walletClientType?: WalletClientType;
  connectorType?: ConnectorType;
  imported?: boolean;
  delegated?: boolean;
  recoveryMethod?: string;
}

/**
 * Solana-specific wallet account
 */
export interface PrivySolanaWalletAccount extends PrivyWalletAccount {
  chainType: 'solana';
}

/**
 * Ethereum-specific wallet account
 */
export interface PrivyEthereumWalletAccount extends PrivyWalletAccount {
  chainType: 'ethereum';
}

/**
 * Solana wallet interface with signing methods
 */
export interface PrivySolanaWallet {
  address: string;
  chainType: 'solana';
  walletClientType: WalletClientType;
  connectorType?: ConnectorType;
  signTransaction?: (tx: any) => Promise<any>;
  signAllTransactions?: (txs: any[]) => Promise<any[]>;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
}

/**
 * Email account interface
 */
export interface PrivyEmailAccount extends PrivyLinkedAccount {
  type: 'email';
  address: string;
}

/**
 * Phone account interface
 */
export interface PrivyPhoneAccount extends PrivyLinkedAccount {
  type: 'phone';
  phoneNumber: string;
}

/**
 * Social account interface (Google, Twitter, Discord, etc.)
 */
export interface PrivySocialAccount extends PrivyLinkedAccount {
  type: Exclude<AccountType, 'wallet' | 'email' | 'phone'>;
  subject: string;
  email?: string;
  username?: string;
  name?: string;
}

/**
 * Type guard: Check if account is a wallet account
 */
export function isWalletAccount(
  account: PrivyLinkedAccount
): account is PrivyWalletAccount {
  return (
    account.type === 'wallet' &&
    'address' in account &&
    typeof (account as any).address === 'string' &&
    (account as any).address.length > 0 &&
    'chainType' in account &&
    ((account as any).chainType === 'ethereum' || (account as any).chainType === 'solana')
  );
}

/**
 * Type guard: Check if account is a Solana wallet account
 */
export function isSolanaWalletAccount(
  account: PrivyLinkedAccount
): account is PrivySolanaWalletAccount {
  return (
    isWalletAccount(account) &&
    account.chainType === 'solana'
  );
}

/**
 * Type guard: Check if account is an Ethereum wallet account
 */
export function isEthereumWalletAccount(
  account: PrivyLinkedAccount
): account is PrivyEthereumWalletAccount {
  return (
    isWalletAccount(account) &&
    account.chainType === 'ethereum'
  );
}

/**
 * Type guard: Check if account is a Privy embedded wallet
 */
export function isPrivyEmbeddedWallet(
  account: PrivyLinkedAccount
): account is PrivyWalletAccount {
  return (
    isWalletAccount(account) &&
    account.walletClientType === 'privy'
  );
}

/**
 * Type guard: Check if wallet is a Solana wallet with signing methods
 */
export function isSolanaWallet(wallet: any): wallet is PrivySolanaWallet {
  return (
    wallet &&
    typeof wallet === 'object' &&
    wallet.chainType === 'solana' &&
    typeof wallet.address === 'string' &&
    wallet.address.length > 0
  );
}

/**
 * Type guard: Check if account is an email account
 */
export function isEmailAccount(
  account: PrivyLinkedAccount
): account is PrivyEmailAccount {
  return account.type === 'email' && 'address' in account;
}

/**
 * Type guard: Check if account is a phone account
 */
export function isPhoneAccount(
  account: PrivyLinkedAccount
): account is PrivyPhoneAccount {
  return account.type === 'phone' && 'phoneNumber' in account;
}

/**
 * Type guard: Check if account is a social account
 */
export function isSocialAccount(
  account: PrivyLinkedAccount
): account is PrivySocialAccount {
  return (
    account.type !== 'wallet' &&
    account.type !== 'email' &&
    account.type !== 'phone' &&
    'subject' in account
  );
}
