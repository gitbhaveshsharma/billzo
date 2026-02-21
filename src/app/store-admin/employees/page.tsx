"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useStoreAdmin } from "../_context/store-admin-context";
import { useStoreUsersStore } from "@/stores/store-users.store";
import {
    EmployeeTable,
    EmployeeToolbar,
    EmployeeStats,
    EmployeePagination,
    AddEmployeeDialog,
    EditEmployeeDialog,
    EmployeeDetailSheet,
    BanUserDialog,
    ChangeRoleDialog,
    ResetAccessDialog,
    DeleteEmployeeDialog,
    BulkActionDialog,
    type EmployeeAction,
} from "../_components/employees";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type {
    EnrichedStoreUser,
    AddStoreUserRequest,
    UpdateStoreUserRequest,
    UpdateEmployeeRequest,
    BanUserRequest,
    ResetUserAccessRequest,
    StoreUserFilters,
    StoreUserPagination,
} from "@/types/store-users.types";
import { canManageUser } from "@/utils/store-users.utils";
import { createClient } from "@/lib/supabase/client";

// ============================================================================
// EMPLOYEES PAGE
// ============================================================================

export default function EmployeesPage() {
    const {
        appUser,
        storeId,
        isLoading: contextLoading,
        canManageEmployees,
        availableRoles,
    } = useStoreAdmin();

    const {
        users,
        stats,
        filters,
        pagination,
        totalUsers,
        totalPages,
        isLoading,
        selectedUserIds,
        fetchUsers,
        fetchStats,
        addUser,
        updateUser,
        updateEmployee,
        createEmployee,
        removeUser,
        banUser,
        unbanUser,
        activateUser,
        deactivateUser,
        resetUserAccess,
        bulkActivate,
        bulkBan,
        bulkChangeRole,
        setFilters,
        setPagination,
        setSelectedUserIds,
        toggleUserSelection,
        clearSelection,
    } = useStoreUsersStore();

    // ========================================================================
    // DIALOG STATE
    // ========================================================================

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [detailSheetOpen, setDetailSheetOpen] = useState(false);
    const [banDialogOpen, setBanDialogOpen] = useState(false);
    const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
    const [resetAccessDialogOpen, setResetAccessDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
    const [bulkAction, setBulkAction] = useState<"activate" | "deactivate" | "ban" | "change-role" | null>(null);

    const [selectedUser, setSelectedUser] = useState<EnrichedStoreUser | null>(null);

    // ========================================================================
    // DATA FETCHING
    // ========================================================================

    // Stable string snapshots — only change when actual VALUES change, not
    // object references.  This prevents the infinite loop that occurs when
    // fetchUsers writes a new pagination object on every success response and
    // a [filters, pagination] effect sees the new reference as a "change".
    const filtersJson = JSON.stringify(filters);
    const paginationJson = JSON.stringify(pagination);

    useEffect(() => {
        if (!storeId) return;
        fetchUsers(storeId, true);
        fetchStats(storeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId, filtersJson, paginationJson]);

    // ========================================================================
    // HELPERS
    // ========================================================================

    const currentUserAsEnriched = users.find(
        (u) => u.user_id === appUser?.id
    );

    const canManage = useCallback(
        (target: EnrichedStoreUser) => {
            if (!canManageEmployees || !currentUserAsEnriched) return false;
            if (target.user_id === appUser?.id) return false; // Can't manage self
            return canManageUser(currentUserAsEnriched, target);
        },
        [canManageEmployees, currentUserAsEnriched, appUser?.id]
    );

    // ========================================================================
    // ACTION HANDLERS
    // ========================================================================

    const handleAction = useCallback(
        (action: EmployeeAction, user: EnrichedStoreUser) => {
            setSelectedUser(user);

            switch (action) {
                case "view":
                    setDetailSheetOpen(true);
                    break;
                case "edit":
                    setEditDialogOpen(true);
                    break;
                case "edit-role":
                    setChangeRoleDialogOpen(true);
                    break;
                case "activate":
                    handleActivate(user);
                    break;
                case "deactivate":
                    handleDeactivate(user);
                    break;
                case "ban":
                    setBanDialogOpen(true);
                    break;
                case "unban":
                    handleUnban(user);
                    break;
                case "reset-access":
                    setResetAccessDialogOpen(true);
                    break;
                case "force-logout":
                    handleForceLogout(user);
                    break;
                case "delete":
                    setDeleteDialogOpen(true);
                    break;
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [storeId]
    );

    const handleActivate = async (user: EnrichedStoreUser) => {
        if (!storeId) return;
        const toastId = toast.loading("Activating...");
        const success = await activateUser(storeId, user.user_id);
        if (success) {
            toast.success(`${user.full_name || user.email} activated`, { id: toastId });
            fetchStats(storeId);
        } else {
            toast.error("Failed to activate user", { id: toastId });
        }
    };

    const handleDeactivate = async (user: EnrichedStoreUser) => {
        if (!storeId) return;
        const toastId = toast.loading("Deactivating...");
        const success = await deactivateUser(storeId, user.user_id);
        if (success) {
            toast.success(`${user.full_name || user.email} deactivated`, { id: toastId });
            fetchStats(storeId);
        } else {
            toast.error("Failed to deactivate user", { id: toastId });
        }
    };

    const handleUnban = async (user: EnrichedStoreUser) => {
        if (!storeId) return;
        const toastId = toast.loading("Unbanning...");
        const success = await unbanUser(storeId, user.user_id);
        if (success) {
            toast.success(`${user.full_name || user.email} unbanned`, { id: toastId });
            fetchStats(storeId);
        } else {
            toast.error("Failed to unban user", { id: toastId });
        }
    };

    const handleForceLogout = async (user: EnrichedStoreUser) => {
        if (!storeId) return;
        const toastId = toast.loading("Terminating sessions...");
        try {
            const client = createClient();
            const { error } = await client
                .from("sessions")
                .update({
                    is_active: false,
                    terminated_at: new Date().toISOString(),
                    termination_reason: "Force logout by admin",
                })
                .eq("user_id", user.user_id)
                .eq("store_id", storeId)
                .eq("is_active", true);

            if (error) {
                toast.error("Failed to terminate sessions", { id: toastId });
            } else {
                toast.success(`Sessions terminated for ${user.full_name || user.email}`, { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        }
    };

    // ========================================================================
    // CRUD HANDLERS (passed to dialogs)
    // ========================================================================

    const handleAddEmployee = async (data: AddStoreUserRequest): Promise<{ success: boolean; invited?: boolean }> => {
        if (!storeId) return { success: false };
        const result = await addUser(storeId, data);
        if (result.success) {
            fetchStats(storeId);
        }
        return result;
    };

    const handleUpdateUser = async (userId: string, data: UpdateStoreUserRequest): Promise<boolean> => {
        if (!storeId) return false;
        const success = await updateUser(storeId, userId, data);
        if (success) {
            fetchStats(storeId);
        }
        return success;
    };

    const handleUpdateEmployee = async (employeeId: string, data: UpdateEmployeeRequest): Promise<boolean> => {
        return await updateEmployee(employeeId, data);
    };

    const handleCreateEmployee = async (
        storeUserId: string,
        email: string,
        data: { first_name: string; last_name: string; phone?: string; employee_type?: string; employment_status?: string; salary?: number; pay_frequency?: string; notes?: string }
    ): Promise<boolean> => {
        if (!storeId) return false;
        return await createEmployee(storeId, storeUserId, email, data);
    };

    const handleBanUser = async (userId: string, request: BanUserRequest): Promise<boolean> => {
        if (!storeId) return false;
        const success = await banUser(storeId, userId, request);
        if (success) {
            fetchStats(storeId);
        }
        return success;
    };

    const handleChangeRole = async (userId: string, roleId: string): Promise<boolean> => {
        if (!storeId) return false;
        return await updateUser(storeId, userId, { role_id: roleId });
    };

    const handleResetAccess = async (userId: string, request: ResetUserAccessRequest): Promise<boolean> => {
        if (!storeId) return false;
        return await resetUserAccess(storeId, userId, request);
    };

    const handleDeleteUser = async (userId: string): Promise<boolean> => {
        if (!storeId) return false;
        const success = await removeUser(storeId, userId);
        if (success) {
            fetchStats(storeId);
        }
        return success;
    };

    // ========================================================================
    // BULK ACTIONS
    // ========================================================================

    const handleBulkAction = (action: "activate" | "deactivate" | "ban" | "change-role") => {
        setBulkAction(action);
        setBulkActionDialogOpen(true);
    };

    const handleBulkConfirm = async (options?: { reason?: string; roleId?: string }): Promise<boolean> => {
        if (!storeId) return false;

        let success = false;

        switch (bulkAction) {
            case "activate":
                success = await bulkActivate(storeId, {
                    user_ids: selectedUserIds,
                    is_active: true,
                });
                break;
            case "deactivate":
                success = await bulkActivate(storeId, {
                    user_ids: selectedUserIds,
                    is_active: false,
                });
                break;
            case "ban":
                if (!options?.reason || !appUser?.id) return false;
                success = await bulkBan(
                    storeId,
                    { user_ids: selectedUserIds, reason: options.reason },
                    appUser.id
                );
                break;
            case "change-role":
                if (!options?.roleId) return false;
                success = await bulkChangeRole(storeId, {
                    user_ids: selectedUserIds,
                    role_id: options.roleId,
                });
                break;
        }

        if (success) {
            clearSelection();
            fetchStats(storeId);
        }

        return success;
    };

    // ========================================================================
    // SELECT HANDLERS
    // ========================================================================

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            // Only select users we can manage
            const manageableIds = users
                .filter((u) => canManage(u))
                .map((u) => u.user_id);
            setSelectedUserIds(manageableIds);
        } else {
            clearSelection();
        }
    };

    // ========================================================================
    // FILTER & PAGINATION HANDLERS
    // ========================================================================

    const handleFiltersChange = useCallback(
        (newFilters: Partial<StoreUserFilters>) => {
            setFilters(newFilters);
        },
        [setFilters]
    );

    const handlePaginationChange = useCallback(
        (newPagination: Partial<StoreUserPagination>) => {
            setPagination(newPagination);
        },
        [setPagination]
    );

    // ========================================================================
    // LOADING STATE
    // ========================================================================

    if (contextLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" text="Loading..." />
            </div>
        );
    }

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
                <p className="text-sm text-muted-foreground">
                    Manage your store employees, roles, and access permissions.
                </p>
            </div>

            {/* Stats */}
            <EmployeeStats stats={stats} isLoading={isLoading && !users.length} />

            {/* Toolbar */}
            <EmployeeToolbar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                selectedCount={selectedUserIds.length}
                onAddEmployee={() => setAddDialogOpen(true)}
                onBulkAction={handleBulkAction}
                users={users}
                availableRoles={availableRoles}
            />

            {/* Table */}
            <EmployeeTable
                users={users}
                isLoading={isLoading}
                selectedIds={selectedUserIds}
                onToggleSelect={toggleUserSelection}
                onSelectAll={handleSelectAll}
                onAction={handleAction}
                canManage={canManage}
            />

            {/* Pagination */}
            <EmployeePagination
                pagination={pagination}
                totalUsers={totalUsers}
                totalPages={totalPages}
                onPaginationChange={handlePaginationChange}
            />

            {/* ============================================================ */}
            {/* DIALOGS & SHEETS */}
            {/* ============================================================ */}

            {/* Add Employee */}
            <AddEmployeeDialog
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                availableRoles={availableRoles}
                onSubmit={handleAddEmployee}
            />

            {/* Edit Employee */}
            <EditEmployeeDialog
                user={selectedUser}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                availableRoles={availableRoles}
                onUpdateUser={handleUpdateUser}
                onUpdateEmployee={handleUpdateEmployee}
                onCreateEmployee={handleCreateEmployee}
            />

            {/* View Employee Detail */}
            <EmployeeDetailSheet
                user={selectedUser}
                open={detailSheetOpen}
                onOpenChange={setDetailSheetOpen}
            />

            {/* Ban User */}
            <BanUserDialog
                user={selectedUser}
                open={banDialogOpen}
                onOpenChange={setBanDialogOpen}
                onBan={handleBanUser}
                currentUserId={appUser?.id || ""}
            />

            {/* Change Role */}
            <ChangeRoleDialog
                user={selectedUser}
                open={changeRoleDialogOpen}
                onOpenChange={setChangeRoleDialogOpen}
                availableRoles={availableRoles}
                onChangeRole={handleChangeRole}
            />

            {/* Reset Access */}
            <ResetAccessDialog
                user={selectedUser}
                open={resetAccessDialogOpen}
                onOpenChange={setResetAccessDialogOpen}
                onReset={handleResetAccess}
            />

            {/* Delete Employee */}
            <DeleteEmployeeDialog
                user={selectedUser}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onDelete={handleDeleteUser}
            />

            {/* Bulk Actions */}
            <BulkActionDialog
                action={bulkAction}
                selectedCount={selectedUserIds.length}
                open={bulkActionDialogOpen}
                onOpenChange={setBulkActionDialogOpen}
                availableRoles={availableRoles}
                onConfirm={handleBulkConfirm}
            />
        </div>
    );
}
