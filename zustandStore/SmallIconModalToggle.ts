import { create } from "zustand";

const useSmallIconToggleStore = create((set) => ({
  isOn: false,
  toggle: () => set((state: any) => ({ isOn: !state.isOn })),
  setOn: () => set({ isOn: true }),
  setOff: () => set({ isOn: false }),
}));

export default useSmallIconToggleStore;
