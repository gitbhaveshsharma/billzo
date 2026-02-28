import type {
    TaxSettings,
    PaymentGateway,
    InvoiceSettings,
    PrinterSettings,
    BusinessHours,
    Holiday,
    CurrencySettings,
    DiscountSettings,
    InventorySettings,
    SalesSettings,
    PosSettings,
    NotificationSettings,
    BackupSettings,
    PrinterType,
    LogoSize,
    BackupFrequency,
    CurrencyPosition,
    Weekday,
    SettingsSection,
    StoreSettings,
} from "@/types/store.types";
import type { GstCalculationMethod } from "@/types/database.types";

// ============================================================================
// DEFAULT VALUES (matching SQL migration defaults)
// ============================================================================

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
    gst_enabled: true,
    cgst_rate: 2.5,
    sgst_rate: 2.5,
    igst_rate: 5.0,
    cess_rate: 0.0,
    hsn_required: true,
    gst_composition_scheme: false,
    reverse_charge_applicable: false,
    tcs_applicable: false,
    tds_applicable: false,
};

export const DEFAULT_PAYMENT_GATEWAY: PaymentGateway = {
    razorpay: {
        enabled: false,
        key_id: null,
        key_secret: null,
        webhook_secret: null,
        auto_capture: true,
    },
    paytm: {
        enabled: false,
        merchant_id: null,
        merchant_key: null,
    },
    phonepe: {
        enabled: false,
        merchant_id: null,
        salt_key: null,
        salt_index: null,
    },
    stripe: {
        enabled: false,
        publishable_key: null,
        secret_key: null,
    },
};

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
    prefix: "INV",
    starting_number: 1001,
    number_format: "INV-{YYYY}-{####}",
    show_gst: true,
    show_hsn: true,
    show_cgst_sgst: true,
    show_igst: false,
    show_cess: false,
    show_discount: true,
    show_delivery_charges: false,
    terms: "Goods once sold will not be taken back or exchanged.",
    footer: "Thank you for your business!",
    invoice_copy_count: 2,
    enable_digital_signature: false,
    signature_image_url: null,
    authorized_signatory_name: null,
    round_off: true,
    decimal_places: 2,
};

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
    type: "thermal",
    paper_width: 80,
    character_per_line: 42,
    font_size: 12,
    header: "",
    footer: "Visit again!",
    show_barcode: true,
    show_qr_code: false,
    show_logo: true,
    logo_size: "small",
    print_copies: 1,
    auto_print: true,
    cut_paper: true,
    receipt_layout_config: null,
};

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
    monday: { open: "09:00", close: "21:00", closed: false, breaks: [] },
    tuesday: { open: "09:00", close: "21:00", closed: false, breaks: [] },
    wednesday: { open: "09:00", close: "21:00", closed: false, breaks: [] },
    thursday: { open: "09:00", close: "21:00", closed: false, breaks: [] },
    friday: { open: "09:00", close: "21:00", closed: false, breaks: [] },
    saturday: { open: "10:00", close: "22:00", closed: false, breaks: [] },
    sunday: { open: "10:00", close: "20:00", closed: false, breaks: [] },
};

export const DEFAULT_HOLIDAYS: Holiday[] = [];

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
    currency_code: "INR",
    currency_symbol: "₹",
    currency_position: "before",
    thousand_separator: ",",
    decimal_separator: ".",
    decimal_places: 2,
};

export const DEFAULT_DISCOUNT_SETTINGS: DiscountSettings = {
    max_discount_percentage: 50,
    allow_item_discount: true,
    allow_invoice_discount: true,
    require_approval_above: 25,
    discount_on_mrp: false,
};

export const DEFAULT_INVENTORY_SETTINGS: InventorySettings = {
    low_stock_alert: true,
    low_stock_threshold: 10,
    negative_stock_allowed: false,
    auto_generate_barcode: true,
    barcode_prefix: "STORE",
    enable_batch_tracking: false,
    enable_expiry_tracking: false,
    expiry_alert_days: 30,
};

export const DEFAULT_SALES_SETTINGS: SalesSettings = {
    allow_credit_sales: true,
    max_credit_days: 30,
    max_credit_amount: 50000,
    require_customer_for_credit: true,
    allow_hold_bills: true,
    max_hold_bills: 10,
    allow_layaway: false,
    mandatory_customer_phone: false,
    send_sms_receipt: false,
    send_email_receipt: false,
    send_whatsapp_receipt: false,
};

export const DEFAULT_POS_SETTINGS: PosSettings = {
    offline_mode_enabled: true,
    quick_billing_mode: false,
    show_product_images: true,
    barcode_scanner_enabled: true,
    weighing_scale_enabled: false,
    cash_drawer_enabled: true,
    customer_display_enabled: false,
    sound_on_scan: true,
    shortcut_keys_enabled: true,
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
    low_stock_alert: true,
    expiry_alert: true,
    daily_sales_report: false,
    weekly_sales_report: false,
    payment_received: true,
    new_order: true,
};

