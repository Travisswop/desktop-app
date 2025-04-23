export interface WalletItem {
  address: string;
  isActive: boolean;
  isEVM: boolean;
}

export interface ReceiverData {
  address: string;
  isEns?: boolean;
  ensName?: string;
  avatar?: string;
}
