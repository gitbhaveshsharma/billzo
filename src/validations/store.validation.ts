import { z } from "zod";
import {
  phoneSchema,
  pincodeSchema,
  emailOptionalSchema,
} from "./common.validation";

// ============================================================================
// STORE CREATION SCHEMA (onboarding — do NOT modify)
// ============================================================================

/** Store creation schema — simplified to ~10 fields for smooth onboarding */
export const storeSchema = z.object({
  name: z
    .string()
    .min(2, "Store name must be at least 2 characters")
    .max(100, "Store name must not exceed 100 characters"),

  store_code: z
    .string()
    .min(3, "Store code must be at least 3 characters")
    .max(20, "Store code must not exceed 20 characters")
    .regex(
      /^[A-Z0-9-]+$/,
      "Store code must be uppercase alphanumeric with dashes"
    ),

  store_type: z.enum(["retail", "warehouse", "franchise", "outlet", "kiosk"], {
    error: "Select a store type",
  }),

  address_line1: z.string().min(3, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),

  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),

  phone: phoneSchema,
  email: emailOptionalSchema,
  gstin: z.string().optional().or(z.literal("")),
});

export const updateStoreSchema = storeSchema.partial();

export type StoreFormData = z.infer<typeof storeSchema>;

// ============================================================================
// STORE SETTINGS VALIDATION SCHEMAS
// ============================================================================

// -- Tax Settings ------------------------------------------------------------

export const taxSettingsSchema = z.object({
  gst_enabled: z.boolean(),
  cgst_rate: z
    .number()
    .min(0, "CGST rate cannot be negative")
    .max(100, "CGST rate cannot exceed 100%"),
  sgst_rate: z
    .number()
    .min(0, "SGST rate cannot be negative")
    .max(100, "SGST rate cannot exceed 100%"),
  igst_rate: z
    .number()
    .min(0, "IGST rate cannot be negative")
    .max(100, "IGST rate cannot exceed 100%"),
  cess_rate: z
    .number()
    .min(0, "Cess rate cannot be negative")
    .max(100, "Cess rate cannot exceed 100%"),
  hsn_required: z.boolean(),
  gst_composition_scheme: z.boolean(),
  reverse_charge_applicable: z.boolean(),
  tcs_applicable: z.boolean(),
  tds_applicable: z.boolean(),
});

export type TaxSettingsFormData = z.infer<typeof taxSettingsSchema>;

// -- Invoice Settings --------------------------------------------------------

export const invoiceSettingsSchema = z.object({
  prefix: z
    .string()
    .min(1, "Invoice prefix is required")
    .max(10, "Prefix must not exceed 10 characters")
    .regex(
      /^[A-Z0-9-]+$/,
      "Prefix must be uppercase alphanumeric with dashes"
    ),
  starting_number: z
    .number()
    .int("Must be a whole number")
    .min(1, "Starting number must be at least 1"),
  number_format: z.string().min(1, "Number format is required"),
  show_gst: z.boolean(),
  show_hsn: z.boolean(),
  show_cgst_sgst: z.boolean(),
  show_igst: z.boolean(),
  show_cess: z.boolean(),
  show_discount: z.boolean(),
  show_delivery_charges: z.boolean(),
  terms: z.string().max(500, "Terms must not exceed 500 characters"),
  footer: z.string().max(200, "Footer must not exceed 200 characters"),
  invoice_copy_count: z
    .number()
    .int()
    .min(1, "At least 1 copy required")
    .max(5, "Maximum 5 copies"),
  enable_digital_signature: z.boolean(),
  signature_image_url: z.string().nullable(),
  authorized_signatory_name: z
    .string()
    .max(100, "Signatory name must not exceed 100 characters")
    .nullable(),
  round_off: z.boolean(),
  decimal_places: z.number().int().min(0).max(4),
});

export type InvoiceSettingsFormData = z.infer<typeof invoiceSettingsSchema>;

// -- Printer Settings --------------------------------------------------------

