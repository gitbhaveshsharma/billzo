import type {
    Sale,
    SaleItem,
    SalePayment,
    SaleReturn,
    SaleStatus,
    PaymentMethod,
    ReturnStatus,
    DiscountType,
    PaymentRecordStatus,
    ChequeStatus,
    CartItem,
    HoldBill,
    CreateSaleItemRequest,
    EnrichedSale,
    SalesDashboardStats,
    SaleSummaryView,
} from "@/types/sales.types";

// ============================================================================
// SALES UTILS
// Display, formatting, GST calculations, cart helpers, status checks, export
// ============================================================================

// ============================================================================
// STATUS LABELS & COLORS
// ============================================================================

const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
    DRAFT: "Draft",
    HOLD: "On Hold",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    PARTIAL_RETURN: "Partial Return",
    FULLY_RETURNED: "Fully Returned",
    CREDIT: "Credit",
    PARTIAL_PAID: "Partial Paid",
};

const SALE_STATUS_COLORS: Record<SaleStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-800 border-slate-200",
    HOLD: "bg-amber-100 text-amber-800 border-amber-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
    CANCELLED: "bg-red-100 text-red-800 border-red-200",
    PARTIAL_RETURN: "bg-orange-100 text-orange-800 border-orange-200",
    FULLY_RETURNED: "bg-pink-100 text-pink-800 border-pink-200",
    CREDIT: "bg-blue-100 text-blue-800 border-blue-200",
    PARTIAL_PAID: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    CASH: "Cash",
    CARD_CREDIT: "Credit Card",
    CARD_DEBIT: "Debit Card",
    UPI: "UPI",
    NET_BANKING: "Net Banking",
    WALLET: "Wallet",
    CHEQUE: "Cheque",
    NEFT_RTGS: "NEFT/RTGS",
    CREDIT_NOTE: "Credit Note",
    LOYALTY_POINTS: "Loyalty Points",
    EMI: "EMI",
    GIFT_CARD: "Gift Card",
};

const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
    CASH: "bg-green-100 text-green-800 border-green-200",
    CARD_CREDIT: "bg-blue-100 text-blue-800 border-blue-200",
    CARD_DEBIT: "bg-indigo-100 text-indigo-800 border-indigo-200",
    UPI: "bg-purple-100 text-purple-800 border-purple-200",
    NET_BANKING: "bg-cyan-100 text-cyan-800 border-cyan-200",
    WALLET: "bg-teal-100 text-teal-800 border-teal-200",
    CHEQUE: "bg-orange-100 text-orange-800 border-orange-200",
    NEFT_RTGS: "bg-sky-100 text-sky-800 border-sky-200",
    CREDIT_NOTE: "bg-lime-100 text-lime-800 border-lime-200",
    LOYALTY_POINTS: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
    EMI: "bg-rose-100 text-rose-800 border-rose-200",
    GIFT_CARD: "bg-violet-100 text-violet-800 border-violet-200",
};

const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
    INITIATED: "Initiated",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    COMPLETED: "Completed",
    REFUND_PENDING: "Refund Pending",
    REFUND_COMPLETED: "Refund Completed",
};

const RETURN_STATUS_COLORS: Record<ReturnStatus, string> = {
    INITIATED: "bg-slate-100 text-slate-800 border-slate-200",
    APPROVED: "bg-blue-100 text-blue-800 border-blue-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
    REFUND_PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    REFUND_COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
    PERCENTAGE: "Percentage",
    FLAT_AMOUNT: "Flat Amount",
    BUY_X_GET_Y: "Buy X Get Y",
    COMBO: "Combo",
    LOYALTY: "Loyalty",
    MANUAL: "Manual",
};

const PAYMENT_RECORD_STATUS_LABELS: Record<PaymentRecordStatus, string> = {
    SUCCESS: "Success",
    FAILED: "Failed",
    PENDING: "Pending",
    REVERSED: "Reversed",
};

const PAYMENT_RECORD_STATUS_COLORS: Record<PaymentRecordStatus, string> = {
    SUCCESS: "bg-green-100 text-green-800 border-green-200",
    FAILED: "bg-red-100 text-red-800 border-red-200",
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    REVERSED: "bg-orange-100 text-orange-800 border-orange-200",
};

const CHEQUE_STATUS_LABELS: Record<ChequeStatus, string> = {
    pending: "Pending",
    cleared: "Cleared",
    bounced: "Bounced",
};

const CHEQUE_STATUS_COLORS: Record<ChequeStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    cleared: "bg-green-100 text-green-800 border-green-200",
    bounced: "bg-red-100 text-red-800 border-red-200",
};

// --- Label getters ---

export const getSaleStatusLabel = (status: SaleStatus): string =>
    SALE_STATUS_LABELS[status] ?? status;

export const getSaleStatusColor = (status: SaleStatus): string =>
    SALE_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800 border-gray-200";

export const getPaymentMethodLabel = (method: PaymentMethod): string =>
    PAYMENT_METHOD_LABELS[method] ?? method;

export const getPaymentMethodColor = (method: PaymentMethod): string =>
    PAYMENT_METHOD_COLORS[method] ?? "bg-gray-100 text-gray-800 border-gray-200";

export const getReturnStatusLabel = (status: ReturnStatus): string =>
    RETURN_STATUS_LABELS[status] ?? status;

export const getReturnStatusColor = (status: ReturnStatus): string =>
    RETURN_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800 border-gray-200";

export const getDiscountTypeLabel = (type: DiscountType): string =>
    DISCOUNT_TYPE_LABELS[type] ?? type;

export const getPaymentRecordStatusLabel = (
    status: PaymentRecordStatus
): string => PAYMENT_RECORD_STATUS_LABELS[status] ?? status;

