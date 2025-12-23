import { create } from "zustand";

type BooleanStore = {
  value: boolean;
  setTrue: () => void;
  setFalse: () => void;
  toggle: () => void;
};

export const useWalletHideBalanceStore = create<BooleanStore>((set) => ({
  value: false,
  setTrue: () => set({ value: true }),
  setFalse: () => set({ value: false }),
  toggle: () => set((state) => ({ value: !state.value })),
}));
