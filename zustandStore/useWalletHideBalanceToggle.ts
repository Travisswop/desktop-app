import { create } from "zustand";

type BooleanStore = {
  value: boolean;
  setTrue: () => void;
  setFalse: () => void;
  toggle: () => void;
  setValue: (value: boolean) => void;
};

export const useWalletHideBalanceStore = create<BooleanStore>((set) => ({
  value: false,

  setTrue: () => set({ value: true }),

  setFalse: () => set({ value: false }),

  toggle: () =>
    set((state) => ({
      value: !state.value,
    })),

  setValue: (value: boolean) =>
    set({
      value,
    }),
}));
