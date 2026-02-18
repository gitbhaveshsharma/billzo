import type {
    Supplier,
    SupplierContact,
    SupplierType,
    PaymentTerm,
    SupplierStats,
    SUPPLIER_TYPES,
    PAYMENT_TERMS,
} from "@/types/supplier.types";

// ============================================================================
// SUPPLIER DISPLAY UTILITIES
// ============================================================================

// -- Supplier Type ----------------------------------------------------------

const SUPPLIER_TYPE_LABELS: Record<SupplierType, string> = {
    manufacturer: "Manufacturer",
    distributor: "Distributor",
    wholesaler: "Wholesaler",
    retailer: "Retailer",
};

const SUPPLIER_TYPE_BADGE_COLORS: Record<SupplierType, string> = {
    manufacturer: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    distributor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    wholesaler: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    retailer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

export function getSupplierTypeLabel(type: SupplierType): string {
    return SUPPLIER_TYPE_LABELS[type] ?? type;
}

export function getSupplierTypeBadgeColor(type: SupplierType): string {
    return SUPPLIER_TYPE_BADGE_COLORS[type] ?? "bg-gray-100 text-gray-800";
}

// -- Payment Terms ----------------------------------------------------------

const PAYMENT_TERM_LABELS: Record<PaymentTerm, string> = {
    immediate: "Immediate",
    "7_days": "Net 7 Days",
    "15_days": "Net 15 Days",
    "30_days": "Net 30 Days",
    "45_days": "Net 45 Days",
    "60_days": "Net 60 Days",
};

export function getPaymentTermLabel(term: PaymentTerm): string {
    return PAYMENT_TERM_LABELS[term] ?? term;
}

export function getPaymentTermDays(term: PaymentTerm): number {
    const daysMap: Record<PaymentTerm, number> = {
        immediate: 0,
        "7_days": 7,
        "15_days": 15,
        "30_days": 30,
        "45_days": 45,
        "60_days": 60,
    };
    return daysMap[term] ?? 0;
}

// -- Status Badges ----------------------------------------------------------

export interface SupplierStatusBadge {
    label: string;
    color: string;
}

export function getSupplierStatusBadge(supplier: Supplier): SupplierStatusBadge {
    if (supplier.blacklisted) {
        return {
            label: "Blacklisted",
            color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        };
    }
    if (!supplier.is_active) {
        return {
            label: "Inactive",
            color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
        };
    }
    if (supplier.is_preferred) {
        return {
            label: "Preferred",
            color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
        };
    }
    return {
        label: "Active",
        color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    };
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format currency value (INR by default)
 */
export function formatCurrency(
    amount: number | null | undefined,
    locale = "en-IN",
    currency = "INR"
): string {
    if (amount == null) return "—";
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number | null | undefined): string {
    if (value == null) return "—";
    return `${value.toFixed(2)}%`;
}

/**
 * Format phone number for display
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
    if (!phone) return "—";
    // If it starts with +91, format as +91 XXXXX XXXXX
    if (phone.startsWith("+91") && phone.length === 13) {
        return `+91 ${phone.slice(3, 8)} ${phone.slice(8)}`;
    }
    return phone;
}

/**
 * Format date for display
 */
export function formatDate(
    dateString: string | null | undefined,
    options?: Intl.DateTimeFormatOptions
): string {
    if (!dateString) return "—";
    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
        ...options,
    };
    return new Date(dateString).toLocaleDateString("en-IN", defaultOptions);
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
    if (!dateString) return "—";
    const now = Date.now();
    const date = new Date(dateString).getTime();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(dateString);
}

/**
 * Get supplier initials for avatar
 */
export function getSupplierInitials(name: string): string {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? "")
        .join("");
}

/**
 * Get avatar color based on supplier name (deterministic)
 */
