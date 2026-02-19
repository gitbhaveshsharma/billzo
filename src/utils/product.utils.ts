import type {
    Product,
    ProductVariant,
    ProductBatch,
    Inventory,
    InventoryTransaction,
    StockAlert,
    Category,
    UnitOfMeasure,
    TransactionType,
    AlertType,
    AlertSeverity,
    BarcodeType,
    PriceType,
    PriceHistoryType,
    UnitCategory,
    ProductDashboardStats,
} from "@/types/product.types";

// ============================================================================
// STATUS / LABEL DISPLAY UTILITIES
// ============================================================================

// -- Transaction Type --------------------------------------------------------

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
    RETURN: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    ADJUSTMENT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    TRANSFER_IN: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    TRANSFER_OUT: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    DAMAGE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    EXPIRY: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

export function getTransactionTypeLabel(type: TransactionType): string {
    return TRANSACTION_TYPE_LABELS[type] ?? type;
}

export function getTransactionTypeColor(type: TransactionType): string {
    return TRANSACTION_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-800";
}

// -- Alert Type & Severity ---------------------------------------------------

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

const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
};

const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
    low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export function getAlertTypeLabel(type: AlertType): string {
    return ALERT_TYPE_LABELS[type] ?? type;
}

export function getAlertTypeColor(type: AlertType): string {
    return ALERT_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-800";
}

export function getAlertSeverityLabel(severity: AlertSeverity): string {
    return ALERT_SEVERITY_LABELS[severity] ?? severity;
}

export function getAlertSeverityColor(severity: AlertSeverity): string {
    return ALERT_SEVERITY_COLORS[severity] ?? "bg-gray-100 text-gray-800";
}

// -- Barcode Type ------------------------------------------------------------

const BARCODE_TYPE_LABELS: Record<BarcodeType, string> = {
    EAN13: "EAN-13",
    UPC: "UPC-A",
    CODE128: "Code 128",
    CODE39: "Code 39",
    QR: "QR Code",
    ITF: "ITF",
};

export function getBarcodeTypeLabel(type: BarcodeType): string {
    return BARCODE_TYPE_LABELS[type] ?? type;
}

// -- Price Type & History Type -----------------------------------------------

const PRICE_TYPE_LABELS: Record<PriceType, string> = {
    selling: "Selling",
    mrp: "MRP",
    wholesale: "Wholesale",
};

export function getPriceTypeLabel(type: PriceType): string {
    return PRICE_TYPE_LABELS[type] ?? type;
}

const PRICE_HISTORY_TYPE_LABELS: Record<PriceHistoryType, string> = {
    PURCHASE: "Purchase Price",
    SELLING: "Selling Price",
    MRP: "MRP",
};

export function getPriceHistoryTypeLabel(type: PriceHistoryType): string {
    return PRICE_HISTORY_TYPE_LABELS[type] ?? type;
}

// -- Unit Category -----------------------------------------------------------

const UNIT_CATEGORY_LABELS: Record<UnitCategory, string> = {
    weight: "Weight",
    quantity: "Quantity",
    volume: "Volume",
    length: "Length",
};

