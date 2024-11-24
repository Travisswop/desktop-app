import { create } from "zustand";

type Store = {
  setState: ({}) => void;
};

const useUpdateSmartIcon = create<Store>((set) => ({
  setState: (data: any) =>
    set(() => ({
      ...data,
    })),
}));

export default useUpdateSmartIcon;
