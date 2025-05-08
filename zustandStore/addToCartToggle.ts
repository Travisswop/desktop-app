// toggleStore.ts
import { create } from "zustand";

type Store = {
  toggle: boolean;
  setToggle: (item: boolean) => void;
};

// Create the toggle store
const useAddToCardToggleStore = create<Store>((set) => ({
  toggle: true, // Initial state
  setToggle: (item: boolean) => set({ toggle: item }), // Toggle function
}));

export default useAddToCardToggleStore;