export function getUnitCategoryLabel(category: UnitCategory): string {
    return UNIT_CATEGORY_LABELS[category] ?? category;
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
 * Format quantity with unit code
 */
export function formatQuantity(
    quantity: number | null | undefined,
    unitCode?: string | null
): string {
    if (quantity == null) return "—";
    const formatted = Number.isInteger(quantity)
        ? quantity.toString()
        : quantity.toFixed(3).replace(/\.?0+$/, "");
    return unitCode ? `${formatted} ${unitCode}` : formatted;
}

/**
 * Format stock status (quantity with visual indicator)
 */
export function getStockStatusLabel(inventory: Inventory | null | undefined): string {
    if (!inventory) return "No inventory";
    if (inventory.quantity_on_hand <= 0) return "Out of Stock";
    if (inventory.quantity_on_hand <= inventory.reorder_point) return "Low Stock";
    if (inventory.maximum_stock && inventory.quantity_on_hand > inventory.maximum_stock) return "Overstock";
    return "In Stock";
}

export function getStockStatusColor(inventory: Inventory | null | undefined): string {
    if (!inventory || inventory.quantity_on_hand <= 0) {
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    }
    if (inventory.quantity_on_hand <= inventory.reorder_point) {
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
    }
    if (inventory.maximum_stock && inventory.quantity_on_hand > inventory.maximum_stock) {
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    }
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
}

// ============================================================================
// PRODUCT STATUS UTILITIES
// ============================================================================

/**
 * Check if product is active and available for sale
 */
export function isProductAvailable(product: Product): boolean {
    return product.is_active;
}

/**
 * Get effective selling price (consider variant override)
 */
export function getEffectivePrice(product: Product, variant?: ProductVariant | null): number {
    if (variant?.selling_price != null) return variant.selling_price;
    return product.selling_price;
}

/**
 * Get effective MRP (consider variant override)
 */
export function getEffectiveMrp(product: Product, variant?: ProductVariant | null): number {
    if (variant?.mrp != null) return variant.mrp;
    return product.mrp;
}

/**
 * Calculate discount percentage between MRP and selling price
 */
export function calculateDiscountPercentage(mrp: number, sellingPrice: number): number {
    if (mrp <= 0) return 0;
    return roundToTwo(((mrp - sellingPrice) / mrp) * 100);
}

/**
 * Calculate profit margin percentage
 */
export function calculateProfitMargin(sellingPrice: number, costPrice: number | null | undefined): number {
    if (!costPrice || costPrice <= 0 || sellingPrice <= 0) return 0;
    return roundToTwo(((sellingPrice - costPrice) / sellingPrice) * 100);
}

// ============================================================================
// TAX CALCULATION UTILITIES
// ============================================================================

/**
 * Calculate GST split (CGST + SGST for intra-state, IGST for inter-state)
 */
export function calculateGstSplit(
    taxableAmount: number,
    gstPercentage: number,
    isInterState: boolean
): { cgst: number; sgst: number; igst: number } {
    const totalGst = (taxableAmount * gstPercentage) / 100;

    if (isInterState) {
        return { cgst: 0, sgst: 0, igst: roundToTwo(totalGst) };
    }

    const half = totalGst / 2;
    return {
        cgst: roundToTwo(half),
        sgst: roundToTwo(half),
        igst: 0,
    };
}

/**
 * Calculate cess amount
 */
export function calculateCess(taxableAmount: number, cessPercentage: number): number {
    return roundToTwo((taxableAmount * cessPercentage) / 100);
}

/**
 * Calculate total tax for a product
 */
export function calculateProductTax(
    amount: number,
    gstPercentage: number,
    cessPercentage: number,
    isInterState: boolean
): { cgst: number; sgst: number; igst: number; cess: number; totalTax: number; totalWithTax: number } {
    const gstSplit = calculateGstSplit(amount, gstPercentage, isInterState);
    const cess = calculateCess(amount, cessPercentage);
    const totalTax = roundToTwo(gstSplit.cgst + gstSplit.sgst + gstSplit.igst + cess);
    const totalWithTax = roundToTwo(amount + totalTax);

    return { ...gstSplit, cess, totalTax, totalWithTax };
}

// ============================================================================
// BARCODE UTILITIES
// ============================================================================

/**
 * Validate barcode format (basic validation)
 * Standard barcodes are 8-14 digits
 */
export function isValidBarcode(barcode: string): boolean {
    return /^[0-9]{8,14}$/.test(barcode);
}

/**
 * Detect barcode type from value
 */
export function detectBarcodeType(barcode: string): BarcodeType | null {
    if (!barcode) return null;
    if (/^[0-9]{13}$/.test(barcode)) return "EAN13";
    if (/^[0-9]{12}$/.test(barcode)) return "UPC";
    if (/^[0-9]{8}$/.test(barcode)) return "EAN13"; // EAN-8
    if (/^[0-9]{14}$/.test(barcode)) return "ITF";
    return "CODE128"; // fallback for other formats
}

// ============================================================================
// CATEGORY UTILITIES
// ============================================================================

/**
 * Build category path string
 */
export function buildCategoryPath(categories: Category[], categoryId: string): string {
    const buildPath = (id: string): string[] => {
        const cat = categories.find((c) => c.id === id);
        if (!cat) return [];
        if (cat.parent_id) {
            return [...buildPath(cat.parent_id), cat.name];
        }
        return [cat.name];
    };
    return buildPath(categoryId).join(" / ");
}

/**
 * Get category tree from flat list
 */
export function buildCategoryTree(categories: Category[]): (Category & { children: Category[] })[] {
    const map = new Map<string, Category & { children: Category[] }>();
    const roots: (Category & { children: Category[] })[] = [];

    // Create nodes
    for (const cat of categories) {
        map.set(cat.id, { ...cat, children: [] });
    }

    // Build tree
    for (const cat of categories) {
        const node = map.get(cat.id)!;
        if (cat.parent_id) {
            const parent = map.get(cat.parent_id);
            if (parent) {
                parent.children.push(node);
            } else {
                roots.push(node);
            }
        } else {
            roots.push(node);
        }
    }

    // Sort by sort_order
    const sortChildren = (nodes: (Category & { children: Category[] })[]) => {
        nodes.sort((a, b) => a.sort_order - b.sort_order);
        for (const node of nodes) {
            sortChildren(node.children as (Category & { children: Category[] })[]);
        }
    };
    sortChildren(roots);

    return roots;
}

/**
 * Flatten category tree to sorted list (depth-first)
 */
export function flattenCategoryTree(
    tree: (Category & { children: Category[] })[],
    depth = 0
): (Category & { depth: number })[] {
    const result: (Category & { depth: number })[] = [];
    for (const node of tree) {
        result.push({ ...node, depth });
        if (node.children.length > 0) {
            result.push(
                ...flattenCategoryTree(node.children as (Category & { children: Category[] })[], depth + 1)
            );
        }
    }
    return result;
}

// ============================================================================
// BATCH / EXPIRY UTILITIES
// ============================================================================

/**
 * Get days until expiry
 */
export function getDaysUntilExpiry(expiryDate: string | null | undefined): number | null {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate).getTime();
    const now = Date.now();
    return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
}

