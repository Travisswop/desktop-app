import { Socket } from 'socket.io-client';

export interface TokenTransferNotificationData {
  tokenSymbol: string;
  tokenName: string;
  amount: string;
  recipientAddress: string;
  recipientEnsName?: string;
  txSignature: string;
  network: string;
  tokenLogo?: string;
  usdValue?: string;
}

export interface NFTTransferNotificationData {
  nftName: string;
  nftImage?: string;
  recipientAddress: string;
  recipientEnsName?: string;
  txSignature: string;
  network: string;
  tokenId?: string;
  collectionName?: string;
}

export interface SwapNotificationData {
  inputTokenSymbol: string;
  inputAmount: string;
  outputTokenSymbol: string;
  outputAmount: string;
  txSignature: string;
  network: string;
  inputTokenLogo?: string;
  outputTokenLogo?: string;
  inputUsdValue?: string;
  outputUsdValue?: string;
}

/**
 * Wallet Notification Utility
 * Provides helper functions to emit Socket.IO events for wallet operations
 * These events trigger backend notification creation
 */
export class WalletNotificationService {
  private socket: Socket | null;

  constructor(socket?: Socket | null) {
    this.socket = socket || null;
  }

  /**
   * Set or update the socket connection
   */
  setSocket(socket: Socket) {
    this.socket = socket;
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Emit event when user sends tokens
   */
  emitTokenSent(data: TokenTransferNotificationData): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket not connected. Cannot emit token_sent notification.');
      return;
    }


    this.socket.emit('wallet:token_sent', {
      tokenSymbol: data.tokenSymbol,
      tokenName: data.tokenName,
      amount: data.amount,
      recipientAddress: data.recipientAddress,
      recipientEnsName: data.recipientEnsName,
      txSignature: data.txSignature,
      network: data.network,
      tokenLogo: data.tokenLogo,
      usdValue: data.usdValue,
      timestamp: Date.now(),
    }, (response: any) => {
      if (response?.success) {
        console.log('[WalletNotificationService] Token sent notification created successfully');
      } else {
        console.error('[WalletNotificationService] Failed to create token sent notification:', response);
      }
    });
  }

  /**
   * Emit event when user sends NFT
   */
  emitNFTSent(data: NFTTransferNotificationData): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket not connected. Cannot emit nft_sent notification.');
      return;
    }


    this.socket.emit('wallet:nft_sent', {
      nftName: data.nftName,
      nftImage: data.nftImage,
      recipientAddress: data.recipientAddress,
      recipientEnsName: data.recipientEnsName,
      txSignature: data.txSignature,
      network: data.network,
      tokenId: data.tokenId,
      collectionName: data.collectionName,
      timestamp: Date.now(),
    }, (response: any) => {
      if (response?.success) {
        console.log('[WalletNotificationService] NFT sent notification created successfully');
      } else {
        console.error('[WalletNotificationService] Failed to create NFT sent notification:', response);
      }
    });
  }

  /**
   * Emit event when user completes a swap
   */
  emitSwapCompleted(data: SwapNotificationData): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket not connected. Cannot emit swap_completed notification.');
      return;
    }


    this.socket.emit('wallet:swap_completed', {
      inputTokenSymbol: data.inputTokenSymbol,
      inputAmount: data.inputAmount,
      outputTokenSymbol: data.outputTokenSymbol,
      outputAmount: data.outputAmount,
      txSignature: data.txSignature,
      network: data.network,
      inputTokenLogo: data.inputTokenLogo,
      outputTokenLogo: data.outputTokenLogo,
      inputUsdValue: data.inputUsdValue,
      outputUsdValue: data.outputUsdValue,
      timestamp: Date.now(),
    }, (response: any) => {
      if (response?.success) {
        console.log('[WalletNotificationService] Swap completed notification created successfully');
      } else {
        console.error('[WalletNotificationService] Failed to create swap completed notification:', response);
      }
    });
  }

  /**
   * Emit event when swap fails
   */
  emitSwapFailed(data: Pick<SwapNotificationData, 'inputTokenSymbol' | 'inputAmount' | 'outputTokenSymbol' | 'network'> & { reason?: string }): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket not connected. Cannot emit swap_failed notification.');
      return;
    }


    this.socket.emit('wallet:swap_failed', {
      inputTokenSymbol: data.inputTokenSymbol,
      inputAmount: data.inputAmount,
      outputTokenSymbol: data.outputTokenSymbol,
      network: data.network,
      reason: data.reason,
      timestamp: Date.now(),
    }, (response: any) => {
      if (response?.success) {
        console.log('[WalletNotificationService] Swap failed notification created successfully');
      } else {
        console.error('[WalletNotificationService] Failed to create swap failed notification:', response);
      }
    });
  }
}

// Create a singleton instance
let walletNotificationService: WalletNotificationService | null = null;

/**
 * Get or create the wallet notification service instance
 */
export function getWalletNotificationService(socket?: Socket): WalletNotificationService {
  if (!walletNotificationService) {
    walletNotificationService = new WalletNotificationService(socket);
  } else if (socket) {
    walletNotificationService.setSocket(socket);
  }
  return walletNotificationService;
}

/**
 * Helper function to format USD value
 */
export function formatUSDValue(amount: number | string, price: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(numAmount) || isNaN(numPrice)) {
    return '0.00';
  }

  return (numAmount * numPrice).toFixed(2);
}

/**
 * Helper function to truncate address for display
 */
export function truncateAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address || address.length < startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}
