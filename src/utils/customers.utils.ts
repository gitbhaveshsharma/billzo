import type {
    Customer,
    CustomerType,
    LedgerTransactionType,
    PaymentMethod,
    CustomerLedgerEntry,
    CreditNote,
    CustomerDashboardStats,
    CustomerFilters,
    CustomerCreditSummary,
} from "@/types/customers.types";
import type { GenderType } from "@/types/database.types";

// ============================================================================
// CUSTOMER TYPE DISPLAY
// ============================================================================

const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
    RETAIL: "Retail",
    WHOLESALE: "Wholesale",
    CORPORATE: "Corporate",
    VIP: "VIP",
    LOYALTY: "Loyalty",
};

const CUSTOMER_TYPE_COLORS: Record<CustomerType, string> = {
    RETAIL: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    WHOLESALE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    CORPORATE: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    VIP: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    LOYALTY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

export function getCustomerTypeLabel(type: CustomerType): string {
    return CUSTOMER_TYPE_LABELS[type] ?? type;
}

export function getCustomerTypeColor(type: CustomerType): string {
    return CUSTOMER_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-800";
}

// ============================================================================
// GENDER DISPLAY
// ============================================================================

const GENDER_LABELS: Record<GenderType, string> = {
    male: "Male",
    female: "Female",
    other: "Other",
    prefer_not_to_say: "Prefer Not to Say",
};

export function getGenderLabel(gender: GenderType | null | undefined): string {
    if (!gender) return "—";
    return GENDER_LABELS[gender] ?? gender;
}

// ============================================================================
// LEDGER TRANSACTION TYPE DISPLAY
// ============================================================================

const LEDGER_TRANSACTION_TYPE_LABELS: Record<LedgerTransactionType, string> = {
    SALE_CREDIT: "Sale (Credit)",
    PAYMENT_RECEIVED: "Payment Received",
    RETURN_CREDIT: "Return Credit",
    ADJUSTMENT: "Adjustment",
    OPENING_BALANCE: "Opening Balance",
};

const LEDGER_TRANSACTION_TYPE_COLORS: Record<LedgerTransactionType, string> = {
    SALE_CREDIT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    PAYMENT_RECEIVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    RETURN_CREDIT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    ADJUSTMENT: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    OPENING_BALANCE: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export function getLedgerTransactionTypeLabel(type: LedgerTransactionType): string {
    return LEDGER_TRANSACTION_TYPE_LABELS[type] ?? type;
}

export function getLedgerTransactionTypeColor(type: LedgerTransactionType): string {
    return LEDGER_TRANSACTION_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-800";
}

/** Returns true if transaction type is debit (increases outstanding) */
export function isDebitTransaction(type: LedgerTransactionType): boolean {
    return type === "SALE_CREDIT" || type === "OPENING_BALANCE";
}

// ============================================================================
// PAYMENT METHOD DISPLAY
// ============================================================================

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

export function getPaymentMethodLabel(method: PaymentMethod | null | undefined): string {
    if (!method) return "—";
    return PAYMENT_METHOD_LABELS[method] ?? method;
}

// ============================================================================
// CREDIT STATUS HELPERS
// ============================================================================

export type CreditStatus = "no_credit" | "within_limit" | "near_limit" | "over_limit" | "overdue";

const CREDIT_STATUS_LABELS: Record<CreditStatus, string> = {
    no_credit: "No Credit",
    within_limit: "Within Limit",
    near_limit: "Near Limit",
    over_limit: "Over Limit",
    overdue: "Overdue",
};

const CREDIT_STATUS_COLORS: Record<CreditStatus, string> = {
    no_credit: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    within_limit: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    near_limit: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    over_limit: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    overdue: "bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-200",
};

/** Near-limit threshold: 80% of credit limit */
const NEAR_LIMIT_THRESHOLD = 0.8;

/**
 * Determine a customer's credit status based on their credit settings and balance.
 */
export function getCreditStatus(customer: Pick<Customer, "is_credit_allowed" | "credit_limit" | "outstanding_balance">): CreditStatus {
    if (!customer.is_credit_allowed) return "no_credit";
    if (customer.outstanding_balance <= 0) return "within_limit";
    if (customer.outstanding_balance > customer.credit_limit) return "over_limit";
    if (customer.outstanding_balance >= customer.credit_limit * NEAR_LIMIT_THRESHOLD) return "near_limit";
    return "within_limit";
}

export function getCreditStatusLabel(status: CreditStatus): string {
    return CREDIT_STATUS_LABELS[status] ?? status;
}

export function getCreditStatusColor(status: CreditStatus): string {
    return CREDIT_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
}

/**
 * Check if a customer has overdue credit based on the credit summary view.
 */
export function isOverdue(summary: Pick<CustomerCreditSummary, "overdue_invoices" | "oldest_due_days" | "credit_days">): boolean {
    return summary.overdue_invoices > 0 || summary.oldest_due_days > summary.credit_days;
}

/**
 * Calculate the remaining credit available for a customer.
 */
export function getRemainingCredit(customer: Pick<Customer, "credit_limit" | "outstanding_balance" | "is_credit_allowed">): number {
    if (!customer.is_credit_allowed) return 0;
    return Math.max(0, customer.credit_limit - customer.outstanding_balance);
}

/**
 * Calculate credit utilization percentage (0..100).
 */
export function getCreditUtilization(customer: Pick<Customer, "credit_limit" | "outstanding_balance">): number {
    if (customer.credit_limit <= 0) return 0;
    return Math.min(100, (customer.outstanding_balance / customer.credit_limit) * 100);
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format currency in Indian Rupees (₹).
 */
export function formatCurrency(amount: number | null | undefined): string {
    if (amount == null) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format a phone number for display (e.g., 9876543210 → +91 98765 43210).
 */
export function formatPhone(phone: string | null | undefined): string {
    if (!phone) return "—";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
        return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return phone;
}

/**
 * Format a date string for display (DD MMM YYYY).
 */
export function formatDate(date: string | null | undefined): string {
    if (!date) return "—";
    try {
        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(new Date(date));
    } catch {
        return date;
    }
}

/**
 * Format a date string with time (DD MMM YYYY, HH:MM).
 */
export function formatDateTime(date: string | null | undefined): string {
    if (!date) return "—";
    try {
        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        }).format(new Date(date));
    } catch {
        return date;
    }
}

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago", "just now").
 */
export function formatRelativeTime(date: string | null | undefined): string {
    if (!date) return "—";
    try {
        const now = Date.now();
        const then = new Date(date).getTime();
        const diffMs = now - then;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return "just now";
        if (diffMin < 60) return `${diffMin} min ago`;
        if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
        if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
        return formatDate(date);
    } catch {
        return date;
    }
}

/**
 * Format loyalty points for display (e.g. 1,234 pts).
 */
export function formatPoints(points: number | null | undefined): string {
    if (points == null) return "0 pts";
    return `${points.toLocaleString("en-IN")} pts`;
}

/**
 * Format number with Indian locale (e.g. 1,23,456).
 */
export function formatNumber(value: number | null | undefined): string {
    if (value == null) return "0";
    return value.toLocaleString("en-IN");
}

/**
 * Mask a phone number for privacy: 98765XXXXX → 98765***10.
 */
export function maskPhone(phone: string | null | undefined): string {
    if (!phone) return "—";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 6) return phone;
    return `${cleaned.slice(0, 5)}***${cleaned.slice(-2)}`;
}

// ============================================================================
// CUSTOMER DISPLAY HELPERS
// ============================================================================

/**
 * Get customer display name with code, used in dropdowns and search results.
 * e.g. "Rajesh Kumar (STORE1-CUST0001)"
 */
export function getCustomerDisplayName(customer: Pick<Customer, "name" | "customer_code">): string {
    return `${customer.name} (${customer.customer_code})`;
}

/**
 * Get a short summary for customer list items.
 */
export function getCustomerSummary(customer: Pick<Customer, "phone" | "customer_type" | "total_visits" | "total_purchases">): string {
    const parts: string[] = [
        formatPhone(customer.phone),
        getCustomerTypeLabel(customer.customer_type),
        `${customer.total_visits} visit${customer.total_visits === 1 ? "" : "s"}`,
        formatCurrency(customer.total_purchases),
    ];
    return parts.join(" · ");
}

/**
 * Get initials from customer name (for avatars).
 */
export function getCustomerInitials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("");
}

