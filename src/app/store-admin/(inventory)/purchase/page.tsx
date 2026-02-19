"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useStoreAdmin } from "../../_context/store-admin-context";
import { usePurchaseStore } from "@/stores/purchase.store";
import { useSupplierStore } from "@/stores/supplier.store";
import {
    PurchaseStats,
    PurchaseToolbar,
    PurchaseTable,
    PurchasePagination,
    CreatePODialog,
    PurchaseDetailSheet,
    ReceiveItemsDialog,
    AddPaymentDialog,
    CreateReturnDialog,
    CancelPODialog,
    DeletePODialog,
    type PurchaseAction,
} from "../../_components/purchase";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type {
    PurchaseOrder,
    CreatePurchaseOrderRequest,
    CreatePurchasePaymentRequest,
    CreatePurchaseReturnRequest,
    ReceiveItemRequest,
    PurchaseOrderFilters,
    PurchaseOrderPagination,
} from "@/types/purchase.types";

// ============================================================================
// PURCHASE ORDERS PAGE
// ============================================================================

export default function PurchasePage() {
    const { storeId, isLoading: contextLoading } = useStoreAdmin();

    const {
        orders,
        dashboardStats,
        filters,
        pagination,
        totalOrders,
        totalPages,
        isLoading,
        isSaving,
        selectedOrderIds,
        fetchOrders,
        fetchDashboardStats,
        createOrder,
        confirmOrder,
        cancelOrder,
        deleteOrder,
        receiveItems,
        addPayment,
        createReturn,
        setFilters,
        setPagination,
        setSelectedOrderIds,
        toggleOrderSelection,
        clearSelection,
    } = usePurchaseStore();

    const fetchSuppliers = useSupplierStore((s) => s.fetchSuppliers);

    // ========================================================================
    // DIALOG STATE
    // ========================================================================

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [detailSheetOpen, setDetailSheetOpen] = useState(false);
    const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [returnDialogOpen, setReturnDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

    // ========================================================================
    // DATA FETCHING
    // ========================================================================

    // Serialize filter/pagination to primitive values to avoid infinite loops
    const filtersKey = JSON.stringify(filters);
    const paginationPage = pagination.page;
    const paginationLimit = pagination.limit;
    const paginationSortBy = pagination.sort_by;
    const paginationSortOrder = pagination.sort_order;

    useEffect(() => {
        if (storeId) {
            fetchOrders(storeId, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId, filtersKey, paginationPage, paginationLimit, paginationSortBy, paginationSortOrder]);

    useEffect(() => {
        if (storeId) {
            fetchDashboardStats(storeId);
        }
    }, [storeId, fetchDashboardStats]);

    // Pre-fetch suppliers for Create PO dialog
    useEffect(() => {
        if (storeId) {
            fetchSuppliers(storeId);
        }
    }, [storeId, fetchSuppliers]);

    // ========================================================================
    // ACTION HANDLER
    // ========================================================================

    const handleAction = useCallback(
        (action: PurchaseAction, order: PurchaseOrder) => {
            setSelectedOrder(order);

            switch (action) {
                case "view":
                    setDetailSheetOpen(true);
                    break;
                case "edit":
                    // For now, open detail sheet for editing
                    setDetailSheetOpen(true);
                    break;
                case "confirm":
                    handleConfirmOrder(order);
                    break;
                case "cancel":
                    setCancelDialogOpen(true);
                    break;
                case "receive":
                    setReceiveDialogOpen(true);
                    break;
                case "payment":
                    setPaymentDialogOpen(true);
                    break;
                case "return":
                    setReturnDialogOpen(true);
                    break;
                case "delete":
                    setDeleteDialogOpen(true);
                    break;
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [storeId]
    );

    // ========================================================================
    // CONFIRM ORDER (inline)
    // ========================================================================

    const handleConfirmOrder = async (order: PurchaseOrder) => {
        if (!storeId) return;
        const toastId = toast.loading("Confirming order...");
        const success = await confirmOrder(storeId, order.id);
        if (success) {
            toast.success(`${order.po_number} confirmed`, { id: toastId });
            fetchDashboardStats(storeId);
        } else {
            toast.error("Failed to confirm order", { id: toastId });
        }
    };

    // ========================================================================
    // CRUD HANDLERS
    // ========================================================================

    const handleCreateOrder = async (data: CreatePurchaseOrderRequest): Promise<boolean> => {
        if (!storeId) return false;
        const toastId = toast.loading("Creating purchase order...");
        const result = await createOrder(storeId, data);
        if (result) {
            toast.success(`${result.po_number} created`, { id: toastId });
            fetchDashboardStats(storeId);
            return true;
        }
        toast.error("Failed to create purchase order", { id: toastId });
        return false;
    };

    const handleCancelOrder = async (poId: string, reason: string): Promise<boolean> => {
        if (!storeId) return false;
        const toastId = toast.loading("Cancelling order...");
        const success = await cancelOrder(storeId, poId, { cancellation_reason: reason });
        if (success) {
            toast.success("Order cancelled", { id: toastId });
            fetchDashboardStats(storeId);
            return true;
        }
        toast.error("Failed to cancel order", { id: toastId });
        return false;
    };

    const handleDeleteOrder = async (poId: string): Promise<boolean> => {
        if (!storeId) return false;
        const toastId = toast.loading("Deleting order...");
        const success = await deleteOrder(storeId, poId);
        if (success) {
            toast.success("Order deleted", { id: toastId });
            fetchDashboardStats(storeId);
            return true;
        }
        toast.error("Failed to delete order", { id: toastId });
        return false;
    };

    const handleReceiveItems = async (poId: string, items: ReceiveItemRequest[]): Promise<boolean> => {
        if (!storeId) return false;
        const toastId = toast.loading("Receiving items...");
        const success = await receiveItems(storeId, poId, items);
        if (success) {
            toast.success("Items received successfully", { id: toastId });
            fetchDashboardStats(storeId);
            return true;
        }
        toast.error("Failed to receive items", { id: toastId });
        return false;
    };

    const handleAddPayment = async (poId: string, data: CreatePurchasePaymentRequest): Promise<boolean> => {
        if (!storeId) return false;
        const toastId = toast.loading("Recording payment...");
        const result = await addPayment(storeId, poId, data);
        if (result) {
            toast.success("Payment recorded", { id: toastId });
            fetchDashboardStats(storeId);
            return true;
        }
        toast.error("Failed to record payment", { id: toastId });
        return false;
    };

    const handleCreateReturn = async (data: CreatePurchaseReturnRequest): Promise<boolean> => {
        if (!storeId) return false;
        const toastId = toast.loading("Creating return...");
        const result = await createReturn(storeId, data);
        if (result) {
            toast.success(`Return ${result.return_number} created`, { id: toastId });
            fetchDashboardStats(storeId);
            return true;
        }
        toast.error("Failed to create return", { id: toastId });
        return false;
    };

    // ========================================================================
    // FILTER & PAGINATION
    // ========================================================================

    const handleFiltersChange = useCallback(
        (newFilters: Partial<PurchaseOrderFilters>) => {
            setFilters(newFilters);
        },
        [setFilters]
    );

    const handlePageChange = useCallback(
        (page: number) => {
            setPagination({ page });
        },
        [setPagination]
    );

    const handleLimitChange = useCallback(
        (limit: number) => {
            setPagination({ limit, page: 1 });
        },
        [setPagination]
    );

    const handleSelectAll = useCallback(
        (ids: string[]) => {
            setSelectedOrderIds(ids);
        },
        [setSelectedOrderIds]
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
                <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
                <p className="text-sm text-muted-foreground">
                    Create and manage purchase orders, track payments, receive items, and handle returns.
                </p>
            </div>

            {/* Stats */}
            <PurchaseStats
                stats={dashboardStats}
                isLoading={isLoading && !orders.length}
            />

            {/* Toolbar */}
            <PurchaseToolbar
                filters={filters}
                orders={orders}
                onFiltersChange={handleFiltersChange}
                onCreatePO={() => setCreateDialogOpen(true)}
                isLoading={isLoading}
            />

            {/* Table */}
            <PurchaseTable
                orders={orders}
                selectedIds={selectedOrderIds}
                isLoading={isLoading}
                onToggleSelect={toggleOrderSelection}
                onSelectAll={handleSelectAll}
                onAction={handleAction}
            />

            {/* Pagination */}
            <PurchasePagination
                page={pagination.page}
                limit={pagination.limit}
                totalOrders={totalOrders}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
            />

            {/* ============================================================ */}
            {/* DIALOGS & SHEETS */}
            {/* ============================================================ */}

            {/* Create PO */}
            <CreatePODialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                storeId={storeId!}
                onSubmit={handleCreateOrder}
                isSaving={isSaving}
            />

            {/* PO Detail Sheet */}
            <PurchaseDetailSheet
                open={detailSheetOpen}
                onOpenChange={setDetailSheetOpen}
                storeId={storeId!}
                orderId={selectedOrder?.id ?? null}
                onReceive={() => {
                    setDetailSheetOpen(false);
                    setReceiveDialogOpen(true);
                }}
                onAddPayment={() => {
                    setDetailSheetOpen(false);
                    setPaymentDialogOpen(true);
                }}
                onCreateReturn={() => {
                    setDetailSheetOpen(false);
                    setReturnDialogOpen(true);
                }}
            />

            {/* Receive Items */}
            <ReceiveItemsDialog
                open={receiveDialogOpen}
                onOpenChange={setReceiveDialogOpen}
                storeId={storeId!}
                orderId={selectedOrder?.id ?? null}
                onSubmit={handleReceiveItems}
                isSaving={isSaving}
            />

            {/* Add Payment */}
            <AddPaymentDialog
                open={paymentDialogOpen}
                onOpenChange={setPaymentDialogOpen}
                order={selectedOrder}
                onSubmit={handleAddPayment}
                isSaving={isSaving}
            />

            {/* Create Return */}
            <CreateReturnDialog
                open={returnDialogOpen}
                onOpenChange={setReturnDialogOpen}
                storeId={storeId!}
                order={selectedOrder}
                onSubmit={handleCreateReturn}
                isSaving={isSaving}
            />

            {/* Cancel PO */}
            <CancelPODialog
                open={cancelDialogOpen}
                onOpenChange={setCancelDialogOpen}
                order={selectedOrder}
                onConfirm={handleCancelOrder}
                isSaving={isSaving}
            />

            {/* Delete PO */}
            <DeletePODialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                order={selectedOrder}
                onConfirm={handleDeleteOrder}
                isSaving={isSaving}
            />
        </div>
    );
}
