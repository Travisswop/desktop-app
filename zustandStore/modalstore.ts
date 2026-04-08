import { create } from "zustand";

interface ModalStore {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
  feedRefetchTrigger: number;
  triggerFeedRefetch: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
  toggleModal: () => set((state) => ({ isOpen: !state.isOpen })),
  feedRefetchTrigger: 0,
  triggerFeedRefetch: () =>
    set((state) => ({ feedRefetchTrigger: state.feedRefetchTrigger + 1 })),
}));
