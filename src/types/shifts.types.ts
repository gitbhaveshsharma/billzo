// ============================================================================
// SHIFTS TYPES - Cash Shifts & Cash Movements management types
// Aligned with: supabase/migrations/7_point-of-sale.sql (tables 31, 40)
// ============================================================================

// ============================================================================
// ENUMS & CONSTANTS (matching DB enums / constraints)
// ============================================================================

/** Cash register shift lifecycle — matches `shift_status` DB enum */
export const SHIFT_STATUSES = ["OPEN", "CLOSED", "SUSPENDED"] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

/** Cash movement types — matches `cash_movements.movement_type` column */
export const CASH_MOVEMENT_TYPES = [
    "CASH_IN",
    "CASH_OUT",
    "SAFE_DROP",
    "PETTY_CASH",
    "OPENING",
    "CLOSING",
] as const;
export type CashMovementType = (typeof CASH_MOVEMENT_TYPES)[number];

// ============================================================================
// CASH SHIFT - matches `cash_shifts` table
// ============================================================================

export interface CashShift {
    id: string;
    store_id: string;

    // Who opened / closed
    opened_by: string;
    closed_by: string | null;

    // Terminal / POS device (multi-terminal stores)
    terminal_id: string | null;
    terminal_name: string | null;

    // Shift Timing
    shift_date: string; // DATE
    opened_at: string;  // TIMESTAMPTZ
    closed_at: string | null;

    // Opening Cash
    opening_cash: number;
    opening_notes: string | null;

    // Closing Reconciliation
    closing_cash_expected: number | null;
    closing_cash_actual: number | null;
    cash_difference: number | null; // GENERATED: actual - expected
    closing_notes: string | null;

    // Sales Summary (snapshot at close)
    total_sales_count: number;
    total_sales_amount: number;
    total_returns_count: number;
    total_returns_amount: number;
    total_discount_given: number;
    total_tax_collected: number;

    // Payment Method Breakdown (snapshot at close)
    cash_sales: number;
    card_sales: number;
    upi_sales: number;
    other_sales: number;

    // Cash Movements
    cash_in: number;
    cash_out: number;
    cash_in_reason: string | null;
    cash_out_reason: string | null;

    // Status
    status: ShiftStatus;

    // System fields
    created_at: string;
    updated_at: string;
}

// ============================================================================
// CASH MOVEMENT - matches `cash_movements` table
// ============================================================================

export interface CashMovement {
    id: string;
    store_id: string;
    shift_id: string;

    // Movement
    movement_type: CashMovementType;
    amount: number;
    reason: string;

    // Authorization (for large amounts)
    authorized_by: string | null;

    // Performed by
    performed_by: string;

    // System fields
    created_at: string;
}

// ============================================================================
// ENRICHED / COMPOSITE TYPES
// ============================================================================

/** Shift with its related cash movements and cashier profile info */
export interface EnrichedCashShift extends CashShift {
    movements: CashMovement[];
    cashier_name: string | null;
    closed_by_name: string | null;
}

/** Today's shift summary — matches `v_today_shift_summary` view */
export interface TodayShiftSummary {
    shift_id: string;
    store_id: string;
    terminal_id: string | null;
    terminal_name: string | null;
    shift_status: ShiftStatus;
    opened_at: string;
    opening_cash: number;
    total_sales_count: number;
    total_sales_amount: number;
    total_discount_given: number;
    total_tax_collected: number;
    cash_sales: number;
    card_sales: number;
    upi_sales: number;
    cashier_name: string | null;
}

/** Close shift RPC response */
export interface CloseShiftResult {
    success: boolean;
    error?: string;
    shift_id?: string;
    closing_cash_expected?: number;
    closing_cash_actual?: number;
    cash_difference?: number;
    cash_sales?: number;
    card_sales?: number;
    upi_sales?: number;
}

// ============================================================================
// SHIFT DASHBOARD STATS
// ============================================================================

export interface ShiftDashboardStats {
    // Today
    today_total_sales: number;
    today_total_revenue: number;
    today_total_returns: number;
    today_total_discounts: number;
    today_total_tax: number;

    // Payment breakdown (today)
    today_cash_sales: number;
    today_card_sales: number;
    today_upi_sales: number;
    today_other_sales: number;

    // Shift counts
    open_shifts_count: number;
    closed_shifts_today: number;

    // Cash movements today
    total_cash_in_today: number;
    total_cash_out_today: number;

    // Average
    average_shift_duration_minutes: number;
    average_sales_per_shift: number;
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

/** Open a new cash shift */
export interface OpenShiftRequest {
    opening_cash: number;
    terminal_id?: string;
    terminal_name?: string;
    opening_notes?: string;
}

/** Close an open cash shift (calls close_shift RPC) */
export interface CloseShiftRequest {
    closing_cash_actual: number;
    closing_notes?: string;
}

/** Suspend a shift (mid-day break, etc.) */
export interface SuspendShiftRequest {
    reason: string;
}

/** Resume a suspended shift */
export interface ResumeShiftRequest {
    notes?: string;
}

/** Record a cash movement (cash-in / cash-out) */
export interface CreateCashMovementRequest {
    movement_type: CashMovementType;
    amount: number;
    reason: string;
    authorized_by?: string;
}

/** Update shift notes */
export interface UpdateShiftNotesRequest {
    opening_notes?: string;
    closing_notes?: string;
}

// ============================================================================
// FILTER & PAGINATION TYPES
// ============================================================================

export interface ShiftFilters {
    search?: string;
    status?: ShiftStatus;
    terminal_id?: string;
    opened_by?: string;
    date_from?: string;
    date_to?: string;
    shift_date?: string;          // Exact date match
    has_discrepancy?: boolean;    // cash_difference != 0
}

export interface ShiftPagination {
    page: number;
    limit: number;
    sort_by: ShiftSortField;
    sort_order: "asc" | "desc";
}

export const SHIFT_SORT_FIELDS = [
    "shift_date",
    "opened_at",
    "closed_at",
    "total_sales_amount",
    "total_sales_count",
    "opening_cash",
    "cash_difference",
    "status",
    "created_at",
] as const;

export type ShiftSortField = (typeof SHIFT_SORT_FIELDS)[number];

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface ShiftListResponse {
    shifts: CashShift[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface CashMovementListResponse {
    movements: CashMovement[];
    total: number;
}
