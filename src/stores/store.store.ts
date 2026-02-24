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

  // -- Receipt config (persisted locally + synced to DB) --
  /** Receipt layout / print settings. Persisted locally and in store_settings.printer_settings */
  receiptConfig: ReceiptLayoutConfig;
  isSavingReceiptConfig: boolean;

  // -- Store settings --
  storeSettings: StoreSettings | null;
  isSettingsLoading: boolean;
  settingsError: string | null;

  // -- Store actions --
  setStore: (store: Store | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateStatus: (status: string) => void;
  /** Patch receiptConfig locally (live preview). Call saveReceiptConfig to persist to DB. */
  updateReceiptConfig: (patch: Partial<ReceiptLayoutConfig>) => void;
  /** Save the current receiptConfig to the DB via store_settings.printer_settings */
  saveReceiptConfig: (storeId: string) => Promise<{ success: boolean; error?: string }>;

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
      isSavingReceiptConfig: false,
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

      saveReceiptConfig: async (storeId: string) => {
        set({ isSavingReceiptConfig: true });
        const config = get().receiptConfig;
        const result = await get().updateSettings(storeId, {
          printer_settings: {
            receipt_layout_config: config,
            // Keep the top-level fields in sync with ReceiptLayoutConfig for
            // callers that read printer_settings directly (ESC/POS drivers, etc.)
            paper_width: typeof config.paperSize === "number"
              ? (config.paperSize as 58 | 80)
              : 80,
            print_copies: config.printCopies,
            auto_print: config.autoPrint,
            show_barcode: config.showBarcode,
            show_qr_code: config.showQrCode,
            show_logo: config.showLogo,
            header: config.headerNote,
            footer: config.footerText,
          },
        });
        set({ isSavingReceiptConfig: false });
        return result;
      },

      // -- Settings actions --
      fetchSettings: async (storeId: string) => {
        set({ isSettingsLoading: true, settingsError: null });
        const { data, error } = await storeService.getSettings(storeId);
        if (error) {
          set({ settingsError: error, isSettingsLoading: false });
          return;
        }
        // Sync receiptConfig from DB if available
        const dbReceiptConfig = data?.printer_settings?.receipt_layout_config;
        set({
          storeSettings: data,
          isSettingsLoading: false,
          ...(dbReceiptConfig
            ? { receiptConfig: { ...DEFAULT_RECEIPT_LAYOUT_CONFIG, ...dbReceiptConfig } }
            : {}),
        });
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

      setStoreSettings: (settings) => {
        const dbReceiptConfig = settings?.printer_settings?.receipt_layout_config;
        set({
          storeSettings: settings,
          ...(dbReceiptConfig
            ? { receiptConfig: { ...DEFAULT_RECEIPT_LAYOUT_CONFIG, ...dbReceiptConfig } }
            : {}),
        });
      },

      // -- Reset --
      reset: () =>
        set({
          store: null,
          isLoading: false,
          error: null,
          receiptConfig: DEFAULT_RECEIPT_LAYOUT_CONFIG,
          isSavingReceiptConfig: false,
          storeSettings: null,
          isSettingsLoading: false,
          settingsError: null,
        }),
    }),
    {
      name: "store-storage",
      partialize: (state) => ({
        store: state.store,
        // Keep receiptConfig locally as an offline fallback; the DB is the source of truth
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
  if (updates.printer_settings) {
    result.printer_settings = {
      ...current.printer_settings,
      ...updates.printer_settings,
      // Deep-merge receipt_layout_config if both sides have it
      receipt_layout_config:
        updates.printer_settings.receipt_layout_config !== undefined
          ? updates.printer_settings.receipt_layout_config
          : current.printer_settings.receipt_layout_config,
    };
  }
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
