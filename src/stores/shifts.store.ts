import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { shiftsService } from "@/services/shifts.service";
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
} from "@/types/shifts.types";

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface ShiftsState {
    // Data
    shifts: CashShift[];
    currentShift: EnrichedCashShift | null;
    activeShift: CashShift | null; // Current user's open/suspended shift
    openShifts: CashShift[];       // All open shifts in the store (manager view)
    todaySummary: TodayShiftSummary[];
    dashboardStats: ShiftDashboardStats | null;
    recentShifts: CashShift[];
    discrepancyShifts: CashShift[];

    // Pagination & Filters
    filters: ShiftFilters;
    pagination: ShiftPagination;
    totalShifts: number;
    totalPages: number;

    // UI State
    isLoading: boolean;
    isRefreshing: boolean;
    isSaving: boolean;
    error: string | null;
    selectedShiftIds: string[];

    // Cache
    lastFetch: number | null;
    cacheTimeout: number; // 5 minutes
    movementsCache: Map<string, { data: CashMovement[]; fetchedAt: number }>;

    // ====================================================================
    // Actions — Fetching
    // ====================================================================
    fetchShifts: (storeId: string, forceRefresh?: boolean) => Promise<void>;
    fetchShiftById: (storeId: string, shiftId: string) => Promise<void>;
    fetchActiveShift: (storeId: string, terminalId?: string) => Promise<void>;
    fetchOpenShifts: (storeId: string) => Promise<void>;
    fetchTodaySummary: (storeId: string) => Promise<void>;
    fetchDashboardStats: (storeId: string) => Promise<void>;
    fetchRecentShifts: (storeId: string) => Promise<void>;
    fetchDiscrepancies: (storeId: string) => Promise<void>;

    // ====================================================================
    // Actions — Shift Lifecycle
    // ====================================================================
    openShift: (storeId: string, data: OpenShiftRequest) => Promise<CashShift | null>;
    closeShift: (storeId: string, shiftId: string, data: CloseShiftRequest) => Promise<CloseShiftResult | null>;
    suspendShift: (storeId: string, shiftId: string, data: SuspendShiftRequest) => Promise<boolean>;
    resumeShift: (storeId: string, shiftId: string) => Promise<boolean>;
    updateShiftNotes: (storeId: string, shiftId: string, data: UpdateShiftNotesRequest) => Promise<boolean>;

    // ====================================================================
    // Actions — Cash Movements
    // ====================================================================
    fetchMovements: (shiftId: string, forceRefresh?: boolean) => Promise<CashMovement[]>;
    addCashMovement: (storeId: string, shiftId: string, data: CreateCashMovementRequest) => Promise<CashMovement | null>;
    deleteCashMovement: (storeId: string, movementId: string, shiftId: string) => Promise<boolean>;

    // ====================================================================
    // Actions — UI State
    // ====================================================================
    setFilters: (filters: Partial<ShiftFilters>) => void;
    setPagination: (pagination: Partial<ShiftPagination>) => void;
    setSelectedShiftIds: (ids: string[]) => void;
    toggleShiftSelection: (shiftId: string) => void;
    clearSelection: () => void;
    setError: (error: string | null) => void;

    // ====================================================================
    // Actions — Cache
    // ====================================================================
    invalidateCache: () => void;
    clearMovementsCache: (shiftId?: string) => void;

    // ====================================================================
    // Actions — Reset
    // ====================================================================
    reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
    shifts: [] as CashShift[],
    currentShift: null as EnrichedCashShift | null,
    activeShift: null as CashShift | null,
    openShifts: [] as CashShift[],
    todaySummary: [] as TodayShiftSummary[],
    dashboardStats: null as ShiftDashboardStats | null,
    recentShifts: [] as CashShift[],
    discrepancyShifts: [] as CashShift[],
    filters: {} as ShiftFilters,
    pagination: {
        page: 1,
        limit: 20,
        sort_by: "opened_at" as const,
        sort_order: "desc" as const,
    } as ShiftPagination,
    totalShifts: 0,
    totalPages: 0,
    isLoading: false,
    isRefreshing: false,
    isSaving: false,
    error: null as string | null,
    selectedShiftIds: [] as string[],
    lastFetch: null as number | null,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    movementsCache: new Map() as Map<string, { data: CashMovement[]; fetchedAt: number }>,
};

// ============================================================================
// ZUSTAND STORE
// ============================================================================

