import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Store } from "@/types/store.types";

interface StoreState {
  store: Store | null;
  isLoading: boolean;
  error: string | null;

  setStore: (store: Store | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateStatus: (status: string) => void;
  reset: () => void;
}

export const useStoreStore = create<StoreState>()(
  persist(
    (set) => ({
      store: null,
      isLoading: false,
      error: null,

      setStore: (store) => set({ store, error: null }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),

      updateStatus: (status) =>
        set((state) => ({
          store: state.store
            ? { ...state.store, status: status as Store["status"] }
            : null,
        })),

      reset: () =>
        set({ store: null, isLoading: false, error: null }),
    }),
    {
      name: "store-storage",
      partialize: (state) => ({ store: state.store }),
    }
  )
);
