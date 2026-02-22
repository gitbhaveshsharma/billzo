import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { storeUsersService } from "@/services/store-users.service";
import type {
    EnrichedStoreUser,
    Employee,
    StoreUserFilters,
    StoreUserPagination,
    StoreUserStats,
    AddStoreUserRequest,
    UpdateStoreUserRequest,
    UpdateEmployeeRequest,
    BanUserRequest,
    ResetUserAccessRequest,
    AvailableRolesResponse,
    BulkActivateRequest,
    BulkBanRequest,
    BulkRoleChangeRequest,
} from "@/types/store-users.types";
import type { RoleName } from "@/types/database.types";

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface StoreUsersState {
    // Data
    users: EnrichedStoreUser[];
    currentUser: EnrichedStoreUser | null;
    stats: StoreUserStats | null;
    availableRoles: AvailableRolesResponse | null;

    // Pagination & Filters
    filters: StoreUserFilters;
    pagination: StoreUserPagination;
    totalUsers: number;
    totalPages: number;

    // UI State
    isLoading: boolean;
    isRefreshing: boolean;
    error: string | null;
    selectedUserIds: string[];

    // Cache
    lastFetch: number | null;
    cacheTimeout: number; // in milliseconds

    // Actions - Fetching
    fetchUsers: (storeId: string, forceRefresh?: boolean) => Promise<void>;
    fetchUserById: (storeId: string, userId: string) => Promise<void>;
    fetchStats: (storeId: string) => Promise<void>;
    fetchAvailableRoles: (currentRole: RoleName) => Promise<void>;

    // Actions - CRUD
    addUser: (storeId: string, request: AddStoreUserRequest) => Promise<{ success: boolean; invited?: boolean }>;
    updateUser: (storeId: string, userId: string, updates: UpdateStoreUserRequest) => Promise<boolean>;
    updateEmployee: (employeeId: string, updates: UpdateEmployeeRequest) => Promise<boolean>;
    createEmployee: (
        storeId: string,
        storeUserId: string,
        email: string,
        data: { first_name: string; last_name: string; phone?: string; employee_type?: string; employment_status?: string; salary?: number; pay_frequency?: string; notes?: string }
    ) => Promise<boolean>;
    removeUser: (storeId: string, userId: string) => Promise<boolean>;

    // Actions - User Management
    banUser: (storeId: string, userId: string, request: BanUserRequest) => Promise<boolean>;
    unbanUser: (storeId: string, userId: string) => Promise<boolean>;
    activateUser: (storeId: string, userId: string) => Promise<boolean>;
    deactivateUser: (storeId: string, userId: string) => Promise<boolean>;
    resetUserAccess: (storeId: string, userId: string, request: ResetUserAccessRequest) => Promise<boolean>;

    // Actions - Bulk Operations
    bulkActivate: (storeId: string, request: BulkActivateRequest) => Promise<boolean>;
    bulkBan: (storeId: string, request: BulkBanRequest, bannedBy: string) => Promise<boolean>;
    bulkChangeRole: (storeId: string, request: BulkRoleChangeRequest) => Promise<boolean>;

    // Actions - UI State
    setFilters: (filters: Partial<StoreUserFilters>) => void;
    setPagination: (pagination: Partial<StoreUserPagination>) => void;
    setSelectedUserIds: (ids: string[]) => void;
    toggleUserSelection: (userId: string) => void;
    clearSelection: () => void;
    setError: (error: string | null) => void;

    // Actions - Cache
    invalidateCache: () => void;
    clearCache: () => void;

    // Actions - Reset
    reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
    users: [],
    currentUser: null,
    stats: null,
    availableRoles: null,
    filters: {},
    pagination: {
        page: 1,
        limit: 10,
        sort_by: "created_at" as const,
        sort_order: "desc" as const,
    },
    totalUsers: 0,
    totalPages: 0,
    isLoading: false,
    isRefreshing: false,
    error: null,
    selectedUserIds: [],
    lastFetch: null,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
};

// ============================================================================
// ZUSTAND STORE
// ============================================================================