export const getPaymentRecordStatusColor = (
    status: PaymentRecordStatus
): string =>
    PAYMENT_RECORD_STATUS_COLORS[status] ??
    "bg-gray-100 text-gray-800 border-gray-200";

export const getChequeStatusLabel = (status: ChequeStatus): string =>
    CHEQUE_STATUS_LABELS[status] ?? status;

export const getChequeStatusColor = (status: ChequeStatus): string =>
    CHEQUE_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800 border-gray-200";

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format a number as Indian Rupees (INR)
 * @example formatCurrency(1234.5) → "₹1,234.50"
 */
export const formatCurrency = (amount: number | null | undefined): string => {
    if (amount == null) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

// ============================================================================
// UNIT OF MEASURE — Quantity input behavior
// ============================================================================

/**
 * Unit categories — maps common unit names / codes to their category.
 * Weight & volume units allow fractional (decimal) quantities;
 * "quantity" / "length" units default to whole numbers.
 */
const WEIGHT_UNIT_NAMES = new Set([
    "kg", "g", "gm", "gram", "grams", "kilogram", "kilograms",
    "mg", "milligram", "milligrams", "quintal", "ton", "tonne",
]);
const VOLUME_UNIT_NAMES = new Set([
    "l", "ltr", "litre", "liter", "litres", "liters",
    "ml", "millilitre", "milliliter", "millilitres", "milliliters",
    "kl", "kilolitre", "kiloliter",
]);
const LENGTH_UNIT_NAMES = new Set([
    "m", "meter", "meters", "metre", "metres",
    "cm", "centimeter", "centimeters", "centimetre", "centimetres",
    "mm", "millimeter", "millimeters", "millimetre", "millimetres",
    "ft", "feet", "foot", "inch", "inches", "in",
    "yd", "yard", "yards",
]);

export type UnitInputCategory = "weight" | "volume" | "length" | "quantity";

/** Quick presets for weight units (shown as buttons in the cart) */
export interface QuantityPreset {
    label: string;
    value: number;
}

/**
 * Configuration object for a unit — controls step, decimal places, presets, etc.
 */
export interface UnitInputConfig {
    /** Category inferred from unit_name */
    category: UnitInputCategory;
    /** Whether fractional input is allowed */
    allowDecimal: boolean;
    /** Input step attribute */
    step: number;
    /** Number of decimal places for display */
    decimalPlaces: number;
    /** Min quantity (0.001 for weight/volume, 1 for quantity) */
    min: number;
    /** Quick-pick presets (e.g. 250g, 500g, 1kg) */
    presets: QuantityPreset[];
}

/**
 * Detect unit category from the `unit_name` string on a SellableItem.
 * Returns a config object that drives the quantity input UI.
 */
export function getUnitInputConfig(unitName: string | null | undefined): UnitInputConfig {
    const lower = (unitName ?? "").trim().toLowerCase();

    if (WEIGHT_UNIT_NAMES.has(lower)) {
        // Weight units like kg, g — allow up to 3 decimal places
        // Presets are relative to the unit: if unit is "g" presets are in grams, if "kg" in kg fractions
        const isGrams = ["g", "gm", "gram", "grams", "mg", "milligram", "milligrams"].includes(lower);
        return {
            category: "weight",
            allowDecimal: true,
            step: isGrams ? 1 : 0.001,
            decimalPlaces: isGrams ? 0 : 3,
            min: isGrams ? 1 : 0.001,
            presets: isGrams
                ? [
                      { label: "100g", value: 100 },
                      { label: "250g", value: 250 },
                      { label: "500g", value: 500 },
                      { label: "1kg",  value: 1000 },
                  ]
                : [
                      { label: "250g", value: 0.25 },
                      { label: "500g", value: 0.5 },
                      { label: "1kg",  value: 1 },
                      { label: "2kg",  value: 2 },
                  ],
        };
    }

    if (VOLUME_UNIT_NAMES.has(lower)) {
        const isMl = ["ml", "millilitre", "milliliter", "millilitres", "milliliters"].includes(lower);
        return {
            category: "volume",
            allowDecimal: true,
            step: isMl ? 1 : 0.001,
            decimalPlaces: isMl ? 0 : 3,
            min: isMl ? 1 : 0.001,
            presets: isMl
                ? [
                      { label: "100ml", value: 100 },
                      { label: "250ml", value: 250 },
                      { label: "500ml", value: 500 },
                      { label: "1L",    value: 1000 },
                  ]
                : [
                      { label: "250ml", value: 0.25 },
                      { label: "500ml", value: 0.5 },
                      { label: "1L",    value: 1 },
                      { label: "2L",    value: 2 },
                  ],
        };
    }

    if (LENGTH_UNIT_NAMES.has(lower)) {
        return {
            category: "length",
            allowDecimal: true,
            step: 0.01,
            decimalPlaces: 2,
            min: 0.01,
            presets: [
                { label: "0.5",  value: 0.5 },
                { label: "1",    value: 1 },
                { label: "2",    value: 2 },
                { label: "5",    value: 5 },
            ],
        };
    }

    // Default — "pcs", "nos", "box", etc. — whole numbers only
    return {
        category: "quantity",
        allowDecimal: false,
        step: 1,
        decimalPlaces: 0,
        min: 1,
        presets: [],
    };
}

/**
 * Format a quantity value respecting the unit's decimal precision.
 * @example formatQty(1.5, "kg") → "1.5 kg"
 * @example formatQty(2, "pcs") → "2 pcs"
 */
export function formatQty(quantity: number, unitName?: string | null): string {
    const cfg = getUnitInputConfig(unitName);
    const formatted = cfg.allowDecimal
        ? quantity.toFixed(cfg.decimalPlaces).replace(/\.?0+$/, "")
        : Math.round(quantity).toString();
    return unitName ? `${formatted} ${unitName}` : formatted;
}

/**
 * Convert a quantity into a human-readable string with smart unit conversion.
 * Fractional kg → grams, fractional L → ml, etc.
 * This makes "0.15 kg" → "150g", "0.5 L" → "500ml", "1.5 kg" → "1.5 kg"
 *
 * @example humanReadableQty(0.15, "kg")  → "150g"
 * @example humanReadableQty(0.25, "kg")  → "250g"
 * @example humanReadableQty(1.5,  "kg")  → "1.5 kg"
 * @example humanReadableQty(0.5,  "l")   → "500 ml"
 * @example humanReadableQty(2,    "pcs") → "2 pcs"
 */
export function humanReadableQty(quantity: number, unitName?: string | null): string {
    const lower = (unitName ?? "").trim().toLowerCase();

    // Weight: kg family → convert sub-1 values to grams
    if (["kg", "kilogram", "kilograms"].includes(lower)) {
        if (quantity < 1) {
            const grams = Math.round(quantity * 1000);
            return `${grams}g`;
        }
        // Trim trailing zeros
        const s = quantity.toFixed(3).replace(/\.?0+$/, "");
        return `${s} kg`;
    }

    // Volume: l/ltr/litre family → convert sub-1 values to ml
    if (["l", "ltr", "litre", "liter", "litres", "liters"].includes(lower)) {
        if (quantity < 1) {
            const ml = Math.round(quantity * 1000);
            return `${ml} ml`;
        }
        const s = quantity.toFixed(3).replace(/\.?0+$/, "");
        return `${s} L`;
    }

    // All other units: fall back to standard formatQty
    return formatQty(quantity, unitName);
}

/**
 * Parse a quantity string into a number, clamped to the unit's min.
 */
export function parseQtyInput(value: string, unitName?: string | null): number {
    const cfg = getUnitInputConfig(unitName);
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < cfg.min) return cfg.min;
    if (!cfg.allowDecimal) return Math.round(parsed);
    // Round to allowed decimal places
    const factor = Math.pow(10, cfg.decimalPlaces);
    return Math.round(parsed * factor) / factor;
}

