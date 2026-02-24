import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Store, StoreSettings, StoreSettingsUpdate } from "@/types/store.types";
import {
  type ReceiptLayoutConfig,
  DEFAULT_RECEIPT_LAYOUT_CONFIG,
} from "@/hooks/use-hardware";
import { storeService } from "@/services/store.service";

interface StoreState {
  // -- Store --
  store: Store | null;
  isLoading: boolean;
  error: string | null;

  // -- Receipt config (persisted) --
  /** Persisted receipt layout / print settings for this store */
  receiptConfig: ReceiptLayoutConfig;

  // -- Store settings --
  storeSettings: StoreSettings | null;
  isSettingsLoading: boolean;
  settingsError: string | null;

  // -- Store actions --
  setStore: (store: Store | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateStatus: (status: string) => void;
  updateReceiptConfig: (patch: Partial<ReceiptLayoutConfig>) => void;

  // -- Settings actions --
  fetchSettings: (storeId: string) => Promise<void>;
  updateSettings: (
    storeId: string,
    updates: StoreSettingsUpdate
  ) => Promise<{ success: boolean; error?: string }>;
  setStoreSettings: (settings: StoreSettings | null) => void;

  // -- Reset --
  reset: () => void;
}

export const useStoreStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // -- Initial state --
      store: null,
      isLoading: false,
      error: null,
      receiptConfig: DEFAULT_RECEIPT_LAYOUT_CONFIG,
      storeSettings: null,
      isSettingsLoading: false,
      settingsError: null,

      // -- Store actions --
      setStore: (store) => set({ store, error: null }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),

      updateStatus: (status) =>
        set((state) => ({
          store: state.store
            ? { ...state.store, status: status as Store["status"] }
            : null,
        })),

      updateReceiptConfig: (patch) =>
        set((state) => ({
          receiptConfig: { ...state.receiptConfig, ...patch },
        })),

      // -- Settings actions --
      fetchSettings: async (storeId: string) => {
        set({ isSettingsLoading: true, settingsError: null });
        const { data, error } = await storeService.getSettings(storeId);
        if (error) {
          set({ settingsError: error, isSettingsLoading: false });
          return;
        }
        set({ storeSettings: data, isSettingsLoading: false });
      },

      updateSettings: async (storeId: string, updates: StoreSettingsUpdate) => {
        const previous = get().storeSettings;

        // Optimistic update: merge updates into current state
        if (previous) {
          set({
            storeSettings: {
              ...previous,
              ...flattenSettingsUpdate(previous, updates),
            },
          });
        }

        const { data, error } = await storeService.updateSettings(
          storeId,
          updates
        );

        if (error) {
          // Rollback on failure
          set({ storeSettings: previous, settingsError: error });
          return { success: false, error };
        }

        set({ storeSettings: data, settingsError: null });
        return { success: true };
      },

      setStoreSettings: (settings) => set({ storeSettings: settings }),

      // -- Reset --
      reset: () =>
        set({
          store: null,
          isLoading: false,
          error: null,
          storeSettings: null,
          isSettingsLoading: false,
          settingsError: null,
        }),
    }),
    {
      name: "store-storage",
      partialize: (state) => ({
        store: state.store,
        receiptConfig: state.receiptConfig,
      }),
    }
  )
);

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Merge a StoreSettingsUpdate into a StoreSettings object for optimistic UI.
 * Returns a partial object that can be spread onto the current state.
 */
function flattenSettingsUpdate(
  current: StoreSettings,
  updates: StoreSettingsUpdate
): Partial<StoreSettings> {
  const result: Partial<StoreSettings> = {};

  if (updates.tax_settings)
    result.tax_settings = { ...current.tax_settings, ...updates.tax_settings };
  if (updates.payment_gateway)
    result.payment_gateway = {
      razorpay: { ...current.payment_gateway.razorpay, ...updates.payment_gateway.razorpay },
      paytm: { ...current.payment_gateway.paytm, ...updates.payment_gateway.paytm },
      phonepe: { ...current.payment_gateway.phonepe, ...updates.payment_gateway.phonepe },
      stripe: { ...current.payment_gateway.stripe, ...updates.payment_gateway.stripe },
    };
  if (updates.invoice_settings)
    result.invoice_settings = { ...current.invoice_settings, ...updates.invoice_settings };
  if (updates.printer_settings)
    result.printer_settings = { ...current.printer_settings, ...updates.printer_settings };
  if (updates.business_hours)
    result.business_hours = { ...current.business_hours, ...updates.business_hours };
  if (updates.holidays !== undefined) result.holidays = updates.holidays;
  if (updates.discount_settings)
    result.discount_settings = { ...current.discount_settings, ...updates.discount_settings };
  if (updates.inventory_settings)
    result.inventory_settings = { ...current.inventory_settings, ...updates.inventory_settings };
  if (updates.sales_settings)
    result.sales_settings = { ...current.sales_settings, ...updates.sales_settings };
  if (updates.pos_settings)
    result.pos_settings = { ...current.pos_settings, ...updates.pos_settings };
  if (updates.notification_settings)
    result.notification_settings = {
      ...current.notification_settings,
      ...updates.notification_settings,
    };
  if (updates.backup_settings)
    result.backup_settings = { ...current.backup_settings, ...updates.backup_settings };

  // Scalar fields
  if (updates.currency_code !== undefined) result.currency_code = updates.currency_code;
  if (updates.currency_symbol !== undefined) result.currency_symbol = updates.currency_symbol;
  if (updates.currency_position !== undefined) result.currency_position = updates.currency_position;
  if (updates.thousand_separator !== undefined)
    result.thousand_separator = updates.thousand_separator;
  if (updates.decimal_separator !== undefined)
    result.decimal_separator = updates.decimal_separator;
  if (updates.decimal_places !== undefined) result.decimal_places = updates.decimal_places;
  if (updates.gst_calculation_method !== undefined)
    result.gst_calculation_method = updates.gst_calculation_method;

  return result;
}