export const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
    auto_backup_enabled: true,
    backup_frequency: "daily",
    backup_time: "02:00",
    retention_days: 30,
    cloud_backup: true,
};

// ============================================================================
// LABEL MAPS
// ============================================================================

// -- Printer Type ------------------------------------------------------------

const PRINTER_TYPE_LABELS: Record<PrinterType, string> = {
    thermal: "Thermal",
    dot_matrix: "Dot Matrix",
    inkjet: "Inkjet",
    laser: "Laser",
};

export function getPrinterTypeLabel(type: PrinterType): string {
    return PRINTER_TYPE_LABELS[type] ?? type;
}

// -- Logo Size ---------------------------------------------------------------

const LOGO_SIZE_LABELS: Record<LogoSize, string> = {
    small: "Small",
    medium: "Medium",
    large: "Large",
};

export function getLogoSizeLabel(size: LogoSize): string {
    return LOGO_SIZE_LABELS[size] ?? size;
}

// -- Backup Frequency --------------------------------------------------------

const BACKUP_FREQUENCY_LABELS: Record<BackupFrequency, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
};

export function getBackupFrequencyLabel(freq: BackupFrequency): string {
    return BACKUP_FREQUENCY_LABELS[freq] ?? freq;
}

// -- Currency Position -------------------------------------------------------

const CURRENCY_POSITION_LABELS: Record<CurrencyPosition, string> = {
    before: "Before Amount (₹100)",
    after: "After Amount (100₹)",
};

export function getCurrencyPositionLabel(pos: CurrencyPosition): string {
    return CURRENCY_POSITION_LABELS[pos] ?? pos;
}

// -- GST Calculation Method --------------------------------------------------

const GST_METHOD_LABELS: Record<GstCalculationMethod, string> = {
    inclusive: "Inclusive (Price includes GST)",
    exclusive: "Exclusive (GST added on top)",
};

export function getGstMethodLabel(method: GstCalculationMethod): string {
    return GST_METHOD_LABELS[method] ?? method;
}

// -- Weekday -----------------------------------------------------------------

const WEEKDAY_LABELS: Record<Weekday, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
};

export function getWeekdayLabel(day: Weekday): string {
    return WEEKDAY_LABELS[day] ?? day;
}

// -- Settings Section --------------------------------------------------------

const SETTINGS_SECTION_LABELS: Record<SettingsSection, string> = {
    tax_settings: "Tax & GST",
    payment_gateway: "Payment Gateway",
    invoice_settings: "Invoice",
    printer_settings: "Printer",
    business_hours: "Business Hours",
    holidays: "Holidays",
    currency: "Currency & Formatting",
    discount_settings: "Discount",
    inventory_settings: "Inventory",
    sales_settings: "Sales",
    pos_settings: "POS Terminal",
    notification_settings: "Notifications",
    backup_settings: "Backup",
};

