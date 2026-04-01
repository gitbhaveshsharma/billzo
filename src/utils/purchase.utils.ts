import type {
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    PaymentStatus,
    PaymentMethod,
    POItemStatus,
    ReturnStatus,
    RefundStatus,
    PurchaseDashboardStats,
    CreatePurchaseOrderItemRequest,
    ActiveProductOffer,
    SupplierOfferDetails,
} from "@/types/purchase.types";

// ============================================================================
// STATUS DISPLAY UTILITIES
// ============================================================================

// -- Purchase Order Status ---------------------------------------------------

const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
    draft: "Draft",
    confirmed: "Confirmed",
    partially_received: "Partially Received",
    received: "Received",
    cancelled: "Cancelled",
    returned: "Returned",
};

const PO_STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    partially_received: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    received: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    returned: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export function getPOStatusLabel(status: PurchaseOrderStatus): string {
    return PO_STATUS_LABELS[status] ?? status;
}

export function getPOStatusColor(status: PurchaseOrderStatus): string {
    return PO_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
}

// -- Payment Status ----------------------------------------------------------

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    unpaid: "Unpaid",
    partially_paid: "Partially Paid",
    paid: "Paid",
    refunded: "Refunded",
};

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
    unpaid: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    partially_paid: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    refunded: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export function getPaymentStatusLabel(status: PaymentStatus): string {
    return PAYMENT_STATUS_LABELS[status] ?? status;
}

export function getPaymentStatusColor(status: PaymentStatus): string {
    return PAYMENT_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
}

// -- Payment Method ----------------------------------------------------------

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    upi: "UPI",
    credit_note: "Credit Note",
    other: "Other",
};

export function getPaymentMethodLabel(method: PaymentMethod): string {
    return PAYMENT_METHOD_LABELS[method] ?? method;
}

// -- PO Item Status ----------------------------------------------------------

const PO_ITEM_STATUS_LABELS: Record<POItemStatus, string> = {
    pending: "Pending",
    partially_received: "Partially Received",
    received: "Received",
    cancelled: "Cancelled",
    returned: "Returned",
};

const PO_ITEM_STATUS_COLORS: Record<POItemStatus, string> = {
    pending: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    partially_received: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    received: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    returned: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export function getPOItemStatusLabel(status: POItemStatus): string {
    return PO_ITEM_STATUS_LABELS[status] ?? status;
}

export function getPOItemStatusColor(status: POItemStatus): string {
    return PO_ITEM_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
}

// -- Return Status -----------------------------------------------------------

const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
    draft: "Draft",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
};

const RETURN_STATUS_COLORS: Record<ReturnStatus, string> = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export function getReturnStatusLabel(status: ReturnStatus): string {
    return RETURN_STATUS_LABELS[status] ?? status;
}

export function getReturnStatusColor(status: ReturnStatus): string {
    return RETURN_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
}

// -- Refund Status -----------------------------------------------------------

const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
    pending: "Pending",
    refunded: "Refunded",
    credit_note: "Credit Note",
    adjusted: "Adjusted",
};

