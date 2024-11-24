import { create } from "zustand";

const useSmartSiteApiDataStore = create((set) => ({
  state: {},
  setSmartSiteData: (data: any) =>
    set((state: any) => ({
      ...state,
      ...data,
    })),
}));

export default useSmartSiteApiDataStore;
