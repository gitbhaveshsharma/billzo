"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSalesStore } from "@/stores/sales.store";
import {
    SalesStats,
    SalesToolbar,
    SalesTable,
    SalesPagination,
    SaleDetailSheet,
    PaymentDialog,
    CancelSaleDialog,
    ProcessReturnDialog,
    ReceiptView,
    type SaleAction,
} from "../../store-admin/_components/sales";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type {
    Sale,
    EnrichedSale,
    SaleFilters,
    CreateSalePaymentRequest,
    CreateSaleReturnRequest,
} from "@/types/sales.types";

// ============================================================================
// POS ORDERS PAGE — CASHIER SALES HISTORY
// ============================================================================

export default function POSOrdersPage() {
    const { appUser, isLoading: authLoading } = useAuth();
    const storeId = appUser?.storeId ?? null;

    const {
        sales,
        currentSale,
        dashboardStats,
        filters,
        pagination,
        totalSales,
        totalPages,
        isLoading,
        isSaving,
        fetchSales,
        fetchSaleById,
        fetchDashboardStats,
        addPayment,
        cancelSale,
        createReturn,
        setFilters,
        setPagination,
    } = useSalesStore();

    // Dialog state
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);
    const [receiptOpen, setReceiptOpen] = useState(false);
    const [receiptSale, setReceiptSale] = useState<EnrichedSale | null>(null);

    // ========================================================================
    // LOAD DATA
    // ========================================================================

    useEffect(() => {
        if (storeId) {
            fetchSales(storeId);
            fetchDashboardStats(storeId);
        }
    }, [storeId, fetchSales, fetchDashboardStats]);

    // ========================================================================
    // ACTIONS (SalesTable callback: action first, sale second)
    // ========================================================================

    const handleAction = useCallback(
        async (action: SaleAction, sale: Sale) => {
            setSelectedSale(sale);
            switch (action) {
                case "view":
                    setDetailOpen(true);
                    break;
                case "print":
                    if (storeId) {
                        await fetchSaleById(storeId, sale.id);
                        const enriched = useSalesStore.getState().currentSale;
                        if (enriched) {
                            setReceiptSale(enriched);
                            setReceiptOpen(true);
                        }
                    }
                    break;
                case "add_payment":
                    setPaymentOpen(true);
                    break;
                case "cancel":
                    setCancelOpen(true);
                    break;
                case "return":
                    if (storeId) {
                        await fetchSaleById(storeId, sale.id);
                    }
                    setReturnOpen(true);
                    break;
            }
        },
        [storeId, fetchSaleById]
    );

    // ========================================================================
    // ADD PAYMENT
    // ========================================================================

    const handleAddPayment = useCallback(
        async (
            payments: CreateSalePaymentRequest[],
            isCreditSale: boolean,
            _creditDueDate?: string
        ) => {
            if (!storeId || !selectedSale) return;

            const toastId = toast.loading("Recording payment...");

            let ok = true;
            for (const payment of payments) {
                const result = await addPayment(
                    storeId,
                    selectedSale.id,
                    payment
                );
                if (!result) {
                    ok = false;
                    break;
                }
            }

            if (ok) {
                toast.success("Payment recorded", { id: toastId });
                setPaymentOpen(false);
                fetchSales(storeId);
                fetchDashboardStats(storeId);
            } else {
                toast.error("Failed to record payment", { id: toastId });
            }
        },
        [storeId, selectedSale, addPayment, fetchSales, fetchDashboardStats]
    );

    // ========================================================================
    // CANCEL SALE (CancelSaleDialog passes saleId + reason)
    // ========================================================================

    const handleCancelSale = useCallback(
        async (saleId: string, reason: string) => {
            if (!storeId) return;

            const toastId = toast.loading("Cancelling sale...");
            const result = await cancelSale(storeId, saleId, {
                cancellation_reason: reason,
            });
            if (result) {
                toast.success("Sale cancelled", { id: toastId });
                setCancelOpen(false);
                fetchSales(storeId);
                fetchDashboardStats(storeId);
            } else {
                toast.error("Failed to cancel sale", { id: toastId });
            }
        },
        [storeId, cancelSale, fetchSales, fetchDashboardStats]
    );

    // ========================================================================
    // PROCESS RETURN (ProcessReturnDialog passes a data object)
    // ========================================================================

    const handleProcessReturn = useCallback(
        async (data: {
            sale_id: string;
            return_reason: string;
            return_notes?: string;
            refund_method?: string;
            items: Array<{
                sale_item_id: string;
                product_id: string;
                variant_id?: string;
                batch_id?: string;
                product_name: string;
                product_code: string;
                unit_price: number;
                unit_cost?: number;
                return_quantity: number;
                item_return_reason?: string;
                restock?: boolean;
                restock_condition?: string;
            }>;
        }) => {
            if (!storeId) return;

            const toastId = toast.loading("Processing return...");
            const result = await createReturn(
                storeId,
                data as unknown as CreateSaleReturnRequest
            );
            if (result) {
                toast.success("Return processed", { id: toastId });
                setReturnOpen(false);
                fetchSales(storeId);
                fetchDashboardStats(storeId);
            } else {
                toast.error("Failed to process return", { id: toastId });
            }
        },
        [storeId, createReturn, fetchSales, fetchDashboardStats]
    );

    // ========================================================================
    // DETAIL SHEET ACTIONS (callbacks receive EnrichedSale or saleId)
    // ========================================================================

    const handleDetailPayment = useCallback(
        (sale: EnrichedSale) => {
            setSelectedSale(sale as unknown as Sale);
            setDetailOpen(false);
            setPaymentOpen(true);
        },
        []
    );

    const handleDetailReturn = useCallback(
        (sale: EnrichedSale) => {
            setSelectedSale(sale as unknown as Sale);
            setDetailOpen(false);
            setReturnOpen(true);
        },
        []
    );

    const handleDetailCancel = useCallback(
        (sale: EnrichedSale) => {
            setSelectedSale(sale as unknown as Sale);
            setDetailOpen(false);
            setCancelOpen(true);
        },
        []
    );

    const handleDetailPrint = useCallback(
        (saleId: string) => {
            if (currentSale) {
                setReceiptSale(currentSale);
                setReceiptOpen(true);
            }
        },
        [currentSale]
    );

    // ========================================================================
    // FILTERS & PAGINATION
    // ========================================================================

    const handleFilterChange = useCallback(
        (newFilters: Partial<SaleFilters>) => {
            setFilters(newFilters);
            if (storeId) {
                setPagination({ page: 1 });
                fetchSales(storeId);
            }
        },
        [storeId, setFilters, setPagination, fetchSales]
    );

    const handlePageChange = useCallback(
        (page: number) => {
            setPagination({ page });
            if (storeId) fetchSales(storeId);
        },
        [storeId, setPagination, fetchSales]
    );

    const handleLimitChange = useCallback(
        (limit: number) => {
            setPagination({ page: 1, limit });
            if (storeId) fetchSales(storeId);
        },
        [storeId, setPagination, fetchSales]
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
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <div>
                <h1 className="text-xl font-bold tracking-tight">Orders</h1>
                <p className="text-sm text-muted-foreground">
                    View sales history and manage orders
                </p>
            </div>

            {/* Stats */}
            <SalesStats stats={dashboardStats} isLoading={isLoading} />

            {/* Toolbar */}
            <SalesToolbar
                filters={filters}
                sales={sales}
                onFiltersChange={handleFilterChange}
                isLoading={isLoading}
            />

            {/* Table */}
            <SalesTable
                sales={sales}
                isLoading={isLoading}
                onAction={handleAction}
            />

            {/* Pagination */}
            <SalesPagination
                page={pagination.page}
                limit={pagination.limit}
                totalSales={totalSales}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
            />

            {/* Sale Detail Sheet */}
            <SaleDetailSheet
                open={detailOpen}
                onOpenChange={setDetailOpen}
                storeId={storeId!}
                saleId={selectedSale?.id ?? null}
                onAddPayment={handleDetailPayment}
                onProcessReturn={handleDetailReturn}
                onCancelSale={handleDetailCancel}
                onPrint={handleDetailPrint}
            />

            {/* Payment Dialog */}
            <PaymentDialog
                open={paymentOpen}
                onOpenChange={setPaymentOpen}
                totalAmount={selectedSale?.total_amount ?? 0}
                paidAmount={selectedSale?.paid_amount ?? 0}
                onConfirm={handleAddPayment}
                isProcessing={isSaving}
                customerName={selectedSale?.customer_name}
            />

            {/* Cancel Sale Dialog */}
            <CancelSaleDialog
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                sale={selectedSale}
                onConfirm={handleCancelSale}
                isProcessing={isSaving}
            />

            {/* Process Return Dialog */}
            <ProcessReturnDialog
                open={returnOpen}
                onOpenChange={setReturnOpen}
                sale={currentSale}
                onConfirm={handleProcessReturn}
                isProcessing={isSaving}
            />

            {/* Receipt Dialog */}
            <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>Receipt</DialogTitle>
                    </DialogHeader>
                    {receiptSale && (
                        <ReceiptView
                            sale={receiptSale}
                            storeName={appUser?.storeName ?? "Store"}
                            storeAddress=""
                            onPrint={() => window.print()}
                            compact
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
