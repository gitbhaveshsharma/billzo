"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useStoreAdmin } from "../../_context/store-admin-context";
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
    ReturnApprovalDialog,
    ReturnsTable,
    CreditSalesView,
    ProductSalesReportTable,
    type SaleAction,
} from "../../_components/sales";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
    Sale,
    EnrichedSale,
    SaleReturn,
    SaleFilters,
    CreateSalePaymentRequest,
} from "@/types/sales.types";

export default function SalesPage() {
    const { storeId, isLoading: contextLoading } = useStoreAdmin();

    const {
        sales,
        returns,
        creditSales,
        dashboardStats,
        productSalesReport,
        filters,
        pagination,
        totalSales,
        totalPages,
        isLoading,
        isSaving,
        fetchSales,
        fetchReturns,
        fetchCreditSales,
        fetchDashboardStats,
        fetchProductSalesReport,
        cancelSale,
        addPayment,
        createReturn,
        approveReturn,
        completeReturn,
        setFilters,
        setPagination,
    } = useSalesStore();

    // ========================================================================
    // DIALOG STATE
    // ========================================================================

    const [detailSheetOpen, setDetailSheetOpen] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [returnDialogOpen, setReturnDialogOpen] = useState(false);
    const [returnApprovalOpen, setReturnApprovalOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [selectedReturn, setSelectedReturn] = useState<SaleReturn | null>(null);
    const [activeTab, setActiveTab] = useState("sales");

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
            fetchSales(storeId, true);
        }
    }, [storeId, filtersKey, paginationPage, paginationLimit, paginationSortBy, paginationSortOrder]);

    useEffect(() => {
        if (storeId) {
            fetchDashboardStats(storeId);
        }
    }, [storeId, fetchDashboardStats]);

    // Lazy load tab data
    useEffect(() => {
        if (!storeId) return;
        if (activeTab === "returns") fetchReturns(storeId);
        if (activeTab === "credit") fetchCreditSales(storeId);
        if (activeTab === "report") fetchProductSalesReport(storeId);
    }, [storeId, activeTab, fetchReturns, fetchCreditSales, fetchProductSalesReport]);

    // ========================================================================
    // ACTION HANDLER (from table row actions)
    // ========================================================================

    const handleAction = useCallback(
        (action: SaleAction, sale: Sale) => {
            setSelectedSale(sale);

            switch (action) {
                case "view":
                    setDetailSheetOpen(true);
                    break;
                case "print":
                    // TODO: implement print receipt
                    toast.success("Print receipt triggered");
                    break;
                case "cancel":
                    setCancelDialogOpen(true);
                    break;
                case "return":
                    setReturnDialogOpen(true);
                    break;
                case "add_payment":
                    setPaymentDialogOpen(true);
                    break;
            }
        },
        []
    );

    // ========================================================================
    // LIFECYCLE HANDLERS
    // ========================================================================

    const handleCancelSale = async (saleId: string, reason: string) => {
        if (!storeId) return;
        const toastId = toast.loading("Cancelling sale...");
        const success = await cancelSale(storeId, saleId, {
            cancellation_reason: reason,
        });
        if (success) {
            toast.success("Sale cancelled", { id: toastId });
            setCancelDialogOpen(false);
            fetchDashboardStats(storeId);
        } else {
            toast.error("Failed to cancel sale", { id: toastId });
        }
    };

    const handleAddPayment = async (
        payments: CreateSalePaymentRequest[],
        isCreditSale: boolean,
        _creditDueDate?: string
    ) => {
        if (!storeId || !selectedSale) return;
        const toastId = toast.loading("Recording payment...");

        let allSuccess = true;
        for (const payment of payments) {
            const result = await addPayment(storeId, selectedSale.id, payment);
            if (!result) {
                allSuccess = false;
                break;
            }
        }

        if (allSuccess) {
            toast.success("Payment recorded", { id: toastId });
            setPaymentDialogOpen(false);
            fetchDashboardStats(storeId);
        } else {
            toast.error("Failed to record payment", { id: toastId });
        }
    };

    const handleProcessReturn = async (data: {
        sale_id: string;
        return_reason: string;
        return_notes?: string;
        refund_method?: string;
        refund_tax?: boolean;
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
        const result = await createReturn(storeId, data as Parameters<typeof createReturn>[1]);
        if (result) {
            toast.success("Return processed", { id: toastId });
            setReturnDialogOpen(false);
            fetchDashboardStats(storeId);
            fetchReturns(storeId);
        } else {
            toast.error("Failed to process return", { id: toastId });
        }
    };

    const handleApproveReturn = async (
        returnId: string,
        approved: boolean,
        rejectionReason?: string
    ) => {
        if (!storeId) return;
        const toastId = toast.loading(approved ? "Approving return..." : "Rejecting return...");
        const success = await approveReturn(storeId, returnId, {
            approved,
            rejection_reason: rejectionReason,
        });
        if (success) {
            toast.success(approved ? "Return approved" : "Return rejected", {
                id: toastId,
            });
            setReturnApprovalOpen(false);
            fetchReturns(storeId);
        } else {
            toast.error("Failed to update return", { id: toastId });
        }
    };

    // ========================================================================
    // DETAIL SHEET HELPERS
    // ========================================================================

    const handleDetailAddPayment = (sale: EnrichedSale) => {
        setDetailSheetOpen(false);
        setSelectedSale(sale);
        setPaymentDialogOpen(true);
    };

    const handleDetailReturn = (sale: EnrichedSale) => {
        setDetailSheetOpen(false);
        setSelectedSale(sale);
        setReturnDialogOpen(true);
    };

    const handleDetailCancel = (sale: EnrichedSale) => {
        setDetailSheetOpen(false);
        setSelectedSale(sale);
        setCancelDialogOpen(true);
    };

    // ========================================================================
    // CREDIT SALES HELPERS
    // ========================================================================

    const handleCreditAction = useCallback(
        (action: "view" | "add_payment", sale: Sale) => {
            setSelectedSale(sale);
            if (action === "view") setDetailSheetOpen(true);
            if (action === "add_payment") setPaymentDialogOpen(true);
        },
        []
    );

    // ========================================================================
    // RETURNS TABLE HELPERS
    // ========================================================================

    const handleReturnAction = useCallback(
        (action: "view" | "approve" | "complete", saleReturn: SaleReturn) => {
            setSelectedReturn(saleReturn);
            if (action === "approve") {
                setReturnApprovalOpen(true);
            }
            if (action === "complete") {
                if (!storeId) return;
                const toastId = toast.loading("Completing return...");
                completeReturn(storeId, saleReturn.id).then((ok) => {
                    if (ok) {
                        toast.success("Return completed", { id: toastId });
                        fetchReturns(storeId!);
                    } else {
                        toast.error("Failed to complete return", { id: toastId });
                    }
                });
            }
        },
        [storeId, completeReturn, fetchReturns]
    );

    // ========================================================================
    // FILTER & PAGINATION
    // ========================================================================

    const handleFiltersChange = useCallback(
        (newFilters: Partial<SaleFilters>) => {
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
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Sales</h1>
                <p className="text-sm text-muted-foreground">
                    View sales history, manage returns, and track credit sales.
                </p>
            </div>

            {/* Stats */}
            <SalesStats
                stats={dashboardStats}
                isLoading={isLoading && !sales.length}
            />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="sales">Sales</TabsTrigger>
                    <TabsTrigger value="returns">Returns</TabsTrigger>
                    <TabsTrigger value="credit">Credit Sales</TabsTrigger>
                    <TabsTrigger value="report">Product Report</TabsTrigger>
                </TabsList>

                {/* Sales Tab */}
                <TabsContent value="sales" className="space-y-4 mt-4">
                    <SalesToolbar
                        filters={filters}
                        sales={sales}
                        onFiltersChange={handleFiltersChange}
                        isLoading={isLoading}
                    />

                    <SalesTable
                        sales={sales}
                        isLoading={isLoading}
                        onAction={handleAction}
                    />

                    <SalesPagination
                        page={pagination.page}
                        limit={pagination.limit}
                        totalSales={totalSales}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        onLimitChange={handleLimitChange}
                    />
                </TabsContent>

                {/* Returns Tab */}
                <TabsContent value="returns" className="mt-4">
                    <ReturnsTable
                        returns={returns}
                        isLoading={isLoading}
                        onAction={handleReturnAction}
                    />
                </TabsContent>

                {/* Credit Sales Tab */}
                <TabsContent value="credit" className="mt-4">
                    <CreditSalesView
                        sales={creditSales}
                        isLoading={isLoading}
                        onAction={handleCreditAction}
                    />
                </TabsContent>

                {/* Product Report Tab */}
                <TabsContent value="report" className="mt-4">
                    <ProductSalesReportTable
                        data={productSalesReport}
                        isLoading={isLoading}
                    />
                </TabsContent>
            </Tabs>

            {/* ============================================================ */}
            {/* DIALOGS & SHEETS */}
            {/* ============================================================ */}

            {/* Sale Detail */}
            <SaleDetailSheet
                open={detailSheetOpen}
                onOpenChange={setDetailSheetOpen}
                storeId={storeId!}
                saleId={selectedSale?.id ?? null}
                onAddPayment={handleDetailAddPayment}
                onProcessReturn={handleDetailReturn}
                onCancelSale={handleDetailCancel}
            />

            {/* Payment Dialog */}
            <PaymentDialog
                open={paymentDialogOpen}
                onOpenChange={setPaymentDialogOpen}
                totalAmount={selectedSale?.total_amount ?? 0}
                paidAmount={selectedSale?.paid_amount ?? 0}
                onConfirm={handleAddPayment}
                isProcessing={isSaving}
                customerName={selectedSale?.customer_name}
            />

            {/* Cancel Sale Dialog */}
            <CancelSaleDialog
                open={cancelDialogOpen}
                onOpenChange={setCancelDialogOpen}
                sale={selectedSale}
                onConfirm={handleCancelSale}
                isProcessing={isSaving}
            />

            {/* Process Return Dialog */}
            <ProcessReturnDialog
                open={returnDialogOpen}
                onOpenChange={setReturnDialogOpen}
                sale={selectedSale as EnrichedSale | null}
                onConfirm={handleProcessReturn}
                isProcessing={isSaving}
            />

            {/* Return Approval Dialog */}
            <ReturnApprovalDialog
                open={returnApprovalOpen}
                onOpenChange={setReturnApprovalOpen}
                saleReturn={selectedReturn}
                onConfirm={handleApproveReturn}
                isProcessing={isSaving}
            />
        </div>
    );
}