export const printerSettingsSchema = z.object({
  type: z.enum(["thermal", "dot_matrix", "inkjet", "laser"]),
  paper_width: z.union([z.literal(58), z.literal(80)]),
  character_per_line: z
    .number()
    .int()
    .min(20, "At least 20 characters per line")
    .max(80, "Maximum 80 characters per line"),
  font_size: z
    .number()
    .int()
    .min(8, "Minimum font size is 8")
    .max(24, "Maximum font size is 24"),
  header: z.string().max(200, "Header must not exceed 200 characters"),
  footer: z.string().max(200, "Footer must not exceed 200 characters"),
  show_barcode: z.boolean(),
  show_qr_code: z.boolean(),
  show_logo: z.boolean(),
  logo_size: z.enum(["small", "medium", "large"]),
  print_copies: z
    .number()
    .int()
    .min(1, "At least 1 copy")
    .max(5, "Maximum 5 copies"),
  auto_print: z.boolean(),
  cut_paper: z.boolean(),
});

export type PrinterSettingsFormData = z.infer<typeof printerSettingsSchema>;

// -- Business Hours ----------------------------------------------------------

const timeBreakSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  label: z.string().optional(),
});

const dayScheduleSchema = z
  .object({
    open: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    close: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    closed: z.boolean(),
    breaks: z.array(timeBreakSchema),
  })
  .refine(
    (day) => {
      if (day.closed) return true;
      return day.open < day.close;
    },
    { message: "Opening time must be before closing time" }
  );

export const businessHoursSchema = z.object({
  monday: dayScheduleSchema,
  tuesday: dayScheduleSchema,
  wednesday: dayScheduleSchema,
  thursday: dayScheduleSchema,
  friday: dayScheduleSchema,
  saturday: dayScheduleSchema,
  sunday: dayScheduleSchema,
});

export type BusinessHoursFormData = z.infer<typeof businessHoursSchema>;

// -- Holiday -----------------------------------------------------------------

export const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  name: z
    .string()
    .min(1, "Holiday name is required")
    .max(100, "Name must not exceed 100 characters"),
  closed: z.boolean(),
});

export const holidaysSchema = z.array(holidaySchema);

export type HolidayFormData = z.infer<typeof holidaySchema>;

// -- Currency Settings -------------------------------------------------------

export const currencySettingsSchema = z.object({
  currency_code: z
    .string()
    .min(3, "Currency code must be 3 characters")
    .max(3, "Currency code must be 3 characters")
    .regex(/^[A-Z]{3}$/, "Currency code must be 3 uppercase letters"),
  currency_symbol: z
    .string()
    .min(1, "Currency symbol is required")
    .max(5, "Symbol must not exceed 5 characters"),
  currency_position: z.enum(["before", "after"]),
  thousand_separator: z.string().max(1, "Must be a single character"),
  decimal_separator: z.string().max(1, "Must be a single character"),
  decimal_places: z.number().int().min(0).max(4),
  gst_calculation_method: z.enum(["inclusive", "exclusive"]),
});

export type CurrencySettingsFormData = z.infer<typeof currencySettingsSchema>;

// -- Discount Settings -------------------------------------------------------

export const discountSettingsSchema = z.object({
  max_discount_percentage: z
    .number()
    .min(0, "Cannot be negative")
    .max(100, "Cannot exceed 100%"),
  allow_item_discount: z.boolean(),
  allow_invoice_discount: z.boolean(),
  require_approval_above: z
    .number()
    .min(0, "Cannot be negative")
    .max(100, "Cannot exceed 100%"),
  discount_on_mrp: z.boolean(),
});

export type DiscountSettingsFormData = z.infer<typeof discountSettingsSchema>;

// -- Inventory Settings ------------------------------------------------------

export const inventorySettingsSchema = z.object({
  low_stock_alert: z.boolean(),
  low_stock_threshold: z
    .number()
    .int()
    .min(0, "Threshold cannot be negative"),
  negative_stock_allowed: z.boolean(),
  auto_generate_barcode: z.boolean(),
  barcode_prefix: z
    .string()
    .max(20, "Prefix must not exceed 20 characters")
    .regex(
      /^[A-Z0-9-]*$/,
      "Prefix must be uppercase alphanumeric with dashes"
    ),
  enable_batch_tracking: z.boolean(),
  enable_expiry_tracking: z.boolean(),
  expiry_alert_days: z
    .number()
    .int()
    .min(1, "Must be at least 1 day")
    .max(365, "Cannot exceed 365 days"),
});

