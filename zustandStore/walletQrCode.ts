import { create } from 'zustand';

type Store = {
  walletQrCode: boolean;
  setWalletQrCode: (qr: boolean) => void;
};

const useWalletQrCode = create<Store>((set) => ({
  walletQrCode: false,
  setWalletQrCode: (qr: boolean) => set({ walletQrCode: qr }),
}));

export default useWalletQrCode;