/**
 * Format a date string into localized display format
 * @example formatDate("2025-06-15") → "15 Jun 2025"
 */
export const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "—";
    try {
        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(new Date(dateString));
    } catch {
        return dateString;
    }
};

/**
 * Format a datetime string with time
 * @example formatDateTime("2025-06-15T09:30:00Z") → "15 Jun 2025, 09:30 AM"
 */
export const formatDateTime = (
    dateString: string | null | undefined
): string => {
    if (!dateString) return "—";
    try {
        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        }).format(new Date(dateString));
    } catch {
        return dateString;
    }
};

/**
 * Format time only
 * @example formatTime("2025-06-15T09:30:00Z") → "09:30 AM"
 */
export const formatTime = (dateString: string | null | undefined): string => {
    if (!dateString) return "—";
    try {
        return new Intl.DateTimeFormat("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        }).format(new Date(dateString));
    } catch {
        return dateString;
    }
};

/**
 * Format relative time (e.g. "5m ago", "2h ago")
 */
export const formatRelativeTime = (
    dateString: string | null | undefined
): string => {
    if (!dateString) return "—";
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return formatDate(dateString);
    } catch {
        return dateString;
    }
};

/**
 * Format invoice number for display
 * @example formatInvoiceNumber("INV/MAIN/2025-26/0001") → "INV/MAIN/2025-26/0001"
 */
export const formatInvoiceNumber = (
    invoiceNumber: string | null | undefined
): string => {
    if (!invoiceNumber) return "—";
    return invoiceNumber;
};

/**
 * Format a number as percentage
 * @example formatPercentage(18.5) → "18.50%"
 */
export const formatPercentage = (
    value: number | null | undefined
): string => {
    if (value == null) return "0%";
    return `${value.toFixed(2)}%`;
};

/**
 * Format quantity with unit
 * @example formatQuantity(5, "kg") → "5 kg"
 */
export const formatQuantity = (
    quantity: number,
    unit?: string | null
): string => {
    const formatted =
        quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(2);
    return unit ? `${formatted} ${unit}` : formatted;
};

// ============================================================================
// GST CALCULATION HELPERS
// ============================================================================

/**
 * Split GST percentage into CGST/SGST (intrastate) or IGST (interstate)
 */
export const calculateGstSplit = (
    gstPercentage: number,
    isInterstate: boolean
): {
    cgst_percentage: number;
    sgst_percentage: number;
    igst_percentage: number;
} => {
    if (isInterstate) {
        return {
            cgst_percentage: 0,
            sgst_percentage: 0,
            igst_percentage: gstPercentage,
        };
    }
    const half = Math.round((gstPercentage / 2) * 100) / 100;
    return {
        cgst_percentage: half,
        sgst_percentage: half,
        igst_percentage: 0,
    };
};

/**
 * Calculate GST amounts from a taxable amount
 */
export const calculateGstAmounts = (
    taxableAmount: number,
    gstPercentage: number,
    cessPercentage: number,
    isInterstate: boolean
): {
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    cess_amount: number;
    tax_amount: number;
} => {
    const gstAmount =
        Math.round(taxableAmount * (gstPercentage / 100) * 100) / 100;
    const cessAmount =
        Math.round(taxableAmount * (cessPercentage / 100) * 100) / 100;

    if (isInterstate) {
        return {
            cgst_amount: 0,
            sgst_amount: 0,
            igst_amount: gstAmount,
            cess_amount: cessAmount,
            tax_amount: gstAmount + cessAmount,
        };
    }

    const halfGst = Math.round((gstAmount / 2) * 100) / 100;
    return {
        cgst_amount: halfGst,
        sgst_amount: halfGst,
        igst_amount: 0,
        cess_amount: cessAmount,
        tax_amount: halfGst * 2 + cessAmount,
    };
};

