import type {
    InventoryRecord,
    EnrichedInventoryRecord,
    InventoryTransaction,
    EnrichedInventoryTransaction,
    ProductBatch,
    StockAlert,
    PriceHistory,
    TransactionType,
    AlertType,
    AlertSeverity,
    PriceType,
    InventoryDashboardStats,
    StockMovementSummary,
} from "@/types/inventory.types";

// ============================================================================
// TRANSACTION TYPE DISPLAY
// ============================================================================

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
    PURCHASE: "Purchase",
    SALE: "Sale",
    RETURN: "Return",
    ADJUSTMENT: "Adjustment",
    TRANSFER_IN: "Transfer In",
    TRANSFER_OUT: "Transfer Out",
    DAMAGE: "Damage",
    EXPIRY: "Expiry",
};

const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
    PURCHASE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    SALE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    RETURN: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    ADJUSTMENT: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    TRANSFER_IN: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    TRANSFER_OUT: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    DAMAGE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    EXPIRY: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
};

export function getTransactionTypeLabel(type: TransactionType): string {
    return TRANSACTION_TYPE_LABELS[type] ?? type;
}

export function getTransactionTypeColor(type: TransactionType): string {
    return TRANSACTION_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-800";
}

// ============================================================================
// ALERT TYPE DISPLAY
// ============================================================================

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
    LOW_STOCK: "Low Stock",
    EXPIRY: "Expiring Soon",
    OVERSTOCK: "Overstock",
};

const ALERT_TYPE_COLORS: Record<AlertType, string> = {
    LOW_STOCK: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    EXPIRY: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    OVERSTOCK: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

export function getAlertTypeLabel(type: AlertType): string {
    return ALERT_TYPE_LABELS[type] ?? type;
}

export function getAlertTypeColor(type: AlertType): string {
    return ALERT_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-800";
}

// ============================================================================
// ALERT SEVERITY DISPLAY
// ============================================================================

const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
};

const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export function getAlertSeverityLabel(severity: AlertSeverity): string {
    return ALERT_SEVERITY_LABELS[severity] ?? severity;
}

export function getAlertSeverityColor(severity: AlertSeverity): string {
    return ALERT_SEVERITY_COLORS[severity] ?? "bg-gray-100 text-gray-800";
}

// ============================================================================
// PRICE TYPE DISPLAY
// ============================================================================

const PRICE_TYPE_LABELS: Record<PriceType, string> = {
    PURCHASE: "Purchase Price",
    SELLING: "Selling Price",
    MRP: "MRP",
};

export function getPriceTypeLabel(type: PriceType): string {
    return PRICE_TYPE_LABELS[type] ?? type;
}

// ============================================================================
// STOCK LEVEL DISPLAY
// ============================================================================

export type StockLevelStatus = "out_of_stock" | "critical" | "low" | "normal" | "overstock";

const STOCK_LEVEL_LABELS: Record<StockLevelStatus, string> = {
    out_of_stock: "Out of Stock",
    critical: "Critical",
    low: "Low Stock",
    normal: "In Stock",
    overstock: "Overstock",
};

