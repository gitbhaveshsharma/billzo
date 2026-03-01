"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    type ReactNode,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { useStoreStore } from "@/stores/store.store";
import { useStoreUsersStore } from "@/stores/store-users.store";
import type { AppUser } from "@/types/auth.types";
import type { Store } from "@/types/store.types";
import type { RoleName } from "@/types/database.types";
import type { EnrichedStoreUser, StoreUserStats, AvailableRolesResponse } from "@/types/store-users.types";
import { EMPLOYEE_MANAGEMENT_ROLES } from "@/constants/roles";

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface StoreAdminContextValue {
    /** Current authenticated app user */
    appUser: AppUser | null;
    /** Current store */
    store: Store | null;
    /** Current user's role */
    role: RoleName | null;
    /** Store ID shortcut */
    storeId: string | null;
    /** Whether the context data is loading */
    isLoading: boolean;
    /** Whether user can manage employees */
    canManageEmployees: boolean;
    /** Whether user is store admin or higher */
    isAdmin: boolean;
    /** Store users from the Zustand store */
    users: EnrichedStoreUser[];
    /** User stats */
    stats: StoreUserStats | null;
    /** Available roles for assignment */
    availableRoles: AvailableRolesResponse | null;
    /** Refresh users data */
    refreshUsers: () => Promise<void>;
    /** Refresh stats */
    refreshStats: () => Promise<void>;
}

const StoreAdminContext = createContext<StoreAdminContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface StoreAdminProviderProps {
    children: ReactNode;
}

export function StoreAdminProvider({ children }: StoreAdminProviderProps) {
    const { appUser } = useAuth();
    const { store, fetchStore } = useStoreStore();

    const {
        users,
        stats,
        availableRoles,
        isLoading,
        fetchUsers,
        fetchStats,
        fetchAvailableRoles,
    } = useStoreUsersStore();

    const role = appUser?.role ?? null;
    const storeId = appUser?.storeId ?? store?.id ?? null;

    // Fetch full store record if not yet loaded
    useEffect(() => {
        if (storeId) {
            fetchStore(storeId);
        }
    }, [storeId, fetchStore]);

    const canManageEmployees = useMemo(
        () => !!role && EMPLOYEE_MANAGEMENT_ROLES.includes(role),
        [role]
    );

    const isAdmin = useMemo(
        () => role === "super_admin" || role === "store_admin",
        [role]
    );

    // Fetch available roles on mount
    useEffect(() => {
        if (role) {
            fetchAvailableRoles(role);
        }
    }, [role, fetchAvailableRoles]);

    const refreshUsers = async () => {
        if (storeId) {
            await fetchUsers(storeId, true);
        }
    };

    const refreshStats = async () => {
        if (storeId) {
            await fetchStats(storeId);
        }
    };

    const value = useMemo<StoreAdminContextValue>(
        () => ({
            appUser,
            store,
            role,
            storeId,
            isLoading,
            canManageEmployees,
            isAdmin,
            users,
            stats,
            availableRoles,
            refreshUsers,
            refreshStats,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [appUser, store, role, storeId, isLoading, canManageEmployees, isAdmin, users, stats, availableRoles]
    );

    return (
        <StoreAdminContext.Provider value={value}>
            {children}
        </StoreAdminContext.Provider>
    );
}

// ============================================================================
// HOOK
// ============================================================================

export function useStoreAdmin(): StoreAdminContextValue {
    const ctx = useContext(StoreAdminContext);
    if (!ctx) {
        throw new Error("useStoreAdmin must be used within a StoreAdminProvider");
    }
    return ctx;
}
