import '@privy-io/js-sdk-core';

declare module '@privy-io/js-sdk-core' {
  interface ConnectedStandardSolanaWallet {
    walletClientType?: string;
    connectorType?: string;
    id?: string;
    type?: string;
  }
}
