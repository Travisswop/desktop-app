'use client';

import {
  WalletReadyState,
  WalletName,
} from '@solana/wallet-adapter-base';
import {
  BaseWalletAdapter,
  WalletConnectionError,
  WalletDisconnectionError,
  WalletNotConnectedError,
  WalletPublicKeyError,
  WalletSignTransactionError,
} from '@solana/wallet-adapter-base';
import {
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import type { ConnectedStandardSolanaWallet } from '@privy-io/react-auth/solana';

// Type for Privy Solana wallet in v3.0
type PrivySolanaWallet = ConnectedStandardSolanaWallet | null;

export interface PrivyWalletAdapterConfig {
  wallet: PrivySolanaWallet;
}

export const PrivyWalletName = 'Privy' as WalletName<'Privy'>;

export class PrivyWalletAdapter extends BaseWalletAdapter {
  name = PrivyWalletName;
  url = 'https://privy.io';
  icon =
    'https://assets-global.website-files.com/63e8cc07a5728fdf70046de1/63e8cd07a5728fe413046e15_privy-logo.svg';
  supportedTransactionVersions = null;

  private _wallet: PrivySolanaWallet;
  private _publicKey: PublicKey | null;
  private _connecting: boolean;
  private _readyState: WalletReadyState;

  constructor(config: PrivyWalletAdapterConfig) {
    super();
    this._wallet = config.wallet;
    this._publicKey = null;
    this._connecting = false;
    this._readyState = config.wallet
      ? WalletReadyState.Installed
      : WalletReadyState.NotDetected;
  }

  get publicKey() {
    return this._publicKey;
  }

  get connecting() {
    return this._connecting;
  }

  get connected() {
    return !!this._wallet && !!this._publicKey;
  }

  get readyState() {
    return this._readyState;
  }

  async connect(): Promise<void> {
    try {
      if (this.connected || this.connecting) return;
      if (!this._wallet)
        throw new WalletConnectionError('Privy wallet not available');

      this._connecting = true;

      try {
        this._publicKey = new PublicKey(this._wallet.address);
        this.emit('connect', this._publicKey);
        console.log(
          'PrivyWalletAdapter: Connected to',
          this._wallet.address
        );
      } catch (error: any) {
        throw new WalletPublicKeyError(error?.message, error);
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this._publicKey = null;
      this.emit('disconnect');
      console.log('PrivyWalletAdapter: Disconnected');
    } catch (error: any) {
      this.emit('error', error);
      throw new WalletDisconnectionError(error?.message, error);
    }
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T> {
    try {
      if (!this._wallet || !this.connected) {
        throw new WalletNotConnectedError();
      }

      console.log(
        'Attempting to sign transaction with Privy wallet:',
        {
          walletAddress: this._wallet.address,
          transaction: transaction,
        }
      );

      // Get the global signer instance
      const signer = (window as any).__privyTransactionSigner;
      if (!signer?.signTransaction) {
        throw new WalletSignTransactionError(
          'Privy transaction signer not initialized. Make sure PrivyTransactionSignerProvider is mounted.'
        );
      }

      const signedTransaction = await signer.signTransaction(
        transaction
      );
      return signedTransaction as T;
    } catch (error: any) {
      console.error('Transaction signing error:', error);
      this.emit('error', error);
      throw new WalletSignTransactionError(
        error?.message || 'Failed to sign Solana transaction',
        error
      );
    }
  }

  async signAllTransactions<
    T extends Transaction | VersionedTransaction
  >(transactions: T[]): Promise<T[]> {
    try {
      if (!this._wallet || !this.connected) {
        throw new WalletNotConnectedError();
      }

      // Get the global signer instance
      const signer = (window as any).__privyTransactionSigner;
      if (!signer?.signAllTransactions) {
        throw new WalletSignTransactionError(
          'Privy transaction signer not initialized. Make sure PrivyTransactionSignerProvider is mounted.'
        );
      }

      const signedTransactions = await signer.signAllTransactions(
        transactions
      );
      return signedTransactions as T[];
    } catch (error: any) {
      console.error('Failed to sign transactions:', error);
      this.emit('error', error);
      throw new WalletSignTransactionError(error?.message, error);
    }
  }

  // Implement sendTransaction to resolve abstract member
  async sendTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
    options?: any
  ): Promise<string> {
    throw new Error('Not implemented');
  }

  // Update the wallet reference
  updateWallet(wallet: PrivySolanaWallet) {
    const wasConnected = this.connected;
    this._wallet = wallet;
    this._readyState = wallet
      ? WalletReadyState.Installed
      : WalletReadyState.NotDetected;

    if (wallet && !wasConnected) {
      // Auto-connect when wallet becomes available
      this.connect().catch(console.error);
    } else if (!wallet && wasConnected) {
      // Auto-disconnect when wallet becomes unavailable
      this.disconnect().catch(console.error);
    }
  }
}
