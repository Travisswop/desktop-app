// toggleStore.js
import { create } from "zustand";
type Store = {
  toggle: boolean;
  setToggle: () => void;
};
// Create the toggle store
const useAddToCardToggleStore = create<Store>((set) => ({
  toggle: true, // Initial state
  setToggle: () => set((state) => ({ toggle: !state.toggle })), // Toggle function
}));

export default useAddToCardToggleStore;
