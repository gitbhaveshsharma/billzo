"use client";

import { forwardRef } from "react";
import { Printer, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { EnrichedSale } from "@/types/sales.types";
import {
    buildReceiptData,
    formatCurrency,
    formatDate,
} from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

interface ReceiptViewProps {
    sale: EnrichedSale;
    storeName: string;
    storeAddress: string;
    storeGstin?: string | null;
    storePhone?: string | null;
    onPrint?: () => void;
    /** Compact mode for POS thermal printer style */
    compact?: boolean;
}

// ============================================================================
// RECEIPT VIEW
// ============================================================================

export const ReceiptView = forwardRef<HTMLDivElement, ReceiptViewProps>(
    function ReceiptView(
        {
            sale,
            storeName,
            storeAddress,
            storeGstin = null,
            storePhone = null,
            onPrint,
            compact = false,
        },
        ref
    ) {
        const receipt = buildReceiptData(
            sale,
            storeName,
            storeAddress,
            storeGstin ?? null,
            storePhone ?? null
        );

        return (
            <div className="space-y-3">
                {/* Action Buttons (not printed) */}
                {onPrint && (
                    <div className="flex gap-2 print:hidden">
                        <Button variant="outline" size="sm" className="gap-1" onClick={onPrint}>
                            <Printer className="h-3.5 w-3.5" />
                            Print
                        </Button>
                    </div>
                )}

                {/* Receipt Content */}
                <div
                    ref={ref}
                    className={`bg-white text-black p-4 rounded-md border print:border-none print:p-0 ${
                        compact ? "max-w-[300px] text-xs" : "max-w-[400px] text-sm"
                    }`}
                >
                    {/* Store Header */}
                    <div className="text-center space-y-0.5">
                        <h2 className={compact ? "text-sm font-bold" : "text-base font-bold"}>
                            {receipt.store.name}
                        </h2>
                        <p className="text-xs text-gray-600">{receipt.store.address}</p>
                        {receipt.store.phone && (
                            <p className="text-xs text-gray-600">
                                Ph: {receipt.store.phone}
                            </p>
                        )}
                        {receipt.store.gstin && (
                            <p className="text-xs text-gray-600">
                                GSTIN: {receipt.store.gstin}
                            </p>
                        )}
                    </div>

                    <Separator className="my-2 border-dashed" />

                    {/* Invoice Info */}
                    <div className="flex justify-between text-xs">
                        <span>Invoice: {receipt.invoice.number}</span>
                        <span>{receipt.invoice.date}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                        <span>Time: {receipt.invoice.time}</span>
                        {sale.cashier_name && <span>Cashier: {sale.cashier_name}</span>}
                    </div>

                    {/* Customer */}
                    {receipt.customer.name && (
                        <div className="text-xs mt-1">
                            <span className="text-gray-600">Customer: </span>
                            {receipt.customer.name}
                            {receipt.customer.phone && ` (${receipt.customer.phone})`}
                            {receipt.customer.gstin && (
                                <div className="text-gray-600">
                                    GSTIN: {receipt.customer.gstin}
                                </div>
                            )}
                        </div>
                    )}

                    <Separator className="my-2 border-dashed" />

                    {/* Items Table */}
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-dashed">
                                <th className="text-left py-0.5 font-medium">Item</th>
                                <th className="text-right py-0.5 font-medium">Qty</th>
                                <th className="text-right py-0.5 font-medium">Rate</th>
                                <th className="text-right py-0.5 font-medium">Amt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receipt.items.map((item, i) => (
                                <tr key={i} className="border-b border-dotted">
                                    <td className="py-0.5">
                                        <div>{item.name}</div>
                                        {!compact && item.hsn && (
                                            <div className="text-gray-500 text-[10px]">
                                                HSN: {item.hsn}
                                            </div>
                                        )}
                                    </td>
                                    <td className="text-right py-0.5">
                                        {item.qty}
                                        {item.unit ? ` ${item.unit}` : ""}
                                    </td>
                                    <td className="text-right py-0.5">
                                        {formatCurrency(item.price)}
                                    </td>
                                    <td className="text-right py-0.5">
                                        {formatCurrency(item.total)}
                                        {item.discount > 0 && (
                                            <div className="text-gray-500 text-[10px]">
                                                Disc: -{formatCurrency(item.discount)}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <Separator className="my-2 border-dashed" />

                    {/* Totals */}
                    <div className="space-y-0.5 text-xs">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>{formatCurrency(receipt.totals.subtotal)}</span>
                        </div>
                        {receipt.totals.discount > 0 && (
                            <div className="flex justify-between">
                                <span>Discount</span>
                                <span>-{formatCurrency(receipt.totals.discount)}</span>
                            </div>
                        )}
                        {receipt.totals.cgst > 0 && (
                            <div className="flex justify-between">
                                <span>CGST</span>
                                <span>{formatCurrency(receipt.totals.cgst)}</span>
                            </div>
                        )}
                        {receipt.totals.sgst > 0 && (
                            <div className="flex justify-between">
                                <span>SGST</span>
                                <span>{formatCurrency(receipt.totals.sgst)}</span>
                            </div>
                        )}
                        {receipt.totals.igst > 0 && (
                            <div className="flex justify-between">
                                <span>IGST</span>
                                <span>{formatCurrency(receipt.totals.igst)}</span>
                            </div>
                        )}
                        {receipt.totals.cess > 0 && (
                            <div className="flex justify-between">
                                <span>Cess</span>
                                <span>{formatCurrency(receipt.totals.cess)}</span>
                            </div>
                        )}
                        {receipt.totals.round_off !== 0 && (
                            <div className="flex justify-between">
                                <span>Round Off</span>
                                <span>{formatCurrency(receipt.totals.round_off)}</span>
                            </div>
                        )}
                        <Separator className="my-1 border-dashed" />
                        <div className="flex justify-between font-bold text-sm">
                            <span>TOTAL</span>
                            <span>{formatCurrency(receipt.totals.total)}</span>
                        </div>
                    </div>

                    <Separator className="my-2 border-dashed" />

                    {/* Payments */}
                    <div className="space-y-0.5 text-xs">
                        <p className="font-medium">Payments</p>
                        {receipt.payments.map((p, i) => (
                            <div key={i} className="flex justify-between">
                                <span>
                                    {p.method}
                                    {p.reference && (
                                        <span className="text-gray-500"> ({p.reference})</span>
                                    )}
                                </span>
                                <span>{formatCurrency(p.amount)}</span>
                            </div>
                        ))}
                        {receipt.totals.change > 0 && (
                            <div className="flex justify-between font-medium">
                                <span>Change</span>
                                <span>{formatCurrency(receipt.totals.change)}</span>
                            </div>
                        )}
                        {receipt.totals.due > 0 && (
                            <div className="flex justify-between font-medium text-red-600">
                                <span>Balance Due</span>
                                <span>{formatCurrency(receipt.totals.due)}</span>
                            </div>
                        )}
                    </div>

                    {/* Credit info */}
                    {receipt.footer.is_credit && (
                        <>
                            <Separator className="my-2 border-dashed" />
                            <div className="text-xs text-center">
                                <p className="font-medium">CREDIT SALE</p>
                                {receipt.footer.credit_due_date && (
                                    <p>
                                        Payment Due: {formatDate(receipt.footer.credit_due_date)}
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    {/* Notes */}
                    {receipt.footer.notes && (
                        <>
                            <Separator className="my-2 border-dashed" />
                            <p className="text-xs text-gray-600 text-center">
                                {receipt.footer.notes}
                            </p>
                        </>
                    )}

                    {/* Footer */}
                    <Separator className="my-2 border-dashed" />
                    <p className="text-xs text-center text-gray-500">
                        Thank you for your purchase!
                    </p>
                </div>
            </div>
        );
    }
);
