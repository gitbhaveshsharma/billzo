"use client";

import { useEffect } from "react";
import { Clock, User, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import type { HoldBill, Sale } from "@/types/sales.types";
import { formatCurrency, formatRelativeTime } from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

interface HoldBillsDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Local hold bills (saved in cart state) */
    localHoldBills: HoldBill[];
    /** Server hold bills (saved in DB with HOLD status) */
    serverHoldBills: Sale[];
    onRecallLocal: (billId: string) => void;
    onRemoveLocal: (billId: string) => void;
    onRecallServer: (saleId: string) => void;
}

// ============================================================================
// LOCAL HOLD BILL CARD
// ============================================================================

function LocalHoldCard({
    bill,
    index,
    onRecall,
    onRemove,
}: {
    bill: HoldBill;
    index: number;
    onRecall: (id: string) => void;
    onRemove: (id: string) => void;
}) {
    return (
        <div className="border rounded-md p-3 space-y-2 relative">
            {index <= 9 && (
                <kbd className="absolute top-1.5 right-1.5 text-[10px] font-mono text-muted-foreground border rounded px-1 bg-muted/50">
                    {index}
                </kbd>
            )}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">
                        {bill.items.length} item{bill.items.length !== 1 ? "s" : ""}
                    </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(bill.held_at)}
                </div>
            </div>

            {bill.customer_name && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{bill.customer_name}</span>
                    {bill.customer_phone && <span>({bill.customer_phone})</span>}
                </div>
            )}

            <div className="text-sm font-bold">
                {formatCurrency(
                    bill.items.reduce(
                        (sum, item) => sum + item.unit_price * item.quantity,
                        0
                    )
                )}
            </div>

            {bill.notes && (
                <p className="text-xs text-muted-foreground italic">{bill.notes}</p>
            )}

            <div className="flex gap-2">
                <Button
                    variant="default"
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={() => onRecall(bill.id)}
                >
                    Recall
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-500 hover:text-red-700"
                    onClick={() => onRemove(bill.id)}
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}

// ============================================================================
// SERVER HOLD BILL CARD
// ============================================================================

function ServerHoldCard({
    sale,
    index,
    onRecall,
}: {
    sale: Sale;
    index: number;
    onRecall: (saleId: string) => void;
}) {
    return (
        <div className="border rounded-md p-3 space-y-2 relative">
            {index <= 9 && (
                <kbd className="absolute top-1.5 right-1.5 text-[10px] font-mono text-muted-foreground border rounded px-1 bg-muted/50">
                    {index}
                </kbd>
            )}
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-600">
                    {sale.invoice_number || "Draft"}
                </span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(sale.updated_at)}
                </div>
            </div>

            {sale.customer_name && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{sale.customer_name}</span>
                </div>
            )}

            <div className="text-sm font-bold">
                {formatCurrency(sale.total_amount)}
            </div>

            <Button
                variant="default"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => onRecall(sale.id)}
            >
                Recall
            </Button>
        </div>
    );
}

// ============================================================================
// HOLD BILLS DRAWER
// ============================================================================

export function HoldBillsDrawer({
    open,
    onOpenChange,
    localHoldBills,
    serverHoldBills,
    onRecallLocal,
    onRemoveLocal,
    onRecallServer,
}: HoldBillsDrawerProps) {
    const totalHolds = localHoldBills.length + serverHoldBills.length;

    // ========================================================================
    // KEYBOARD SHORTCUTS — Number keys (1-9) to recall bills in order
    // ========================================================================
    useEffect(() => {
        if (!open) return;

        function handleKeyDown(e: KeyboardEvent) {
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName.toLowerCase() ?? "";
            if (tag === "input" || tag === "textarea" || tag === "select") return;
            if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

            const idx = parseInt(e.key, 10);
            if (idx >= 1 && idx <= 9) {
                const oneBasedIdx = idx - 1;
                // Local bills come first, then server bills
                if (oneBasedIdx < localHoldBills.length) {
                    e.preventDefault();
                    onRecallLocal(localHoldBills[oneBasedIdx].id);
                } else {
                    const serverIdx = oneBasedIdx - localHoldBills.length;
                    if (serverIdx < serverHoldBills.length) {
                        e.preventDefault();
                        onRecallServer(serverHoldBills[serverIdx].id);
                    }
                }
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, localHoldBills, serverHoldBills, onRecallLocal, onRecallServer]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-[360px] sm:w-[400px]">
                <SheetHeader>
                    <SheetTitle>
                        Held Bills ({totalHolds})
                    </SheetTitle>
                    <SheetDescription>
                        Bills put on hold. Recall to continue billing.
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="mt-4 h-[calc(100vh-120px)]">
                    <div className="space-y-4 pr-2 p-4">
                        {/* Local hold bills */}
                        {localHoldBills.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Current Session
                                </h3>
                                {localHoldBills.map((bill, idx) => (
                                    <LocalHoldCard
                                        key={bill.id}
                                        bill={bill}
                                        index={idx + 1}
                                        onRecall={onRecallLocal}
                                        onRemove={onRemoveLocal}
                                    />
                                ))}
                            </div>
                        )}

                        {localHoldBills.length > 0 && serverHoldBills.length > 0 && (
                            <Separator />
                        )}

                        {/* Server hold bills */}
                        {serverHoldBills.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Saved Hold Bills
                                </h3>
                                {serverHoldBills.map((sale, idx) => (
                                    <ServerHoldCard
                                        key={sale.id}
                                        sale={sale}
                                        index={localHoldBills.length + idx + 1}
                                        onRecall={onRecallServer}
                                    />
                                ))}
                            </div>
                        )}

                        {totalHolds === 0 && (
                            <div className="text-center py-12">
                                <p className="text-sm text-muted-foreground">
                                    No held bills
                                </p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
