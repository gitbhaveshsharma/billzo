"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useStoreAdmin } from "../_context/store-admin-context";
import { useCustomerStore } from "@/stores/customers.store";
import {
    CustomerTable,
    CustomerToolbar,
    CustomerStats,
    CustomerPagination,
    AddCustomerDialog,
    EditCustomerDialog,
    CustomerDetailSheet,
    BlacklistCustomerDialog,
    DeleteCustomerDialog,
    RecordPaymentDialog,
    AdjustLoyaltyPointsDialog,
    type CustomerAction,
} from "../_components/customer";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type {
    Customer,
    CreateCustomerRequest,
    UpdateCustomerRequest,
    RecordPaymentRequest,
    AdjustLoyaltyPointsRequest,
    BlacklistCustomerRequest,
    CustomerFilters,
    CustomerPagination as CustomerPaginationType,
    CustomerType,
} from "@/types/customers.types";

// ============================================================================
// CUSTOMER PAGE
// ============================================================================

export default function CustomerPage() {
    const {
        storeId,
        isLoading: contextLoading,
    } = useStoreAdmin();

    const {
        customers,
        dashboardStats,
        filters,
        pagination,
        totalCustomers,
        totalPages,
        isLoading,
        selectedCustomerIds,
        fetchCustomers,
        fetchDashboardStats,
        createCustomer,
        updateCustomer,
        deleteCustomer,
        deactivateCustomer,
        reactivateCustomer,
        toggleBlacklist,
        recordPayment,
        adjustLoyaltyPoints,
        bulkUpdateType,
        bulkDeactivate,
        bulkAddTags,
        setFilters,
        setPagination,
        setSelectedCustomerIds,
        toggleCustomerSelection,
        clearSelection,
    } = useCustomerStore();

    // ========================================================================
    // DIALOG STATE
    // ========================================================================

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [detailSheetOpen, setDetailSheetOpen] = useState(false);
    const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [loyaltyDialogOpen, setLoyaltyDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    // ========================================================================
    // DATA FETCHING
    // ========================================================================

    const filtersKey = JSON.stringify(filters);
    const paginationPage = pagination.page;
    const paginationLimit = pagination.limit;
    const paginationSortBy = pagination.sort_by;
    const paginationSortOrder = pagination.sort_order;

    useEffect(() => {
        if (storeId) {
            fetchCustomers(storeId, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId, filtersKey, paginationPage, paginationLimit, paginationSortBy, paginationSortOrder]);

    useEffect(() => {
        if (storeId) {
            fetchDashboardStats(storeId);
        }
    }, [storeId, fetchDashboardStats]);

    // ========================================================================
    // ACTION HANDLERS
    // ========================================================================

    const handleAction = useCallback(
        (action: CustomerAction, customer: Customer) => {
            setSelectedCustomer(customer);

            switch (action) {
                case "view":
                    setDetailSheetOpen(true);
                    break;
                case "edit":
                    setEditDialogOpen(true);
                    break;
                case "deactivate":
                    handleDeactivate(customer);
                    break;
                case "reactivate":
                    handleReactivate(customer);
                    break;
                case "blacklist":
                    setBlacklistDialogOpen(true);
                    break;
                case "unblacklist":
                    handleUnblacklist(customer);
                    break;
                case "record-payment":
                    setPaymentDialogOpen(true);
                    break;
                case "adjust-loyalty":
                    setLoyaltyDialogOpen(true);
                    break;
                case "delete":
                    setDeleteDialogOpen(true);
                    break;
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [storeId]
    );

    const handleDeactivate = async (customer: Customer) => {
        if (!storeId) return;
        const toastId = toast.loading("Deactivating customer...");
        const success = await deactivateCustomer(storeId, customer.id);
        if (success) {
            toast.success(`${customer.name} deactivated`, { id: toastId });
            fetchDashboardStats(storeId);
        } else {
            toast.error("Failed to deactivate customer", { id: toastId });
        }
    };

    const handleReactivate = async (customer: Customer) => {
        if (!storeId) return;
        const toastId = toast.loading("Reactivating customer...");
        const success = await reactivateCustomer(storeId, customer.id);
        if (success) {
            toast.success(`${customer.name} reactivated`, { id: toastId });
            fetchDashboardStats(storeId);
        } else {
            toast.error("Failed to reactivate customer", { id: toastId });
        }
    };

    const handleUnblacklist = async (customer: Customer) => {
        if (!storeId) return;
        const toastId = toast.loading("Removing blacklist...");
        const success = await toggleBlacklist(storeId, customer.id, {
            is_blacklisted: false,
        });
        if (success) {
            toast.success(`${customer.name} removed from blacklist`, { id: toastId });
            fetchDashboardStats(storeId);
        } else {
            toast.error("Failed to remove blacklist", { id: toastId });
        }
    };

    // ========================================================================
    // CRUD HANDLERS (passed to dialogs)
    // ========================================================================

    const handleAddCustomer = async (data: CreateCustomerRequest): Promise<boolean> => {
        if (!storeId) return false;
        const result = await createCustomer(storeId, data);
        if (result) {
            fetchDashboardStats(storeId);
            return true;
        }
        return false;
    };

    const handleUpdateCustomer = async (customerId: string, data: UpdateCustomerRequest): Promise<boolean> => {
        if (!storeId) return false;
        const success = await updateCustomer(storeId, customerId, data);
        if (success) {
            fetchDashboardStats(storeId);
        }
        return success;
    };

    const handleBlacklist = async (customerId: string, reason: string): Promise<boolean> => {
        if (!storeId) return false;
        const toastId = toast.loading("Blacklisting customer...");
        const success = await toggleBlacklist(storeId, customerId, {
            is_blacklisted: true,
            blacklist_reason: reason,
        });
        if (success) {
            toast.success("Customer blacklisted", { id: toastId });
            fetchDashboardStats(storeId);
        } else {
            toast.error("Failed to blacklist customer", { id: toastId });
        }
        return success;
    };

    const handleDeleteCustomer = async (customerId: string): Promise<boolean> => {
        if (!storeId) return false;
        const toastId = toast.loading("Deleting customer...");
        const success = await deleteCustomer(storeId, customerId);
        if (success) {
            toast.success("Customer deleted", { id: toastId });
            fetchDashboardStats(storeId);
        } else {
            toast.error("Failed to delete customer", { id: toastId });
        }
        return success;
    };

    const handleRecordPayment = async (data: RecordPaymentRequest): Promise<boolean> => {
        if (!storeId) return false;
        const success = await recordPayment(storeId, data);
        if (success) {
            fetchDashboardStats(storeId);
        }
        return success;
    };

    const handleAdjustLoyalty = async (customerId: string, data: AdjustLoyaltyPointsRequest): Promise<boolean> => {
        if (!storeId) return false;
        const success = await adjustLoyaltyPoints(storeId, customerId, data);
        if (success) {
            fetchDashboardStats(storeId);
        }
        return success;
    };

    // ========================================================================
    // BULK ACTION HANDLERS
    // ========================================================================

    const handleBulkChangeType = async (type: CustomerType) => {
        if (!storeId || selectedCustomerIds.length === 0) return;
        const toastId = toast.loading("Updating customer type...");
        const success = await bulkUpdateType(storeId, selectedCustomerIds, type);
        if (success) {
            toast.success(`Updated ${selectedCustomerIds.length} customer(s) type`, { id: toastId });
            clearSelection();
            fetchDashboardStats(storeId);
        } else {
            toast.error("Failed to update customer type", { id: toastId });
        }
    };

    const handleBulkDeactivate = async () => {
        if (!storeId || selectedCustomerIds.length === 0) return;
        const toastId = toast.loading("Deactivating customers...");
        const success = await bulkDeactivate(storeId, selectedCustomerIds);
        if (success) {
            toast.success(`Deactivated ${selectedCustomerIds.length} customer(s)`, { id: toastId });
            clearSelection();
            fetchDashboardStats(storeId);
        } else {
            toast.error("Failed to deactivate customers", { id: toastId });
        }
    };

    const handleBulkAddTags = async () => {
        if (!storeId || selectedCustomerIds.length === 0) return;
        const input = window.prompt("Enter tags (comma separated):");
        if (!input) return;
        const tags = input.split(",").map((t) => t.trim()).filter(Boolean);
        if (tags.length === 0) return;
        const toastId = toast.loading("Adding tags...");
        const success = await bulkAddTags(storeId, selectedCustomerIds, tags);
        if (success) {
            toast.success(`Added tags to ${selectedCustomerIds.length} customer(s)`, { id: toastId });
            clearSelection();
        } else {
            toast.error("Failed to add tags", { id: toastId });
        }
    };

    // ========================================================================
    // SELECT HANDLERS
    // ========================================================================

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = customers.map((c) => c.id);
            setSelectedCustomerIds(allIds);
        } else {
            clearSelection();
        }
    };

    // ========================================================================
    // FILTER & PAGINATION HANDLERS
    // ========================================================================

    const handleFiltersChange = useCallback(
        (newFilters: Partial<CustomerFilters>) => {
            setFilters(newFilters);
        },
        [setFilters]
    );

    const handlePaginationChange = useCallback(
        (newPagination: Partial<CustomerPaginationType>) => {
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
                <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
                <p className="text-sm text-muted-foreground">
                    Manage your customers, track purchases, and handle credit accounts.
                </p>
            </div>

            {/* Stats */}
            <CustomerStats stats={dashboardStats} isLoading={isLoading && !customers.length} />

            {/* Toolbar */}
            <CustomerToolbar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                selectedCount={selectedCustomerIds.length}
                onAddCustomer={() => setAddDialogOpen(true)}
                customers={customers}
                onBulkChangeType={handleBulkChangeType}
                onBulkDeactivate={handleBulkDeactivate}
                onBulkAddTags={handleBulkAddTags}
            />

            {/* Table */}
            <CustomerTable
                customers={customers}
                isLoading={isLoading}
                selectedIds={selectedCustomerIds}
                onToggleSelect={toggleCustomerSelection}
                onSelectAll={handleSelectAll}
                onAction={handleAction}
            />

            {/* Pagination */}
            <CustomerPagination
                pagination={pagination}
                totalCustomers={totalCustomers}
                totalPages={totalPages}
                onPaginationChange={handlePaginationChange}
            />

            {/* ============================================================ */}
            {/* DIALOGS & SHEETS */}
            {/* ============================================================ */}

            {/* Add Customer */}
            <AddCustomerDialog
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                onSubmit={handleAddCustomer}
            />

            {/* Edit Customer */}
            <EditCustomerDialog
                customer={selectedCustomer}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSubmit={handleUpdateCustomer}
            />

            {/* View Customer Detail */}
            <CustomerDetailSheet
                customer={selectedCustomer}
                storeId={storeId}
                open={detailSheetOpen}
                onOpenChange={setDetailSheetOpen}
                onRecordPayment={(c) => {
                    setSelectedCustomer(c);
                    setPaymentDialogOpen(true);
                }}
                onAdjustLoyalty={(c) => {
                    setSelectedCustomer(c);
                    setLoyaltyDialogOpen(true);
                }}
            />

            {/* Blacklist Customer */}
            <BlacklistCustomerDialog
                customer={selectedCustomer}
                open={blacklistDialogOpen}
                onOpenChange={setBlacklistDialogOpen}
                onConfirm={handleBlacklist}
            />

            {/* Delete Customer */}
            <DeleteCustomerDialog
                customer={selectedCustomer}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDeleteCustomer}
            />

            {/* Record Payment */}
            <RecordPaymentDialog
                customer={selectedCustomer}
                open={paymentDialogOpen}
                onOpenChange={setPaymentDialogOpen}
                onSubmit={handleRecordPayment}
            />

            {/* Adjust Loyalty Points */}
            <AdjustLoyaltyPointsDialog
                customer={selectedCustomer}
                open={loyaltyDialogOpen}
                onOpenChange={setLoyaltyDialogOpen}
                onSubmit={handleAdjustLoyalty}
            />
        </div>
    );
}
