'use client';

import {
    WalletAdapter,
    WalletAdapterProps,
    WalletReadyState,
    WalletName,
    SendTransactionOptions,
    TransactionOrVersionedTransaction,
} from '@solana/wallet-adapter-base';
import {
    BaseWalletAdapter,
    WalletConnectionError,
    WalletDisconnectionError,
    WalletNotConnectedError,
    WalletPublicKeyError,
    WalletSignTransactionError,
} from '@solana/wallet-adapter-base';
import { Connection, PublicKey, Transaction, TransactionSignature, VersionedTransaction } from '@solana/web3.js';
import type { Wallet } from '@privy-io/react-auth';

// Type guard to check if wallet has Solana-specific methods
function isSolanaWallet(wallet: Wallet | null): wallet is Wallet & {
    signTransaction: (transaction: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
    signAllTransactions: (transactions: (Transaction | VersionedTransaction)[]) => Promise<(Transaction | VersionedTransaction)[]>;
} {
    return !!(wallet && 'signTransaction' in wallet && 'signAllTransactions' in wallet);
}

export interface PrivyWalletAdapterConfig {
    wallet: Wallet | null;
}

export const PrivyWalletName = 'Privy' as WalletName<'Privy'>;

export class PrivyWalletAdapter extends BaseWalletAdapter {
    name = PrivyWalletName;
    url = 'https://privy.io';
    icon = 'https://assets-global.website-files.com/63e8cc07a5728fdf70046de1/63e8cd07a5728fe413046e15_privy-logo.svg';
    supportedTransactionVersions = null;

    private _wallet: Wallet | null;
    private _publicKey: PublicKey | null;
    private _connecting: boolean;
    private _readyState: WalletReadyState;

    constructor(config: PrivyWalletAdapterConfig) {
        super();
        this._wallet = config.wallet;
        this._publicKey = null;
        this._connecting = false;
        this._readyState = config.wallet ? WalletReadyState.Installed : WalletReadyState.NotDetected;
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
            if (!this._wallet) throw new WalletConnectionError('Privy wallet not available');

            this._connecting = true;

            try {
                this._publicKey = new PublicKey(this._wallet.address);
                this.emit('connect', this._publicKey);
                console.log('PrivyWalletAdapter: Connected to', this._wallet.address);
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

    async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
        try {
            if (!this._wallet || !this.connected) {
                throw new WalletNotConnectedError();
            }

            try {
                if (isSolanaWallet(this._wallet)) {
                    const signedTransaction = await this._wallet.signTransaction(transaction);
                    return signedTransaction as T;
                }
                throw new WalletSignTransactionError('Wallet does not support transaction signing');
            } catch (error: any) {
                throw new WalletSignTransactionError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
        try {
            if (!this._wallet || !this.connected) {
                throw new WalletNotConnectedError();
            }

            try {
                if (isSolanaWallet(this._wallet)) {
                    const signedTransactions = await this._wallet.signAllTransactions(transactions);
                    return signedTransactions as T[];
                }
                throw new WalletSignTransactionError('Wallet does not support transaction signing');
            } catch (error: any) {
                throw new WalletSignTransactionError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
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
    updateWallet(wallet: Wallet | null) {
        const wasConnected = this.connected;
        this._wallet = wallet;
        this._readyState = wallet ? WalletReadyState.Installed : WalletReadyState.NotDetected;

        if (wallet && !wasConnected) {
            // Auto-connect when wallet becomes available
            this.connect().catch(console.error);
        } else if (!wallet && wasConnected) {
            // Auto-disconnect when wallet becomes unavailable
            this.disconnect().catch(console.error);
        }
    }
}