/**
 * Get expiry status label
 */
export function getExpiryStatusLabel(expiryDate: string | null | undefined): string {
    const days = getDaysUntilExpiry(expiryDate);
    if (days === null) return "—";
    if (days < 0) return "Expired";
    if (days === 0) return "Expires today";
    if (days <= 7) return `Expires in ${days}d`;
    if (days <= 30) return `Expires in ${days}d`;
    if (days <= 90) return `Expires in ${Math.ceil(days / 30)} months`;
    return "Valid";
}

/**
 * Get expiry status color
 */
export function getExpiryStatusColor(expiryDate: string | null | undefined): string {
    const days = getDaysUntilExpiry(expiryDate);
    if (days === null) return "bg-gray-100 text-gray-800";
    if (days < 0) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    if (days <= 30) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
    if (days <= 90) return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
}

/**
 * Check if a batch is expiring soon (within given days)
 */
export function isBatchExpiringSoon(batch: ProductBatch, days = 30): boolean {
    const daysUntil = getDaysUntilExpiry(batch.expiry_date);
    return daysUntil !== null && daysUntil >= 0 && daysUntil <= days;
}

/**
 * Check if batch is expired
 */
export function isBatchExpired(batch: ProductBatch): boolean {
    const daysUntil = getDaysUntilExpiry(batch.expiry_date);
    return daysUntil !== null && daysUntil < 0;
}

// ============================================================================
// INVENTORY UTILITIES
// ============================================================================

/**
 * Check if product is low on stock
 */
export function isLowStock(inventory: Inventory): boolean {
    return inventory.quantity_on_hand <= inventory.reorder_point && inventory.quantity_on_hand > 0;
}

/**
 * Check if product is out of stock
 */
export function isOutOfStock(inventory: Inventory): boolean {
    return inventory.quantity_on_hand <= 0;
}

/**
 * Check if transaction type increases stock
 */
export function isStockIncrease(type: TransactionType): boolean {
    return ["PURCHASE", "RETURN", "TRANSFER_IN"].includes(type);
}

/**
 * Check if transaction type decreases stock
 */
export function isStockDecrease(type: TransactionType): boolean {
    return ["SALE", "TRANSFER_OUT", "DAMAGE", "EXPIRY"].includes(type);
}

/**
 * Calculate inventory value
 */
export function calculateInventoryValue(inventory: Inventory): number {
    return roundToTwo((inventory.quantity_on_hand) * (inventory.average_cost ?? 0));
}

// ============================================================================
// SEARCH & FILTER UTILITIES
// ============================================================================

/**
 * Filter products by search query (client-side)
 */
