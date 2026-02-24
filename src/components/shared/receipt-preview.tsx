"use client";

import { cn } from "@/lib/utils";
import type { ReceiptLayoutConfig, ReceiptPaperSize } from "@/hooks/use-hardware";

// ============================================================================
// MOCK DATA — used only for preview rendering
// ============================================================================

const MOCK_STORE = {
    name: "My Store",
    address: "123 Main St, Mumbai",
    phone: "+91 98765 43210",
    gstin: "27AAAAA0000A1Z5",
};

const MOCK_ITEMS = [
    { name: "Basmati Rice 5kg", hsn: "1006", qty: 2, unit: "Pcs", rate: 299, discount: 20, gst: 5, total: 578 },
    { name: "Sunflower Oil 1L", hsn: "1512", qty: 1, unit: "Pcs", rate: 180, discount: 0, gst: 5, total: 180 },
    { name: "Atta Chakki Fresh 10kg", hsn: "1101", qty: 1, unit: "Pcs", rate: 450, discount: 0, gst: 5, total: 450 },
];

// ============================================================================
// HELPERS
// ============================================================================

function getPaperMaxWidth(size: ReceiptPaperSize): string {
    switch (size) {
        case 58: return "max-w-[140px]";
        case 80: return "max-w-[196px]";
        case "A5": return "max-w-[280px]";
        case "A4": return "max-w-[360px]";
    }
}

function getFontClass(size: ReceiptLayoutConfig["fontSize"]): string {
    switch (size) {
        case "small": return "text-[8px]";
        case "medium": return "text-[9px]";
        case "large": return "text-[10px]";
    }
}

// ============================================================================
// RECEIPT PREVIEW
// ============================================================================

interface ReceiptPreviewProps {
    config: ReceiptLayoutConfig;
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
    storeGstin?: string;
    className?: string;
}

