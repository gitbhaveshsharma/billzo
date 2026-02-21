"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CashShift } from "@/types/shifts.types";

// ============================================================================
// TYPES
// ============================================================================

interface NoShiftGuardProps {
    activeShift: CashShift | null;
    isLoading: boolean;
    onOpenShift: () => void;
    children: React.ReactNode;
}

// ============================================================================
// NO SHIFT GUARD
// ============================================================================

export function NoShiftGuard({
    activeShift,
    isLoading,
    onOpenShift,
    children,
}: NoShiftGuardProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-5 w-5 animate-spin" />
                    <span>Checking shift status...</span>
                </div>
            </div>
        );
    }

    if (!activeShift || activeShift.status !== "OPEN") {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md w-full">
                    <CardContent className="p-8 text-center space-y-4">
                        <div className="bg-amber-50 dark:bg-amber-950 rounded-full p-4 w-fit mx-auto">
                            <AlertTriangle className="h-8 w-8 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">No Open Shift</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                You must open a cash shift before you can start billing.
                                All sales are tied to a shift for reconciliation.
                            </p>
                        </div>
                        <Button onClick={onOpenShift} className="w-full">
                            Open Shift
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}