// ============================================================================
// ITEM-LEVEL CALCULATION
// ============================================================================

/** Full item calculation result */
export interface ItemCalculation {
    subtotal: number;
    discount_total: number;
    price_after_discount: number;
    taxable_amount: number;
    cgst_percentage: number;
    sgst_percentage: number;
    igst_percentage: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    cess_amount: number;
    tax_amount: number;
    total_amount: number;
    total_cost: number | null;
    profit_amount: number | null;
    profit_percentage: number | null;
}

/**
 * Calculate all computed fields for a single sale item.
 * This mimics the calculations the DB expects to be pre-computed on insert.
 */
export const calculateItemTotals = (
    item: {
        quantity: number;
        unit_price: number;
        unit_cost?: number | null;
        discount_type: DiscountType;
        discount_percentage: number;
        discount_amount: number;
        gst_percentage: number;
        cess_percentage: number;
    },
    isInterstate: boolean
): ItemCalculation => {
    const subtotal = Math.round(item.unit_price * item.quantity * 100) / 100;

    // Discount
    let discountTotal: number;
    if (item.discount_type === "PERCENTAGE") {
        discountTotal =
            Math.round(subtotal * (item.discount_percentage / 100) * 100) / 100;
    } else {
        discountTotal = Math.round(item.discount_amount * item.quantity * 100) / 100;
    }

    const priceAfterDiscount =
        Math.round(
            (item.unit_price -
                (item.discount_type === "PERCENTAGE"
                    ? item.unit_price * (item.discount_percentage / 100)
                    : item.discount_amount)) *
                100
        ) / 100;

    const taxableAmount = Math.round((subtotal - discountTotal) * 100) / 100;

    // GST split
    const gstSplit = calculateGstSplit(item.gst_percentage, isInterstate);
    const gstAmounts = calculateGstAmounts(
        taxableAmount,
        item.gst_percentage,
        item.cess_percentage,
        isInterstate
    );

    const totalAmount =
        Math.round((taxableAmount + gstAmounts.tax_amount) * 100) / 100;

    // Cost & profit
    let totalCost: number | null = null;
    let profitAmount: number | null = null;
    let profitPercentage: number | null = null;

    if (item.unit_cost != null) {
        totalCost = Math.round(item.unit_cost * item.quantity * 100) / 100;
        profitAmount = Math.round((taxableAmount - totalCost) * 100) / 100;
        profitPercentage =
            totalCost > 0
                ? Math.round((profitAmount / totalCost) * 10000) / 100
                : 0;
    }

    return {
        subtotal,
        discount_total: discountTotal,
        price_after_discount: priceAfterDiscount,
        taxable_amount: taxableAmount,
        ...gstSplit,
        ...gstAmounts,
        total_amount: totalAmount,
        total_cost: totalCost,
        profit_amount: profitAmount,
        profit_percentage: profitPercentage,
    };
};

// ============================================================================
// SALE-LEVEL CALCULATIONS
// ============================================================================

/** Sale-level calculation totals */
export interface SaleCalculation {
    subtotal: number;
    item_discount_total: number;
    bill_discount_amount: number;
    discount_total: number;
    taxable_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    cess_amount: number;
    tax_amount: number;
    gross_total: number;
    round_off: number;
    total_amount: number;
}

/**
 * Calculate full sale totals from cart items and bill discount.
 * Used before creating a sale to pre-compute all header amounts.
 */
export const calculateSaleTotals = (
    items: CartItem[],
    billDiscountPercentage: number,
    billDiscountAmount: number,
    isInterstate: boolean
): SaleCalculation => {
    // Sum up item-level totals
    let subtotal = 0;
    let itemDiscountTotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let cess = 0;

    for (const item of items) {
        const calc = calculateItemTotals(
            {
                quantity: item.quantity,
                unit_price: item.unit_price,
                unit_cost: item.unit_cost,
                discount_type: item.discount_type,
                discount_percentage: item.discount_percentage,
                discount_amount: item.discount_amount,
                gst_percentage: item.gst_percentage,
                cess_percentage: item.cess_percentage,
            },
            isInterstate
        );
        subtotal += calc.subtotal;
        itemDiscountTotal += calc.discount_total;
        cgst += calc.cgst_amount;
        sgst += calc.sgst_amount;
        igst += calc.igst_amount;
        cess += calc.cess_amount;
    }

    subtotal = Math.round(subtotal * 100) / 100;
    itemDiscountTotal = Math.round(itemDiscountTotal * 100) / 100;

    // Bill-level discount (applied on subtotal after item discounts)
    const afterItemDiscount = subtotal - itemDiscountTotal;
    const billDiscount =
        billDiscountPercentage > 0
            ? Math.round(
                  afterItemDiscount * (billDiscountPercentage / 100) * 100
              ) / 100
            : Math.round(billDiscountAmount * 100) / 100;

    const discountTotal =
        Math.round((itemDiscountTotal + billDiscount) * 100) / 100;
    const taxableAmount = Math.round((subtotal - discountTotal) * 100) / 100;
    const taxAmount = Math.round((cgst + sgst + igst + cess) * 100) / 100;
    const grossTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;
    const roundOff = calculateRoundOff(grossTotal);
    const totalAmount = Math.round((grossTotal + roundOff) * 100) / 100;

    return {
        subtotal,
        item_discount_total: itemDiscountTotal,
        bill_discount_amount: billDiscount,
        discount_total: discountTotal,
        taxable_amount: taxableAmount,
        cgst_amount: Math.round(cgst * 100) / 100,
        sgst_amount: Math.round(sgst * 100) / 100,
        igst_amount: Math.round(igst * 100) / 100,
        cess_amount: Math.round(cess * 100) / 100,
        tax_amount: taxAmount,
        gross_total: grossTotal,
        round_off: roundOff,
        total_amount: totalAmount,
    };
};

