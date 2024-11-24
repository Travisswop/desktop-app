import { create } from 'zustand';

type Store = {
  selectTabValue: string;
  selectWalletTabValue: string;
  selectTabViewValue: string;
  setSelectTabValue: (tab: string) => void;
  setSelectWalletTabValue: (tab: string) => void;
  setSelectTabViewValue: (view: string) => void;
};

const useWalletTabValue = create<Store>((set) => ({
  selectTabValue: 'wallet',
  selectWalletTabValue: 'token',
  selectTabViewValue: 'walletList',
  setSelectTabValue: (tab: string) => set({ selectTabValue: tab }),
  setSelectWalletTabValue: (tab: string) => set({ selectWalletTabValue: tab }),
  setSelectTabViewValue: (view: string) => set({ selectTabViewValue: view }),
}));

export default useWalletTabValue;
