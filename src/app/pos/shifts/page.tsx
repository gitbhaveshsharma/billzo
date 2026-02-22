"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/use-auth";
import { useShiftsStore } from "@/stores/shifts.store";
import {
    ShiftStats,
    ShiftToolbar,
    ShiftTable,
    ShiftPagination,
    ShiftDetailSheet,
    OpenShiftDialog,
    CloseShiftDialog,
    SuspendShiftDialog,
    ResumeShiftDialog,
    CashMovementDialog,
    ShiftStatusBanner,
    type ShiftAction,
} from "../../store-admin/_components/shifts";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type {
    CashShift,
    OpenShiftRequest,
    CloseShiftRequest,
    SuspendShiftRequest,
    CreateCashMovementRequest,
    ShiftFilters,
    CashMovementType,
} from "@/types/shifts.types";

// ============================================================================
// POS SHIFTS PAGE
// ============================================================================

export default function POSShiftsPage() {
    const { appUser, isLoading: authLoading } = useAuth();
    const storeId = appUser?.storeId ?? null;

    const {
        shifts,
        activeShift,
        dashboardStats,
        filters,
        pagination,
        totalShifts,
        totalPages,
        isLoading,
        isSaving,
        fetchShifts,
        fetchActiveShift,
        fetchDashboardStats,
        openShift,
        closeShift,
        suspendShift,
        resumeShift,
        addCashMovement,
        setFilters,
        setPagination,
    } = useShiftsStore();

    // ========================================================================
    // DIALOG STATE
    // ========================================================================

    const [openDialogOpen, setOpenDialogOpen] = useState(false);
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
    const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
    const [movementDialogOpen, setMovementDialogOpen] = useState(false);
    const [detailSheetOpen, setDetailSheetOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState<CashShift | null>(null);
    const [movementDefaultType, setMovementDefaultType] = useState<CashMovementType>("CASH_IN");

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
            fetchShifts(storeId, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId, filtersKey, paginationPage, paginationLimit, paginationSortBy, paginationSortOrder]);

    useEffect(() => {
        if (storeId) {
            fetchDashboardStats(storeId);
            fetchActiveShift(storeId);
        }
    }, [storeId, fetchDashboardStats, fetchActiveShift]);

    // ========================================================================
    // ACTION HANDLER
    // ========================================================================

    const handleAction = useCallback(
        (action: ShiftAction, shift: CashShift) => {
            setSelectedShift(shift);

            switch (action) {
                case "view":
                    setDetailSheetOpen(true);
                    break;
                case "close":
                    setCloseDialogOpen(true);
                    break;
                case "suspend":
                    setSuspendDialogOpen(true);
                    break;
                case "resume":
                    setResumeDialogOpen(true);
                    break;
                case "cash_in":
                    setMovementDefaultType("CASH_IN");
                    setMovementDialogOpen(true);
                    break;
                case "cash_out":
                    setMovementDefaultType("CASH_OUT");
                    setMovementDialogOpen(true);
                    break;
            }
        },
        []
    );

    // ========================================================================
    // LIFECYCLE HANDLERS
    // ========================================================================

    const handleOpenShift = async (data: OpenShiftRequest): Promise<boolean> => {
        if (!storeId) return false;
        const toastId = toast.loading("Opening shift...");
        const result = await openShift(storeId, data);
        if (result) {
            toast.success("Shift opened successfully", { id: toastId });
            fetchActiveShift(storeId);
            fetchDashboardStats(storeId);
            return true;
        }
        toast.error("Failed to open shift", { id: toastId });
        return false;
    };

    const handleCloseShift = async (shiftId: string, data: CloseShiftRequest): Promise<boolean> => {
        if (!storeId) return false;
        const toastId = toast.loading("Closing shift...");
        const result = await closeShift(storeId, shiftId, data);
        if (result?.success) {
            toast.success("Shift closed successfully", { id: toastId });
            fetchActiveShift(storeId);
            fetchDashboardStats(storeId);
            return true;
        }
        toast.error(result?.error ?? "Failed to close shift", { id: toastId });
        return false;
    };

    const handleSuspendShift = async (shiftId: string, data: SuspendShiftRequest): Promise<boolean> => {
        if (!storeId) return false;
        const toastId = toast.loading("Suspending shift...");
        const success = await suspendShift(storeId, shiftId, data);
        if (success) {
            toast.success("Shift suspended", { id: toastId });
            fetchActiveShift(storeId);
            return true;
        }
        toast.error("Failed to suspend shift", { id: toastId });
        return false;
    };

    const handleResumeShift = async (shiftId: string): Promise<boolean> => {
        if (!storeId) return false;
        const toastId = toast.loading("Resuming shift...");
        const success = await resumeShift(storeId, shiftId);
        if (success) {
            toast.success("Shift resumed", { id: toastId });
            fetchActiveShift(storeId);
            return true;
        }
        toast.error("Failed to resume shift", { id: toastId });
        return false;
    };

    const handleCashMovement = async (
        shiftId: string,
        data: CreateCashMovementRequest
    ): Promise<boolean> => {
        if (!storeId) return false;
        const toastId = toast.loading("Recording cash movement...");
        const result = await addCashMovement(storeId, shiftId, data);
        if (result) {
            toast.success("Cash movement recorded", { id: toastId });
            fetchDashboardStats(storeId);
            return true;
        }
        toast.error("Failed to record cash movement", { id: toastId });
        return false;
    };

    // ========================================================================
    // BANNER QUICK ACTIONS
    // ========================================================================

    const handleBannerCashIn = (shiftId: string) => {
        const shift = shifts.find((s) => s.id === shiftId) ?? activeShift;
        if (shift) {
            setSelectedShift(shift);
            setMovementDefaultType("CASH_IN");
            setMovementDialogOpen(true);
        }
    };

    const handleBannerCashOut = (shiftId: string) => {
        const shift = shifts.find((s) => s.id === shiftId) ?? activeShift;
        if (shift) {
            setSelectedShift(shift);
            setMovementDefaultType("CASH_OUT");
            setMovementDialogOpen(true);
        }
    };

    const handleBannerClose = (shiftId: string) => {
        const shift = shifts.find((s) => s.id === shiftId) ?? activeShift;
        if (shift) {
            setSelectedShift(shift);
            setCloseDialogOpen(true);
        }
    };

    const handleBannerSuspend = (shiftId: string) => {
        const shift = shifts.find((s) => s.id === shiftId) ?? activeShift;
        if (shift) {
            setSelectedShift(shift);
            setSuspendDialogOpen(true);
        }
    };

    // ========================================================================
    // DETAIL SHEET ACTIONS
    // ========================================================================

    const handleDetailClose = (shiftId: string) => {
        setDetailSheetOpen(false);
        const shift = shifts.find((s) => s.id === shiftId);
        if (shift) {
            setSelectedShift(shift);
            setCloseDialogOpen(true);
        }
    };

    const handleDetailSuspend = (shiftId: string) => {
        setDetailSheetOpen(false);
        const shift = shifts.find((s) => s.id === shiftId);
        if (shift) {
            setSelectedShift(shift);
            setSuspendDialogOpen(true);
        }
    };

    const handleDetailResume = (shiftId: string) => {
        setDetailSheetOpen(false);
        const shift = shifts.find((s) => s.id === shiftId);
        if (shift) {
            setSelectedShift(shift);
            setResumeDialogOpen(true);
        }
    };

    const handleDetailCashIn = (shiftId: string) => {
        setDetailSheetOpen(false);
        const shift = shifts.find((s) => s.id === shiftId);
        if (shift) {
            setSelectedShift(shift);
            setMovementDefaultType("CASH_IN");
            setMovementDialogOpen(true);
        }
    };

    const handleDetailCashOut = (shiftId: string) => {
        setDetailSheetOpen(false);
        const shift = shifts.find((s) => s.id === shiftId);
        if (shift) {
            setSelectedShift(shift);
            setMovementDefaultType("CASH_OUT");
            setMovementDialogOpen(true);
        }
    };

    // ========================================================================
    // FILTER & PAGINATION
    // ========================================================================

    const handleFiltersChange = useCallback(
        (newFilters: Partial<ShiftFilters>) => {
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
                <h1 className="text-2xl font-bold tracking-tight">My Shifts</h1>
                <p className="text-sm text-muted-foreground">
                    Manage your cash register shifts and cash movements.
                </p>
            </div>

            {/* Active Shift Banner */}
            <ShiftStatusBanner
                shift={activeShift}
                isLoading={isLoading && !shifts.length}
                compact
                onOpenShift={() => setOpenDialogOpen(true)}
                onCloseShift={handleBannerClose}
                onSuspendShift={handleBannerSuspend}
                onCashIn={handleBannerCashIn}
                onCashOut={handleBannerCashOut}
            />

            {/* Stats */}
            <ShiftStats
                stats={dashboardStats}
                isLoading={isLoading && !shifts.length}
            />

            {/* Toolbar */}
            <ShiftToolbar
                filters={filters}
                shifts={shifts}
                onFiltersChange={handleFiltersChange}
                isLoading={isLoading}
            />

            {/* Table */}
            <ShiftTable
                shifts={shifts}
                isLoading={isLoading}
                onAction={handleAction}
            />

            {/* Pagination */}
            <ShiftPagination
                page={pagination.page}
                limit={pagination.limit}
                totalShifts={totalShifts}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
            />

            {/* ============================================================ */}
            {/* DIALOGS & SHEETS */}
            {/* ============================================================ */}

            <OpenShiftDialog
                open={openDialogOpen}
                onOpenChange={setOpenDialogOpen}
                onSubmit={handleOpenShift}
                isSaving={isSaving}
            />

            <CloseShiftDialog
                open={closeDialogOpen}
                onOpenChange={setCloseDialogOpen}
                shift={selectedShift}
                onSubmit={handleCloseShift}
                isSaving={isSaving}
            />

            <SuspendShiftDialog
                open={suspendDialogOpen}
                onOpenChange={setSuspendDialogOpen}
                shift={selectedShift}
                onConfirm={handleSuspendShift}
                isSaving={isSaving}
            />

            <ResumeShiftDialog
                open={resumeDialogOpen}
                onOpenChange={setResumeDialogOpen}
                shift={selectedShift}
                onConfirm={handleResumeShift}
                isSaving={isSaving}
            />

            <CashMovementDialog
                open={movementDialogOpen}
                onOpenChange={setMovementDialogOpen}
                shiftId={selectedShift?.id ?? null}
                defaultType={movementDefaultType}
                onSubmit={handleCashMovement}   
                isSaving={isSaving}
            />

            <ShiftDetailSheet
                open={detailSheetOpen}
                onOpenChange={setDetailSheetOpen}
                storeId={storeId!}
                shiftId={selectedShift?.id ?? null}
                onClose={handleDetailClose}
                onSuspend={handleDetailSuspend}
                onResume={handleDetailResume}
                onCashIn={handleDetailCashIn}
                onCashOut={handleDetailCashOut}
            />
        </div>
    );
}