/**
 * Calculate round-off to nearest rupee, constrained to -0.50 to 0.50
 * Matches DB CHECK: round_off BETWEEN -0.50 AND 0.50
 */
export const calculateRoundOff = (grossTotal: number): number => {
    const rounded = Math.round(grossTotal);
    const diff = Math.round((rounded - grossTotal) * 100) / 100;
    // Constrain to -0.50 to 0.50
    if (diff > 0.5) return 0.5;
    if (diff < -0.5) return -0.5;
    return diff;
};

// ============================================================================
// BUILD SALE ITEM PAYLOAD — for database insert
// ============================================================================

/**
 * Build a full sale_items row payload from a CreateSaleItemRequest.
 * Computes all calculated fields (tax, totals, profit).
 * Omits: id, sale_id, store_id, returned_quantity, net_quantity (GENERATED),
 *        is_returned, is_void, created_at, updated_at
 */
export const buildSaleItemPayload = (
    item: CreateSaleItemRequest,
    isInterstate: boolean
): Record<string, unknown> => {
    const discountType = item.discount_type ?? "PERCENTAGE";
    const discountPercentage = item.discount_percentage ?? 0;
    const discountAmount = item.discount_amount ?? 0;
    const gstPercentage = item.gst_percentage ?? 0;
    const cessPercentage = item.cess_percentage ?? 0;

    const calc = calculateItemTotals(
        {
            quantity: item.quantity,
            unit_price: item.unit_price,
            unit_cost: item.unit_cost,
            discount_type: discountType,
            discount_percentage: discountPercentage,
            discount_amount: discountAmount,
            gst_percentage: gstPercentage,
            cess_percentage: cessPercentage,
        },
        isInterstate
    );

    return {
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        batch_id: item.batch_id ?? null,
        product_name: item.product_name,
        product_code: item.product_code,
        barcode: item.barcode ?? null,
        hsn_code: item.hsn_code ?? null,
        unit_name: item.unit_name ?? null,
        quantity: item.quantity,
        mrp: item.mrp,
        unit_price: item.unit_price,
        unit_cost: item.unit_cost ?? null,
        discount_type: discountType,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        price_after_discount: calc.price_after_discount,
        subtotal: calc.subtotal,
        discount_total: calc.discount_total,
        taxable_amount: calc.taxable_amount,
        gst_percentage: gstPercentage,
        cgst_percentage: calc.cgst_percentage,
        sgst_percentage: calc.sgst_percentage,
        igst_percentage: calc.igst_percentage,
        cess_percentage: cessPercentage,
        cgst_amount: calc.cgst_amount,
        sgst_amount: calc.sgst_amount,
        igst_amount: calc.igst_amount,
        cess_amount: calc.cess_amount,
        tax_amount: calc.tax_amount,
        total_amount: calc.total_amount,
        total_cost: calc.total_cost,
        profit_amount: calc.profit_amount,
        profit_percentage: calc.profit_percentage,
        serial_numbers: item.serial_numbers ?? null,
        sort_order: item.sort_order ?? 0,
    };
};

// ============================================================================
// STATUS CHECKS — used by UI to enable/disable actions
// ============================================================================

/** Can the sale be edited (items added/removed)? Only DRAFT/HOLD */
export const canEditSale = (sale: Sale): boolean =>
    sale.status === "DRAFT" || sale.status === "HOLD";

/** Can the sale be completed via RPC? Must be DRAFT or HOLD */
export const canCompleteSale = (sale: Sale): boolean =>
    sale.status === "DRAFT" || sale.status === "HOLD";

/** Can the sale be cancelled? Not already cancelled/returned */
export const canCancelSale = (sale: Sale): boolean =>
    sale.status !== "CANCELLED" &&
    sale.status !== "FULLY_RETURNED" &&
    sale.status !== "PARTIAL_RETURN";

/** Can payments be added? Not cancelled or fully returned */
export const canAddPayment = (sale: Sale): boolean =>
    sale.status !== "CANCELLED" && sale.status !== "FULLY_RETURNED";

/** Can a return be created? Must be completed or credit or partial paid */
export const canCreateReturn = (sale: Sale): boolean =>
    sale.status === "COMPLETED" ||
    sale.status === "CREDIT" ||
    sale.status === "PARTIAL_PAID" ||
    sale.status === "PARTIAL_RETURN";

/** Can a sale item be voided? Sale must be editable */
export const canVoidItem = (sale: Sale): boolean => canEditSale(sale);

/** Is the sale fully paid? due_amount = 0 and paid_amount ≥ total_amount */
export const isFullyPaid = (sale: Sale): boolean =>
    sale.due_amount <= 0 && sale.paid_amount >= sale.total_amount;

/** Is the sale in draft or hold status? */
export const isDraftOrHold = (sale: Sale): boolean =>
    sale.status === "DRAFT" || sale.status === "HOLD";

/** Is the sale finalized (completed/credit/partial_paid)? */
export const isFinalized = (sale: Sale): boolean =>
    sale.status === "COMPLETED" ||
    sale.status === "CREDIT" ||
    sale.status === "PARTIAL_PAID";

/** Has the sale been returned (partial or full)? */
export const hasReturns = (sale: Sale): boolean =>
    sale.status === "PARTIAL_RETURN" || sale.status === "FULLY_RETURNED";

/** Can the return be approved? Only INITIATED returns */
export const canApproveReturn = (returnItem: SaleReturn): boolean =>
    returnItem.status === "INITIATED";

/** Can the return be completed? Only APPROVED returns */
export const canCompleteReturn = (returnItem: SaleReturn): boolean =>
    returnItem.status === "APPROVED" || returnItem.status === "REFUND_PENDING";

