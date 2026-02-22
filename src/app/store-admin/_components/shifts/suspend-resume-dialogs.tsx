"use client";

import { useState } from "react";
import { PauseCircle, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import type { CashShift, SuspendShiftRequest } from "@/types/shifts.types";

// ============================================================================
// SUSPEND SHIFT DIALOG
// ============================================================================

interface SuspendShiftDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shift: CashShift | null;
    onConfirm: (shiftId: string, data: SuspendShiftRequest) => Promise<boolean>;
    isSaving: boolean;
}

export function SuspendShiftDialog({
    open,
    onOpenChange,
    shift,
    onConfirm,
    isSaving,
}: SuspendShiftDialogProps) {
    const [reason, setReason] = useState("");

    const handleConfirm = async () => {
        if (!shift || reason.length < 3) return;
        const success = await onConfirm(shift.id, { reason });
        if (success) {
            setReason("");
            onOpenChange(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) setReason("");
                onOpenChange(isOpen);
            }}
        >
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600">
                        <PauseCircle className="h-5 w-5" />
                        Suspend Shift
                    </DialogTitle>
                    <DialogDescription>
                        Temporarily suspend this shift. No sales can be made while suspended.
                        {shift?.terminal_name && (
                            <> Terminal: <strong>{shift.terminal_name}</strong></>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2 p-4">
                    <Label>Reason *</Label>
                    <Textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Enter the reason for suspending (min 3 characters)..."
                        rows={3}
                    />
                    {reason.length > 0 && reason.length < 3 && (
                        <p className="text-sm text-red-500">
                            Reason must be at least 3 characters
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="default"
                        onClick={handleConfirm}
                        disabled={isSaving || reason.length < 3}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        {isSaving ? "Suspending..." : "Suspend Shift"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// RESUME SHIFT DIALOG
// ============================================================================

interface ResumeShiftDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shift: CashShift | null;
    onConfirm: (shiftId: string) => Promise<boolean>;
    isSaving: boolean;
}

export function ResumeShiftDialog({
    open,
    onOpenChange,
    shift,
    onConfirm,
    isSaving,
}: ResumeShiftDialogProps) {
    const handleConfirm = async () => {
        if (!shift) return;
        const success = await onConfirm(shift.id);
        if (success) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-green-600">
                        <PlayCircle className="h-5 w-5" />
                        Resume Shift
                    </DialogTitle>
                    <DialogDescription>
                        Resume this suspended shift to continue making sales.
                        {shift?.terminal_name && (
                            <> Terminal: <strong>{shift.terminal_name}</strong></>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isSaving}
                    >
                        {isSaving ? "Resuming..." : "Resume Shift"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