export const useShiftsStore = create<ShiftsState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // ================================================================
            // FETCHING ACTIONS
            // ================================================================

            fetchShifts: async (storeId: string, forceRefresh = false) => {
                const state = get();

                // Check cache
                if (!forceRefresh && state.lastFetch) {
                    const elapsed = Date.now() - state.lastFetch;
                    if (elapsed < state.cacheTimeout) return;
                }

                set({
                    isLoading: !state.shifts.length,
                    isRefreshing: !!state.shifts.length,
                });

                try {
                    const result = await shiftsService.getList(
                        storeId,
                        state.filters,
                        state.pagination
                    );

                    if (result.error) {
                        set({ error: result.error, isLoading: false, isRefreshing: false });
                        return;
                    }

                    if (result.data) {
                        set({
                            shifts: result.data.shifts,
                            totalShifts: result.data.total,
                            totalPages: result.data.total_pages,
                            lastFetch: Date.now(),
                            error: null,
                            isLoading: false,
                            isRefreshing: false,
                        });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch shifts",
                        isLoading: false,
                        isRefreshing: false,
                    });
                }
            },

            fetchShiftById: async (storeId: string, shiftId: string) => {
                set({ isLoading: true });

                try {
                    const result = await shiftsService.getById(storeId, shiftId);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return;
                    }

                    if (result.data) {
                        set({ currentShift: result.data, error: null, isLoading: false });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch shift",
                        isLoading: false,
                    });
                }
            },

            fetchActiveShift: async (storeId: string, terminalId?: string) => {
                try {
                    const result = await shiftsService.getOpenShift(storeId, terminalId);

                    if (result.error) {
                        set({ error: result.error });
                        return;
                    }

                    set({ activeShift: result.data ?? null, error: null });
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch active shift",
                    });
                }
            },

            fetchOpenShifts: async (storeId: string) => {
                try {
                    const result = await shiftsService.getAllOpenShifts(storeId);
                    if (result.data) {
                        set({ openShifts: result.data, error: null });
                    }
                } catch {
                    // Silent fail for open shifts
                }
            },

            fetchTodaySummary: async (storeId: string) => {
                try {
                    const result = await shiftsService.getTodaySummary(storeId);
                    if (result.data) {
                        set({ todaySummary: result.data, error: null });
                    }
                } catch {
                    // Silent fail
                }
            },

            fetchDashboardStats: async (storeId: string) => {
                try {
                    const result = await shiftsService.getDashboardStats(storeId);

                    if (result.error) {
                        set({ error: result.error });
                        return;
                    }

                    if (result.data) {
                        set({ dashboardStats: result.data, error: null });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch dashboard stats",
                    });
                }
            },

            fetchRecentShifts: async (storeId: string) => {
                try {
                    const result = await shiftsService.getRecent(storeId);
                    if (result.data) {
                        set({ recentShifts: result.data });
                    }
                } catch {
                    // Silent fail
                }
            },

            fetchDiscrepancies: async (storeId: string) => {
                try {
                    const result = await shiftsService.getDiscrepancies(storeId);
                    if (result.data) {
                        set({ discrepancyShifts: result.data });
                    }
                } catch {
                    // Silent fail
                }
            },

            // ================================================================
            // SHIFT LIFECYCLE ACTIONS
            // ================================================================

            openShift: async (storeId: string, data: OpenShiftRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await shiftsService.open(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Immediately set as active shift and add to lists
                        set((state) => ({
                            activeShift: result.data!,
                            shifts: [result.data!, ...state.shifts],
                            openShifts: [result.data!, ...state.openShifts],
                            totalShifts: state.totalShifts + 1,
                            error: null,
                            isSaving: false,
                        }));

                        get().invalidateCache();
                        return result.data;
                    }

                    set({ isSaving: false });
                    return null;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to open shift",
                        isSaving: false,
                    });
                    return null;
                }
            },

            closeShift: async (storeId: string, shiftId: string, data: CloseShiftRequest) => {
                set({ isSaving: true, error: null });

                const previousShifts = get().shifts;
                const previousActiveShift = get().activeShift;
                const previousOpenShifts = get().openShifts;
                const previousCurrent = get().currentShift;

                // Optimistic: mark shift as CLOSED in UI immediately
                set((state) => ({
                    shifts: state.shifts.map((s) =>
                        s.id === shiftId
                            ? { ...s, status: "CLOSED" as const, closing_cash_actual: data.closing_cash_actual }
                            : s
                    ),
                    activeShift:
                        state.activeShift?.id === shiftId ? null : state.activeShift,
                    openShifts: state.openShifts.filter((s) => s.id !== shiftId),
                    currentShift:
                        state.currentShift?.id === shiftId
                            ? { ...state.currentShift, status: "CLOSED" as const, closing_cash_actual: data.closing_cash_actual }
                            : state.currentShift,
                }));

                try {
                    const result = await shiftsService.close(storeId, shiftId, data);

                    if (result.error) {
                        // Revert optimistic update
                        set({
                            shifts: previousShifts,
                            activeShift: previousActiveShift,
                            openShifts: previousOpenShifts,
                            currentShift: previousCurrent,
                            error: result.error,
                            isSaving: false,
                        });
                        return null;
                    }

                    if (result.data) {
                        // Refresh the shift data from server to get accurate totals
                        const refreshRes = await shiftsService.getById(storeId, shiftId);
                        if (refreshRes.data) {
                            set((state) => ({
                                shifts: state.shifts.map((s) =>
                                    s.id === shiftId ? refreshRes.data! : s
                                ),
                                currentShift:
                                    state.currentShift?.id === shiftId
                                        ? refreshRes.data!
                                        : state.currentShift,
                            }));
                        }

                        set({ error: null, isSaving: false });
                        get().invalidateCache();
                        return result.data;
                    }

                    set({ isSaving: false });
                    return null;
                } catch (err) {
                    set({
                        shifts: previousShifts,
                        activeShift: previousActiveShift,
                        openShifts: previousOpenShifts,
                        currentShift: previousCurrent,
                        error: err instanceof Error ? err.message : "Failed to close shift",
                        isSaving: false,
                    });
                    return null;
                }
            },

            suspendShift: async (storeId: string, shiftId: string, data: SuspendShiftRequest) => {
                set({ isSaving: true, error: null });

                const previousShifts = get().shifts;
                const previousActiveShift = get().activeShift;
                const previousCurrent = get().currentShift;

                // Optimistic: mark as SUSPENDED
                set((state) => ({
                    shifts: state.shifts.map((s) =>
                        s.id === shiftId ? { ...s, status: "SUSPENDED" as const } : s
                    ),
                    activeShift:
                        state.activeShift?.id === shiftId
                            ? { ...state.activeShift, status: "SUSPENDED" as const }
                            : state.activeShift,
                    currentShift:
                        state.currentShift?.id === shiftId
                            ? { ...state.currentShift, status: "SUSPENDED" as const }
                            : state.currentShift,
                }));

                try {
                    const result = await shiftsService.suspend(storeId, shiftId, data);

                    if (result.error) {
                        set({
                            shifts: previousShifts,
                            activeShift: previousActiveShift,
                            currentShift: previousCurrent,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            shifts: state.shifts.map((s) =>
                                s.id === shiftId ? result.data! : s
                            ),
                            activeShift:
                                state.activeShift?.id === shiftId
                                    ? result.data!
                                    : state.activeShift,
                            currentShift:
                                state.currentShift?.id === shiftId
                                    ? { ...state.currentShift, ...result.data! }
                                    : state.currentShift,
                            error: null,
                            isSaving: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    set({
                        shifts: previousShifts,
                        activeShift: previousActiveShift,
                        currentShift: previousCurrent,
                        error: err instanceof Error ? err.message : "Failed to suspend shift",
                        isSaving: false,
                    });
                    return false;
                }
            },

            resumeShift: async (storeId: string, shiftId: string) => {
                set({ isSaving: true, error: null });

                const previousShifts = get().shifts;
                const previousActiveShift = get().activeShift;
                const previousCurrent = get().currentShift;

                // Optimistic: mark as OPEN
                set((state) => ({
                    shifts: state.shifts.map((s) =>
                        s.id === shiftId ? { ...s, status: "OPEN" as const } : s
                    ),
                    activeShift:
                        state.activeShift?.id === shiftId
                            ? { ...state.activeShift, status: "OPEN" as const }
                            : state.activeShift,
                    currentShift:
                        state.currentShift?.id === shiftId
                            ? { ...state.currentShift, status: "OPEN" as const }
                            : state.currentShift,
                }));

                try {
                    const result = await shiftsService.resume(storeId, shiftId);

                    if (result.error) {
                        set({
                            shifts: previousShifts,
                            activeShift: previousActiveShift,
                            currentShift: previousCurrent,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            shifts: state.shifts.map((s) =>
                                s.id === shiftId ? result.data! : s
                            ),
                            activeShift:
                                state.activeShift?.id === shiftId
                                    ? result.data!
                                    : state.activeShift,
                            currentShift:
                                state.currentShift?.id === shiftId
                                    ? { ...state.currentShift, ...result.data! }
                                    : state.currentShift,
                            error: null,
                            isSaving: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    set({
                        shifts: previousShifts,
                        activeShift: previousActiveShift,
                        currentShift: previousCurrent,
                        error: err instanceof Error ? err.message : "Failed to resume shift",
                        isSaving: false,
                    });
                    return false;
                }
            },

            updateShiftNotes: async (
                storeId: string,
                shiftId: string,
                data: UpdateShiftNotesRequest
            ) => {
                set({ isSaving: true, error: null });

                const previousShifts = get().shifts;
                const previousCurrent = get().currentShift;

                // Optimistic update
                set((state) => ({
                    shifts: state.shifts.map((s) =>
                        s.id === shiftId ? { ...s, ...data } : s
                    ),
                    currentShift:
                        state.currentShift?.id === shiftId
                            ? { ...state.currentShift, ...data }
                            : state.currentShift,
                }));

                try {
                    const result = await shiftsService.updateNotes(storeId, shiftId, data);

                    if (result.error) {
                        set({
                            shifts: previousShifts,
                            currentShift: previousCurrent,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            shifts: state.shifts.map((s) =>
                                s.id === shiftId ? result.data! : s
                            ),
                            currentShift:
                                state.currentShift?.id === shiftId
                                    ? { ...state.currentShift, ...result.data! }
                                    : state.currentShift,
                            error: null,
                            isSaving: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    set({
                        shifts: previousShifts,
                        currentShift: previousCurrent,
                        error: err instanceof Error ? err.message : "Failed to update shift notes",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // CASH MOVEMENT ACTIONS
            // ================================================================

            fetchMovements: async (shiftId: string, forceRefresh = false) => {
                const state = get();
                const cached = state.movementsCache.get(shiftId);

                if (!forceRefresh && cached) {
                    const elapsed = Date.now() - cached.fetchedAt;
                    if (elapsed < state.cacheTimeout) return cached.data;
                }

                try {
                    const result = await shiftsService.getMovements(shiftId);

                    if (result.error) {
                        set({ error: result.error });
                        return [];
                    }

                    const movements = result.data ?? [];
                    const newCache = new Map(state.movementsCache);
                    newCache.set(shiftId, { data: movements, fetchedAt: Date.now() });
                    set({ movementsCache: newCache });

                    // Update currentShift movements if matching
                    if (state.currentShift?.id === shiftId) {
                        set((s) => ({
                            currentShift: s.currentShift
                                ? { ...s.currentShift, movements }
                                : null,
                        }));
                    }

                    return movements;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch movements",
                    });
                    return [];
                }
            },

            addCashMovement: async (
                storeId: string,
                shiftId: string,
                data: CreateCashMovementRequest
            ) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await shiftsService.addCashMovement(storeId, shiftId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Update movements cache
                        const state = get();
                        const cached = state.movementsCache.get(shiftId);
                        if (cached) {
                            const updatedMovements = [...cached.data, result.data];
                            const newCache = new Map(state.movementsCache);
                            newCache.set(shiftId, { data: updatedMovements, fetchedAt: Date.now() });
                            set({ movementsCache: newCache });
                        }

                        // Update current shift movements if matching
                        if (state.currentShift?.id === shiftId) {
                            set((s) => ({
                                currentShift: s.currentShift
                                    ? {
                                        ...s.currentShift,
                                        movements: [...s.currentShift.movements, result.data!],
                                    }
                                    : null,
                            }));
                        }

                        // Update shift's cash_in/cash_out in the list optimistically
                        const isInflow =
                            data.movement_type === "CASH_IN" || data.movement_type === "OPENING";
                        const updateField = isInflow ? "cash_in" : "cash_out";

                        set((state) => ({
                            shifts: state.shifts.map((s) =>
                                s.id === shiftId
                                    ? { ...s, [updateField]: (s[updateField] ?? 0) + data.amount }
                                    : s
                            ),
                            activeShift:
                                state.activeShift?.id === shiftId
                                    ? {
                                        ...state.activeShift,
                                        [updateField]: ((state.activeShift[updateField] as number) ?? 0) + data.amount,
                                    }
                                    : state.activeShift,
                            error: null,
                            isSaving: false,
                        }));

                        return result.data;
                    }

                    set({ isSaving: false });
                    return null;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to add cash movement",
                        isSaving: false,
                    });
                    return null;
                }
            },

            deleteCashMovement: async (
                storeId: string,
                movementId: string,
                shiftId: string
            ) => {
                set({ isSaving: true, error: null });

                // Snapshot for rollback
                const previousMovementsCache = new Map(get().movementsCache);
                const previousShifts = get().shifts;
                const previousActiveShift = get().activeShift;
                const previousCurrent = get().currentShift;

                // Find the movement to be deleted (for optimistic cash adjustment)
                const cached = get().movementsCache.get(shiftId);
                const deletedMovement = cached?.data.find((m) => m.id === movementId);

                // Optimistic removal from cache
                if (cached) {
                    const updatedMovements = cached.data.filter((m) => m.id !== movementId);
                    const newCache = new Map(get().movementsCache);
                    newCache.set(shiftId, { data: updatedMovements, fetchedAt: Date.now() });
                    set({ movementsCache: newCache });
                }

                // Optimistic: adjust shift cash totals & remove from currentShift movements
                if (deletedMovement) {
                    const isInflow =
                        deletedMovement.movement_type === "CASH_IN" ||
                        deletedMovement.movement_type === "OPENING";
                    const updateField = isInflow ? "cash_in" : "cash_out";

                    set((state) => ({
                        shifts: state.shifts.map((s) =>
                            s.id === shiftId
                                ? { ...s, [updateField]: Math.max(0, (s[updateField] ?? 0) - deletedMovement.amount) }
                                : s
                        ),
                        activeShift:
                            state.activeShift?.id === shiftId
                                ? {
                                    ...state.activeShift,
                                    [updateField]: Math.max(
                                        0,
                                        ((state.activeShift[updateField] as number) ?? 0) - deletedMovement.amount
                                    ),
                                }
                                : state.activeShift,
                        currentShift:
                            state.currentShift?.id === shiftId
                                ? {
                                    ...state.currentShift,
                                    movements: state.currentShift.movements.filter(
                                        (m) => m.id !== movementId
                                    ),
                                }
                                : state.currentShift,
                    }));
                }

                try {
                    const result = await shiftsService.deleteCashMovement(
                        storeId,
                        movementId,
                        shiftId
                    );

                    if (result.error) {
                        // Revert all optimistic changes
                        set({
                            movementsCache: previousMovementsCache,
                            shifts: previousShifts,
                            activeShift: previousActiveShift,
                            currentShift: previousCurrent,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        movementsCache: previousMovementsCache,
                        shifts: previousShifts,
                        activeShift: previousActiveShift,
                        currentShift: previousCurrent,
                        error: err instanceof Error ? err.message : "Failed to delete cash movement",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // UI STATE ACTIONS
            // ================================================================

            setFilters: (filters: Partial<ShiftFilters>) => {
                set((state) => ({
                    filters: { ...state.filters, ...filters },
                    pagination: { ...state.pagination, page: 1 }, // Reset to page 1
                    lastFetch: null, // Invalidate cache
                }));
            },

            setPagination: (pagination: Partial<ShiftPagination>) => {
                set((state) => ({
                    pagination: { ...state.pagination, ...pagination },
                    lastFetch: null, // Invalidate cache
                }));
            },

            setSelectedShiftIds: (ids: string[]) => {
                set({ selectedShiftIds: ids });
            },

            toggleShiftSelection: (shiftId: string) => {
                set((state) => ({
                    selectedShiftIds: state.selectedShiftIds.includes(shiftId)
                        ? state.selectedShiftIds.filter((id) => id !== shiftId)
                        : [...state.selectedShiftIds, shiftId],
                }));
            },

            clearSelection: () => {
                set({ selectedShiftIds: [] });
            },

            setError: (error: string | null) => {
                set({ error });
            },

            // ================================================================
            // CACHE ACTIONS
            // ================================================================

            invalidateCache: () => {
                set({ lastFetch: null });
            },

            clearMovementsCache: (shiftId?: string) => {
                if (shiftId) {
                    const newCache = new Map(get().movementsCache);
                    newCache.delete(shiftId);
                    set({ movementsCache: newCache });
                } else {
                    set({ movementsCache: new Map() });
                }
            },

            // ================================================================
            // RESET
            // ================================================================

            reset: () => {
                set(initialState);
            },
        }),
        { name: "shifts-store" }
    )
);
