import type { Database, StoreType, GstCalculationMethod } from "./database.types";
import type { ReceiptLayoutConfig } from "@/hooks/use-hardware";

// ============================================================================
// STORE TABLE TYPES
// ============================================================================

export type Store = Database["public"]["Tables"]["stores"]["Row"];
export type StoreInsert = Database["public"]["Tables"]["stores"]["Insert"];
export type StoreUpdate = Database["public"]["Tables"]["stores"]["Update"];

/** Simplified input for creating a store during onboarding (10 fields) */
export interface CreateStoreInput {
  organization_id: string;
  name: string;
  store_code: string;
  store_type: StoreType;
  address_line1: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  email?: string;
}

/** Store with user role info from v_user_store_role view */
export type UserStoreRole =
  Database["public"]["Views"]["v_user_store_role"]["Row"];

// ============================================================================
// STORE SETTINGS — ENUMS & CONSTANTS
// ============================================================================

export const GST_CALCULATION_METHODS = ["inclusive", "exclusive"] as const;

export const CURRENCY_POSITIONS = ["before", "after"] as const;
export type CurrencyPosition = (typeof CURRENCY_POSITIONS)[number];

export const PRINTER_TYPES = ["thermal", "dot_matrix", "inkjet", "laser"] as const;
export type PrinterType = (typeof PRINTER_TYPES)[number];

export const PAPER_WIDTHS = [58, 80] as const;
export type PaperWidth = (typeof PAPER_WIDTHS)[number];

export const LOGO_SIZES = ["small", "medium", "large"] as const;
export type LogoSize = (typeof LOGO_SIZES)[number];

export const BACKUP_FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export type BackupFrequency = (typeof BACKUP_FREQUENCIES)[number];

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

// ============================================================================
// STORE SETTINGS — JSONB COLUMN INTERFACES
// ============================================================================

// -- Tax Settings (India GST) ------------------------------------------------

export interface TaxSettings {
  gst_enabled: boolean;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cess_rate: number;
  hsn_required: boolean;
  gst_composition_scheme: boolean;
  reverse_charge_applicable: boolean;
  tcs_applicable: boolean;
  tds_applicable: boolean;
}

// -- Payment Gateway ---------------------------------------------------------

export interface PaymentGatewayCredentials {
  enabled: boolean;
  [key: string]: unknown;
}

export interface RazorpaySettings extends PaymentGatewayCredentials {
  key_id: string | null;
  key_secret: string | null;
  webhook_secret: string | null;
  auto_capture: boolean;
}

export interface PaytmSettings extends PaymentGatewayCredentials {
  merchant_id: string | null;
  merchant_key: string | null;
}

export interface PhonePeSettings extends PaymentGatewayCredentials {
  merchant_id: string | null;
  salt_key: string | null;
  salt_index: string | null;
}

export interface StripeSettings extends PaymentGatewayCredentials {
  publishable_key: string | null;
  secret_key: string | null;
}

export interface PaymentGateway {
  razorpay: RazorpaySettings;
  paytm: PaytmSettings;
  phonepe: PhonePeSettings;
  stripe: StripeSettings;
}

// -- Invoice Settings --------------------------------------------------------

export interface InvoiceSettings {
  prefix: string;
  starting_number: number;
  number_format: string;
  show_gst: boolean;
  show_hsn: boolean;
  show_cgst_sgst: boolean;
  show_igst: boolean;
  show_cess: boolean;
  show_discount: boolean;
  show_delivery_charges: boolean;
  terms: string;
  footer: string;
  invoice_copy_count: number;
  enable_digital_signature: boolean;
  signature_image_url: string | null;
  authorized_signatory_name: string | null;
  round_off: boolean;
  decimal_places: number;
}

// -- Printer Settings --------------------------------------------------------

export interface PrinterSettings {
  type: PrinterType;
  paper_width: PaperWidth;
  character_per_line: number;
  font_size: number;
  header: string;
  footer: string;
  show_barcode: boolean;
  show_qr_code: boolean;
  show_logo: boolean;
  logo_size: LogoSize;
  print_copies: number;
  auto_print: boolean;
  cut_paper: boolean;
  /** Full receipt layout/print config — stored as JSONB sub-field */
  receipt_layout_config: ReceiptLayoutConfig | null;
}

// -- Business Hours ----------------------------------------------------------

export interface TimeBreak {
  start: string;
  end: string;
  label?: string;
}

export interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
  breaks: TimeBreak[];
}

export type BusinessHours = Record<Weekday, DaySchedule>;

// -- Holidays ----------------------------------------------------------------

export interface Holiday {
  date: string;
  name: string;
  closed: boolean;
}

// -- Currency Settings (scalar columns) --------------------------------------