// ============================================================================
// FILTERING / SEARCH HELPERS
// ============================================================================

/**
 * Client-side search across multiple customer fields.
 * Useful for instant POS lookup.
 */
export function filterCustomersBySearch(customers: Customer[], query: string): Customer[] {
    if (!query.trim()) return customers;
    const lowerQuery = query.toLowerCase().trim();
    return customers.filter((c) => {
        return (
            c.name.toLowerCase().includes(lowerQuery) ||
            c.phone.includes(lowerQuery) ||
            c.customer_code.toLowerCase().includes(lowerQuery) ||
            (c.email && c.email.toLowerCase().includes(lowerQuery)) ||
            (c.company_name && c.company_name.toLowerCase().includes(lowerQuery)) ||
            (c.alternate_phone && c.alternate_phone.includes(lowerQuery)) ||
            (c.gstin && c.gstin.toLowerCase().includes(lowerQuery))
        );
    });
}

/**
 * Apply all filters to a customer array (client-side).
 * Use this for offline/cache-based filtering.
 */
export function applyCustomerFilters(customers: Customer[], filters: CustomerFilters): Customer[] {
    let result = customers;

    if (filters.search) {
        result = filterCustomersBySearch(result, filters.search);
    }
    if (filters.customer_type !== undefined) {
        result = result.filter((c) => c.customer_type === filters.customer_type);
    }
    if (filters.is_active !== undefined) {
        result = result.filter((c) => c.is_active === filters.is_active);
    }
    if (filters.is_blacklisted !== undefined) {
        result = result.filter((c) => c.is_blacklisted === filters.is_blacklisted);
    }
    if (filters.is_credit_allowed !== undefined) {
        result = result.filter((c) => c.is_credit_allowed === filters.is_credit_allowed);
    }
    if (filters.has_outstanding === true) {
        result = result.filter((c) => c.outstanding_balance > 0);
    } else if (filters.has_outstanding === false) {
        result = result.filter((c) => c.outstanding_balance <= 0);
    }
    if (filters.city) {
        const lowerCity = filters.city.toLowerCase();
        result = result.filter((c) => c.city?.toLowerCase() === lowerCity);
    }
    if (filters.state) {
        const lowerState = filters.state.toLowerCase();
        result = result.filter((c) => c.state?.toLowerCase() === lowerState);
    }
    if (filters.tags && filters.tags.length > 0) {
        result = result.filter((c) =>
            c.tags && filters.tags!.some((tag) => c.tags!.includes(tag))
        );
    }
    if (filters.min_purchases !== undefined) {
        result = result.filter((c) => c.total_purchases >= filters.min_purchases!);
    }
    if (filters.max_purchases !== undefined) {
        result = result.filter((c) => c.total_purchases <= filters.max_purchases!);
    }
    if (filters.min_loyalty_points !== undefined) {
        result = result.filter((c) => c.loyalty_points >= filters.min_loyalty_points!);
    }

    return result;
}

