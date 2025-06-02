// Type guard to check if a linked account is a wallet with an address
export const isWalletAccount = (
  account: any
): account is {
  address: string;
  chainType: string;
  type: string;
} => {
  return (
    account &&
    account.type === 'wallet' &&
    typeof account.address === 'string' &&
    account.address.length > 0
  );
};

// Type guard specifically for Ethereum wallet accounts
export const isEthereumWalletAccount = (
  account: any
): account is {
  address: string;
  chainType: 'ethereum';
  type: 'wallet';
} => {
  return isWalletAccount(account) && account.chainType === 'ethereum';
};
