"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSalesStore } from "@/stores/sales.store";
import {
    ReturnsTable,
    ProcessReturnDialog,
    ReturnApprovalDialog,
    SaleDetailSheet,
} from "../../store-admin/_components/sales";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type {
    SaleReturn,
    EnrichedSale,
    CreateSaleReturnRequest,
} from "@/types/sales.types";

// ============================================================================
// POS REFUNDS PAGE
// ============================================================================

export default function POSRefundsPage() {
    const { appUser, isLoading: authLoading } = useAuth();
    const storeId = appUser?.storeId ?? null;

    const {
        returns,
        currentSale,
        isLoading,
        isSaving,
        fetchReturns,
        createReturn,
        approveReturn,
        completeReturn,
    } = useSalesStore();

    // Dialog state
    const [selectedReturn, setSelectedReturn] =
        useState<SaleReturn | null>(null);
    const [returnSale, setReturnSale] = useState<EnrichedSale | null>(null);
    const [processReturnOpen, setProcessReturnOpen] = useState(false);
    const [approvalOpen, setApprovalOpen] = useState(false);
    const [detailSheetOpen, setDetailSheetOpen] = useState(false);
    const [detailSaleId, setDetailSaleId] = useState<string | null>(null);

    // ========================================================================
    // LOAD DATA
    // ========================================================================

    useEffect(() => {
        if (storeId) {
            fetchReturns(storeId);
        }
    }, [storeId, fetchReturns]);

    // ========================================================================
    // RETURN ACTIONS (ReturnsTable callback: action first, saleReturn second)
    // ========================================================================

    const handleReturnAction = useCallback(
        (action: "view" | "approve" | "complete", saleReturn: SaleReturn) => {
            setSelectedReturn(saleReturn);
            switch (action) {
                case "view":
                    setDetailSaleId(saleReturn.sale_id);
                    setDetailSheetOpen(true);
                    break;
                case "approve":
                    setApprovalOpen(true);
                    break;
                case "complete":
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
                    break;
            }
        },
        [storeId, completeReturn, fetchReturns]
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
                toast.success("Return processed successfully", { id: toastId });
                setProcessReturnOpen(false);
                setReturnSale(null);
                fetchReturns(storeId);
            } else {
                toast.error("Failed to process return", { id: toastId });
            }
        },
        [storeId, createReturn, fetchReturns]
    );

    // ========================================================================
    // APPROVE / REJECT RETURN (ReturnApprovalDialog passes returnId, approved, reason)
    // ========================================================================

    const handleApproveReturn = useCallback(
        async (returnId: string, approved: boolean, rejectionReason?: string) => {
            if (!storeId) return;

            const toastId = toast.loading(
                approved ? "Approving return..." : "Rejecting return..."
            );

            const result = await approveReturn(storeId, returnId, {
                approved,
                rejection_reason: rejectionReason,
            });
            if (result) {
                toast.success(
                    approved ? "Return approved" : "Return rejected",
                    { id: toastId }
                );
                setApprovalOpen(false);
                setSelectedReturn(null);
                fetchReturns(storeId);
            } else {
                toast.error("Failed to update return", { id: toastId });
            }
        },
        [storeId, approveReturn, fetchReturns]
    );

    // ========================================================================
    // DETAIL SHEET ACTIONS (onProcessReturn receives EnrichedSale)
    // ========================================================================

    const handleDetailReturn = useCallback(
        (sale: EnrichedSale) => {
            setReturnSale(sale);
            setDetailSheetOpen(false);
            setProcessReturnOpen(true);
        },
        []
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
                <h1 className="text-xl font-bold tracking-tight">Refunds</h1>
                <p className="text-sm text-muted-foreground">
                    View and manage sale returns
                </p>
            </div>

            <ReturnsTable
                returns={returns}
                isLoading={isLoading}
                onAction={handleReturnAction}
            />

            {/* Process Return Dialog */}
            <ProcessReturnDialog
                open={processReturnOpen}
                onOpenChange={setProcessReturnOpen}
                sale={returnSale ?? currentSale}
                onConfirm={handleProcessReturn}
                isProcessing={isSaving}
            />

            {/* Approve / Reject Dialog */}
            <ReturnApprovalDialog
                open={approvalOpen}
                onOpenChange={setApprovalOpen}
                saleReturn={selectedReturn}
                onConfirm={handleApproveReturn}
                isProcessing={isSaving}
            />

            {/* Sale Detail Sheet */}
            <SaleDetailSheet
                open={detailSheetOpen}
                onOpenChange={setDetailSheetOpen}
                storeId={storeId!}
                saleId={detailSaleId}
                onProcessReturn={handleDetailReturn}
            />
        </div>
    );
}