export function getSupplierAvatarColor(name: string): string {
    const colors = [
        "bg-blue-500",
        "bg-green-500",
        "bg-purple-500",
        "bg-amber-500",
        "bg-rose-500",
        "bg-cyan-500",
        "bg-indigo-500",
        "bg-teal-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

// ============================================================================
// ADDRESS UTILITIES
// ============================================================================

/**
 * Format full address from supplier fields
 */
export function formatSupplierAddress(supplier: Supplier): string {
    const parts = [
        supplier.address_line1,
        supplier.address_line2,
        supplier.landmark,
        supplier.city,
        supplier.state,
        supplier.pincode,
        supplier.country !== "India" ? supplier.country : null,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "—";
}

/**
 * Check if supplier has a complete address
 */
export function hasCompleteAddress(supplier: Supplier): boolean {
    return !!(supplier.address_line1 && supplier.city && supplier.state && supplier.pincode);
}

// ============================================================================
// GST UTILITIES
// ============================================================================

/**
 * Extract state code from GSTIN (first 2 digits)
 */
export function extractStateFromGstin(gstin: string | null): string | null {
    if (!gstin || gstin.length < 2) return null;
    return gstin.substring(0, 2);
}

/**
 * Extract PAN from GSTIN (characters 3-12)
 */
export function extractPanFromGstin(gstin: string | null): string | null {
    if (!gstin || gstin.length < 12) return null;
    return gstin.substring(2, 12);
}

/**
 * Check if supplier has GST registration
 */
export function isGstRegistered(supplier: Supplier): boolean {
    return !!supplier.gstin;
}

/**
 * Validate GSTIN-PAN consistency
 * PAN embedded in GSTIN (chars 3-12) must match supplier's PAN if both are provided
 */
export function isGstinPanConsistent(
    gstin: string | null | undefined,
    pan: string | null | undefined
): boolean {
    if (!gstin || !pan) return true; // Can't validate if either is missing
    const panFromGstin = extractPanFromGstin(gstin);
    return panFromGstin === pan;
}

// ============================================================================
// BANK DETAILS UTILITIES
// ============================================================================

/**
 * Check if supplier has bank details
 */
export function hasBankDetails(supplier: Supplier): boolean {
    return !!(supplier.bank_name && supplier.bank_account_number && supplier.ifsc_code);
}

/**
 * Mask bank account number for display (show last 4 digits)
 */
export function maskAccountNumber(accountNumber: string | null | undefined): string {
    if (!accountNumber) return "—";
    if (accountNumber.length <= 4) return accountNumber;
    return "•".repeat(accountNumber.length - 4) + accountNumber.slice(-4);
}

// ============================================================================
// CONTACT UTILITIES
// ============================================================================

/**
 * Get primary contact from supplier contacts
 */
export function getPrimaryContact(
    contacts: SupplierContact[]
): SupplierContact | undefined {
    return contacts.find((c) => c.is_primary) ?? contacts[0];
}

/**
 * Get authorized contacts (who can place orders)
 */
export function getAuthorizedContacts(
    contacts: SupplierContact[]
): SupplierContact[] {
    return contacts.filter((c) => c.is_authorized);
}

/**
 * Format contact display name with designation
 */
export function formatContactDisplay(contact: SupplierContact): string {
    if (contact.designation) {
        return `${contact.name} (${contact.designation})`;
    }
    return contact.name;
}

// ============================================================================
// CREDIT UTILITIES
// ============================================================================

/**
 * Check if supplier has credit facility
 */
export function hasCreditFacility(supplier: Supplier): boolean {
    return (supplier.credit_limit ?? 0) > 0 || supplier.credit_days > 0;
}

/**
 * Format credit info for display
 */
export function formatCreditInfo(supplier: Supplier): string {
    const parts: string[] = [];
    if (supplier.credit_limit) {
        parts.push(`Limit: ${formatCurrency(supplier.credit_limit)}`);
    }
    if (supplier.credit_days > 0) {
        parts.push(`${supplier.credit_days} days`);
    }
    return parts.length > 0 ? parts.join(" | ") : "No credit";
}

// ============================================================================
// SEARCH & FILTER UTILITIES
// ============================================================================

/**
 * Filter suppliers by search query (client-side)
 * Searches across name, code, contact person, email, phone, city
 */
export function filterSuppliersBySearch(
    suppliers: Supplier[],
    query: string
): Supplier[] {
    if (!query.trim()) return suppliers;
    const lowerQuery = query.toLowerCase().trim();
    return suppliers.filter(
        (s) =>
            s.name.toLowerCase().includes(lowerQuery) ||
            s.supplier_code.toLowerCase().includes(lowerQuery) ||
            s.contact_person?.toLowerCase().includes(lowerQuery) ||
            s.email?.toLowerCase().includes(lowerQuery) ||
            s.phone?.includes(lowerQuery) ||
            s.city?.toLowerCase().includes(lowerQuery) ||
            s.gstin?.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Sort suppliers (client-side)
 */
export function sortSuppliers(
    suppliers: Supplier[],
    sortBy: string,
    sortOrder: "asc" | "desc"
): Supplier[] {
    const sorted = [...suppliers].sort((a, b) => {
        let valueA: string | number | null = null;
        let valueB: string | number | null = null;

        switch (sortBy) {
            case "name":
                valueA = a.name.toLowerCase();
                valueB = b.name.toLowerCase();
                break;
            case "supplier_code":
                valueA = a.supplier_code.toLowerCase();
                valueB = b.supplier_code.toLowerCase();
                break;
            case "created_at":
                valueA = a.created_at;
                valueB = b.created_at;
                break;
            case "updated_at":
                valueA = a.updated_at;
                valueB = b.updated_at;
                break;
            case "credit_limit":
                valueA = a.credit_limit ?? 0;
                valueB = b.credit_limit ?? 0;
                break;
            case "city":
                valueA = a.city?.toLowerCase() ?? "";
                valueB = b.city?.toLowerCase() ?? "";
                break;
            default:
                return 0;
        }

        if (valueA === null && valueB === null) return 0;
        if (valueA === null) return 1;
        if (valueB === null) return -1;

        if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
        if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
        return 0;
    });

    return sorted;
}

// ============================================================================
// STATISTICS UTILITIES
// ============================================================================

/**
 * Compute supplier statistics from a list of suppliers (client-side)
 */
export function computeSupplierStats(suppliers: Supplier[]): SupplierStats {
    const stats: SupplierStats = {
        total_suppliers: suppliers.length,
        active_suppliers: 0,
        inactive_suppliers: 0,
        preferred_suppliers: 0,
        blacklisted_suppliers: 0,
        by_type: { manufacturer: 0, distributor: 0, wholesaler: 0, retailer: 0 },
        by_payment_terms: {
            immediate: 0,
            "7_days": 0,
            "15_days": 0,
            "30_days": 0,
            "45_days": 0,
            "60_days": 0,
        },
        with_gstin: 0,
        without_gstin: 0,
        total_credit_limit: 0,
        average_credit_days: 0,
    };

    let totalCreditDays = 0;
    let creditDaysCount = 0;

    for (const supplier of suppliers) {
        // Active/Inactive
        if (supplier.is_active) stats.active_suppliers++;
        else stats.inactive_suppliers++;

        // Preferred
        if (supplier.is_preferred) stats.preferred_suppliers++;

        // Blacklisted
        if (supplier.blacklisted) stats.blacklisted_suppliers++;

        // By type
        if (supplier.type in stats.by_type) {
            stats.by_type[supplier.type]++;
        }

        // By payment terms
        if (supplier.payment_terms in stats.by_payment_terms) {
            stats.by_payment_terms[supplier.payment_terms]++;
        }

        // GST
        if (supplier.gstin) stats.with_gstin++;
        else stats.without_gstin++;

        // Credit
        stats.total_credit_limit += supplier.credit_limit ?? 0;
        if (supplier.credit_days > 0) {
            totalCreditDays += supplier.credit_days;
            creditDaysCount++;
        }
    }

    stats.average_credit_days =
        creditDaysCount > 0 ? Math.round(totalCreditDays / creditDaysCount) : 0;

    return stats;
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/**
 * Export suppliers to CSV format
 */
export function exportSuppliersToCSV(suppliers: Supplier[]): string {
    const headers = [
        "Supplier Code",
        "Name",
        "Legal Name",
        "Type",
        "GSTIN",
        "PAN",
        "Contact Person",
        "Email",
        "Phone",
        "City",
        "State",
        "Pincode",
        "Payment Terms",
        "Credit Limit",
        "Credit Days",
        "Status",
        "Preferred",
        "Created At",
    ];

    const rows = suppliers.map((s) => [
        s.supplier_code,
        s.name,
        s.legal_name ?? "",
        getSupplierTypeLabel(s.type),
        s.gstin ?? "",
        s.pan_number ?? "",
        s.contact_person ?? "",
        s.email ?? "",
        s.phone ?? "",
        s.city ?? "",
        s.state ?? "",
        s.pincode ?? "",
        getPaymentTermLabel(s.payment_terms),
        s.credit_limit?.toString() ?? "",
        s.credit_days.toString(),
        s.blacklisted ? "Blacklisted" : s.is_active ? "Active" : "Inactive",
        s.is_preferred ? "Yes" : "No",
        formatDate(s.created_at),
    ]);

    const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
            row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
    ].join("\n");

    return csvContent;
}

/**
 * Download CSV string as file
 */
export function downloadCSV(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// ============================================================================
// TAG UTILITIES
// ============================================================================

/**
 * Parse tags string (comma-separated) into array
 */
export function parseTags(tagsString: string): string[] {
    return tagsString
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
}

/**
 * Get unique tags from a list of suppliers
 */
export function getUniqueTags(suppliers: Supplier[]): string[] {
    const tagSet = new Set<string>();
    for (const supplier of suppliers) {
        if (supplier.tags) {
            for (const tag of supplier.tags) {
                tagSet.add(tag);
            }
        }
    }
    return Array.from(tagSet).sort();
}

/**
 * Get unique cities from a list of suppliers
 */
export function getUniqueCities(suppliers: Supplier[]): string[] {
    const citySet = new Set<string>();
    for (const supplier of suppliers) {
        if (supplier.city) {
            citySet.add(supplier.city);
        }
    }
    return Array.from(citySet).sort();
}

/**
 * Get unique states from a list of suppliers
 */
export function getUniqueStates(suppliers: Supplier[]): string[] {
    const stateSet = new Set<string>();
    for (const supplier of suppliers) {
        if (supplier.state) {
            stateSet.add(supplier.state);
        }
    }
    return Array.from(stateSet).sort();
}
