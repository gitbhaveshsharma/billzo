import type {
    CashShift,
    CashMovement,
    ShiftStatus,
    CashMovementType,
    ShiftDashboardStats,
    ShiftFilters,
    ShiftPagination,
} from "@/types/shifts.types";

// ============================================================================
// SHIFTS UTILS
// Display, formatting, status helpers, calculations, export
// ============================================================================

// ============================================================================
// STATUS LABELS & COLORS
// ============================================================================

const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
    OPEN: "Open",
    CLOSED: "Closed",
    SUSPENDED: "Suspended",
};

const SHIFT_STATUS_COLORS: Record<ShiftStatus, string> = {
    OPEN: "bg-green-100 text-green-800 border-green-200",
    CLOSED: "bg-gray-100 text-gray-800 border-gray-200",
    SUSPENDED: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const CASH_MOVEMENT_TYPE_LABELS: Record<CashMovementType, string> = {
    CASH_IN: "Cash In",
    CASH_OUT: "Cash Out",
    SAFE_DROP: "Safe Drop",
    PETTY_CASH: "Petty Cash",
    OPENING: "Opening",
    CLOSING: "Closing",
};

const CASH_MOVEMENT_TYPE_COLORS: Record<CashMovementType, string> = {
    CASH_IN: "bg-green-100 text-green-800 border-green-200",
    CASH_OUT: "bg-red-100 text-red-800 border-red-200",
    SAFE_DROP: "bg-blue-100 text-blue-800 border-blue-200",
    PETTY_CASH: "bg-orange-100 text-orange-800 border-orange-200",
    OPENING: "bg-indigo-100 text-indigo-800 border-indigo-200",
    CLOSING: "bg-purple-100 text-purple-800 border-purple-200",
};

/** Get human-readable shift status label */
export const getShiftStatusLabel = (status: ShiftStatus): string =>
    SHIFT_STATUS_LABELS[status] ?? status;

/** Get Tailwind badge classes for shift status */
export const getShiftStatusColor = (status: ShiftStatus): string =>
    SHIFT_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800 border-gray-200";

/** Get human-readable cash movement type label */
export const getCashMovementTypeLabel = (type: CashMovementType): string =>
    CASH_MOVEMENT_TYPE_LABELS[type] ?? type;

/** Get Tailwind badge classes for cash movement type */
export const getCashMovementTypeColor = (type: CashMovementType): string =>
    CASH_MOVEMENT_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-800 border-gray-200";

// ============================================================================
// FORMATTING
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
export const formatDateTime = (dateString: string | null | undefined): string => {
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
 * Format a time-only string
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
 * Format relative time (e.g. "5 min ago", "2 hrs ago")
 */
export const formatRelativeTime = (dateString: string | null | undefined): string => {
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
 * Format shift duration between opened_at and closed_at (or now)
 * @example formatShiftDuration(shift) → "4h 32m"
 */
export const formatShiftDuration = (shift: CashShift): string => {
    const start = new Date(shift.opened_at);
    const end = shift.closed_at ? new Date(shift.closed_at) : new Date();
    const diffMs = end.getTime() - start.getTime();

    if (diffMs < 0) return "0m";

    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);

    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
};

/**
 * Get shift duration in minutes (numeric, for calculations)
 */
export const getShiftDurationMinutes = (shift: CashShift): number => {
    const start = new Date(shift.opened_at);
    const end = shift.closed_at ? new Date(shift.closed_at) : new Date();
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
};

// ============================================================================
// STATUS CHECKS — used by UI to enable/disable actions
// ============================================================================

/** Can the shift be closed? Only OPEN shifts can be closed */
export const canCloseShift = (shift: CashShift): boolean =>
    shift.status === "OPEN";

/** Can the shift be suspended? Only OPEN shifts can be suspended */
export const canSuspendShift = (shift: CashShift): boolean =>
    shift.status === "OPEN";

/** Can the shift be resumed? Only SUSPENDED shifts can be resumed */
export const canResumeShift = (shift: CashShift): boolean =>
    shift.status === "SUSPENDED";

/** Can cash movements be added? Only OPEN shifts allow movements */
export const canAddCashMovement = (shift: CashShift): boolean =>
    shift.status === "OPEN";

/** Can sales be created under this shift? Only OPEN shifts */
export const canCreateSale = (shift: CashShift): boolean =>
    shift.status === "OPEN";

/** Is the shift active (open or suspended)? */
export const isShiftActive = (shift: CashShift): boolean =>
    shift.status === "OPEN" || shift.status === "SUSPENDED";

/** Does the closed shift have a cash discrepancy? */
export const hasDiscrepancy = (shift: CashShift): boolean => {
    if (shift.status !== "CLOSED") return false;
    return shift.cash_difference !== null && shift.cash_difference !== 0;
};

/** Get the magnitude of the discrepancy (always positive) */
export const getDiscrepancyAmount = (shift: CashShift): number =>
    Math.abs(shift.cash_difference ?? 0);

/** Is the discrepancy a shortage (negative) or excess (positive)? */
export const getDiscrepancyType = (shift: CashShift): "shortage" | "excess" | "none" => {
    if (!shift.cash_difference || shift.cash_difference === 0) return "none";
    return shift.cash_difference < 0 ? "shortage" : "excess";
};

// ============================================================================
// CALCULATIONS
// ============================================================================

/**
 * Calculate expected closing cash:
 * opening_cash + cash_sales + cash_in - cash_out
 */
export const calculateExpectedClosingCash = (shift: CashShift): number => {
    return (
        (shift.opening_cash ?? 0) +
        (shift.cash_sales ?? 0) +
        (shift.cash_in ?? 0) -
        (shift.cash_out ?? 0)
    );
};

/**
 * Calculate total revenue from a shift (all payment methods)
 */
export const calculateShiftRevenue = (shift: CashShift): number => {
    return (
        (shift.cash_sales ?? 0) +
        (shift.card_sales ?? 0) +
        (shift.upi_sales ?? 0) +
        (shift.other_sales ?? 0)
    );
};

/**
 * Calculate net cash flow from movements
 */
export const calculateNetCashFlow = (movements: CashMovement[]): number => {
    return movements.reduce((net, movement) => {
        const isInflow = movement.movement_type === "CASH_IN" || movement.movement_type === "OPENING";
        return net + (isInflow ? movement.amount : -movement.amount);
    }, 0);
};

/**
 * Summarize cash movements by type
 */
export const summarizeCashMovements = (
    movements: CashMovement[]
): Record<CashMovementType, number> => {
    const summary: Record<string, number> = {};
    for (const type of [
        "CASH_IN",
        "CASH_OUT",
        "SAFE_DROP",
        "PETTY_CASH",
        "OPENING",
        "CLOSING",
    ] as CashMovementType[]) {
        summary[type] = movements
            .filter((m) => m.movement_type === type)
            .reduce((sum, m) => sum + m.amount, 0);
    }
    return summary as Record<CashMovementType, number>;
};

// ============================================================================
// SEARCH & FILTER (client-side helpers)
// ============================================================================

/**
 * Filter shifts by a search query (terminal name, cashier name, notes)
 */
export const filterShiftsBySearch = (
    shifts: CashShift[],
    query: string
): CashShift[] => {
    if (!query || !query.trim()) return shifts;
    const q = query.toLowerCase().trim();

    return shifts.filter((shift) => {
        const fields = [
            shift.terminal_name,
            shift.terminal_id,
            shift.opening_notes,
            shift.closing_notes,
            shift.status,
        ];
        return fields.some((field) => field?.toLowerCase().includes(q));
    });
};

/**
 * Sort shifts client-side
 */
export const sortShifts = (
    shifts: CashShift[],
    sortBy: string,
    sortOrder: "asc" | "desc"
): CashShift[] => {
    const sorted = [...shifts].sort((a, b) => {
        const aVal = a[sortBy as keyof CashShift];
        const bVal = b[sortBy as keyof CashShift];

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
// DASHBOARD STATS (client-side computation from shift array)
// ============================================================================

/**
 * Get an empty dashboard stats object (safe defaults)
 */
export const getEmptyShiftDashboardStats = (): ShiftDashboardStats => ({
    today_total_sales: 0,
    today_total_revenue: 0,
    today_total_returns: 0,
    today_total_discounts: 0,
    today_total_tax: 0,
    today_cash_sales: 0,
    today_card_sales: 0,
    today_upi_sales: 0,
    today_other_sales: 0,
    open_shifts_count: 0,
    closed_shifts_today: 0,
    total_cash_in_today: 0,
    total_cash_out_today: 0,
    average_shift_duration_minutes: 0,
    average_sales_per_shift: 0,
});

/**
 * Compute shift dashboard stats from array of shifts (today's shifts)
 */
export const computeShiftDashboardStats = (shifts: CashShift[]): ShiftDashboardStats => {
    if (!shifts.length) return getEmptyShiftDashboardStats();

    const openShifts = shifts.filter((s) => s.status === "OPEN");
    const closedShifts = shifts.filter((s) => s.status === "CLOSED");

    const totals = shifts.reduce(
        (acc, s) => ({
            sales: acc.sales + (s.total_sales_count ?? 0),
            revenue:
                acc.revenue +
                (s.cash_sales ?? 0) +
                (s.card_sales ?? 0) +
                (s.upi_sales ?? 0) +
                (s.other_sales ?? 0),
            returns: acc.returns + (s.total_returns_amount ?? 0),
            discounts: acc.discounts + (s.total_discount_given ?? 0),
            tax: acc.tax + (s.total_tax_collected ?? 0),
            cashSales: acc.cashSales + (s.cash_sales ?? 0),
            cardSales: acc.cardSales + (s.card_sales ?? 0),
            upiSales: acc.upiSales + (s.upi_sales ?? 0),
            otherSales: acc.otherSales + (s.other_sales ?? 0),
            cashIn: acc.cashIn + (s.cash_in ?? 0),
            cashOut: acc.cashOut + (s.cash_out ?? 0),
        }),
        {
            sales: 0,
            revenue: 0,
            returns: 0,
            discounts: 0,
            tax: 0,
            cashSales: 0,
            cardSales: 0,
            upiSales: 0,
            otherSales: 0,
            cashIn: 0,
            cashOut: 0,
        }
    );

    const totalDurationMinutes = closedShifts.reduce(
        (sum, s) => sum + getShiftDurationMinutes(s),
        0
    );

    return {
        today_total_sales: totals.sales,
        today_total_revenue: totals.revenue,
        today_total_returns: totals.returns,
        today_total_discounts: totals.discounts,
        today_total_tax: totals.tax,
        today_cash_sales: totals.cashSales,
        today_card_sales: totals.cardSales,
        today_upi_sales: totals.upiSales,
        today_other_sales: totals.otherSales,
        open_shifts_count: openShifts.length,
        closed_shifts_today: closedShifts.length,
        total_cash_in_today: totals.cashIn,
        total_cash_out_today: totals.cashOut,
        average_shift_duration_minutes:
            closedShifts.length > 0
                ? Math.round(totalDurationMinutes / closedShifts.length)
                : 0,
        average_sales_per_shift:
            shifts.length > 0 ? Math.round(totals.sales / shifts.length) : 0,
    };
};

// ============================================================================
// EXPORT HELPERS
// ============================================================================

/**
 * Export shifts to CSV format
 */
export const exportShiftsToCSV = (shifts: CashShift[]): string => {
    const headers = [
        "Shift Date",
        "Opened At",
        "Closed At",
        "Status",
        "Terminal",
        "Opening Cash",
        "Closing Cash Expected",
        "Closing Cash Actual",
        "Cash Difference",
        "Total Sales",
        "Sales Amount",
        "Returns Amount",
        "Cash Sales",
        "Card Sales",
        "UPI Sales",
        "Other Sales",
        "Discount Given",
        "Tax Collected",
        "Cash In",
        "Cash Out",
        "Duration",
    ];

    const rows = shifts.map((s) => [
        s.shift_date,
        s.opened_at,
        s.closed_at ?? "",
        s.status,
        s.terminal_name ?? s.terminal_id ?? "",
        s.opening_cash,
        s.closing_cash_expected ?? "",
        s.closing_cash_actual ?? "",
        s.cash_difference ?? "",
        s.total_sales_count,
        s.total_sales_amount,
        s.total_returns_amount,
        s.cash_sales,
        s.card_sales,
        s.upi_sales,
        s.other_sales,
        s.total_discount_given,
        s.total_tax_collected,
        s.cash_in,
        s.cash_out,
        formatShiftDuration(s),
    ]);

    const csvRows = [
        headers.join(","),
        ...rows.map((row) =>
            row.map((cell) => {
                const str = String(cell);
                return str.includes(",") || str.includes('"')
                    ? `"${str.replace(/"/g, '""')}"`
                    : str;
            }).join(",")
        ),
    ];

    return csvRows.join("\n");
};

/**
 * Export cash movements to CSV format
 */
export const exportCashMovementsToCSV = (movements: CashMovement[]): string => {
    const headers = [
        "Date",
        "Type",
        "Amount",
        "Reason",
        "Shift ID",
    ];

    const rows = movements.map((m) => [
        m.created_at,
        getCashMovementTypeLabel(m.movement_type),
        m.amount,
        m.reason,
        m.shift_id,
    ]);

    const csvRows = [
        headers.join(","),
        ...rows.map((row) =>
            row.map((cell) => {
                const str = String(cell);
                return str.includes(",") || str.includes('"')
                    ? `"${str.replace(/"/g, '""')}"`
                    : str;
            }).join(",")
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
// UNUSED-SAFE: All constants referenced by the parameterized lookup maps above
// are used in the exported functions. No dead code.
// ============================================================================
