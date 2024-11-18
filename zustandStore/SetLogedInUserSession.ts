import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletState {
  account: string;
  balance: string;
}

interface UserState {
  user: any | null;
  wallet: WalletState | null;
}

interface UserStore {
  state: UserState;
  setUser: (user: any) => void;
  setWallet: (wallet: WalletState | null) => void;
}

const useLoggedInUserStore = create<UserStore>()(
  persist(
    (set) => ({
      state: {
        user: null,
        wallet: null,
      },
      setUser: (user) =>
        set((state) => ({
          state: {
            ...state.state,
            user,
          },
        })),
      setWallet: (wallet) =>
        set((state) => ({
          state: {
            ...state.state,
            wallet,
          },
        })),
    }),
    {
      name: 'user-storage',
      getStorage: () => localStorage,
    }
  )
);

export default useLoggedInUserStore;