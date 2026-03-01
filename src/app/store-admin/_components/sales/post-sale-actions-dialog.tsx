"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    Printer,
    MessageSquare,
    Mail,
    X,
    CheckCircle2,
    Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { EnrichedSale } from "@/types/sales.types";
import type { ReceiptLayoutConfig } from "@/hooks/use-hardware";
import { buildReceiptData } from "@/utils/sales.utils";
import type { PrintReceiptData } from "@/utils/receipt-print";

// ============================================================================
// TYPES
// ============================================================================

export interface PostSaleActionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The completed sale to generate receipt for */
    sale: EnrichedSale | null;
    /** Store display name */
    storeName: string;
    /** Store address line */
    storeAddress: string;
    /** Store GSTIN */
    storeGstin?: string | null;
    /** Store phone number */
    storePhone?: string | null;
    /** Receipt layout config from store settings */
    receiptConfig: ReceiptLayoutConfig;
    /** Hardware print function (Bridge → USB → HTML fallback) */
    printFn: (data: PrintReceiptData, config: ReceiptLayoutConfig) => Promise<boolean> | boolean;
    /** Callback after any receipt action completes */
    onActionComplete?: (action: "print" | "sms" | "email" | "skip") => void;
}

type ActionState = "idle" | "printing" | "done";

// ============================================================================
// COMPONENT
// ============================================================================

export function PostSaleActionsDialog({
    open,
    onOpenChange,
    sale,
    storeName,
    storeAddress,
    storeGstin,
    storePhone,
    receiptConfig,
    printFn,
    onActionComplete,
}: PostSaleActionsDialogProps) {
    const [actionState, setActionState] = useState<ActionState>("idle");
    const dialogRef = useRef<HTMLDivElement>(null);

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setActionState("idle");
        }
    }, [open]);

    // Build receipt data from enriched sale
    const buildPrintData = useCallback((): PrintReceiptData | null => {
        if (!sale) return null;

        const receipt = buildReceiptData(
            sale,
            storeName,
            storeAddress,
            storeGstin ?? null,
            storePhone ?? null
        );

        return {
            store: receipt.store,
            invoice: receipt.invoice,
            cashier: sale.cashier_name ?? null,
            customer: receipt.customer,
            items: receipt.items.map((i) => ({
                name: i.name,
                hsn: i.hsn,
                qty: i.qty,
                unit: i.unit,
                price: i.price,
                discount: i.discount,
                total: i.total,
            })),
            totals: receipt.totals,
            payments: receipt.payments,
            footer: receipt.footer,
        };
    }, [sale, storeName, storeAddress, storeGstin, storePhone]);

    // ── Action handlers ─────────────────────────────────────────────────────

    const handlePrint = useCallback(async () => {
        const data = buildPrintData();
        if (!data) return;

        setActionState("printing");
        try {
            const success = await Promise.resolve(printFn(data, receiptConfig));
            if (success) {
                setActionState("done");
                onActionComplete?.("print");
                // Auto-close after brief success indicator
                setTimeout(() => onOpenChange(false), 600);
            } else {
                setActionState("idle");
                toast.error("Print failed — try again or skip");
            }
        } catch {
            setActionState("idle");
            toast.error("Print failed — try again or skip");
        }
    }, [buildPrintData, printFn, receiptConfig, onActionComplete, onOpenChange]);

    const handleSms = useCallback(() => {
        toast("SMS receipt — coming soon", { icon: "📱" });
        onActionComplete?.("sms");
        onOpenChange(false);
    }, [onActionComplete, onOpenChange]);

    const handleEmail = useCallback(() => {
        toast("Email receipt — coming soon", { icon: "📧" });
        onActionComplete?.("email");
        onOpenChange(false);
    }, [onActionComplete, onOpenChange]);

    const handleSkip = useCallback(() => {
        onActionComplete?.("skip");
        onOpenChange(false);
    }, [onActionComplete, onOpenChange]);

    // ── Keyboard shortcuts ──────────────────────────────────────────────────

    useEffect(() => {
        if (!open || actionState !== "idle") return;

        function handleKeyDown(e: KeyboardEvent) {
            switch (e.key) {
                case "1":
                    e.preventDefault();
                    handlePrint();
                    break;
                case "2":
                    e.preventDefault();
                    handleSms();
                    break;
                case "3":
                    e.preventDefault();
                    handleEmail();
                    break;
                case "4":
                case "Escape":
                    e.preventDefault();
                    handleSkip();
                    break;
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, actionState, handlePrint, handleSms, handleEmail, handleSkip]);

    if (!sale) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                ref={dialogRef}
                className="max-w-sm"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader className="text-center">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <DialogTitle className="text-center">Sale Complete!</DialogTitle>
                    <DialogDescription className="text-center">
                        Invoice: {sale.invoice_number} — How would you like the receipt?
                    </DialogDescription>
                </DialogHeader>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 gap-2 mt-2">
                    {/* Print */}
                    <Button
                        variant="outline"
                        className="h-12 justify-start gap-3 text-sm font-medium"
                        onClick={handlePrint}
                        disabled={actionState !== "idle"}
                    >
                        {actionState === "printing" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : actionState === "done" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                            <Printer className="h-4 w-4" />
                        )}
                        <span className="flex-1 text-left">
                            {actionState === "printing"
                                ? "Printing..."
                                : actionState === "done"
                                  ? "Printed!"
                                  : "Print Receipt"}
                        </span>
                        <kbd className="text-[10px] font-mono text-muted-foreground border rounded px-1.5 py-0.5 bg-muted/50">
                            1
                        </kbd>
                    </Button>

                    {/* SMS */}
                    <Button
                        variant="outline"
                        className="h-12 justify-start gap-3 text-sm font-medium"
                        onClick={handleSms}
                        disabled={actionState !== "idle"}
                    >
                        <MessageSquare className="h-4 w-4" />
                        <span className="flex-1 text-left">Send via SMS</span>
                        <kbd className="text-[10px] font-mono text-muted-foreground border rounded px-1.5 py-0.5 bg-muted/50">
                            2
                        </kbd>
                    </Button>

                    {/* Email */}
                    <Button
                        variant="outline"
                        className="h-12 justify-start gap-3 text-sm font-medium"
                        onClick={handleEmail}
                        disabled={actionState !== "idle"}
                    >
                        <Mail className="h-4 w-4" />
                        <span className="flex-1 text-left">Send via Email</span>
                        <kbd className="text-[10px] font-mono text-muted-foreground border rounded px-1.5 py-0.5 bg-muted/50">
                            3
                        </kbd>
                    </Button>

                    {/* Skip */}
                    <Button
                        variant="ghost"
                        className="h-10 justify-start gap-3 text-sm text-muted-foreground"
                        onClick={handleSkip}
                        disabled={actionState !== "idle"}
                    >
                        <X className="h-4 w-4" />
                        <span className="flex-1 text-left">No Thanks</span>
                        <kbd className="text-[10px] font-mono text-muted-foreground border rounded px-1.5 py-0.5 bg-muted/50">
                            4
                        </kbd>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
