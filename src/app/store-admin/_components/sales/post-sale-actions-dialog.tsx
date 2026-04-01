"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    Printer,
    MessageSquare,
    Mail,
    X,
    CheckCircle2,
    Loader2,
    AlertTriangle,
    RefreshCw,
    Wifi,
    WifiOff,
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
import { useCustomerStore } from "@/stores/customers.store";

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
    /** Hardware print function (Bridge → USB only, no browser fallback) */
    printFn: (data: PrintReceiptData, config: ReceiptLayoutConfig) => Promise<boolean> | boolean;
    /** Whether the Print Bridge is connected (native thermal printer) */
    hasBridgePrinter?: boolean;
    /** Current bridge connection status */
    bridgeStatus?: "unknown" | "running" | "connected" | "offline";
    /** Retry bridge detection */
    onRetryBridge?: () => void;
    /** Callback after any receipt action completes */
    onActionComplete?: (action: "print" | "sms" | "email" | "skip") => void;
}

type ActionState = "idle" | "printing" | "done" | "error";

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
    hasBridgePrinter = false,
    bridgeStatus = "unknown",
    onRetryBridge,
    onActionComplete,
}: PostSaleActionsDialogProps) {
    const [actionState, setActionState] = useState<ActionState>("idle");
    const [lastError, setLastError] = useState<string | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const customerCache = useCustomerStore((s) => s.customerCache);

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setActionState("idle");
            setLastError(null);
        }
    }, [open]);

    // Build receipt data from enriched sale
    const buildPrintData = useCallback((): PrintReceiptData | null => {
        if (!sale) return null;

        // Look up customer address from in-memory cache (no API call)
        const cachedCustomer = sale.customer_id ? customerCache.get(sale.customer_id)?.data : null;
        const customerAddress = cachedCustomer?.address_line1
            ? [cachedCustomer.address_line1, cachedCustomer.address_line2, cachedCustomer.city, cachedCustomer.state, cachedCustomer.pincode]
                  .filter(Boolean)
                  .join(", ")
            : null;

        const receipt = buildReceiptData(
            sale,
            storeName,
            storeAddress,
            storeGstin ?? null,
            storePhone ?? null,
            customerAddress
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
            gstType: receipt.gstType,
        };
    }, [sale, storeName, storeAddress, storeGstin, storePhone, customerCache]);

    // ── Action handlers ─────────────────────────────────────────────────────

    const handlePrint = useCallback(async () => {
        const data = buildPrintData();
        if (!data) return;

        setActionState("printing");
        setLastError(null);
        try {
            const success = await Promise.resolve(printFn(data, receiptConfig));
            if (success) {
                setActionState("done");
                onActionComplete?.("print");
                // Auto-close after brief success indicator
                setTimeout(() => onOpenChange(false), 600);
            } else {
                setActionState("error");
                const errMsg = hasBridgePrinter
                    ? "Print Bridge failed — check printer connection"
                    : "No printer connected — start Print Bridge or connect a USB printer";
                setLastError(errMsg);
                toast.error(errMsg);
            }
        } catch {
            setActionState("error");
            const errMsg = hasBridgePrinter
                ? "Print failed — check printer & bridge"
                : "No printer available";
            setLastError(errMsg);
            toast.error(errMsg);
        }
    }, [buildPrintData, printFn, receiptConfig, onActionComplete, onOpenChange, hasBridgePrinter]);

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
        if (!open || actionState === "printing" || actionState === "done") return;

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

    const isBridgeOnline = bridgeStatus === "connected";
    const showPrinterWarning = !hasBridgePrinter && bridgeStatus !== "unknown";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                ref={dialogRef}
                className="max-w-wd"
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

                {/* Printer Status Indicator */}
                <div className="mx-4 mt-1">
                    <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
                        isBridgeOnline
                            ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                            : showPrinterWarning
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                    }`}>
                        {isBridgeOnline ? (
                            <>
                                <Wifi className="h-3.5 w-3.5 shrink-0" />
                                <span className="flex-1">Print Bridge connected — thermal printer ready</span>
                            </>
                        ) : showPrinterWarning ? (
                            <>
                                <WifiOff className="h-3.5 w-3.5 shrink-0" />
                                <span className="flex-1">Print Bridge offline — start it to enable printing</span>
                                {onRetryBridge && (
                                    <button
                                        onClick={onRetryBridge}
                                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                        Retry
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <Printer className="h-3.5 w-3.5 shrink-0" />
                                <span className="flex-1">Checking printer...</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Error message from last print attempt */}
                {actionState === "error" && lastError && (
                    <div className="mx-4 flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p>{lastError}</p>
                            <p className="mt-1 opacity-70">Press 1 to retry or 4 to skip</p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-1 gap-2 mt-2 p-4">
                    {/* Print */}
                    <Button
                        variant="outline"
                        className={`h-12 justify-start gap-3 text-sm font-medium ${
                            actionState === "error"
                                ? "border-red-200 dark:border-red-800"
                                : ""
                        }`}
                        onClick={handlePrint}
                        disabled={actionState === "printing" || actionState === "done"}
                    >
                        {actionState === "printing" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : actionState === "done" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : actionState === "error" ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : (
                            <Printer className="h-4 w-4" />
                        )}
                        <span className="flex-1 text-left">
                            {actionState === "printing"
                                ? "Printing..."
                                : actionState === "done"
                                  ? "Printed!"
                                  : actionState === "error"
                                    ? "Retry Print"
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
                        disabled={actionState === "printing" || actionState === "done"}
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
                        disabled={actionState === "printing" || actionState === "done"}
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
                        disabled={actionState === "printing" || actionState === "done"}
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