export const useStoreUsersStore = create<StoreUsersState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // ======================================================================
            // FETCHING ACTIONS
            // ======================================================================

            fetchUsers: async (storeId: string, forceRefresh = false) => {
                const state = get();

                // Check cache
                if (!forceRefresh && state.lastFetch) {
                    const timeSinceLastFetch = Date.now() - state.lastFetch;
                    if (timeSinceLastFetch < state.cacheTimeout) {
                        return; // Use cached data
                    }
                }

                set({ isLoading: !state.users.length, isRefreshing: !!state.users.length });

                try {
                    const result = await storeUsersService.getStoreUsers(
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
                            users: result.data.users,
                            totalUsers: result.data.total,
                            totalPages: result.data.total_pages,
                            // Do NOT write pagination here — it would create a new object
                            // reference on every fetch and trigger an infinite re-render loop
                            // in any component that lists pagination as a useEffect dep.
                            lastFetch: Date.now(),
                            error: null,
                            isLoading: false,
                            isRefreshing: false,
                        });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch users",
                        isLoading: false,
                        isRefreshing: false,
                    });
                }
            },

            fetchUserById: async (storeId: string, userId: string) => {
                set({ isLoading: true });

                try {
                    const result = await storeUsersService.getStoreUserById(storeId, userId);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return;
                    }

                    if (result.data) {
                        set({
                            currentUser: result.data,
                            error: null,
                            isLoading: false,
                        });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch user",
                        isLoading: false,
                    });
                }
            },

            fetchStats: async (storeId: string) => {
                try {
                    const result = await storeUsersService.getStoreUserStats(storeId);

                    if (result.error) {
                        set({ error: result.error });
                        return;
                    }

                    if (result.data) {
                        set({ stats: result.data, error: null });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch statistics",
                    });
                }
            },

            fetchAvailableRoles: async (currentRole: RoleName) => {
                try {
                    const result = await storeUsersService.getAvailableRoles(currentRole);

                    if (result.error) {
                        set({ error: result.error });
                        return;
                    }

                    if (result.data) {
                        set({ availableRoles: result.data, error: null });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch roles",
                    });
                }
            },

            // ======================================================================
            // CRUD ACTIONS
            // ======================================================================

            addUser: async (storeId: string, request: AddStoreUserRequest) => {
                set({ isLoading: true, error: null });

                try {
                    const result = await storeUsersService.addStoreUser(storeId, request);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return { success: false };
                    }

                    // Invitation was sent — user doesn't exist yet, no row to add
                    if (result.meta?.invitation_sent) {
                        set({ isLoading: false, error: null });
                        // Invalidate so that when the user accepts, next fetch is fresh
                        get().invalidateCache();
                        return { success: true, invited: true };
                    }

                    if (result.data) {
                        // Optimistically add to list
                        set((state) => ({
                            users: [result.data!, ...state.users],
                            totalUsers: state.totalUsers + 1,
                            error: null,
                            isLoading: false,
                        }));

                        // Invalidate cache to force refresh on next fetch
                        get().invalidateCache();

                        return { success: true };
                    }

                    return { success: false };
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to add user",
                        isLoading: false,
                    });
                    return { success: false };
                }
            },

            updateUser: async (
                storeId: string,
                userId: string,
                updates: UpdateStoreUserRequest
            ) => {
                set({ isLoading: true, error: null });

                try {
                    // Optimistic update
                    set((state) => ({
                        users: state.users.map((user) =>
                            user.user_id === userId ? { ...user, ...updates } : user
                        ),
                        currentUser:
                            state.currentUser?.user_id === userId
                                ? { ...state.currentUser, ...updates }
                                : state.currentUser,
                    }));

                    const result = await storeUsersService.updateStoreUser(
                        storeId,
                        userId,
                        updates
                    );

                    if (result.error) {
                        // Revert optimistic update
                        await get().fetchUsers(storeId, true);
                        set({ error: result.error, isLoading: false });
                        return false;
                    }

                    if (result.data) {
                        // Update with actual data from server
                        set((state) => ({
                            users: state.users.map((user) =>
                                user.user_id === userId ? result.data! : user
                            ),
                            currentUser:
                                state.currentUser?.user_id === userId
                                    ? result.data
                                    : state.currentUser,
                            error: null,
                            isLoading: false,
                        }));

                        return true;
                    }

                    return false;
                } catch (err) {
                    // Revert optimistic update
                    await get().fetchUsers(storeId, true);
                    set({
                        error: err instanceof Error ? err.message : "Failed to update user",
                        isLoading: false,
                    });
                    return false;
                }
            },

            updateEmployee: async (employeeId: string, updates: UpdateEmployeeRequest) => {
                set({ isLoading: true, error: null });

                try {
                    const result = await storeUsersService.updateEmployee(employeeId, updates);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return false;
                    }

                    if (result.data) {
                        // Update employee data in the user object
                        set((state) => ({
                            users: state.users.map((user) =>
                                user.employee?.id === employeeId
                                    ? { ...user, employee: result.data! as Employee }
                                    : user
                            ),
                            currentUser:
                                state.currentUser?.employee?.id === employeeId
                                    ? { ...state.currentUser, employee: result.data as Employee }
                                    : state.currentUser,
                            error: null,
                            isLoading: false,
                        }));

                        return true;
                    }

                    return false;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to update employee",
                        isLoading: false,
                    });
                    return false;
                }
            },

            createEmployee: async (storeId, storeUserId, email, data) => {
                set({ isLoading: true, error: null });
                try {
                    const result = await storeUsersService.createEmployeeForUser(storeId, storeUserId, email, data);
                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return false;
                    }
                    if (result.data) {
                        set((state) => ({
                            users: state.users.map((user) =>
                                user.id === storeUserId
                                    ? { ...user, employee: result.data! as Employee }
                                    : user
                            ),
                            error: null,
                            isLoading: false,
                        }));
                        return true;
                    }
                    return false;
                } catch (err) {
                    set({ error: err instanceof Error ? err.message : "Failed to create employee", isLoading: false });
                    return false;
                }
            },

            removeUser: async (storeId: string, userId: string) => {
                set({ isLoading: true, error: null });

                try {
                    // Optimistic removal
                    set((state) => ({
                        users: state.users.filter((user) => user.user_id !== userId),
                        totalUsers: state.totalUsers - 1,
                    }));

                    const result = await storeUsersService.removeStoreUser(storeId, userId);

                    if (result.error) {
                        // Revert optimistic removal
                        await get().fetchUsers(storeId, true);
                        set({ error: result.error, isLoading: false });
                        return false;
                    }

                    set({ error: null, isLoading: false });
                    return true;
                } catch (err) {
                    // Revert optimistic removal
                    await get().fetchUsers(storeId, true);
                    set({
                        error: err instanceof Error ? err.message : "Failed to remove user",
                        isLoading: false,
                    });
                    return false;
                }
            },

            // ======================================================================
            // USER MANAGEMENT ACTIONS
            // ======================================================================

            banUser: async (storeId: string, userId: string, request: BanUserRequest) => {
                set({ isLoading: true, error: null });

                try {
                    // Optimistic update
                    set((state) => ({
                        users: state.users.map((user) =>
                            user.user_id === userId
                                ? {
                                    ...user,
                                    is_banned: true,
                                    is_active: false,
                                    banned_reason: request.reason,
                                }
                                : user
                        ),
                    }));

                    const result = await storeUsersService.banUser(storeId, userId, request);

                    if (result.error) {
                        await get().fetchUsers(storeId, true);
                        set({ error: result.error, isLoading: false });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            users: state.users.map((user) =>
                                user.user_id === userId ? result.data! : user
                            ),
                            error: null,
                            isLoading: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    await get().fetchUsers(storeId, true);
                    set({
                        error: err instanceof Error ? err.message : "Failed to ban user",
                        isLoading: false,
                    });
                    return false;
                }
            },

            unbanUser: async (storeId: string, userId: string) => {
                set({ isLoading: true, error: null });

                try {
                    // Optimistic update
                    set((state) => ({
                        users: state.users.map((user) =>
                            user.user_id === userId
                                ? { ...user, is_banned: false, banned_reason: null }
                                : user
                        ),
                    }));

                    const result = await storeUsersService.unbanUser(storeId, userId);

                    if (result.error) {
                        await get().fetchUsers(storeId, true);
                        set({ error: result.error, isLoading: false });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            users: state.users.map((user) =>
                                user.user_id === userId ? result.data! : user
                            ),
                            error: null,
                            isLoading: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    await get().fetchUsers(storeId, true);
                    set({
                        error: err instanceof Error ? err.message : "Failed to unban user",
                        isLoading: false,
                    });
                    return false;
                }
            },

            activateUser: async (storeId: string, userId: string) => {
                set({ isLoading: true, error: null });

                try {
                    // Optimistic update
                    set((state) => ({
                        users: state.users.map((user) =>
                            user.user_id === userId ? { ...user, is_active: true } : user
                        ),
                    }));

                    const result = await storeUsersService.setUserActive(storeId, userId, true);

                    if (result.error) {
                        await get().fetchUsers(storeId, true);
                        set({ error: result.error, isLoading: false });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            users: state.users.map((user) =>
                                user.user_id === userId ? result.data! : user
                            ),
                            error: null,
                            isLoading: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    await get().fetchUsers(storeId, true);
                    set({
                        error: err instanceof Error ? err.message : "Failed to activate user",
                        isLoading: false,
                    });
                    return false;
                }
            },

            deactivateUser: async (storeId: string, userId: string) => {
                set({ isLoading: true, error: null });

                try {
                    // Optimistic update
                    set((state) => ({
                        users: state.users.map((user) =>
                            user.user_id === userId ? { ...user, is_active: false } : user
                        ),
                    }));

                    const result = await storeUsersService.setUserActive(storeId, userId, false);

                    if (result.error) {
                        await get().fetchUsers(storeId, true);
                        set({ error: result.error, isLoading: false });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            users: state.users.map((user) =>
                                user.user_id === userId ? result.data! : user
                            ),
                            error: null,
                            isLoading: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    await get().fetchUsers(storeId, true);
                    set({
                        error: err instanceof Error ? err.message : "Failed to deactivate user",
                        isLoading: false,
                    });
                    return false;
                }
            },

            resetUserAccess: async (
                storeId: string,
                userId: string,
                request: ResetUserAccessRequest
            ) => {
                set({ isLoading: true, error: null });

                try {
                    const result = await storeUsersService.resetUserAccess(
                        storeId,
                        userId,
                        request
                    );

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            users: state.users.map((user) =>
                                user.user_id === userId ? result.data! : user
                            ),
                            error: null,
                            isLoading: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to reset user access",
                        isLoading: false,
                    });
                    return false;
                }
            },

            // ======================================================================
            // BULK OPERATIONS
            // ======================================================================

            bulkActivate: async (storeId: string, request: BulkActivateRequest) => {
                set({ isLoading: true, error: null });

                try {
                    const result = await storeUsersService.bulkActivate(storeId, request);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return false;
                    }

                    // Refresh data after bulk operation
                    await get().fetchUsers(storeId, true);
                    set({ isLoading: false, selectedUserIds: [] });
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Bulk activation failed",
                        isLoading: false,
                    });
                    return false;
                }
            },

            bulkBan: async (
                storeId: string,
                request: BulkBanRequest,
                bannedBy: string
            ) => {
                set({ isLoading: true, error: null });

                try {
                    const result = await storeUsersService.bulkBan(storeId, request, bannedBy);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return false;
                    }

                    // Refresh data after bulk operation
                    await get().fetchUsers(storeId, true);
                    set({ isLoading: false, selectedUserIds: [] });
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Bulk ban failed",
                        isLoading: false,
                    });
                    return false;
                }
            },

            bulkChangeRole: async (storeId: string, request: BulkRoleChangeRequest) => {
                set({ isLoading: true, error: null });

                try {
                    const result = await storeUsersService.bulkChangeRole(storeId, request);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return false;
                    }

                    // Refresh data after bulk operation
                    await get().fetchUsers(storeId, true);
                    set({ isLoading: false, selectedUserIds: [] });
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Bulk role change failed",
                        isLoading: false,
                    });
                    return false;
                }
            },

            // ======================================================================
            // UI STATE ACTIONS
            // ======================================================================

            setFilters: (filters: Partial<StoreUserFilters>) => {
                set((state) => ({
                    filters: { ...state.filters, ...filters },
                    pagination: { ...state.pagination, page: 1 }, // Reset to first page
                }));
            },

            setPagination: (pagination: Partial<StoreUserPagination>) => {
                set((state) => ({
                    pagination: { ...state.pagination, ...pagination },
                }));
            },

            setSelectedUserIds: (ids: string[]) => {
                set({ selectedUserIds: ids });
            },

            toggleUserSelection: (userId: string) => {
                set((state) => ({
                    selectedUserIds: state.selectedUserIds.includes(userId)
                        ? state.selectedUserIds.filter((id) => id !== userId)
                        : [...state.selectedUserIds, userId],
                }));
            },

            clearSelection: () => {
                set({ selectedUserIds: [] });
            },

            setError: (error: string | null) => {
                set({ error });
            },

            // ======================================================================
            // CACHE ACTIONS
            // ======================================================================

            invalidateCache: () => {
                set({ lastFetch: null });
            },

            clearCache: () => {
                set({
                    users: [],
                    currentUser: null,
                    stats: null,
                    lastFetch: null,
                });
            },

            // ======================================================================
            // RESET
            // ======================================================================

            reset: () => {
                set(initialState);
            },
        }),
        { name: "StoreUsersStore" }
    )
);
