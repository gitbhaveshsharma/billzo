"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useShiftsStore } from "@/stores/shifts.store";
import { useSalesStore } from "@/stores/sales.store";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import type { OpenShiftRequest, CloseShiftRequest, CreateCashMovementRequest, CashMovementType } from "@/types/shifts.types";

// Reuse shift components
import {
    ShiftStatusBanner,
    CashMovementDialog,
    OpenShiftDialog,
    CloseShiftDialog,
} from "../../store-admin/_components/shifts";

// New daily-report components
import { DailySalesStats } from "../_components/daily-sales-stats";
import { DailySalesTable } from "../_components/daily-sales-table";
import { DailyPaymentBreakdown } from "../_components/daily-payment-breakdown";
import { DailyReturnsList } from "../_components/daily-returns-list";

// ============================================================================
// PAGE
// ============================================================================

export default function PosDailyReportPage() {
    const { appUser, isLoading: authLoading } = useAuth();
    const storeId = appUser?.storeId ?? null;
    const cashierName = appUser?.fullName ?? null;
    const cashierId = appUser?.id ?? null;

    // ---- Shifts store ----
    const {
        activeShift,
        isLoading: shiftsLoading,
        isSaving: shiftsSaving,
        fetchActiveShift,
        openShift,
        closeShift,
        suspendShift,
        addCashMovement,
    } = useShiftsStore();

    // ---- Sales store ----
    const {
        todaySummaries,
        returns,
        dashboardStats,
        isLoading: salesLoading,
        fetchTodaySales,
        fetchDashboardStats,
        fetchReturns,
        setReturnFilters,
    } = useSalesStore();

    // ---- Dialog state ----
    const [openShiftDialogOpen, setOpenShiftDialogOpen] = useState(false);
    const [closeShiftDialogOpen, setCloseShiftDialogOpen] = useState(false);
    const [cashMovementDialogOpen, setCashMovementDialogOpen] = useState(false);
    const [cashMovementDefaultType, setCashMovementDefaultType] = useState<CashMovementType | undefined>();

    // ========================================================================
    // DATA FETCHING
    // ========================================================================

    useEffect(() => {
        if (!storeId) return;

        fetchActiveShift(storeId);
        fetchTodaySales(storeId);
        fetchDashboardStats(storeId);

        // Fetch today's returns
        const today = new Date().toISOString().slice(0, 10);
        setReturnFilters({ date_from: today, date_to: today });
        fetchReturns(storeId);
    }, [storeId, fetchActiveShift, fetchTodaySales, fetchDashboardStats, fetchReturns, setReturnFilters]);

    // ========================================================================
    // DERIVED DATA — filtered to this cashier
    // ========================================================================

    const mySales = useMemo(
        () => todaySummaries.filter((s) => s.cashier_name === cashierName),
        [todaySummaries, cashierName]
    );

    const myReturns = useMemo(
        () => returns.filter((r) => r.processed_by === cashierId),
        [returns, cashierId]
    );

    // Stats from filtered sales
    const billsCount = mySales.length;
    const totalAmount = useMemo(
        () => mySales.reduce((sum, s) => sum + s.total_amount, 0),
        [mySales]
    );
    const returnsCount = myReturns.length;
    const returnsAmount = useMemo(
        () => myReturns.reduce((sum, r) => sum + r.total_returned, 0),
        [myReturns]
    );

    // Payment breakdown — use live data from dashboardStats (fetched from sale_payments)
    const cashAmount = dashboardStats?.today_cash ?? 0;
    const cardAmount = dashboardStats?.today_card ?? 0;
    const upiAmount = dashboardStats?.today_upi ?? 0;
    const otherAmount = dashboardStats?.today_other ?? 0;

    // ========================================================================
    // SHIFT HANDLERS
    // ========================================================================

    const handleOpenShift = useCallback(
        async (data: OpenShiftRequest): Promise<boolean> => {
            if (!storeId) return false;
            const toastId = toast.loading("Opening shift…");
            const result = await openShift(storeId, data);
            if (result) {
                toast.success("Shift opened", { id: toastId });
                setOpenShiftDialogOpen(false);
                fetchTodaySales(storeId);
                return true;
            }
            toast.error("Failed to open shift", { id: toastId });
            return false;
        },
        [storeId, openShift, fetchTodaySales]
    );

    const handleCloseShift = useCallback(
        async (shiftId: string, data: CloseShiftRequest): Promise<boolean> => {
            if (!storeId) return false;
            const toastId = toast.loading("Closing shift…");
            const result = await closeShift(storeId, shiftId, data);
            if (result) {
                toast.success("Shift closed", { id: toastId });
                setCloseShiftDialogOpen(false);
                return true;
            }
            toast.error("Failed to close shift", { id: toastId });
            return false;
        },
        [storeId, closeShift]
    );

    const handleSuspendShift = useCallback(
        async (shiftId: string) => {
            if (!storeId) return;
            const toastId = toast.loading("Suspending shift…");
            const ok = await suspendShift(storeId, shiftId, { reason: "Cashier break" });
            if (ok) {
                toast.success("Shift suspended", { id: toastId });
            } else {
                toast.error("Failed to suspend shift", { id: toastId });
            }
        },
        [storeId, suspendShift]
    );

    const handleCashIn = useCallback((shiftId: string) => {
        void shiftId;
        setCashMovementDefaultType("CASH_IN");
        setCashMovementDialogOpen(true);
    }, []);

    const handleCashOut = useCallback((shiftId: string) => {
        void shiftId;
        setCashMovementDefaultType("CASH_OUT");
        setCashMovementDialogOpen(true);
    }, []);

    const handleAddCashMovement = useCallback(
        async (shiftId: string, data: CreateCashMovementRequest): Promise<boolean> => {
            if (!storeId) return false;
            const toastId = toast.loading("Recording cash movement…");
            const result = await addCashMovement(storeId, shiftId, data);
            if (result) {
                toast.success("Cash movement recorded", { id: toastId });
                setCashMovementDialogOpen(false);
                return true;
            }
            toast.error("Failed to record cash movement", { id: toastId });
            return false;
        },
        [storeId, addCashMovement]
    );

    // ========================================================================
    // LOADING GUARD
    // ========================================================================

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!storeId) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">No store assigned.</p>
            </div>
        );
    }

    const isLoading = shiftsLoading || salesLoading;

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Daily Report</h1>
                <p className="text-muted-foreground text-sm">
                    Your sales summary for today
                </p>
            </div>

            {/* Shift banner — open / close / suspend / cash in-out */}
            <ShiftStatusBanner
                shift={activeShift}
                isLoading={shiftsLoading}
                onOpenShift={() => setOpenShiftDialogOpen(true)}
                onCloseShift={() => setCloseShiftDialogOpen(true)}
                onSuspendShift={(id) => handleSuspendShift(id)}
                onCashIn={handleCashIn}
                onCashOut={handleCashOut}
            />

            {/* Stats strip */}
            <DailySalesStats
                billsCount={billsCount}
                totalAmount={totalAmount}
                returnsCount={returnsCount}
                returnsAmount={returnsAmount}
                cashCollected={cashAmount}
                isLoading={isLoading}
            />

            {/* Main content — table left, breakdown + returns right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <DailySalesTable
                        sales={mySales}
                        isLoading={isLoading}
                    />
                </div>

                <div className="space-y-6">
                    <DailyPaymentBreakdown
                        cash={cashAmount}
                        card={cardAmount}
                        upi={upiAmount}
                        other={otherAmount}
                        isLoading={isLoading}
                    />

                    <DailyReturnsList
                        returns={myReturns}
                        isLoading={isLoading}
                    />
                </div>
            </div>

            {/* ============================================================ */}
            {/* DIALOGS                                                       */}
            {/* ============================================================ */}

            <OpenShiftDialog
                open={openShiftDialogOpen}
                onOpenChange={setOpenShiftDialogOpen}
                onSubmit={handleOpenShift}
                isSaving={shiftsSaving}
            />

            <CloseShiftDialog
                open={closeShiftDialogOpen}
                onOpenChange={setCloseShiftDialogOpen}
                shift={activeShift}
                onSubmit={handleCloseShift}
                isSaving={shiftsSaving}
            />

            <CashMovementDialog
                open={cashMovementDialogOpen}
                onOpenChange={setCashMovementDialogOpen}
                shiftId={activeShift?.id ?? null}
                defaultType={cashMovementDefaultType}
                onSubmit={handleAddCashMovement}
                isSaving={shiftsSaving}
            />
        </div>
    );
}
