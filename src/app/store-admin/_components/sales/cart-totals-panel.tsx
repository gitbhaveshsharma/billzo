"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { SaleCalculation } from "@/utils/sales.utils";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

interface CartTotalsPanelProps {
    totals: SaleCalculation;
    billDiscountPercentage: number;
    isInterstate: boolean;
    onBillDiscountChange: (percentage: number, amount: number) => void;
}

// ============================================================================
// TOTALS ROW
// ============================================================================

function TotalRow({
    label,
    value,
    bold = false,
    large = false,
    negative = false,
    muted = false,
}: {
    label: string;
    value: string;
    bold?: boolean;
    large?: boolean;
    negative?: boolean;
    muted?: boolean;
}) {
    return (
        <div className="flex items-center justify-between">
            <span
                className={`${large ? "text-sm font-bold" : "text-xs"} ${
                    muted ? "text-muted-foreground" : ""
                }`}
            >
                {label}
            </span>
            <span
                className={`${large ? "text-lg font-bold" : "text-xs"} ${
                    bold ? "font-semibold" : ""
                } ${negative ? "text-green-600" : ""}`}
            >
                {negative ? "-" : ""}
                {value}
            </span>
        </div>
    );
}

// ============================================================================
// CART TOTALS PANEL
// ============================================================================

export function CartTotalsPanel({
    totals,
    billDiscountPercentage,
    isInterstate,
    onBillDiscountChange,
}: CartTotalsPanelProps) {
    const handlePercentageChange = (value: string) => {
        const pct = Math.min(100, Math.max(0, Number(value) || 0));
        // Calculate amount from percentage of subtotal
        const amount = (totals.subtotal * pct) / 100;
        onBillDiscountChange(pct, Math.round(amount * 100) / 100);
    };

    return (
        <div className="space-y-1.5 px-3 py-2 bg-muted/30 rounded-lg">
            <TotalRow label="Subtotal" value={formatCurrency(totals.subtotal)} muted />

            {totals.item_discount_total > 0 && (
                <TotalRow
                    label="Item Discounts"
                    value={formatCurrency(totals.item_discount_total)}
                    negative
                />
            )}

            {/* Bill Discount */}
            <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">
                    Bill Discount %
                </Label>
                <div className="flex items-center gap-1">
                    <Input
                        type="number"
                        value={billDiscountPercentage || ""}
                        onChange={(e) => handlePercentageChange(e.target.value)}
                        placeholder="0"
                        className="h-6 w-14 text-center text-xs p-0"
                        min={0}
                        max={100}
                    />
                    {totals.bill_discount_amount > 0 && (
                        <span className="text-xs text-green-600">
                            -{formatCurrency(totals.bill_discount_amount)}
                        </span>
                    )}
                </div>
            </div>

            <TotalRow label="Taxable Amount" value={formatCurrency(totals.taxable_amount)} muted />

            <Separator className="my-1" />

            {/* Tax breakdown */}
            {isInterstate ? (
                <TotalRow label="IGST" value={formatCurrency(totals.igst_amount)} muted />
            ) : (
                <>
                    <TotalRow label="CGST" value={formatCurrency(totals.cgst_amount)} muted />
                    <TotalRow label="SGST" value={formatCurrency(totals.sgst_amount)} muted />
                </>
            )}

            {totals.cess_amount > 0 && (
                <TotalRow label="Cess" value={formatCurrency(totals.cess_amount)} muted />
            )}

            {totals.round_off !== 0 && (
                <TotalRow
                    label="Round Off"
                    value={formatCurrency(Math.abs(totals.round_off))}
                    negative={totals.round_off < 0}
                    muted
                />
            )}

            <Separator className="my-1" />

            <TotalRow
                label="Total Amount"
                value={formatCurrency(totals.total_amount)}
                large
                bold
            />
        </div>
    );
}
