"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCustomerStore } from "@/stores/customers.store";
import { useSalesStore } from "@/stores/sales.store";
import {
    CustomerTable,
    CustomerToolbar,
    CustomerPagination,
    AddCustomerDialog,
    EditCustomerDialog,
    CustomerDetailSheet,
    RecordPaymentDialog,
    AdjustLoyaltyPointsDialog,
    type CustomerAction,
} from "../../store-admin/_components/customer";
import { PosCustomerStats } from "../_components/pos-customer-stats";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type {
    Customer,
    CreateCustomerRequest,
    UpdateCustomerRequest,
    RecordPaymentRequest,
    AdjustLoyaltyPointsRequest,
    CustomerFilters,
    CustomerPagination as CustomerPaginationType,
} from "@/types/customers.types";

// ============================================================================
// POS CUSTOMERS PAGE
// Cashier view — search, view, add, edit basic info, record payment, loyalty
// Cannot: blacklist, delete, change credit limit, change type
// ============================================================================

/** Actions allowed for cashier — subset of full CustomerAction */
const CASHIER_ALLOWED_ACTIONS: CustomerAction[] = [
    "view",
    "edit",
    "record-payment",
    "adjust-loyalty",
];

export default function POSCustomersPage() {
    const { appUser, isLoading: authLoading } = useAuth();
    const storeId = appUser?.storeId ?? null;
    const cashierId = appUser?.id ?? null;

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
        recordPayment,
        adjustLoyaltyPoints,
        setFilters,
        setPagination,
        toggleCustomerSelection,
        setSelectedCustomerIds,
        clearSelection,
    } = useCustomerStore();

    const { todaySummaries, fetchTodaySales } = useSalesStore();

    // ========================================================================
    // DIALOG STATE
    // ========================================================================

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [detailSheetOpen, setDetailSheetOpen] = useState(false);
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
            fetchTodaySales(storeId);
        }
    }, [storeId, fetchDashboardStats, fetchTodaySales]);

    // ========================================================================
    // COMPUTED STATS
    // ========================================================================

    const myCustomersToday = useMemo(() => {
        if (!cashierId || !todaySummaries.length) return 0;
        // Count unique customers from today's sales by this cashier
        const uniqueCustomers = new Set(
            todaySummaries
                .filter((s) => s.customer_name)
                .map((s) => s.customer_name)
        );
        return uniqueCustomers.size;
    }, [cashierId, todaySummaries]);

    // ========================================================================
    // ACTION HANDLER — restricted to cashier-allowed actions
    // ========================================================================

    const handleAction = useCallback(
        (action: CustomerAction, customer: Customer) => {
            if (!CASHIER_ALLOWED_ACTIONS.includes(action)) {
                toast.error("This action is not available");
                return;
            }

            setSelectedCustomer(customer);

            switch (action) {
                case "view":
                    setDetailSheetOpen(true);
                    break;
                case "edit":
                    setEditDialogOpen(true);
                    break;
                case "record-payment":
                    setPaymentDialogOpen(true);
                    break;
                case "adjust-loyalty":
                    setLoyaltyDialogOpen(true);
                    break;
            }
        },
        []
    );

    // ========================================================================
    // CRUD HANDLERS
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

    const handleUpdateCustomer = async (
        customerId: string,
        data: UpdateCustomerRequest
    ): Promise<boolean> => {
        if (!storeId) return false;
        // Cashier can only update basic fields — strip out admin-only fields
        const safeData: UpdateCustomerRequest = {
            name: data.name,
            phone: data.phone,
            alternate_phone: data.alternate_phone,
            email: data.email,
            date_of_birth: data.date_of_birth,
            anniversary_date: data.anniversary_date,
            gender: data.gender,
            address_line1: data.address_line1,
            address_line2: data.address_line2,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            notes: data.notes,
        };
        const success = await updateCustomer(storeId, customerId, safeData);
        if (success) {
            fetchDashboardStats(storeId);
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

    const handleAdjustLoyalty = async (
        customerId: string,
        data: AdjustLoyaltyPointsRequest
    ): Promise<boolean> => {
        if (!storeId) return false;
        const success = await adjustLoyaltyPoints(storeId, customerId, data);
        if (success) {
            fetchDashboardStats(storeId);
        }
        return success;
    };

    // ========================================================================
    // SELECT HANDLERS (for table, even though cashier has no bulk actions)
    // ========================================================================

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedCustomerIds(customers.map((c) => c.id));
        } else {
            clearSelection();
        }
    };

    // ========================================================================
    // FILTER & PAGINATION
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
    // LOADING
    // ========================================================================

    if (authLoading) {
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
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
                <p className="text-sm text-muted-foreground">
                    Search customers, view details, and manage payments.
                </p>
            </div>

            {/* Stats — compact 3-card strip */}
            <PosCustomerStats
                totalCustomers={dashboardStats?.total_customers ?? 0}
                withOutstanding={dashboardStats?.customers_with_credit ?? 0}
                totalOutstanding={dashboardStats?.total_outstanding ?? 0}
                myCustomersToday={myCustomersToday}
                isLoading={isLoading && !customers.length}
            />

            {/* Toolbar — no bulk actions for cashier */}
            <CustomerToolbar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                selectedCount={0}
                onAddCustomer={() => setAddDialogOpen(true)}
                customers={customers}
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

            {/* Edit Customer (basic info only) */}
            <EditCustomerDialog
                customer={selectedCustomer}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSubmit={handleUpdateCustomer}
            />

            {/* Customer Detail Sheet */}
            <CustomerDetailSheet
                customer={selectedCustomer}
                storeId={storeId}
                open={detailSheetOpen}
                onOpenChange={setDetailSheetOpen}
                onRecordPayment={(c: Customer) => {
                    setSelectedCustomer(c);
                    setPaymentDialogOpen(true);
                }}
                onAdjustLoyalty={(c: Customer) => {
                    setSelectedCustomer(c);
                    setLoyaltyDialogOpen(true);
                }}
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