export type InventorySettingsFormData = z.infer<typeof inventorySettingsSchema>;

// -- Sales Settings ----------------------------------------------------------

export const salesSettingsSchema = z
  .object({
    allow_credit_sales: z.boolean(),
    max_credit_days: z.number().int().min(0, "Cannot be negative"),
    max_credit_amount: z.number().min(0, "Cannot be negative"),
    require_customer_for_credit: z.boolean(),
    allow_hold_bills: z.boolean(),
    max_hold_bills: z
      .number()
      .int()
      .min(0, "Cannot be negative")
      .max(100, "Cannot exceed 100"),
    allow_layaway: z.boolean(),
    mandatory_customer_phone: z.boolean(),
    send_sms_receipt: z.boolean(),
    send_email_receipt: z.boolean(),
    send_whatsapp_receipt: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.allow_credit_sales && data.max_credit_days <= 0) return false;
      return true;
    },
    {
      message: "Credit days must be greater than 0 when credit sales are enabled",
      path: ["max_credit_days"],
    }
  );

export type SalesSettingsFormData = z.infer<typeof salesSettingsSchema>;

// -- POS Settings ------------------------------------------------------------

export const posSettingsSchema = z.object({
  offline_mode_enabled: z.boolean(),
  quick_billing_mode: z.boolean(),
  show_product_images: z.boolean(),
  barcode_scanner_enabled: z.boolean(),
  weighing_scale_enabled: z.boolean(),
  cash_drawer_enabled: z.boolean(),
  customer_display_enabled: z.boolean(),
  sound_on_scan: z.boolean(),
  shortcut_keys_enabled: z.boolean(),
});

export type PosSettingsFormData = z.infer<typeof posSettingsSchema>;

// -- Notification Settings ---------------------------------------------------

export const notificationSettingsSchema = z.object({
  low_stock_alert: z.boolean(),
  expiry_alert: z.boolean(),
  daily_sales_report: z.boolean(),
  weekly_sales_report: z.boolean(),
  payment_received: z.boolean(),
  new_order: z.boolean(),
});

export type NotificationSettingsFormData = z.infer<
  typeof notificationSettingsSchema
>;

// -- Backup Settings ---------------------------------------------------------

export const backupSettingsSchema = z.object({
  auto_backup_enabled: z.boolean(),
  backup_frequency: z.enum(["daily", "weekly", "monthly"]),
  backup_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  retention_days: z
    .number()
    .int()
    .min(1, "Must retain for at least 1 day")
    .max(365, "Cannot exceed 365 days"),
  cloud_backup: z.boolean(),
});

export type BackupSettingsFormData = z.infer<typeof backupSettingsSchema>;

// -- Payment Gateway ---------------------------------------------------------

const razorpaySchema = z.object({
  enabled: z.boolean(),
  key_id: z.string().nullable(),
  key_secret: z.string().nullable(),
  webhook_secret: z.string().nullable(),
  auto_capture: z.boolean(),
});

const paytmSchema = z.object({
  enabled: z.boolean(),
  merchant_id: z.string().nullable(),
  merchant_key: z.string().nullable(),
});

const phonepeSchema = z.object({
  enabled: z.boolean(),
  merchant_id: z.string().nullable(),
  salt_key: z.string().nullable(),
  salt_index: z.string().nullable(),
});

const stripeSchema = z.object({
  enabled: z.boolean(),
  publishable_key: z.string().nullable(),
  secret_key: z.string().nullable(),
});

export const paymentGatewaySchema = z.object({
  razorpay: razorpaySchema,
  paytm: paytmSchema,
  phonepe: phonepeSchema,
  stripe: stripeSchema,
});

export type PaymentGatewayFormData = z.infer<typeof paymentGatewaySchema>;