export function ReceiptPreview({
    config,
    storeName = MOCK_STORE.name,
    storeAddress = MOCK_STORE.address,
    storePhone = MOCK_STORE.phone,
    storeGstin = MOCK_STORE.gstin,
    className,
}: ReceiptPreviewProps) {
    const isInvoice = config.layout === "invoice-a4" || config.layout === "invoice-a5";
    const fontClass = getFontClass(config.fontSize);
    const paperClass = getPaperMaxWidth(config.paperSize);

    const subtotal = MOCK_ITEMS.reduce((s, i) => s + i.total, 0);
    const totalDiscount = MOCK_ITEMS.reduce((s, i) => s + i.discount, 0);
    const taxable = subtotal - totalDiscount;
    const cgst = Math.round(taxable * 0.025);
    const sgst = Math.round(taxable * 0.025);
    const total = taxable + cgst + sgst;

    return (
        <div
            className={cn(
                "w-full flex justify-center items-start py-4 bg-muted/40 rounded-xl",
                className
            )}
        >
            <div
                className={cn(
                    "bg-white border shadow-md rounded-sm w-full",
                    paperClass,
                    fontClass,
                    "text-black font-mono leading-tight"
                )}
            >
                {/* ── HEADER ────────────────────────────────────── */}
                <div className={cn("px-2 pt-2 pb-1 text-center", isInvoice && "border-b")}>
                    {config.showLogo && (
                        <div className="w-6 h-6 bg-gray-200 rounded mx-auto mb-1 flex items-center justify-center text-[6px] text-gray-400">
                            LOGO
                        </div>
                    )}
                    {config.showStoreName && (
                        <div className="font-bold text-[1.1em] leading-tight truncate">{storeName}</div>
                    )}
                    {config.showStoreAddress && (
                        <div className="text-gray-500 truncate">{storeAddress}</div>
                    )}
                    {config.showStorePhone && storePhone && (
                        <div className="text-gray-500">Ph: {storePhone}</div>
                    )}
                    {config.showStoreGstin && storeGstin && (
                        <div className="text-gray-500">GSTIN: {storeGstin}</div>
                    )}
                    {config.headerNote && (
                        <div className="text-gray-600 italic mt-0.5">{config.headerNote}</div>
                    )}
                </div>

                {/* ── INVOICE INFO ──────────────────────────────── */}
                <div className="px-2 py-0.5 border-t border-b border-dashed">
                    <div className="flex justify-between">
                        <span>Invoice: INV-0042</span>
                        <span>24/02/26</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                        <span>Time: 02:14 PM</span>
                        <span>Cashier: Admin</span>
                    </div>
                </div>

                {/* ── CUSTOMER ─────────────────────────────────── */}
                {config.showCustomerInfo && (
                    <div className="px-2 py-0.5 border-b border-dashed text-gray-500">
                        Customer: Rahul Sharma
                    </div>
                )}

                {/* ── ITEMS ────────────────────────────────────── */}
                <div className="px-2 py-0.5">
                    {/* Header row */}
                    <div className="flex border-b border-dashed font-semibold pb-0.5 mb-0.5">
                        <span className="flex-1">Item</span>
                        {config.showQty && <span className="w-4 text-right">Qty</span>}
                        {config.showRate && <span className="w-8 text-right">Rate</span>}
                        <span className="w-8 text-right">Amt</span>
                    </div>

                    {/* Item rows */}
                    {MOCK_ITEMS.map((item, i) => (
                        <div key={i} className="mb-0.5">
                            <div className="flex">
                                <span className="flex-1 truncate">{item.name}</span>
                                {config.showQty && <span className="w-4 text-right">{item.qty}</span>}
                                {config.showRate && (
                                    <span className="w-8 text-right">₹{item.rate}</span>
                                )}
                                <span className="w-8 text-right">₹{item.total}</span>
                            </div>
                            {config.showHsn && (
                                <div className="text-gray-400">HSN: {item.hsn}</div>
                            )}
                            {config.showItemDiscount && item.discount > 0 && (
                                <div className="text-gray-400">Disc: -₹{item.discount}</div>
                            )}
                        </div>
                    ))}
                </div>

                {/* ── TOTALS ───────────────────────────────────── */}
                <div className="px-2 py-0.5 border-t border-dashed space-y-0.5">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>₹{subtotal}</span>
                    </div>
                    {totalDiscount > 0 && (
                        <div className="flex justify-between text-gray-500">
                            <span>Discount</span>
                            <span>-₹{totalDiscount}</span>
                        </div>
                    )}
                    {config.showGstBreakdown && (
                        <>
                            <div className="flex justify-between text-gray-500">
                                <span>CGST (2.5%)</span>
                                <span>₹{cgst}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                                <span>SGST (2.5%)</span>
                                <span>₹{sgst}</span>
                            </div>
                        </>
                    )}
                    <div className="flex justify-between font-bold border-t border-dashed pt-0.5 text-[1.05em]">
                        <span>TOTAL</span>
                        <span>₹{total}</span>
                    </div>
                </div>

                {/* ── PAYMENT ──────────────────────────────────── */}
                <div className="px-2 py-0.5 border-t border-dashed">
                    <div className="text-gray-500">Payments</div>
                    <div className="flex justify-between">
                        <span>Cash</span>
                        <span>₹{total}</span>
                    </div>
                </div>

                {/* ── BARCODE / QR ──────────────────────────────── */}
                {(config.showBarcode || config.showQrCode) && (
                    <div className="px-2 py-1 border-t border-dashed flex gap-2 justify-center items-center">
                        {config.showBarcode && (
                            <div className="flex flex-col items-center">
                                <div className="flex gap-px h-4">
                                    {Array.from({ length: 18 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="bg-black"
                                            style={{ width: i % 3 === 0 ? "2px" : "1px" }}
                                        />
                                    ))}
                                </div>
                                <div className="text-[6px] text-gray-400 mt-0.5">INV-0042</div>
                            </div>
                        )}
                        {config.showQrCode && (
                            <div className="w-8 h-8 border border-gray-300 grid grid-cols-4 grid-rows-4 gap-px p-0.5">
                                {Array.from({ length: 16 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={cn("rounded-sm", [0, 1, 4, 5, 2, 8, 11, 14, 15].includes(i) ? "bg-black" : "bg-white")}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── FOOTER ───────────────────────────────────── */}
                <div className="px-2 py-1 border-t border-dashed text-center text-gray-500">
                    {config.showThankYou && config.footerText && (
                        <div>{config.footerText}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