export interface CurrencySettings {
  currency_code: string;
  currency_symbol: string;
  currency_position: CurrencyPosition;
  thousand_separator: string;
  decimal_separator: string;
  decimal_places: number;
}

// -- Discount Settings -------------------------------------------------------

export interface DiscountSettings {
  max_discount_percentage: number;
  allow_item_discount: boolean;
  allow_invoice_discount: boolean;
  require_approval_above: number;
  discount_on_mrp: boolean;
}

// -- Inventory Settings ------------------------------------------------------

export interface InventorySettings {
  low_stock_alert: boolean;
  low_stock_threshold: number;
  negative_stock_allowed: boolean;
  auto_generate_barcode: boolean;
  barcode_prefix: string;
  enable_batch_tracking: boolean;
  enable_expiry_tracking: boolean;
  expiry_alert_days: number;
}

// -- Sales Settings ----------------------------------------------------------

export interface SalesSettings {
  allow_credit_sales: boolean;
  max_credit_days: number;
  max_credit_amount: number;
  require_customer_for_credit: boolean;
  allow_hold_bills: boolean;
  max_hold_bills: number;
  allow_layaway: boolean;
  mandatory_customer_phone: boolean;
  send_sms_receipt: boolean;
  send_email_receipt: boolean;
  send_whatsapp_receipt: boolean;
}

// -- POS Settings ------------------------------------------------------------

export interface PosSettings {
  offline_mode_enabled: boolean;
  quick_billing_mode: boolean;
  show_product_images: boolean;
  barcode_scanner_enabled: boolean;
  weighing_scale_enabled: boolean;
  cash_drawer_enabled: boolean;
  customer_display_enabled: boolean;
  sound_on_scan: boolean;
  shortcut_keys_enabled: boolean;
}

// -- Notification Settings ---------------------------------------------------

export interface NotificationSettings {
  low_stock_alert: boolean;
  expiry_alert: boolean;
  daily_sales_report: boolean;
  weekly_sales_report: boolean;
  payment_received: boolean;
  new_order: boolean;
}

// -- Backup Settings ---------------------------------------------------------

export interface BackupSettings {
  auto_backup_enabled: boolean;
  backup_frequency: BackupFrequency;
  backup_time: string;
  retention_days: number;
  cloud_backup: boolean;
}

// ============================================================================
// AGGREGATE STORE SETTINGS TYPE
// ============================================================================

export interface StoreSettings {
  id: string;
  store_id: string;

  // JSONB columns (typed)
  tax_settings: TaxSettings;
  payment_gateway: PaymentGateway;
  invoice_settings: InvoiceSettings;
  printer_settings: PrinterSettings;
  business_hours: BusinessHours;
  holidays: Holiday[];

  // Scalar currency columns
  currency_code: string;
  currency_symbol: string;
  currency_position: string;
  thousand_separator: string;
  decimal_separator: string;
  decimal_places: number;

  // GST calculation
  gst_calculation_method: GstCalculationMethod;

  // JSONB columns (typed)
  discount_settings: DiscountSettings;
  inventory_settings: InventorySettings;
  sales_settings: SalesSettings;
  pos_settings: PosSettings;
  notification_settings: NotificationSettings;
  backup_settings: BackupSettings;

  // System fields
  created_at: string;
  updated_at: string;
}

// ============================================================================
// STORE SETTINGS UPDATE TYPES (per-section partial updates)
// ============================================================================

export interface StoreSettingsUpdate {
  tax_settings?: Partial<TaxSettings>;
  payment_gateway?: Partial<PaymentGateway>;
  invoice_settings?: Partial<InvoiceSettings>;
  printer_settings?: Partial<PrinterSettings>;
  business_hours?: Partial<BusinessHours>;
  holidays?: Holiday[];
  currency_code?: string;
  currency_symbol?: string;
  currency_position?: string;
  thousand_separator?: string;
  decimal_separator?: string;
  decimal_places?: number;
  gst_calculation_method?: GstCalculationMethod;
  discount_settings?: Partial<DiscountSettings>;
  inventory_settings?: Partial<InventorySettings>;
  sales_settings?: Partial<SalesSettings>;
  pos_settings?: Partial<PosSettings>;
  notification_settings?: Partial<NotificationSettings>;
  backup_settings?: Partial<BackupSettings>;
}

// ============================================================================
// SETTINGS SECTION KEY (for per-section CRUD)
// ============================================================================

export const SETTINGS_SECTIONS = [
  "tax_settings",
  "payment_gateway",
  "invoice_settings",
  "printer_settings",
  "business_hours",
  "holidays",
  "currency",
  "discount_settings",
  "inventory_settings",
  "sales_settings",
  "pos_settings",
  "notification_settings",
  "backup_settings",
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];