// ============================================================================
// CART HELPERS (POS billing flow)
// ============================================================================

/**
 * Generate a unique cart key from product + variant + batch
 */
export const generateCartKey = (
    productId: string,
    variantId: string | null,
    batchId: string | null
): string => {
    const parts = [productId];
    if (variantId) parts.push(variantId);
    if (batchId) parts.push(batchId);
    return parts.join(":");
};

/**
 * Add an item to the cart. If the product+variant+batch already exists,
 * increment the quantity. Otherwise push a new CartItem.
 * Returns a new cart array (immutable).
 */
export const addToCart = (
    cart: CartItem[],
    item: Omit<CartItem, "cart_key">
): CartItem[] => {
    const key = generateCartKey(
        item.product_id,
        item.variant_id,
        item.batch_id
    );
    const existing = cart.find((c) => c.cart_key === key);

    if (existing) {
        return cart.map((c) =>
            c.cart_key === key
                ? { ...c, quantity: c.quantity + item.quantity }
                : c
        );
    }

    return [
        ...cart,
        {
            ...item,
            cart_key: key,
            sort_order: cart.length,
        },
    ];
};

/**
 * Remove an item from the cart by cart key.
 * Returns a new cart array (immutable).
 */
export const removeFromCart = (
    cart: CartItem[],
    cartKey: string
): CartItem[] => cart.filter((c) => c.cart_key !== cartKey);

/**
 * Update the quantity of a cart item. If quantity is 0 or less, remove it.
 * Returns a new cart array (immutable).
 */
export const updateCartQuantity = (
    cart: CartItem[],
    cartKey: string,
    quantity: number
): CartItem[] => {
    if (quantity <= 0) return removeFromCart(cart, cartKey);
    return cart.map((c) =>
        c.cart_key === cartKey ? { ...c, quantity } : c
    );
};

/**
 * Apply a discount to a specific cart item.
 * Returns a new cart array (immutable).
 */
export const applyCartItemDiscount = (
    cart: CartItem[],
    cartKey: string,
    discountType: DiscountType,
    discountPercentage: number,
    discountAmount: number
): CartItem[] =>
    cart.map((c) =>
        c.cart_key === cartKey
            ? {
                  ...c,
                  discount_type: discountType,
                  discount_percentage: discountPercentage,
                  discount_amount: discountAmount,
              }
            : c
    );

/**
 * Calculate totals for the entire cart (used for display).
 */
export const calculateCartTotals = (
    cart: CartItem[],
    billDiscountPercentage: number,
    billDiscountAmount: number,
    isInterstate: boolean
): SaleCalculation =>
    calculateSaleTotals(
        cart,
        billDiscountPercentage,
        billDiscountAmount,
        isInterstate
    );

/**
 * Get item count in cart (unique line items)
 */
export const getCartItemCount = (cart: CartItem[]): number => cart.length;

/**
 * Get total quantity in cart (sum of all quantities)
 */
export const getCartTotalQuantity = (cart: CartItem[]): number =>
    cart.reduce((sum, item) => sum + item.quantity, 0);

// ============================================================================
// HOLD BILL HELPERS
// ============================================================================

/**
 * Create a hold bill from the current cart state
 */
export const createHoldBill = (
    cart: CartItem[],
    customerId: string | null,
    customerName: string | null,
    customerPhone: string | null,
    notes: string | null,
    cashierId: string,
    referenceNumber?: string
): HoldBill => ({
    id: crypto.randomUUID(),
    customer_id: customerId,
    customer_name: customerName,
    customer_phone: customerPhone,
    items: [...cart],
    notes,
    held_at: new Date().toISOString(),
    cashier_id: cashierId,
    reference_number: referenceNumber ?? null,
});

// ============================================================================
// PAYMENT HELPERS
// ============================================================================

/**
 * Calculate remaining amount due from payments
 */
export const calculateRemainingDue = (
    totalAmount: number,
    payments: SalePayment[]
): number => {
    const successPayments = payments.filter((p) => p.status === "SUCCESS");
    const totalPaid = successPayments.reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, Math.round((totalAmount - totalPaid) * 100) / 100);
};

/**
 * Calculate total paid from successful payments
 */
export const calculateTotalPaid = (payments: SalePayment[]): number =>
    payments
        .filter((p) => p.status === "SUCCESS")
        .reduce((sum, p) => sum + p.amount, 0);

/**
 * Get payment breakdown by method
 */
export const getPaymentBreakdown = (
    payments: SalePayment[]
): Record<PaymentMethod, number> => {
    const breakdown = {} as Record<PaymentMethod, number>;
    for (const payment of payments) {
        if (payment.status !== "SUCCESS") continue;
        breakdown[payment.payment_method] =
            (breakdown[payment.payment_method] ?? 0) + payment.amount;
    }
    return breakdown;
};

/**
 * Calculate cash change
 */
export const calculateCashChange = (
    tendered: number,
    amount: number
): number => Math.max(0, Math.round((tendered - amount) * 100) / 100);

// ============================================================================
// RETURN HELPERS
// ============================================================================

/**
 * Get max returnable quantity for a sale item (quantity - already returned)
 */
export const getMaxReturnQuantity = (item: SaleItem): number =>
    Math.max(0, item.quantity - item.returned_quantity);

/**
 * Check if a sale item can still be returned
 */
export const canReturnItem = (item: SaleItem): boolean =>
    !item.is_void && item.quantity > item.returned_quantity;

/**
 * Calculate return item totals (mirrors item calc but for return qty)
 */
