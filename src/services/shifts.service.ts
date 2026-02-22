import { createClient } from "@/lib/supabase/client";
import type { ServiceResponse } from "@/types/api.types";
import type {
    CashShift,
    CashMovement,
    EnrichedCashShift,
    TodayShiftSummary,
    CloseShiftResult,
    ShiftDashboardStats,
    OpenShiftRequest,
    CloseShiftRequest,
    SuspendShiftRequest,
    CreateCashMovementRequest,
    UpdateShiftNotesRequest,
    ShiftFilters,
    ShiftPagination,
    ShiftListResponse,
    CashMovementListResponse,
} from "@/types/shifts.types";
import { computeShiftDashboardStats } from "@/utils/shifts.utils";

const getClient = () => createClient();

// ============================================================================
// SHIFTS SERVICE
// All CRUD operations for cash shifts & cash movements
// Aligned with: cash_shifts, cash_movements tables + close_shift() RPC
// ============================================================================

export const shiftsService = {
    // ========================================================================
    // CASH SHIFT CRUD
    // ========================================================================

    /**
     * Open a new cash shift.
     * Only one OPEN shift per terminal per store is allowed (DB constraint).
     */
    open: async (
        storeId: string,
        data: OpenShiftRequest
    ): Promise<ServiceResponse<CashShift>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;
            if (!user) return { data: null, error: "Not authenticated" };

            const { data: shift, error } = await getClient()
                .from("cash_shifts")
                .insert({
                    store_id: storeId,
                    opened_by: user.id,
                    opening_cash: data.opening_cash,
                    terminal_id: data.terminal_id ?? null,
                    terminal_name: data.terminal_name ?? null,
                    opening_notes: data.opening_notes ?? null,
                    status: "OPEN",
                } as never)
                .select()
                .single();

            if (error) {
                // Handle unique constraint: only one open shift per terminal
                if (error.code === "23505") {
                    return {
                        data: null,
                        error: "A shift is already open for this terminal. Close it before opening a new one.",
                    };
                }
                return { data: null, error: error.message };
            }

            return { data: shift as unknown as CashShift, error: null };
        } catch {
            return { data: null, error: "Failed to open shift" };
        }
    },

    /**
     * Close an open shift via the close_shift() RPC function.
     * This atomically calculates all totals, payment breakdowns,
     * and expected closing cash.
     */
    close: async (
        storeId: string,
        shiftId: string,
        data: CloseShiftRequest
    ): Promise<ServiceResponse<CloseShiftResult>> => {
        try {
            // Update closing notes first (RPC doesn't accept notes)
            if (data.closing_notes) {
                await getClient()
                    .from("cash_shifts")
                    .update({ closing_notes: data.closing_notes } as never)
                    .eq("id", shiftId)
                    .eq("store_id", storeId);
            }

            // Call the close_shift RPC function
            const { data: result, error } = await getClient()
                .rpc("close_shift", {
                    p_shift_id: shiftId,
                    p_closing_cash_actual: data.closing_cash_actual,
                });

            if (error) return { data: null, error: error.message };

            const rpcResult = result as unknown as CloseShiftResult;
            if (!rpcResult?.success) {
                return {
                    data: null,
                    error: rpcResult?.error ?? "Failed to close shift",
                };
            }

            return { data: rpcResult, error: null };
        } catch {
            return { data: null, error: "Failed to close shift" };
        }
    },

    /**
     * Suspend an open shift (mid-day break, system issue, etc.)
     */
    suspend: async (
        storeId: string,
        shiftId: string,
        data: SuspendShiftRequest
    ): Promise<ServiceResponse<CashShift>> => {
        try {
            const { data: shift, error } = await getClient()
                .from("cash_shifts")
                .update({
                    status: "SUSPENDED",
                    cash_out_reason: data.reason,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", shiftId)
                .eq("store_id", storeId)
                .eq("status", "OPEN")
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: shift as unknown as CashShift, error: null };
        } catch {
            return { data: null, error: "Failed to suspend shift" };
        }
    },

    /**
     * Resume a suspended shift back to OPEN status.
     */
    resume: async (
        storeId: string,
        shiftId: string
    ): Promise<ServiceResponse<CashShift>> => {
        try {
            const { data: shift, error } = await getClient()
                .from("cash_shifts")
                .update({
                    status: "OPEN",
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", shiftId)
                .eq("store_id", storeId)
                .eq("status", "SUSPENDED")
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: shift as unknown as CashShift, error: null };
        } catch {
            return { data: null, error: "Failed to resume shift" };
        }
    },

    /**
     * Get a single shift by ID with its cash movements and cashier info
     */
    getById: async (
        storeId: string,
        shiftId: string
    ): Promise<ServiceResponse<EnrichedCashShift>> => {
        try {
            const { data: shift, error } = await getClient()
                .from("cash_shifts")
                .select(`
                    *,
                    cash_movements (*)
                `)
                .eq("id", shiftId)
                .eq("store_id", storeId)
                .single();

            if (error) return { data: null, error: error.message };
            if (!shift) return { data: null, error: "Shift not found" };

            const rawShift = shift as unknown as CashShift & { cash_movements: CashMovement[] };

            // Fetch profile names separately (opened_by/closed_by reference auth.users,
            // but full_name lives in the profiles table keyed by the same UUID)
            let cashier_name: string | null = null;
            let closed_by_name: string | null = null;

            const userIds = [rawShift.opened_by, rawShift.closed_by].filter(Boolean) as string[];
            if (userIds.length > 0) {
                const { data: profiles } = await getClient()
                    .from("profiles")
                    .select("id, full_name")
                    .in("id", userIds);

                if (profiles) {
                    const profileMap = new Map(profiles.map((p) => [p.id, p.full_name]));
                    cashier_name = profileMap.get(rawShift.opened_by) ?? null;
                    if (rawShift.closed_by) {
                        closed_by_name = profileMap.get(rawShift.closed_by) ?? null;
                    }
                }
            }

            const enriched: EnrichedCashShift = {
                ...rawShift,
                movements: rawShift.cash_movements ?? [],
                cashier_name,
                closed_by_name,
            };

            return { data: enriched, error: null };
        } catch {
            return { data: null, error: "Failed to fetch shift" };
        }
    },

    /**
     * Get paginated, filtered list of shifts
     */
    getList: async (
        storeId: string,
        filters?: ShiftFilters,
        pagination?: ShiftPagination
    ): Promise<ServiceResponse<ShiftListResponse>> => {
        try {
            const page = pagination?.page ?? 1;
            const limit = pagination?.limit ?? 20;
            const sortBy = pagination?.sort_by ?? "opened_at";
            const sortOrder = pagination?.sort_order ?? "desc";
            const offset = (page - 1) * limit;

            let query = getClient()
                .from("cash_shifts")
                .select("*", { count: "exact" })
                .eq("store_id", storeId);

            // Apply filters
            if (filters) {
                if (filters.status) {
                    query = query.eq("status", filters.status);
                }
                if (filters.terminal_id) {
                    query = query.eq("terminal_id", filters.terminal_id);
                }
                if (filters.opened_by) {
                    query = query.eq("opened_by", filters.opened_by);
                }
                if (filters.shift_date) {
                    query = query.eq("shift_date", filters.shift_date);
                }
                if (filters.date_from) {
                    query = query.gte("shift_date", filters.date_from);
                }
                if (filters.date_to) {
                    query = query.lte("shift_date", filters.date_to);
                }
                if (filters.has_discrepancy === true) {
                    query = query.neq("cash_difference", 0);
                } else if (filters.has_discrepancy === false) {
                    query = query.eq("cash_difference", 0);
                }
                if (filters.search) {
                    query = query.or(
                        `terminal_name.ilike.%${filters.search}%,` +
                        `terminal_id.ilike.%${filters.search}%,` +
                        `opening_notes.ilike.%${filters.search}%,` +
                        `closing_notes.ilike.%${filters.search}%`
                    );
                }
            }

            // Apply sorting and pagination
            query = query
                .order(sortBy, { ascending: sortOrder === "asc" })
                .range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) return { data: null, error: error.message };

            const total = count ?? 0;
            const totalPages = Math.ceil(total / limit);

            return {
                data: {
                    shifts: (data ?? []) as unknown as CashShift[],
                    total,
                    page,
                    limit,
                    total_pages: totalPages,
                },
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to fetch shifts" };
        }
    },

    /**
     * Get the currently open shift for the current user (or a specific terminal)
     */
    getOpenShift: async (
        storeId: string,
        terminalId?: string
    ): Promise<ServiceResponse<CashShift | null>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;
            if (!user) return { data: null, error: "Not authenticated" };

            let query = getClient()
                .from("cash_shifts")
                .select("*")
                .eq("store_id", storeId)
                .eq("opened_by", user.id)
                .in("status", ["OPEN", "SUSPENDED"])
                .order("opened_at", { ascending: false })
                .limit(1);

            if (terminalId) {
                query = query.eq("terminal_id", terminalId);
            }

            const { data, error } = await query;

            if (error) return { data: null, error: error.message };
            if (!data || data.length === 0) return { data: null, error: null };

            return { data: data[0] as unknown as CashShift, error: null };
        } catch {
            return { data: null, error: "Failed to fetch open shift" };
        }
    },

    /**
     * Get all open shifts for a store (for manager dashboard)
     */
    getAllOpenShifts: async (
        storeId: string
    ): Promise<ServiceResponse<CashShift[]>> => {
        try {
            const { data, error } = await getClient()
                .from("cash_shifts")
                .select("*")
                .eq("store_id", storeId)
                .in("status", ["OPEN", "SUSPENDED"])
                .order("opened_at", { ascending: false });

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as CashShift[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch open shifts" };
        }
    },

    /**
     * Get today's shift summary (uses the v_today_shift_summary view)
     */
    getTodaySummary: async (
        storeId: string
    ): Promise<ServiceResponse<TodayShiftSummary[]>> => {
        try {
            const { data, error } = await getClient()
                .from("v_today_shift_summary")
                .select("*")
                .eq("store_id", storeId);

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as TodayShiftSummary[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch today's shift summary" };
        }
    },

    /**
     * Update shift notes (opening or closing notes)
     */
    updateNotes: async (
        storeId: string,
        shiftId: string,
        data: UpdateShiftNotesRequest
    ): Promise<ServiceResponse<CashShift>> => {
        try {
            const updatePayload: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
            };

            if (data.opening_notes !== undefined) {
                updatePayload.opening_notes = data.opening_notes;
            }
            if (data.closing_notes !== undefined) {
                updatePayload.closing_notes = data.closing_notes;
            }

            const { data: shift, error } = await getClient()
                .from("cash_shifts")
                .update(updatePayload as never)
                .eq("id", shiftId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: shift as unknown as CashShift, error: null };
        } catch {
            return { data: null, error: "Failed to update shift notes" };
        }
    },

    /**
     * Get recent shifts (last N closed shifts for quick history)
     */
    getRecent: async (
        storeId: string,
        limit: number = 10
    ): Promise<ServiceResponse<CashShift[]>> => {
        try {
            const { data, error } = await getClient()
                .from("cash_shifts")
                .select("*")
                .eq("store_id", storeId)
                .eq("status", "CLOSED")
                .order("closed_at", { ascending: false })
                .limit(limit);

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as CashShift[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch recent shifts" };
        }
    },

    /**
     * Get shifts with cash discrepancies (for manager review)
     */
    getDiscrepancies: async (
        storeId: string,
        limit: number = 20
    ): Promise<ServiceResponse<CashShift[]>> => {
        try {
            const { data, error } = await getClient()
                .from("cash_shifts")
                .select("*")
                .eq("store_id", storeId)
                .eq("status", "CLOSED")
                .neq("cash_difference", 0)
                .order("closed_at", { ascending: false })
                .limit(limit);

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as CashShift[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch shift discrepancies" };
        }
    },

    /**
     * Compute dashboard stats from today's shifts (client-side aggregation)
     */
    getDashboardStats: async (
        storeId: string
    ): Promise<ServiceResponse<ShiftDashboardStats>> => {
        try {
            const today = new Date().toISOString().split("T")[0];

            const { data, error } = await getClient()
                .from("cash_shifts")
                .select("*")
                .eq("store_id", storeId)
                .eq("shift_date", today);

            if (error) return { data: null, error: error.message };

            const shifts = (data ?? []) as unknown as CashShift[];
            const stats = computeShiftDashboardStats(shifts);

            return { data: stats, error: null };
        } catch {
            return { data: null, error: "Failed to compute dashboard stats" };
        }
    },

    // ========================================================================
    // CASH MOVEMENTS
    // ========================================================================

    /**
     * Record a cash movement (cash-in, cash-out, safe drop, petty cash)
     */
    addCashMovement: async (
        storeId: string,
        shiftId: string,
        data: CreateCashMovementRequest
    ): Promise<ServiceResponse<CashMovement>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;
            if (!user) return { data: null, error: "Not authenticated" };

            // Verify shift is OPEN before adding movement
            const { data: shiftCheck, error: shiftError } = await getClient()
                .from("cash_shifts")
                .select("id, status")
                .eq("id", shiftId)
                .eq("store_id", storeId)
                .single();

            if (shiftError || !shiftCheck) {
                return { data: null, error: "Shift not found" };
            }

            if ((shiftCheck as Record<string, unknown>).status !== "OPEN") {
                return { data: null, error: "Cash movements can only be added to open shifts" };
            }

            // Insert the movement
            const { data: movement, error } = await getClient()
                .from("cash_movements")
                .insert({
                    store_id: storeId,
                    shift_id: shiftId,
                    movement_type: data.movement_type,
                    amount: data.amount,
                    reason: data.reason,
                    authorized_by: data.authorized_by ?? null,
                    performed_by: user.id,
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };

            // Update the shift's cash_in / cash_out aggregates
            const isInflow =
                data.movement_type === "CASH_IN" || data.movement_type === "OPENING";
            const updateField = isInflow ? "cash_in" : "cash_out";

            // Fetch current value to increment
            const { data: currentShift } = await getClient()
                .from("cash_shifts")
                .select(updateField)
                .eq("id", shiftId)
                .single();

            const currentValue =
                ((currentShift as Record<string, unknown>)?.[updateField] as number) ?? 0;

            await getClient()
                .from("cash_shifts")
                .update({
                    [updateField]: currentValue + data.amount,
                    [`${updateField}_reason`]: data.reason,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", shiftId);

            return { data: movement as unknown as CashMovement, error: null };
        } catch {
            return { data: null, error: "Failed to add cash movement" };
        }
    },

    /**
     * Get all cash movements for a shift
     */
    getMovements: async (
        shiftId: string
    ): Promise<ServiceResponse<CashMovement[]>> => {
        try {
            const { data, error } = await getClient()
                .from("cash_movements")
                .select("*")
                .eq("shift_id", shiftId)
                .order("created_at", { ascending: true });

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as CashMovement[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch cash movements" };
        }
    },

    /**
     * Get all cash movements for a store (with optional date filtering)
     */
    getStoreMovements: async (
        storeId: string,
        dateFrom?: string,
        dateTo?: string
    ): Promise<ServiceResponse<CashMovementListResponse>> => {
        try {
            let query = getClient()
                .from("cash_movements")
                .select("*", { count: "exact" })
                .eq("store_id", storeId)
                .order("created_at", { ascending: false });

            if (dateFrom) {
                query = query.gte("created_at", dateFrom);
            }
            if (dateTo) {
                query = query.lte("created_at", dateTo);
            }

            const { data, error, count } = await query;

            if (error) return { data: null, error: error.message };

            return {
                data: {
                    movements: (data ?? []) as unknown as CashMovement[],
                    total: count ?? 0,
                },
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to fetch cash movements" };
        }
    },

    /**
     * Delete a cash movement (only from OPEN shifts, for corrections)
     */
    deleteCashMovement: async (
        storeId: string,
        movementId: string,
        shiftId: string
    ): Promise<ServiceResponse<null>> => {
        try {
            // Verify shift is still open
            const { data: shiftCheck } = await getClient()
                .from("cash_shifts")
                .select("id, status")
                .eq("id", shiftId)
                .eq("store_id", storeId)
                .single();

            if (!shiftCheck || (shiftCheck as Record<string, unknown>).status !== "OPEN") {
                return { data: null, error: "Can only delete movements from open shifts" };
            }

            // Get the movement details before deleting (to adjust shift totals)
            const { data: movement } = await getClient()
                .from("cash_movements")
                .select("*")
                .eq("id", movementId)
                .eq("shift_id", shiftId)
                .single();

            if (!movement) {
                return { data: null, error: "Cash movement not found" };
            }

            const mov = movement as unknown as CashMovement;

            // Delete the movement
            const { error } = await getClient()
                .from("cash_movements")
                .delete()
                .eq("id", movementId)
                .eq("store_id", storeId);

            if (error) return { data: null, error: error.message };

            // Adjust the shift's cash_in / cash_out
            const isInflow =
                mov.movement_type === "CASH_IN" || mov.movement_type === "OPENING";
            const updateField = isInflow ? "cash_in" : "cash_out";

            const { data: currentShift } = await getClient()
                .from("cash_shifts")
                .select(updateField)
                .eq("id", shiftId)
                .single();

            const currentValue =
                ((currentShift as Record<string, unknown>)?.[updateField] as number) ?? 0;

            await getClient()
                .from("cash_shifts")
                .update({
                    [updateField]: Math.max(0, currentValue - mov.amount),
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", shiftId);

            return { data: null, error: null };
        } catch {
            return { data: null, error: "Failed to delete cash movement" };
        }
    },

    // ========================================================================
    // UTILITY QUERIES
    // ========================================================================

    /**
     * Check if there is an open shift for a specific terminal
     */
    hasOpenShift: async (
        storeId: string,
        terminalId?: string
    ): Promise<ServiceResponse<boolean>> => {
        try {
            let query = getClient()
                .from("cash_shifts")
                .select("id", { count: "exact", head: true })
                .eq("store_id", storeId)
                .eq("status", "OPEN");

            if (terminalId) {
                query = query.eq("terminal_id", terminalId);
            }

            const { count, error } = await query;

            if (error) return { data: null, error: error.message };
            return { data: (count ?? 0) > 0, error: null };
        } catch {
            return { data: null, error: "Failed to check open shift" };
        }
    },

    /**
     * Get shifts by date range (for reporting)
     */
    getByDateRange: async (
        storeId: string,
        dateFrom: string,
        dateTo: string
    ): Promise<ServiceResponse<CashShift[]>> => {
        try {
            const { data, error } = await getClient()
                .from("cash_shifts")
                .select("*")
                .eq("store_id", storeId)
                .gte("shift_date", dateFrom)
                .lte("shift_date", dateTo)
                .order("shift_date", { ascending: false })
                .order("opened_at", { ascending: false });

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as CashShift[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch shifts by date range" };
        }
    },

    /**
     * Get shift count for today (quick check)
     */
    getTodayShiftCount: async (
        storeId: string
    ): Promise<ServiceResponse<number>> => {
        try {
            const today = new Date().toISOString().split("T")[0];

            const { count, error } = await getClient()
                .from("cash_shifts")
                .select("id", { count: "exact", head: true })
                .eq("store_id", storeId)
                .eq("shift_date", today);

            if (error) return { data: null, error: error.message };
            return { data: count ?? 0, error: null };
        } catch {
            return { data: null, error: "Failed to get shift count" };
        }
    },
};
