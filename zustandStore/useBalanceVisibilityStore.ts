// store/useBalanceVisibilityStore.ts
import { create } from "zustand";
import Cookies from "js-cookie";

interface BalanceVisibilityState {
  showBalance: boolean;
  setShowBalance: (show: boolean) => void;
  toggleBalance: () => void;
  initializeFromCookie: () => void;
}

export const useBalanceVisibilityStore = create<BalanceVisibilityState>(
  (set, get) => ({
    showBalance: true,

    // Initialize from cookie
    initializeFromCookie: () => {
      const cookieValue = Cookies.get("hideBalance");
      set({ showBalance: cookieValue !== "true" });
    },

    // Set balance visibility and update cookie
    setShowBalance: (show: boolean) => {
      set({ showBalance: show });
      Cookies.set("hideBalance", show ? "false" : "true", { expires: 365 });
    },

    // Toggle balance visibility
    toggleBalance: () => {
      const { showBalance, setShowBalance } = get();
      setShowBalance(!showBalance);
    },
  }),
);
