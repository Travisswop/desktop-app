// store/swapStore.ts
import { create } from "zustand";

interface SwapState {
  userToken: any[];
  accessToken: string;
  initialInputToken: string;
  initialOutputToken: string;
  initialAmount: string;
  onTokenRefresh?: () => void;
  setSwapData: (data: Partial<SwapState>) => void;
}

export const useSwapStore = create<SwapState>((set) => ({
  userToken: [],
  accessToken: "",
  initialInputToken: "",
  initialOutputToken: "",
  initialAmount: "",
  onTokenRefresh: undefined,
  setSwapData: (data) => set((state) => ({ ...state, ...data })),
}));
