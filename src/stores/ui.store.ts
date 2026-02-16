import { create } from "zustand";

interface UIState {
  isPageLoading: boolean;
  isSidebarOpen: boolean;
  activeModal: string | null;

  setPageLoading: (loading: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  reset: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  isPageLoading: false,
  isSidebarOpen: false,
  activeModal: null,

  setPageLoading: (isPageLoading) => set({ isPageLoading }),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
  reset: () =>
    set({
      isPageLoading: false,
      isSidebarOpen: false,
      activeModal: null,
    }),
}));