export function getRefundStatusLabel(status: RefundStatus): string {
    return REFUND_STATUS_LABELS[status] ?? status;
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
 * Format quantity with unit
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
 * Calculate line item totals
 */
export function calculateItemTotals(
    orderedQuantity: number,
    unitPrice: number,
    discountPercentage: number,
    gstPercentage: number,
    cessPercentage: number,
    isInterState: boolean
): {
    lineTotal: number;
    discountAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    cessAmount: number;
    taxAmount: number;
    totalAmount: number;
} {
    const gross = orderedQuantity * unitPrice;
    const discountAmount = roundToTwo((gross * discountPercentage) / 100);
    const lineTotal = roundToTwo(gross - discountAmount);

    const gstSplit = calculateGstSplit(lineTotal, gstPercentage, isInterState);
    const cessAmount = calculateCess(lineTotal, cessPercentage);
    const taxAmount = roundToTwo(gstSplit.cgst + gstSplit.sgst + gstSplit.igst + cessAmount);
    const totalAmount = roundToTwo(lineTotal + taxAmount);

    return {
        lineTotal,
        discountAmount,
        cgstAmount: gstSplit.cgst,
        sgstAmount: gstSplit.sgst,
        igstAmount: gstSplit.igst,
        cessAmount,
        taxAmount,
        totalAmount,
    };
}

/**
 * Calculate complete PO totals from items and order-level charges
 */
export function calculatePOTotals(
    items: Array<{
        lineTotal: number;
        cgstAmount: number;
        sgstAmount: number;
        igstAmount: number;
        cessAmount: number;
        taxAmount: number;
    }>,
    orderDiscount: number,
    shippingCharges: number,
    otherCharges: number,
    roundOff: number
): {
    subtotal: number;
    taxableAmount: number;
    cgstTotal: number;
    sgstTotal: number;
    igstTotal: number;
    cessTotal: number;
    totalTax: number;
    grandTotal: number;
} {
    const subtotal = roundToTwo(items.reduce((sum, item) => sum + item.lineTotal, 0));
    const taxableAmount = roundToTwo(subtotal - orderDiscount);
    const cgstTotal = roundToTwo(items.reduce((sum, item) => sum + item.cgstAmount, 0));
    const sgstTotal = roundToTwo(items.reduce((sum, item) => sum + item.sgstAmount, 0));
    const igstTotal = roundToTwo(items.reduce((sum, item) => sum + item.igstAmount, 0));
    const cessTotal = roundToTwo(items.reduce((sum, item) => sum + item.cessAmount, 0));
    const totalTax = roundToTwo(cgstTotal + sgstTotal + igstTotal + cessTotal);
    const grandTotal = roundToTwo(taxableAmount + totalTax + shippingCharges + otherCharges + roundOff);

    return {
        subtotal,
        taxableAmount,
        cgstTotal,
        sgstTotal,
        igstTotal,
        cessTotal,
        totalTax,
        grandTotal,
    };
}

/**
 * Build the complete item payload with calculated tax fields
 * for a CreatePurchaseOrderItemRequest before sending to the server
 */
export function buildItemPayload(
    item: CreatePurchaseOrderItemRequest,
    isInterState: boolean
): Record<string, unknown> {
    const calc = calculateItemTotals(
        item.ordered_quantity,
        item.unit_price,
        item.discount_percentage ?? 0,
        item.gst_percentage,
        item.cess_percentage ?? 0,
        isInterState
    );

    const halfGst = item.gst_percentage / 2;

    return {
        ...item,
        discount_amount: calc.discountAmount,
        line_total: calc.lineTotal,
        cgst_percentage: isInterState ? 0 : halfGst,
        sgst_percentage: isInterState ? 0 : halfGst,
        igst_percentage: isInterState ? item.gst_percentage : 0,
        cess_percentage: item.cess_percentage ?? 0,
        cgst_amount: calc.cgstAmount,
        sgst_amount: calc.sgstAmount,
        igst_amount: calc.igstAmount,
        cess_amount: calc.cessAmount,
        tax_amount: calc.taxAmount,
        total_amount: calc.totalAmount,
    };
}

/**
 * Calculate free quantity from offer rules and ordered quantity.
 * Mirrors DB function calculate_offer_free_quantity for consistent preview.
 */
export function calculateOfferFreeQuantity(
    orderedQuantity: number,
    offer: Pick<ActiveProductOffer, "offer_type" | "buy_quantity" | "get_quantity">
): number {
    if (orderedQuantity <= 0 || offer.buy_quantity <= 0 || offer.get_quantity <= 0) return 0;
    const sets = Math.floor(orderedQuantity / offer.buy_quantity);

    switch (offer.offer_type) {
        case "BOGO":
        case "BUY_X_GET_Y_FREE":
        case "BUY_X_GET_Y_DISCOUNT":
            return sets * offer.get_quantity;
        case "VOLUME_FREE":
            return orderedQuantity >= offer.buy_quantity ? offer.get_quantity : 0;
        default:
            return 0;
    }
}

export function findApplicableOfferForPurchaseItem(
    item: Pick<CreatePurchaseOrderItemRequest, "product_id" | "variant_id" | "offer_id">,
    offers: ActiveProductOffer[]
): ActiveProductOffer | null {
    if (!offers.length) return null;

    if (item.offer_id) {
        return offers.find((offer) => offer.offer_id === item.offer_id) ?? null;
    }

    const variantMatch = item.variant_id
        ? offers.find(
              (offer) =>
                  offer.auto_apply &&
                  offer.product_id === item.product_id &&
                  offer.variant_id === item.variant_id
          )
        : null;
    if (variantMatch) return variantMatch;

    return (
        offers.find(
            (offer) =>
                offer.auto_apply &&
                offer.product_id === item.product_id &&
                offer.variant_id === null
        ) ?? null
    );
}

export function formatOfferSummary(
    details: SupplierOfferDetails | Record<string, unknown> | null | undefined,
    freeQuantity?: number
): string | null {
    if (!details || typeof details !== "object") return null;

    const offerCode = typeof details.offer_code === "string" ? details.offer_code : null;
    const offerName = typeof details.offer_name === "string" ? details.offer_name : null;
    const buyQty = typeof details.buy_quantity === "number" ? details.buy_quantity : null;
    const getQty = typeof details.get_quantity === "number" ? details.get_quantity : null;
    const qty = typeof freeQuantity === "number" ? freeQuantity : (
        typeof details.calculated_free_qty === "number" ? details.calculated_free_qty : null
    );

    if (!offerCode && !offerName) return null;

    const namePart = [offerCode, offerName].filter(Boolean).join(" - ");
    if (buyQty && getQty && qty && qty > 0) {
        return `${namePart} (Buy ${buyQty} Get ${getQty}, Free: ${qty})`;
    }
    return namePart;
}

// ============================================================================
// PURCHASE ORDER STATUS UTILITIES
// ============================================================================

/**
 * Check if PO can be edited
 */
export function canEditPO(status: PurchaseOrderStatus): boolean {
    return status === "draft";
}

/**
 * Check if PO can be confirmed
 */
export function canConfirmPO(status: PurchaseOrderStatus): boolean {
    return status === "draft";
}

/**
 * Check if PO can receive items
 */
export function canReceiveItems(status: PurchaseOrderStatus): boolean {
    return status === "confirmed" || status === "partially_received";
}

/**
 * Check if PO can be cancelled
 */
export function canCancelPO(status: PurchaseOrderStatus): boolean {
    return status === "draft" || status === "confirmed";
}

/**
 * Check if PO can add payments
 */
export function canAddPayment(order: PurchaseOrder): boolean {
    return (
        order.status !== "cancelled" &&
        order.status !== "draft" &&
        order.payment_status !== "paid" &&
        order.payment_status !== "refunded"
    );
}

/**
 * Check if PO can create returns
 */
export function canCreateReturn(status: PurchaseOrderStatus): boolean {
    return status === "received" || status === "partially_received";
}

/**
 * Check if PO can be deleted (only drafts)
 */
export function canDeletePO(status: PurchaseOrderStatus): boolean {
    return status === "draft";
}

/**
 * Get allowed next statuses from current status
 */
export function getAllowedStatusTransitions(status: PurchaseOrderStatus): PurchaseOrderStatus[] {
    const transitions: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
        draft: ["confirmed", "cancelled"],
        confirmed: ["partially_received", "received", "cancelled"],
        partially_received: ["received", "cancelled"],
        received: ["returned"],
        cancelled: [],
        returned: [],
    };
    return transitions[status] ?? [];
}