export const calculateReturnItemTotals = (
    item: SaleItem,
    returnQuantity: number,
    isInterstate: boolean
): {
    subtotal: number;
    discount_amount: number;
    taxable_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    tax_amount: number;
    total_amount: number;
} => {
    const subtotal =
        Math.round(item.unit_price * returnQuantity * 100) / 100;
    const discountPerUnit =
        item.quantity > 0 ? item.discount_total / item.quantity : 0;
    const discountAmount =
        Math.round(discountPerUnit * returnQuantity * 100) / 100;
    const taxableAmount = Math.round((subtotal - discountAmount) * 100) / 100;

    const gstAmounts = calculateGstAmounts(
        taxableAmount,
        item.gst_percentage,
        item.cess_percentage,
        isInterstate
    );

    return {
        subtotal,
        discount_amount: discountAmount,
        taxable_amount: taxableAmount,
        cgst_amount: gstAmounts.cgst_amount,
        sgst_amount: gstAmounts.sgst_amount,
        igst_amount: gstAmounts.igst_amount,
        tax_amount: gstAmounts.tax_amount,
        total_amount:
            Math.round((taxableAmount + gstAmounts.tax_amount) * 100) / 100,
    };
};

// ============================================================================
// SEARCH & FILTER (client-side helpers)
// ============================================================================

/**
 * Filter sales by search query (invoice number, customer name, phone, notes)
 */
export const filterSalesBySearch = (
    sales: Sale[],
    query: string
): Sale[] => {
    if (!query || !query.trim()) return sales;
    const q = query.toLowerCase().trim();

    return sales.filter((sale) => {
        const fields = [
            sale.invoice_number,
            sale.customer_name,
            sale.customer_phone,
            sale.notes,
            sale.status,
        ];
        return fields.some((field) => field?.toLowerCase().includes(q));
    });
};

/**
 * Sort sales client-side
 */
export const sortSales = (
    sales: Sale[],
    sortBy: string,
    sortOrder: "asc" | "desc"
): Sale[] => {
    const sorted = [...sales].sort((a, b) => {
        const aVal = a[sortBy as keyof Sale];
        const bVal = b[sortBy as keyof Sale];

        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        if (typeof aVal === "string" && typeof bVal === "string") {
            return aVal.localeCompare(bVal);
        }
        if (typeof aVal === "number" && typeof bVal === "number") {
            return aVal - bVal;
        }
        return 0;
    });

    return sortOrder === "desc" ? sorted.reverse() : sorted;
};

// ============================================================================
// DASHBOARD STATS (client-side computation)
// ============================================================================

/**
 * Empty dashboard stats (safe defaults)
 */
export const getEmptySalesDashboardStats = (): SalesDashboardStats => ({
    today_sales_count: 0,
    today_sales_amount: 0,
    today_returns_count: 0,
    today_returns_amount: 0,
    today_discount_total: 0,
    today_tax_total: 0,
    today_cash: 0,
    today_card: 0,
    today_upi: 0,
    today_other: 0,
    today_credit_sales: 0,
    today_credit_amount: 0,
    total_outstanding: 0,
    average_bill_value: 0,
    average_items_per_bill: 0,
    hold_bills_count: 0,
    top_products: [],
});

/**
 * Compute dashboard stats from today's sales summary
 */
export const computeSalesDashboardStats = (
    summaries: SaleSummaryView[],
    holdBillsCount: number,
    payments: SalePayment[]
): SalesDashboardStats => {
    if (!summaries.length) {
        return { ...getEmptySalesDashboardStats(), hold_bills_count: holdBillsCount };
    }

    const completedSales = summaries.filter(
        (s) =>
            s.status === "COMPLETED" ||
            s.status === "CREDIT" ||
            s.status === "PARTIAL_PAID"
    );
    const creditSales = summaries.filter((s) => s.is_credit_sale);

    const totalSalesAmount = completedSales.reduce(
        (sum, s) => sum + s.total_amount,
        0
    );
    const totalDiscounts = completedSales.reduce(
        (sum, s) => sum + s.discount_total,
        0
    );
    const totalTax = completedSales.reduce((sum, s) => sum + s.tax_amount, 0);
    const totalOutstanding = summaries.reduce(
        (sum, s) => sum + s.due_amount,
        0
    );
    const totalItems = completedSales.reduce(
        (sum, s) => sum + (s.total_quantity ?? 0),
        0
    );

    // Payment breakdown
    const successPayments = payments.filter((p) => p.status === "SUCCESS");
    let cashTotal = 0;
    let cardTotal = 0;
    let upiTotal = 0;
    let otherTotal = 0;
    for (const p of successPayments) {
        switch (p.payment_method) {
            case "CASH":
                cashTotal += p.amount;
                break;
            case "CARD_CREDIT":
            case "CARD_DEBIT":
                cardTotal += p.amount;
                break;
            case "UPI":
                upiTotal += p.amount;
                break;
            default:
                otherTotal += p.amount;
        }
    }

    // Returns
    const returnedSales = summaries.filter(
        (s) => s.status === "PARTIAL_RETURN" || s.status === "FULLY_RETURNED"
    );

    return {
        today_sales_count: completedSales.length,
        today_sales_amount: Math.round(totalSalesAmount * 100) / 100,
        today_returns_count: returnedSales.length,
        today_returns_amount: 0, // Would need actual return records for this
        today_discount_total: Math.round(totalDiscounts * 100) / 100,
        today_tax_total: Math.round(totalTax * 100) / 100,
        today_cash: Math.round(cashTotal * 100) / 100,
        today_card: Math.round(cardTotal * 100) / 100,
        today_upi: Math.round(upiTotal * 100) / 100,
        today_other: Math.round(otherTotal * 100) / 100,
        today_credit_sales: creditSales.length,
        today_credit_amount: creditSales.reduce(
            (sum, s) => sum + s.total_amount,
            0
        ),
        total_outstanding: Math.round(totalOutstanding * 100) / 100,
        average_bill_value:
            completedSales.length > 0
                ? Math.round((totalSalesAmount / completedSales.length) * 100) / 100
                : 0,
        average_items_per_bill:
            completedSales.length > 0
                ? Math.round((totalItems / completedSales.length) * 10) / 10
                : 0,
        hold_bills_count: holdBillsCount,
        top_products: [], // Populated from v_product_sales_report in service
    };
};

