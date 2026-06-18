import { create } from "zustand";

interface ModalStore {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
  feedRefetchTrigger: number;
  createdFeedItem: any | null;
  triggerFeedRefetch: () => void;
  publishCreatedFeedItem: (feedItem?: any | null) => void;
  clearCreatedFeedItem: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
  toggleModal: () => set((state) => ({ isOpen: !state.isOpen })),
  feedRefetchTrigger: 0,
  createdFeedItem: null,
  triggerFeedRefetch: () =>
    set((state) => ({ feedRefetchTrigger: state.feedRefetchTrigger + 1 })),
  publishCreatedFeedItem: (feedItem) =>
    set((state) => ({
      createdFeedItem: feedItem || null,
      feedRefetchTrigger: state.feedRefetchTrigger + 1,
    })),
  clearCreatedFeedItem: () => set({ createdFeedItem: null }),
}));
