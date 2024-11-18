import { create } from "zustand";

type Store = {
  toggle: boolean;
  setToggle: () => void;
};

const useSideBarToggleStore = create<Store>((set) => ({
  toggle: false,
  setToggle: () =>
    set((state) => ({
      toggle: !state.toggle,
    })),
}));

export default useSideBarToggleStore;