// ============================================================================
// EXPORT HELPERS
// ============================================================================

/**
 * Export sales to CSV format
 */
export const exportSalesToCSV = (sales: (Sale | SaleSummaryView)[]): string => {
    const headers = [
        "Invoice Number",
        "Date",
        "Time",
        "Status",
        "Customer Name",
        "Customer Phone",
        "Subtotal",
        "Discount",
        "Tax",
        "Total Amount",
        "Paid Amount",
        "Due Amount",
        "Credit Sale",
        "Payment Method",
    ];

    const rows = sales.map((s) => [
        s.invoice_number,
        s.sale_date,
        "sale_time" in s ? s.sale_time : "",
        s.status,
        s.customer_name ?? "",
        "customer_phone" in s ? (s.customer_phone ?? "") : "",
        "subtotal" in s ? s.subtotal : "",
        "discount_total" in s ? s.discount_total : "",
        s.tax_amount,
        s.total_amount,
        s.paid_amount,
        s.due_amount,
        s.is_credit_sale ? "Yes" : "No",
        "",
    ]);

    const csvRows = [
        headers.join(","),
        ...rows.map((row) =>
            row
                .map((cell) => {
                    const str = String(cell ?? "");
                    return str.includes(",") || str.includes('"')
                        ? `"${str.replace(/"/g, '""')}"`
                        : str;
                })
                .join(",")
        ),
    ];

    return csvRows.join("\n");
};

/**
 * Export sale returns to CSV format
 */
export const exportReturnsToCSV = (returns: SaleReturn[]): string => {
    const headers = [
        "Return Number",
        "Invoice Number",
        "Date",
        "Status",
        "Customer Name",
        "Return Reason",
        "Total Returned",
        "Refund Method",
        "Refund Amount",
    ];

    const rows = returns.map((r) => [
        r.return_number,
        r.original_invoice_number,
        r.return_date,
        r.status,
        r.customer_name ?? "",
        r.return_reason,
        r.total_returned,
        r.refund_method ?? "",
        r.refund_amount,
    ]);

    const csvRows = [
        headers.join(","),
        ...rows.map((row) =>
            row
                .map((cell) => {
                    const str = String(cell ?? "");
                    return str.includes(",") || str.includes('"')
                        ? `"${str.replace(/"/g, '""')}"`
                        : str;
                })
                .join(",")
        ),
    ];

    return csvRows.join("\n");
};

/**
 * Trigger CSV download in the browser
 */
export const downloadCSV = (csv: string, filename: string): void => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// ============================================================================
// RECEIPT / PRINT HELPERS
// ============================================================================

/**
 * Build a receipt-friendly data object for printing/rendering
 */
export const buildReceiptData = (
    sale: EnrichedSale,
    storeName: string,
    storeAddress: string,
    storeGstin: string | null,
    storePhone: string | null,
    customerAddress: string | null = null
): {
    store: { name: string; address: string; gstin: string | null; phone: string | null };
    invoice: { number: string; date: string; time: string };
    customer: { name: string | null; phone: string | null; gstin: string | null; address: string | null };
    items: Array<{
        name: string;
        code: string;
        hsn: string | null;
        qty: number;
        unit: string | null;
        price: number;
        discount: number;
        tax: number;
        total: number;
    }>;
    totals: {
        subtotal: number;
        discount: number;
        taxable: number;
        cgst: number;
        sgst: number;
        igst: number;
        cess: number;
        tax: number;
        round_off: number;
        total: number;
        paid: number;
        due: number;
        change: number;
    };
    payments: Array<{
        method: string;
        amount: number;
        reference: string | null;
    }>;
    footer: {
        is_credit: boolean;
        credit_due_date: string | null;
        notes: string | null;
    };
} => ({
    store: {
        name: storeName,
        address: storeAddress,
        gstin: storeGstin,
        phone: storePhone,
    },
    invoice: {
        number: sale.invoice_number,
        date: formatDate(sale.sale_date),
        time: formatTime(sale.sale_time),
    },
    customer: {
        name: sale.customer_name,
        phone: sale.customer_phone,
        gstin: sale.customer_gstin,
        address: customerAddress,
    },
    items: sale.items
        .filter((i) => !i.is_void)
        .map((i) => ({
            name: i.product_name,
            code: i.product_code,
            hsn: i.hsn_code,
            qty: i.net_quantity,
            unit: i.unit_name,
            price: i.unit_price,
            discount: i.discount_total,
            tax: i.tax_amount,
            total: i.total_amount,
        })),
    totals: {
        subtotal: sale.subtotal,
        discount: sale.discount_total,
        taxable: sale.taxable_amount,
        cgst: sale.cgst_amount,
        sgst: sale.sgst_amount,
        igst: sale.igst_amount,
        cess: sale.cess_amount,
        tax: sale.tax_amount,
        round_off: sale.round_off,
        total: sale.total_amount,
        paid: sale.paid_amount,
        due: sale.due_amount,
        change: sale.change_amount,
    },
    payments: sale.payments
        .filter((p) => p.status === "SUCCESS")
        .map((p) => ({
            method: getPaymentMethodLabel(p.payment_method),
            amount: p.amount,
            reference:
                p.transaction_id ??
                p.upi_ref_number ??
                p.cheque_number ??
                p.authorization_code ??
                null,
        })),
    footer: {
        is_credit: sale.is_credit_sale,
        credit_due_date: sale.credit_due_date,
        notes: sale.notes,
    },
});