export function getSettingsSectionLabel(section: SettingsSection): string {
    return SETTINGS_SECTION_LABELS[section] ?? section;
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format a number using the store's currency settings.
 * e.g. formatCurrency(1500.5, settings) => "₹1,500.50"
 */
export function formatCurrency(
    amount: number,
    settings: CurrencySettings
): string {
    const { currency_symbol, currency_position, thousand_separator, decimal_separator, decimal_places } = settings;

    const fixed = amount.toFixed(decimal_places);
    const [intPart, decPart] = fixed.split(".");

    // Add thousand separators (Indian numbering: last 3, then groups of 2)
    const withSeparator = addThousandSeparator(intPart, thousand_separator);

    const formatted = decPart
        ? `${withSeparator}${decimal_separator}${decPart}`
        : withSeparator;

    return currency_position === "before"
        ? `${currency_symbol}${formatted}`
        : `${formatted}${currency_symbol}`;
}

/**
 * Indian-style thousand separator: 1,23,45,678
 */
function addThousandSeparator(numStr: string, separator: string): string {
    const isNegative = numStr.startsWith("-");
    const digits = isNegative ? numStr.slice(1) : numStr;

    if (digits.length <= 3) return numStr;

    const lastThree = digits.slice(-3);
    const rest = digits.slice(0, -3);

    // Group remaining digits in pairs (Indian numbering)
    const groups: string[] = [];
    for (let i = rest.length; i > 0; i -= 2) {
        groups.unshift(rest.slice(Math.max(0, i - 2), i));
    }

    const result = `${groups.join(separator)}${separator}${lastThree}`;
    return isNegative ? `-${result}` : result;
}

/**
 * Format time string "HH:MM" to "9:00 AM" / "9:00 PM" display.
 */
export function formatTime12h(time: string): string {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Preview invoice number format.
 * e.g. "INV-{YYYY}-{####}" with starting number 1001 → "INV-2025-1001"
 */
export function previewInvoiceNumber(
    format: string,
    startingNumber: number
): string {
    const year = new Date().getFullYear().toString();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");

    return format
        .replace("{YYYY}", year)
        .replace("{YY}", year.slice(-2))
        .replace("{MM}", month)
        .replace(
            /\{(#+)\}/,
            (_, hashes: string) =>
                String(startingNumber).padStart(hashes.length, "0")
        );
}

// ============================================================================
// SAFE PARSERS (DB Json → typed objects with defaults)
// ============================================================================

/**
 * Safely parse a JSONB value from the database, merging with defaults.
 * DB stores Json (unknown), so we spread defaults first, then override.
 */
export function parseTaxSettings(raw: unknown): TaxSettings {
    return { ...DEFAULT_TAX_SETTINGS, ...(raw as Partial<TaxSettings>) };
}

export function parsePaymentGateway(raw: unknown): PaymentGateway {
    const parsed = raw as Partial<PaymentGateway> | null;
    return {
        razorpay: { ...DEFAULT_PAYMENT_GATEWAY.razorpay, ...parsed?.razorpay },
        paytm: { ...DEFAULT_PAYMENT_GATEWAY.paytm, ...parsed?.paytm },
        phonepe: { ...DEFAULT_PAYMENT_GATEWAY.phonepe, ...parsed?.phonepe },
        stripe: { ...DEFAULT_PAYMENT_GATEWAY.stripe, ...parsed?.stripe },
    };
}

export function parseInvoiceSettings(raw: unknown): InvoiceSettings {
    return { ...DEFAULT_INVOICE_SETTINGS, ...(raw as Partial<InvoiceSettings>) };
}

export function parsePrinterSettings(raw: unknown): PrinterSettings {
    return { ...DEFAULT_PRINTER_SETTINGS, ...(raw as Partial<PrinterSettings>) };
}

export function parseBusinessHours(raw: unknown): BusinessHours {
    const parsed = raw as Partial<BusinessHours> | null;
    const result = { ...DEFAULT_BUSINESS_HOURS };
    if (parsed) {
        for (const day of Object.keys(DEFAULT_BUSINESS_HOURS) as Weekday[]) {
            if (parsed[day]) {
                result[day] = { ...DEFAULT_BUSINESS_HOURS[day], ...parsed[day] };
            }
        }
    }
    return result;
}

export function parseHolidays(raw: unknown): Holiday[] {
    if (Array.isArray(raw)) return raw as Holiday[];
    return DEFAULT_HOLIDAYS;
}

export function parseDiscountSettings(raw: unknown): DiscountSettings {
    return { ...DEFAULT_DISCOUNT_SETTINGS, ...(raw as Partial<DiscountSettings>) };
}

export function parseInventorySettings(raw: unknown): InventorySettings {
    return { ...DEFAULT_INVENTORY_SETTINGS, ...(raw as Partial<InventorySettings>) };
}

export function parseSalesSettings(raw: unknown): SalesSettings {
    return { ...DEFAULT_SALES_SETTINGS, ...(raw as Partial<SalesSettings>) };
}

export function parsePosSettings(raw: unknown): PosSettings {
    return { ...DEFAULT_POS_SETTINGS, ...(raw as Partial<PosSettings>) };
}

export function parseNotificationSettings(raw: unknown): NotificationSettings {
    return {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...(raw as Partial<NotificationSettings>),
    };
}

export function parseBackupSettings(raw: unknown): BackupSettings {
    return { ...DEFAULT_BACKUP_SETTINGS, ...(raw as Partial<BackupSettings>) };
}

/**
 * Parse the full store_settings row from DB (Json columns → typed).
 */
export function parseStoreSettings(
    row: Record<string, unknown>
): StoreSettings {
    return {
        id: row.id as string,
        store_id: row.store_id as string,

        tax_settings: parseTaxSettings(row.tax_settings),
        payment_gateway: parsePaymentGateway(row.payment_gateway),
        invoice_settings: parseInvoiceSettings(row.invoice_settings),
        printer_settings: parsePrinterSettings(row.printer_settings),
        business_hours: parseBusinessHours(row.business_hours),
        holidays: parseHolidays(row.holidays),

        currency_code: (row.currency_code as string) ?? DEFAULT_CURRENCY_SETTINGS.currency_code,
        currency_symbol: (row.currency_symbol as string) ?? DEFAULT_CURRENCY_SETTINGS.currency_symbol,
        currency_position: (row.currency_position as string) ?? DEFAULT_CURRENCY_SETTINGS.currency_position,
        thousand_separator: (row.thousand_separator as string) ?? DEFAULT_CURRENCY_SETTINGS.thousand_separator,
        decimal_separator: (row.decimal_separator as string) ?? DEFAULT_CURRENCY_SETTINGS.decimal_separator,
        decimal_places: (row.decimal_places as number) ?? DEFAULT_CURRENCY_SETTINGS.decimal_places,

        gst_calculation_method:
            (row.gst_calculation_method as GstCalculationMethod) ?? "inclusive",

        discount_settings: parseDiscountSettings(row.discount_settings),
        inventory_settings: parseInventorySettings(row.inventory_settings),
        sales_settings: parseSalesSettings(row.sales_settings),
        pos_settings: parsePosSettings(row.pos_settings),
        notification_settings: parseNotificationSettings(row.notification_settings),
        backup_settings: parseBackupSettings(row.backup_settings),

        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
    };
}