const STOCK_LEVEL_COLORS: Record<StockLevelStatus, string> = {
    out_of_stock: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    critical: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
    low: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    normal: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    overstock: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

/**
 * Determine stock level status based on quantity and thresholds
 */
export function getStockLevelStatus(
    quantityOnHand: number,
    reorderPoint: number,
    maximumStock: number | null
): StockLevelStatus {
    if (quantityOnHand <= 0) return "out_of_stock";
    if (reorderPoint > 0 && quantityOnHand <= reorderPoint * 0.5) return "critical";
    if (reorderPoint > 0 && quantityOnHand <= reorderPoint) return "low";
    if (maximumStock != null && quantityOnHand > maximumStock) return "overstock";
    return "normal";
}

export function getStockLevelLabel(status: StockLevelStatus): string {
    return STOCK_LEVEL_LABELS[status] ?? status;
}

export function getStockLevelColor(status: StockLevelStatus): string {
    return STOCK_LEVEL_COLORS[status] ?? "bg-gray-100 text-gray-800";
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
 * Format quantity with optional decimal places
 */
export function formatQuantity(
    quantity: number | null | undefined,
    decimalPlaces = 3
): string {
    if (quantity == null) return "—";
    const formatted = quantity.toFixed(decimalPlaces).replace(/\.?0+$/, "");
    return formatted;
}

/**
 * Format quantity with unit code
 */
export function formatQuantityWithUnit(
    quantity: number | null | undefined,
    unitCode?: string | null,
    decimalPlaces = 3
): string {
    const formatted = formatQuantity(quantity, decimalPlaces);
    if (formatted === "—") return formatted;
    return unitCode ? `${formatted} ${unitCode}` : formatted;
}

/**
 * Get the display label for a unit (prefers symbol over code over name)
 */
export function getUnitDisplayLabel(
    unit?: { name?: string; code?: string; symbol?: string | null } | null
): string {
    if (!unit) return "units";
    return unit.symbol ?? unit.code ?? unit.name ?? "units";
}

/**
 * Get unit label from enriched inventory record
 */
export function getInventoryUnitLabel(
    item: EnrichedInventoryRecord | null | undefined
): string {
    return getUnitDisplayLabel(item?.unit);
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
 * Format percentage
 */
export function formatPercentage(value: number | null | undefined): string {
    if (value == null) return "—";
    return `${value.toFixed(2)}%`;
}

// ============================================================================
// BATCH / EXPIRY UTILITIES
// ============================================================================

/**
 * Calculate days until expiry (negative = already expired)
 */
export function getDaysUntilExpiry(expiryDate: string | null | undefined): number | null {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffMs = expiry.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get expiry status label
 */
export function getExpiryStatusLabel(expiryDate: string | null | undefined): string {
    const days = getDaysUntilExpiry(expiryDate);
    if (days == null) return "No expiry";
    if (days < 0) return "Expired";
    if (days === 0) return "Expires today";
    if (days <= 7) return `Expires in ${days}d`;
    if (days <= 30) return `Expires in ${days}d`;
    if (days <= 90) return `Expires in ${Math.floor(days / 30)}mo`;
    return "Valid";
}

/**
 * Get expiry status color
 */
export function getExpiryStatusColor(expiryDate: string | null | undefined): string {
    const days = getDaysUntilExpiry(expiryDate);
    if (days == null) return "text-gray-500";
    if (days < 0) return "text-red-600 dark:text-red-400";
    if (days <= 7) return "text-red-500 dark:text-red-400";
    if (days <= 30) return "text-amber-500 dark:text-amber-400";
    if (days <= 90) return "text-yellow-500 dark:text-yellow-400";
    return "text-green-500 dark:text-green-400";
}

/**
 * Check if a batch is expired
 */
export function isBatchExpired(expiryDate: string): boolean {
    return new Date(expiryDate) < new Date();
}

/**
 * Check if a batch is expiring within given number of days
 */
export function isBatchExpiringSoon(expiryDate: string, withinDays: number): boolean {
    const days = getDaysUntilExpiry(expiryDate);
    return days != null && days >= 0 && days <= withinDays;
}

// ============================================================================
// TRANSACTION DIRECTION UTILITIES
// ============================================================================

/**
 * Whether a transaction type increases stock
 */
export function isStockIncrease(type: TransactionType): boolean {
    return type === "PURCHASE" || type === "RETURN" || type === "TRANSFER_IN";
}

/**
 * Whether a transaction type decreases stock
 */
export function isStockDecrease(type: TransactionType): boolean {
    return (
        type === "SALE" ||
        type === "TRANSFER_OUT" ||
        type === "DAMAGE" ||
        type === "EXPIRY"
    );
}

/**
 * Get the sign indicator for a transaction type
 */
export function getTransactionSign(type: TransactionType): "+" | "-" | "~" {
    if (isStockIncrease(type)) return "+";
    if (isStockDecrease(type)) return "-";
    return "~"; // ADJUSTMENT
}

// ============================================================================
// SEARCH & FILTER UTILITIES (client-side)
// ============================================================================

/**
 * Filter inventory records by search query (client-side)
 */
export function filterInventoryBySearch(
    records: EnrichedInventoryRecord[],
    query: string
): EnrichedInventoryRecord[] {
    if (!query.trim()) return records;
    const lowerQuery = query.toLowerCase().trim();
    return records.filter(
        (r) =>
            r.product?.name?.toLowerCase().includes(lowerQuery) ||
            r.product?.product_code?.toLowerCase().includes(lowerQuery) ||
            r.product?.barcode?.toLowerCase().includes(lowerQuery) ||
            r.product?.brand?.toLowerCase().includes(lowerQuery) ||
            r.location?.toLowerCase().includes(lowerQuery) ||
            r.warehouse?.toLowerCase().includes(lowerQuery) ||
            r.variant?.name?.toLowerCase().includes(lowerQuery) ||
            r.variant?.variant_code?.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Filter transactions by search query (client-side)
 */
export function filterTransactionsBySearch(
    transactions: EnrichedInventoryTransaction[],
    query: string
): EnrichedInventoryTransaction[] {
    if (!query.trim()) return transactions;
    const lowerQuery = query.toLowerCase().trim();
    return transactions.filter(
        (t) =>
            t.product?.name?.toLowerCase().includes(lowerQuery) ||
            t.product?.product_code?.toLowerCase().includes(lowerQuery) ||
            t.reference_number?.toLowerCase().includes(lowerQuery) ||
            t.batch_number?.toLowerCase().includes(lowerQuery) ||
            t.reason?.toLowerCase().includes(lowerQuery) ||
            t.notes?.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Sort inventory records (client-side)
 */
export function sortInventoryRecords(
    records: EnrichedInventoryRecord[],
    sortBy: string,
    sortOrder: "asc" | "desc"
): EnrichedInventoryRecord[] {
    return [...records].sort((a, b) => {
        let valueA: string | number | null = null;
        let valueB: string | number | null = null;

        switch (sortBy) {
            case "product_name":
                valueA = a.product?.name?.toLowerCase() ?? null;
                valueB = b.product?.name?.toLowerCase() ?? null;
                break;
            case "product_code":
                valueA = a.product?.product_code?.toLowerCase() ?? null;
                valueB = b.product?.product_code?.toLowerCase() ?? null;
                break;
            case "quantity_on_hand":
                valueA = a.quantity_on_hand;
                valueB = b.quantity_on_hand;
                break;
            case "quantity_available":
                valueA = a.quantity_available;
                valueB = b.quantity_available;
                break;
            case "average_cost":
                valueA = a.average_cost;
                valueB = b.average_cost;
                break;
            case "total_value":
                valueA = a.total_value;
                valueB = b.total_value;
                break;
            case "reorder_point":
                valueA = a.reorder_point;
                valueB = b.reorder_point;
                break;
            case "last_updated_at":
                valueA = a.last_updated_at;
                valueB = b.last_updated_at;
                break;
            case "created_at":
                valueA = a.created_at;
                valueB = b.created_at;
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
}

/**
 * Sort transactions (client-side)
 */
export function sortTransactions(
    transactions: EnrichedInventoryTransaction[],
    sortBy: string,
    sortOrder: "asc" | "desc"
): EnrichedInventoryTransaction[] {
    return [...transactions].sort((a, b) => {
        let valueA: string | number | null = null;
        let valueB: string | number | null = null;

        switch (sortBy) {
            case "transaction_date":
                valueA = a.transaction_date;
                valueB = b.transaction_date;
                break;
            case "quantity":
                valueA = a.quantity;
                valueB = b.quantity;
                break;
            case "total_cost":
                valueA = a.total_cost;
                valueB = b.total_cost;
                break;
            case "transaction_type":
                valueA = a.transaction_type;
                valueB = b.transaction_type;
                break;
            case "created_at":
                valueA = a.created_at;
                valueB = b.created_at;
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
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/**
 * Export inventory records to CSV
 */
export function exportInventoryToCSV(records: EnrichedInventoryRecord[]): string {
    const headers = [
        "Product Code",
        "Product Name",
        "Barcode",
        "Brand",
        "Variant",
        "Qty On Hand",
        "Qty Committed",
        "Qty Available",
        "Qty In Transit",
        "Reorder Point",
        "Max Stock",
        "Average Cost",
        "Total Value",
        "Location",
        "Warehouse",
        "Stock Status",
        "Last Updated",
    ];

    const rows = records.map((r) => {
        const status = getStockLevelStatus(r.quantity_on_hand, r.reorder_point, r.maximum_stock);
        return [
            r.product?.product_code ?? "",
            r.product?.name ?? "",
            r.product?.barcode ?? "",
            r.product?.brand ?? "",
            r.variant?.name ?? "",
            formatQuantity(r.quantity_on_hand),
            formatQuantity(r.quantity_committed),
            formatQuantity(r.quantity_available),
            formatQuantity(r.quantity_in_transit),
            formatQuantity(r.reorder_point),
            r.maximum_stock != null ? formatQuantity(r.maximum_stock) : "",
            r.average_cost?.toFixed(2) ?? "",
            r.total_value?.toFixed(2) ?? "",
            r.location ?? "",
            r.warehouse ?? "",
            getStockLevelLabel(status),
            formatDate(r.last_updated_at),
        ];
    });

    return buildCSV(headers, rows);
}

/**
 * Export inventory transactions to CSV
 */
export function exportTransactionsToCSV(transactions: EnrichedInventoryTransaction[]): string {
    const headers = [
        "Date",
        "Type",
        "Product Code",
        "Product Name",
        "Variant",
        "Quantity",
        "Previous Qty",
        "New Qty",
        "Unit Cost",
        "Total Cost",
        "Reference Type",
        "Reference Number",
        "Batch Number",
        "Expiry Date",
        "Reason",
        "Notes",
    ];

    const rows = transactions.map((t) => [
        formatDate(t.transaction_date),
        getTransactionTypeLabel(t.transaction_type),
        t.product?.product_code ?? "",
        t.product?.name ?? "",
        t.variant?.name ?? "",
        formatQuantity(t.quantity),
        t.previous_quantity != null ? formatQuantity(t.previous_quantity) : "",
        t.new_quantity != null ? formatQuantity(t.new_quantity) : "",
        t.unit_cost?.toFixed(2) ?? "",
        t.total_cost?.toFixed(2) ?? "",
        t.reference_type ?? "",
        t.reference_number ?? "",
        t.batch_number ?? "",
        t.expiry_date ? formatDate(t.expiry_date) : "",
        t.reason ?? "",
        t.notes ?? "",
    ]);

    return buildCSV(headers, rows);
}

/**
 * Export batches to CSV
 */
export function exportBatchesToCSV(batches: ProductBatch[]): string {
    const headers = [
        "Batch Number",
        "Product ID",
        "Manufacturing Date",
        "Expiry Date",
        "MRP",
        "Initial Qty",
        "Current Qty",
        "Purchase Date",
        "Purchase Price",
        "Invoice",
        "Status",
        "Expiry Status",
    ];

    const rows = batches.map((b) => [
        b.batch_number,
        b.product_id,
        b.manufacturing_date ? formatDate(b.manufacturing_date) : "",
        formatDate(b.expiry_date),
        b.mrp?.toFixed(2) ?? "",
        formatQuantity(b.initial_quantity),
        formatQuantity(b.current_quantity),
        b.purchase_date ? formatDate(b.purchase_date) : "",
        b.purchase_price?.toFixed(2) ?? "",
        b.purchase_invoice ?? "",
        b.is_active ? "Active" : "Inactive",
        getExpiryStatusLabel(b.expiry_date),
    ]);

    return buildCSV(headers, rows);
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
// DASHBOARD / STATS UTILITIES
// ============================================================================

/**
 * Get empty default inventory stats
 */
export function getEmptyInventoryDashboardStats(): InventoryDashboardStats {
    return {
        total_products: 0,
        total_stock_value: 0,
        low_stock_count: 0,
        out_of_stock_count: 0,
        overstock_count: 0,
        expiring_soon_count: 0,
        expired_count: 0,
        unresolved_alerts_count: 0,
        total_transactions_today: 0,
        total_adjustments_this_month: 0,
        top_moving_products: [],
        stock_value_by_category: [],
    };
}

/**
 * Compute inventory stats from enriched inventory records (client-side)
 */
export function computeInventoryStats(
    records: EnrichedInventoryRecord[],
    batches: ProductBatch[],
    alerts: StockAlert[]
): InventoryDashboardStats {
    const stats = getEmptyInventoryDashboardStats();

    for (const record of records) {
        if (!record.is_active) continue;

        stats.total_products++;
        stats.total_stock_value += record.total_value ?? 0;

        const status = getStockLevelStatus(
            record.quantity_on_hand,
            record.reorder_point,
            record.maximum_stock
        );

        switch (status) {
            case "out_of_stock":
                stats.out_of_stock_count++;
                break;
            case "critical":
            case "low":
                stats.low_stock_count++;
                break;
            case "overstock":
                stats.overstock_count++;
                break;
        }
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const batch of batches) {
        if (!batch.is_active) continue;
        const expiryDate = new Date(batch.expiry_date);
        if (expiryDate < now) {
            stats.expired_count++;
        } else if (expiryDate <= thirtyDaysFromNow) {
            stats.expiring_soon_count++;
        }
    }

    stats.unresolved_alerts_count = alerts.filter((a) => !a.is_resolved).length;

    return stats;
}

/**
 * Compute stock movement summary from transactions (client-side)
 */
export function computeStockMovementSummary(
    transactions: EnrichedInventoryTransaction[],
    openingStockMap: Map<string, number>
): StockMovementSummary[] {
    const summaryMap = new Map<string, StockMovementSummary>();

    for (const txn of transactions) {
        const key = txn.product_id;
        if (!summaryMap.has(key)) {
            summaryMap.set(key, {
                product_id: txn.product_id,
                product_name: txn.product?.name ?? "Unknown",
                product_code: txn.product?.product_code ?? "",
                opening_stock: openingStockMap.get(key) ?? 0,
                purchases: 0,
                sales: 0,
                returns: 0,
                adjustments: 0,
                transfers_in: 0,
                transfers_out: 0,
                damages: 0,
                expired: 0,
                closing_stock: 0,
            });
        }

        const summary = summaryMap.get(key)!;

        switch (txn.transaction_type) {
            case "PURCHASE":
                summary.purchases += txn.quantity;
                break;
            case "SALE":
                summary.sales += txn.quantity;
                break;
            case "RETURN":
                summary.returns += txn.quantity;
                break;
            case "ADJUSTMENT":
                summary.adjustments += txn.quantity;
                break;
            case "TRANSFER_IN":
                summary.transfers_in += txn.quantity;
                break;
            case "TRANSFER_OUT":
                summary.transfers_out += txn.quantity;
                break;
            case "DAMAGE":
                summary.damages += txn.quantity;
                break;
            case "EXPIRY":
                summary.expired += txn.quantity;
                break;
        }
    }

    // Calculate closing stock
    for (const summary of summaryMap.values()) {
        summary.closing_stock =
            summary.opening_stock +
            summary.purchases +
            summary.returns +
            summary.transfers_in -
            summary.sales -
            summary.transfers_out -
            summary.damages -
            summary.expired +
            summary.adjustments;
    }

    return Array.from(summaryMap.values());
}

// ============================================================================
// LOCATION & WAREHOUSE UTILITIES
// ============================================================================

/**
 * Extract unique warehouses from inventory records
 */
export function getUniqueWarehouses(records: InventoryRecord[]): string[] {
    const warehouses = new Set<string>();
    for (const r of records) {
        if (r.warehouse) warehouses.add(r.warehouse);
    }
    return Array.from(warehouses).sort();
}

/**
 * Extract unique locations from inventory records
 */
export function getUniqueLocations(records: InventoryRecord[]): string[] {
    const locations = new Set<string>();
    for (const r of records) {
        if (r.location) locations.add(r.location);
    }
    return Array.from(locations).sort();
}

// ============================================================================
// VALUATION UTILITIES
// ============================================================================

/**
 * Calculate weighted average cost after a new purchase
 */
export function calculateWeightedAverageCost(
    currentQty: number,
    currentAvgCost: number,
    newQty: number,
    newUnitCost: number
): number {
    const totalQty = currentQty + newQty;
    if (totalQty <= 0) return 0;
    const totalValue = currentQty * currentAvgCost + newQty * newUnitCost;
    return roundToTwo(totalValue / totalQty);
}

/**
 * Calculate total inventory value
 */
export function calculateTotalInventoryValue(records: InventoryRecord[]): number {
    return roundToTwo(
        records.reduce((sum, r) => sum + (r.total_value ?? 0), 0)
    );
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function roundToTwo(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

function buildCSV(headers: string[], rows: string[][]): string {
    const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
            row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
    ].join("\n");
    return csvContent;
}