export function filterProductsBySearch(products: Product[], query: string): Product[] {
    if (!query.trim()) return products;
    const lowerQuery = query.toLowerCase().trim();
    return products.filter(
        (p) =>
            p.name.toLowerCase().includes(lowerQuery) ||
            p.product_code.toLowerCase().includes(lowerQuery) ||
            p.barcode?.toLowerCase().includes(lowerQuery) ||
            p.brand?.toLowerCase().includes(lowerQuery) ||
            p.hsn_code?.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Sort products (client-side)
 */
export function sortProducts(
    products: Product[],
    sortBy: string,
    sortOrder: "asc" | "desc"
): Product[] {
    const sorted = [...products].sort((a, b) => {
        let valueA: string | number | null = null;
        let valueB: string | number | null = null;

        switch (sortBy) {
            case "product_code":
                valueA = a.product_code.toLowerCase();
                valueB = b.product_code.toLowerCase();
                break;
            case "name":
                valueA = a.name.toLowerCase();
                valueB = b.name.toLowerCase();
                break;
            case "mrp":
                valueA = a.mrp;
                valueB = b.mrp;
                break;
            case "selling_price":
                valueA = a.selling_price;
                valueB = b.selling_price;
                break;
            case "purchase_price":
                valueA = a.purchase_price;
                valueB = b.purchase_price;
                break;
            case "brand":
                valueA = a.brand?.toLowerCase() ?? null;
                valueB = b.brand?.toLowerCase() ?? null;
                break;
            case "created_at":
                valueA = a.created_at;
                valueB = b.created_at;
                break;
            case "updated_at":
                valueA = a.updated_at;
                valueB = b.updated_at;
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
// EXPORT UTILITIES
// ============================================================================

/**
 * Export products to CSV format
 */
export function exportProductsToCSV(products: Product[]): string {
    const headers = [
        "Product Code",
        "Name",
        "Barcode",
        "Brand",
        "HSN Code",
        "GST %",
        "Cess %",
        "MRP",
        "Selling Price",
        "Purchase Price",
        "Minimum Stock",
        "Reorder Level",
        "Batch Tracked",
        "Active",
        "Taxable",
        "Created At",
    ];

    const rows = products.map((p) => [
        p.product_code,
        p.name,
        p.barcode ?? "",
        p.brand ?? "",
        p.hsn_code ?? "",
        p.gst_percentage.toFixed(2),
        p.cess_percentage.toFixed(2),
        p.mrp.toFixed(2),
        p.selling_price.toFixed(2),
        p.purchase_price?.toFixed(2) ?? "",
        p.minimum_stock.toString(),
        p.reorder_level.toString(),
        p.is_batch_tracked ? "Yes" : "No",
        p.is_active ? "Yes" : "No",
        p.is_taxable ? "Yes" : "No",
        formatDate(p.created_at),
    ]);

    return buildCSV(headers, rows);
}

/**
 * Export inventory to CSV format
 */
export function exportInventoryToCSV(
    items: Array<Inventory & { product_name?: string; product_code?: string }>
): string {
    const headers = [
        "Product Code",
        "Product Name",
        "On Hand",
        "Committed",
        "Available",
        "In Transit",
        "Reorder Point",
        "Location",
        "Warehouse",
        "Average Cost",
        "Total Value",
        "Last Updated",
    ];

    const rows = items.map((i) => [
        i.product_code ?? "",
        i.product_name ?? "",
        i.quantity_on_hand.toString(),
        i.quantity_committed.toString(),
        i.quantity_available.toString(),
        i.quantity_in_transit.toString(),
        i.reorder_point.toString(),
        i.location ?? "",
        i.warehouse ?? "",
        i.average_cost?.toFixed(2) ?? "",
        i.total_value?.toFixed(2) ?? "",
        formatDate(i.last_updated_at),
    ]);

    return buildCSV(headers, rows);
}

/**
 * Export inventory transactions to CSV
 */
export function exportTransactionsToCSV(transactions: InventoryTransaction[]): string {
    const headers = [
        "Date",
        "Type",
        "Quantity",
        "Previous Qty",
        "New Qty",
        "Unit Cost",
        "Total Cost",
        "Ref Type",
        "Ref Number",
        "Batch",
        "Reason",
        "Notes",
    ];

    const rows = transactions.map((t) => [
        formatDate(t.transaction_date),
        getTransactionTypeLabel(t.transaction_type),
        t.quantity.toString(),
        t.previous_quantity?.toString() ?? "",
        t.new_quantity?.toString() ?? "",
        t.unit_cost?.toFixed(2) ?? "",
        t.total_cost?.toFixed(2) ?? "",
        t.reference_type ?? "",
        t.reference_number ?? "",
        t.batch_number ?? "",
        t.reason ?? "",
        t.notes ?? "",
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
 * Get empty default product dashboard stats
 */
export function getEmptyProductDashboardStats(): ProductDashboardStats {
    return {
        total_products: 0,
        active_products: 0,
        inactive_products: 0,
        total_categories: 0,
        total_brands: 0,
        total_inventory_value: 0,
        low_stock_count: 0,
        out_of_stock_count: 0,
        expiring_soon_count: 0,
        unresolved_alerts: 0,
        products_by_category: [],
        products_by_gst: [],
    };
}

/**
 * Compute product stats from data (client-side)
 */
export function computeProductStats(
    products: Product[],
    inventories: Inventory[],
    batches: ProductBatch[],
    alerts: StockAlert[]
): ProductDashboardStats {
    const stats = getEmptyProductDashboardStats();

    stats.total_products = products.length;
    stats.active_products = products.filter((p) => p.is_active).length;
    stats.inactive_products = products.filter((p) => !p.is_active).length;

    // Unique brands
    const brands = new Set(products.map((p) => p.brand).filter(Boolean));
    stats.total_brands = brands.size;

    // Unique category IDs (rough count)
    const categoryIds = new Set(products.map((p) => p.category_id).filter(Boolean));
    stats.total_categories = categoryIds.size;

    // Inventory stats
    for (const inv of inventories) {
        stats.total_inventory_value += inv.total_value ?? 0;
        if (inv.quantity_on_hand <= 0) stats.out_of_stock_count++;
        else if (inv.quantity_on_hand <= inv.reorder_point) stats.low_stock_count++;
    }

    // Expiring batches (within 30 days)
    stats.expiring_soon_count = batches.filter((b) => b.is_active && isBatchExpiringSoon(b, 30)).length;

    // Unresolved alerts
    stats.unresolved_alerts = alerts.filter((a) => !a.is_resolved).length;

    // Products by GST
    const gstMap = new Map<number, number>();
    for (const p of products) {
        gstMap.set(p.gst_percentage, (gstMap.get(p.gst_percentage) ?? 0) + 1);
    }
    stats.products_by_gst = Array.from(gstMap.entries())
        .map(([gst_percentage, count]) => ({ gst_percentage, count }))
        .sort((a, b) => a.gst_percentage - b.gst_percentage);

    return stats;
}

// ============================================================================
// UNIT CONVERSION UTILITIES
// ============================================================================

/**
 * Convert quantity from one unit to another using conversion factors
 */
export function convertUnit(
    quantity: number,
    fromUnit: UnitOfMeasure,
    toUnit: UnitOfMeasure
): number | null {
    // Same unit
    if (fromUnit.id === toUnit.id) return quantity;

    // Both must share the same base unit or one must be the base
    if (fromUnit.is_base_unit && toUnit.base_unit_id === fromUnit.id && toUnit.conversion_factor) {
        return roundToTwo(quantity * toUnit.conversion_factor);
    }

    if (toUnit.is_base_unit && fromUnit.base_unit_id === toUnit.id && fromUnit.conversion_factor) {
        return roundToTwo(quantity / fromUnit.conversion_factor);
    }

    // Both non-base but same base
    if (
        fromUnit.base_unit_id &&
        fromUnit.base_unit_id === toUnit.base_unit_id &&
        fromUnit.conversion_factor &&
        toUnit.conversion_factor
    ) {
        const baseQuantity = quantity / fromUnit.conversion_factor;
        return roundToTwo(baseQuantity * toUnit.conversion_factor);
    }

    return null; // Cannot convert
}

// ============================================================================
// VARIANT UTILITIES
// ============================================================================

/**
 * Format variant attributes for display
 */
export function formatVariantAttributes(attributes: Record<string, string>): string {
    return Object.entries(attributes)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
}

/**
 * Get variant display name
 */
export function getVariantDisplayName(variant: ProductVariant): string {
    if (variant.name) return variant.name;
    return formatVariantAttributes(variant.attributes);
}

// ============================================================================
// GST DISPLAY UTILITIES
// ============================================================================

/**
 * Format GST display for a product
 */
export function formatProductGst(product: Product, isInterState: boolean): string {
    const gst = product.gst_percentage;
    if (gst === 0) return "Exempt";
    if (isInterState) {
        return `IGST @${gst}%`;
    }
    return `CGST @${gst / 2}% + SGST @${gst / 2}%`;
}

/**
 * Format tax amount breakdown for a product
 */
export function formatProductTaxBreakdown(
    amount: number,
    gstPercentage: number,
    cessPercentage: number,
    isInterState: boolean
): string {
    const tax = calculateProductTax(amount, gstPercentage, cessPercentage, isInterState);
    const parts: string[] = [];

    if (isInterState && tax.igst > 0) {
        parts.push(`IGST: ${formatCurrency(tax.igst)}`);
    } else {
        if (tax.cgst > 0) parts.push(`CGST: ${formatCurrency(tax.cgst)}`);
        if (tax.sgst > 0) parts.push(`SGST: ${formatCurrency(tax.sgst)}`);
    }
    if (tax.cess > 0) parts.push(`Cess: ${formatCurrency(tax.cess)}`);

    return parts.length > 0 ? parts.join(" + ") : "No tax";
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function roundToTwo(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

function buildCSV(headers: string[], rows: string[][]): string {
    return [
        headers.join(","),
        ...rows.map((row) =>
            row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
    ].join("\n");
}