// ============================================================================
// UNIQUE VALUE EXTRACTORS (for filter dropdowns)
// ============================================================================

/**
 * Extract unique tags from a list of customers.
 */
export function getUniqueTags(customers: Customer[]): string[] {
    const tagSet = new Set<string>();
    for (const customer of customers) {
        if (customer.tags) {
            for (const tag of customer.tags) {
                tagSet.add(tag);
            }
        }
    }
    return Array.from(tagSet).sort();
}

/**
 * Extract unique cities from a list of customers.
 */
export function getUniqueCities(customers: Customer[]): string[] {
    const citySet = new Set<string>();
    for (const customer of customers) {
        if (customer.city) {
            citySet.add(customer.city);
        }
    }
    return Array.from(citySet).sort();
}

/**
 * Extract unique states from a list of customers.
 */
export function getUniqueStates(customers: Customer[]): string[] {
    const stateSet = new Set<string>();
    for (const customer of customers) {
        if (customer.state) {
            stateSet.add(customer.state);
        }
    }
    return Array.from(stateSet).sort();
}

// ============================================================================
// DASHBOARD COMPUTATION
// ============================================================================

/**
 * Compute dashboard statistics from a list of customers (client-side).
 */
export function computeCustomerDashboardStats(customers: Customer[]): CustomerDashboardStats {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let activeCount = 0;
    let inactiveCount = 0;
    let blacklistedCount = 0;
    let creditCount = 0;
    let totalOutstanding = 0;
    let totalLoyaltyPoints = 0;
    let newThisMonth = 0;
    let vipCount = 0;
    let corporateCount = 0;

    const typeCountMap = new Map<CustomerType, number>();
    const topCustomers: CustomerDashboardStats["top_customers"] = [];

    for (const c of customers) {
        // Active/Inactive/Blacklisted
        if (c.is_blacklisted) {
            blacklistedCount++;
        } else if (c.is_active) {
            activeCount++;
        } else {
            inactiveCount++;
        }

        // Credit
        if (c.is_credit_allowed) creditCount++;
        totalOutstanding += c.outstanding_balance;
        totalLoyaltyPoints += c.loyalty_points;

        // New this month
        if (new Date(c.created_at) >= startOfMonth) newThisMonth++;

        // Type counts
        if (c.customer_type === "VIP") vipCount++;
        if (c.customer_type === "CORPORATE") corporateCount++;
        typeCountMap.set(c.customer_type, (typeCountMap.get(c.customer_type) ?? 0) + 1);

        // Top customers (sorted later)
        topCustomers.push({
            id: c.id,
            name: c.name,
            phone: c.phone,
            total_purchases: c.total_purchases,
            total_visits: c.total_visits,
        });
    }

    // Sort top customers by total_purchases descending and take top 10
    const TOP_CUSTOMERS_LIMIT = 10;
    topCustomers.sort((a, b) => b.total_purchases - a.total_purchases);
    topCustomers.length = Math.min(topCustomers.length, TOP_CUSTOMERS_LIMIT);

    // Build customers_by_type array
    const customersByType: CustomerDashboardStats["customers_by_type"] = [];
    for (const [customer_type, count] of typeCountMap) {
        customersByType.push({ customer_type, count });
    }
    customersByType.sort((a, b) => b.count - a.count);

    return {
        total_customers: customers.length,
        active_customers: activeCount,
        inactive_customers: inactiveCount,
        blacklisted_customers: blacklistedCount,
        customers_with_credit: creditCount,
        total_outstanding: totalOutstanding,
        total_loyalty_points: totalLoyaltyPoints,
        new_customers_this_month: newThisMonth,
        vip_customers: vipCount,
        corporate_customers: corporateCount,
        top_customers: topCustomers,
        customers_by_type: customersByType,
    };
}

