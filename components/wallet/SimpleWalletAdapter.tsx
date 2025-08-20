// Simplified version of what you need
export class SimpleWalletAdapter {
  constructor(private wallet: any, private signTransactionFn: any) {}

  async signTransaction(transaction: any) {
    return await this.signTransactionFn(transaction);
  }

  async signAllTransactions(transactions: any[]) {
    return await Promise.all(
      transactions.map((tx) => this.signTransactionFn(tx))
    );
  }

  get publicKey() {
    return { toBase58: () => this.wallet.address };
  }

  get connected() {
    return true; // Assuming always connected
  }
}