// ============================================================================
// SEARCH & FILTER UTILITIES
// ============================================================================

/**
 * Filter purchase orders by search query (client-side)
 * Searches across PO number, invoice number, supplier name, reference number
 */
export function filterPurchaseOrdersBySearch(
    orders: PurchaseOrder[],
    query: string
): PurchaseOrder[] {
    if (!query.trim()) return orders;
    const lowerQuery = query.toLowerCase().trim();
    return orders.filter(
        (o) =>
            o.po_number.toLowerCase().includes(lowerQuery) ||
            o.invoice_number?.toLowerCase().includes(lowerQuery) ||
            o.supplier_name.toLowerCase().includes(lowerQuery) ||
            o.reference_number?.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Sort purchase orders (client-side)
 */
export function sortPurchaseOrders(
    orders: PurchaseOrder[],
    sortBy: string,
    sortOrder: "asc" | "desc"
): PurchaseOrder[] {
    const sorted = [...orders].sort((a, b) => {
        let valueA: string | number | null = null;
        let valueB: string | number | null = null;

        switch (sortBy) {
            case "po_number":
                valueA = a.po_number.toLowerCase();
                valueB = b.po_number.toLowerCase();
                break;
            case "order_date":
                valueA = a.order_date;
                valueB = b.order_date;
                break;
            case "grand_total":
                valueA = a.grand_total;
                valueB = b.grand_total;
                break;
            case "supplier_name":
                valueA = a.supplier_name.toLowerCase();
                valueB = b.supplier_name.toLowerCase();
                break;
            case "status":
                valueA = a.status;
                valueB = b.status;
                break;
            case "payment_status":
                valueA = a.payment_status;
                valueB = b.payment_status;
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
 * Export purchase orders to CSV format
 */
export function exportPurchaseOrdersToCSV(orders: PurchaseOrder[]): string {
    const headers = [
        "PO Number",
        "Invoice Number",
        "Supplier",
        "Order Date",
        "Status",
        "Subtotal",
        "CGST",
        "SGST",
        "IGST",
        "Cess",
        "Total Tax",
        "Shipping",
        "Grand Total",
        "Payment Status",
        "Paid Amount",
        "Due Amount",
        "Created At",
    ];

    const rows = orders.map((o) => [
        o.po_number,
        o.invoice_number ?? "",
        o.supplier_name,
        formatDate(o.order_date),
        getPOStatusLabel(o.status),
        o.subtotal.toFixed(2),
        o.cgst_amount.toFixed(2),
        o.sgst_amount.toFixed(2),
        o.igst_amount.toFixed(2),
        o.cess_amount.toFixed(2),
        o.total_tax.toFixed(2),
        o.shipping_charges.toFixed(2),
        o.grand_total.toFixed(2),
        getPaymentStatusLabel(o.payment_status),
        o.paid_amount.toFixed(2),
        o.due_amount.toFixed(2),
        formatDate(o.created_at),
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
 * Export purchase order items to CSV
 */
export function exportPurchaseOrderItemsToCSV(items: PurchaseOrderItem[]): string {
    const headers = [
        "Product Code",
        "Product Name",
        "HSN Code",
        "Unit",
        "Ordered Qty",
        "Received Qty",
        "Returned Qty",
        "Pending Qty",
        "Unit Price",
        "MRP",
        "Discount %",
        "Line Total",
        "GST %",
        "CGST",
        "SGST",
        "IGST",
        "Cess",
        "Tax Amount",
        "Total Amount",
        "Batch",
        "Expiry",
        "Status",
    ];

    const rows = items.map((i) => [
        i.product_code,
        i.product_name,
        i.hsn_code ?? "",
        i.unit_code ?? "",
        i.ordered_quantity.toString(),
        i.received_quantity.toString(),
        i.returned_quantity.toString(),
        i.pending_quantity.toString(),
        i.unit_price.toFixed(2),
        i.mrp?.toFixed(2) ?? "",
        i.discount_percentage.toFixed(2),
        i.line_total.toFixed(2),
        i.gst_percentage.toFixed(2),
        i.cgst_amount.toFixed(2),
        i.sgst_amount.toFixed(2),
        i.igst_amount.toFixed(2),
        i.cess_amount.toFixed(2),
        i.tax_amount.toFixed(2),
        i.total_amount.toFixed(2),
        i.batch_number ?? "",
        i.expiry_date ? formatDate(i.expiry_date) : "",
        getPOItemStatusLabel(i.item_status),
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
 * Get unique tags from a list of purchase orders
 */
export function getUniqueTags(orders: PurchaseOrder[]): string[] {
    const tagSet = new Set<string>();
    for (const order of orders) {
        if (order.tags) {
            for (const tag of order.tags) {
                tagSet.add(tag);
            }
        }
    }
    return Array.from(tagSet).sort();
}

/**
 * Get unique supplier names from orders
 */
export function getUniqueSuppliers(orders: PurchaseOrder[]): { id: string; name: string }[] {
    const seen = new Map<string, string>();
    for (const order of orders) {
        if (!seen.has(order.supplier_id)) {
            seen.set(order.supplier_id, order.supplier_name);
        }
    }
    return Array.from(seen.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

// ============================================================================
// GST DISPLAY UTILITIES
// ============================================================================

/**
 * Format GST summary for display
 */
export function formatGstSummary(order: PurchaseOrder): string {
    if (order.is_inter_state) {
        return `IGST: ${formatCurrency(order.igst_amount)}`;
    }
    return `CGST: ${formatCurrency(order.cgst_amount)} + SGST: ${formatCurrency(order.sgst_amount)}`;
}

/**
 * Format tax display for an item
 */
export function formatItemTax(item: PurchaseOrderItem): string {
    if (item.igst_amount > 0) {
        return `IGST @${item.igst_percentage}%: ${formatCurrency(item.igst_amount)}`;
    }
    if (item.cgst_amount > 0 || item.sgst_amount > 0) {
        return `CGST @${item.cgst_percentage}% + SGST @${item.sgst_percentage}%`;
    }
    return "No tax";
}

// ============================================================================
// DASHBOARD UTILITIES
// ============================================================================

/**
 * Get empty default stats
 */
export function getEmptyDashboardStats(): PurchaseDashboardStats {
    return {
        total_orders: 0,
        draft_orders: 0,
        confirmed_orders: 0,
        received_orders: 0,
        cancelled_orders: 0,
        total_amount: 0,
        paid_amount: 0,
        unpaid_amount: 0,
        unpaid_orders: 0,
        this_month_total: 0,
        this_month_count: 0,
        overdue_payments: 0,
    };
}

/**
 * Compute purchase stats from orders (client-side)
 */
export function computePurchaseStats(orders: PurchaseOrder[]): PurchaseDashboardStats {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

    const stats = getEmptyDashboardStats();

    for (const order of orders) {
        if (order.status === "cancelled") {
            stats.cancelled_orders++;
            continue;
        }

        stats.total_orders++;
        stats.total_amount += order.grand_total;
        stats.paid_amount += order.paid_amount;

        switch (order.status) {
            case "draft":
                stats.draft_orders++;
                break;
            case "confirmed":
                stats.confirmed_orders++;
                break;
            case "received":
            case "partially_received":
                stats.received_orders++;
                break;
        }

        if (order.payment_status === "unpaid" || order.payment_status === "partially_paid") {
            stats.unpaid_orders++;
            if (order.payment_due_date && order.payment_due_date < now.toISOString().split("T")[0]) {
                stats.overdue_payments++;
            }
        }

        if (order.order_date >= monthStart) {
            stats.this_month_count++;
            stats.this_month_total += order.grand_total;
        }
    }

    stats.unpaid_amount = stats.total_amount - stats.paid_amount;

    return stats;
}

// ============================================================================
// ID GENERATORS
// ============================================================================

/**
 * Generate a unique SKU in the format: SKU-YYMMDD-HHMMSS-RRR
 * Same fixed length (21 chars) every time. Safe to call in rapid succession
 * because of the 3-char random base-36 suffix.
 */
export function generateSKU(): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `SKU-${yy}${mm}${dd}-${hh}${mi}${ss}-${rnd}`;
}

/**
 * Generate a unique Batch Number in the format: BAT-YYMMDD-HHMMSS-RRR
 * Same fixed length (21 chars) every time.
 */
export function generateBatchNumber(): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `BAT-${yy}${mm}${dd}-${hh}${mi}${ss}-${rnd}`;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function roundToTwo(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}