// ============================================================================
// LEDGER UTILITIES
// ============================================================================

/**
 * Calculate the net balance from a list of ledger entries.
 */
export function calculateLedgerBalance(entries: CustomerLedgerEntry[]): number {
    return entries.reduce((balance, entry) => {
        return balance + entry.debit_amount - entry.credit_amount;
    }, 0);
}

/**
 * Group ledger entries by month for charting / reporting.
 */
export function groupLedgerByMonth(
    entries: CustomerLedgerEntry[]
): Array<{ month: string; debit_total: number; credit_total: number; net: number }> {
    const monthMap = new Map<string, { debit_total: number; credit_total: number }>();

    for (const entry of entries) {
        const date = new Date(entry.entry_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const existing = monthMap.get(monthKey) ?? { debit_total: 0, credit_total: 0 };
        existing.debit_total += entry.debit_amount;
        existing.credit_total += entry.credit_amount;
        monthMap.set(monthKey, existing);
    }

    return Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, { debit_total, credit_total }]) => ({
            month,
            debit_total,
            credit_total,
            net: debit_total - credit_total,
        }));
}

// ============================================================================
// CREDIT NOTE UTILITIES
// ============================================================================

/**
 * Get total available credit note balance for a customer.
 */
export function getTotalAvailableCreditNotes(creditNotes: CreditNote[]): number {
    return creditNotes
        .filter((cn) => cn.is_active && !cn.is_fully_redeemed)
        .reduce((total, cn) => total + cn.amount_remaining, 0);
}

/**
 * Get active (usable) credit notes.
 */
export function getActiveCreditNotes(creditNotes: CreditNote[]): CreditNote[] {
    const now = new Date();
    return creditNotes.filter((cn) => {
        if (!cn.is_active || cn.is_fully_redeemed) return false;
        if (cn.expiry_date && new Date(cn.expiry_date) < now) return false;
        return cn.amount_remaining > 0;
    });
}

/**
 * Check if a credit note is expired.
 */
