// postStore.ts
import { create } from "zustand";

type PostContentItem = {
  networkFee: number;
  transferFee: number;
  bankReceived: number;
  walletAddress: string;
};

type PostStore = {
  tokenContent: PostContentItem;
  setTokenContent: (content: PostContentItem) => void;
};

export const useTokenSendStore = create<PostStore>((set) => ({
  tokenContent: {
    networkFee: 0,
    transferFee: 0,
    bankReceived: 0,
    walletAddress: "",
    // createBridgePaymentResponse: {},
  }, // Initial state (empty array)
  setTokenContent: (content) => set({ tokenContent: content }), // Action to update state
}));