export function isCreditNoteExpired(creditNote: CreditNote): boolean {
    if (!creditNote.expiry_date) return false;
    return new Date(creditNote.expiry_date) < new Date();
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/** CSV column definitions for customer export */
const CUSTOMER_CSV_COLUMNS: Array<{ header: string; accessor: (c: Customer) => string }> = [
    { header: "Code", accessor: (c) => c.customer_code },
    { header: "Name", accessor: (c) => c.name },
    { header: "Phone", accessor: (c) => c.phone },
    { header: "Alternate Phone", accessor: (c) => c.alternate_phone ?? "" },
    { header: "Email", accessor: (c) => c.email ?? "" },
    { header: "Type", accessor: (c) => getCustomerTypeLabel(c.customer_type) },
    { header: "Gender", accessor: (c) => getGenderLabel(c.gender) },
    { header: "Company", accessor: (c) => c.company_name ?? "" },
    { header: "GSTIN", accessor: (c) => c.gstin ?? "" },
    { header: "PAN", accessor: (c) => c.pan_number ?? "" },
    { header: "Address Line 1", accessor: (c) => c.address_line1 ?? "" },
    { header: "Address Line 2", accessor: (c) => c.address_line2 ?? "" },
    { header: "City", accessor: (c) => c.city ?? "" },
    { header: "State", accessor: (c) => c.state ?? "" },
    { header: "Pincode", accessor: (c) => c.pincode ?? "" },
    { header: "Credit Allowed", accessor: (c) => (c.is_credit_allowed ? "Yes" : "No") },
    { header: "Credit Limit", accessor: (c) => c.credit_limit.toString() },
    { header: "Credit Days", accessor: (c) => c.credit_days.toString() },
    { header: "Outstanding Balance", accessor: (c) => c.outstanding_balance.toString() },
    { header: "Loyalty Points", accessor: (c) => c.loyalty_points.toString() },
    { header: "Total Purchases", accessor: (c) => c.total_purchases.toString() },
    { header: "Total Visits", accessor: (c) => c.total_visits.toString() },
    { header: "Last Purchase Date", accessor: (c) => c.last_purchase_date ?? "" },
    { header: "Active", accessor: (c) => (c.is_active ? "Yes" : "No") },
    { header: "Blacklisted", accessor: (c) => (c.is_blacklisted ? "Yes" : "No") },
    { header: "Tags", accessor: (c) => (c.tags ?? []).join(", ") },
    { header: "Created At", accessor: (c) => formatDateTime(c.created_at) },
];

/**
 * Escape a CSV cell: wrap in quotes if it contains comma, quote, or newline.
 */
function escapeCsvCell(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/**
 * Export a list of customers to CSV string.
 */
export function exportCustomersToCSV(customers: Customer[]): string {
    const headerRow = CUSTOMER_CSV_COLUMNS.map((col) => escapeCsvCell(col.header)).join(",");
    const dataRows = customers.map((customer) =>
        CUSTOMER_CSV_COLUMNS.map((col) => escapeCsvCell(col.accessor(customer))).join(",")
    );
    return [headerRow, ...dataRows].join("\n");
}

/** CSV column definitions for ledger export */
const LEDGER_CSV_COLUMNS: Array<{ header: string; accessor: (e: CustomerLedgerEntry) => string }> = [
    { header: "Date", accessor: (e) => e.entry_date },
    { header: "Time", accessor: (e) => e.entry_time },
    { header: "Type", accessor: (e) => getLedgerTransactionTypeLabel(e.transaction_type) },
    { header: "Reference No", accessor: (e) => e.reference_number ?? "" },
    { header: "Debit", accessor: (e) => e.debit_amount.toString() },
    { header: "Credit", accessor: (e) => e.credit_amount.toString() },
    { header: "Balance", accessor: (e) => e.balance.toString() },
    { header: "Payment Method", accessor: (e) => getPaymentMethodLabel(e.payment_method) },
    { header: "Payment Ref", accessor: (e) => e.payment_reference ?? "" },
    { header: "Notes", accessor: (e) => e.notes ?? "" },
];

/**
 * Export ledger entries to CSV string.
 */
export function exportLedgerToCSV(entries: CustomerLedgerEntry[]): string {
    const headerRow = LEDGER_CSV_COLUMNS.map((col) => escapeCsvCell(col.header)).join(",");
    const dataRows = entries.map((entry) =>
        LEDGER_CSV_COLUMNS.map((col) => escapeCsvCell(col.accessor(entry))).join(",")
    );
    return [headerRow, ...dataRows].join("\n");
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate GSTIN format (client-side quick check).
 */
export function isValidGSTIN(gstin: string): boolean {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$/.test(gstin);
}

/**
 * Validate Indian phone number.
 */
export function isValidPhone(phone: string): boolean {
    return /^[6-9][0-9]{9}$/.test(phone.replace(/\D/g, ""));
}

/**
 * Validate PAN number.
 */
export function isValidPAN(pan: string): boolean {
    return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
}

/**
 * Validate Indian pincode.
 */
export function isValidPincode(pincode: string): boolean {
    return /^[1-9][0-9]{5}$/.test(pincode);
}

// ============================================================================
// SORT COMPARATORS
// ============================================================================

type SortDirection = "asc" | "desc";

/**
 * Sort customers by a given field and direction.
 */
export function sortCustomers(
    customers: Customer[],
    field: keyof Customer,
    direction: SortDirection = "asc"
): Customer[] {
    const sorted = [...customers].sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];

        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        if (typeof aVal === "string" && typeof bVal === "string") {
            return aVal.localeCompare(bVal);
        }
        if (typeof aVal === "number" && typeof bVal === "number") {
            return aVal - bVal;
        }
        if (typeof aVal === "boolean" && typeof bVal === "boolean") {
            return Number(aVal) - Number(bVal);
        }

        return String(aVal).localeCompare(String(bVal));
    });

    return direction === "desc" ? sorted.reverse() : sorted;
}
