"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Barcode,
    Search,
    Loader2,
    PackageX,
    ShoppingCart,
    Tag,
    TrendingDown,
    Package,
    ReceiptText,
    Percent,
    Layers,
} from "lucide-react";
import { usePosCatalogStore } from "@/stores/pos-catalog.store";
import { formatCurrency } from "@/utils/sales.utils";
import {
    calculateDiscountPercentage,
    calculateProductTax,
    getBarcodeTypeLabel,
    detectBarcodeType,
} from "@/utils/product.utils";
import { cn } from "@/lib/utils";
import type { SellableItem } from "@/types/pos.types";

// ============================================================================
// CONSTANTS — same detection thresholds as ProductSearchBar
// ============================================================================

/** Max gap (ms) between keystrokes considered a barcode scanner */
const SCANNER_KEYSTROKE_GAP = 50;
/** Minimum characters for a valid barcode */
const SCANNER_MIN_LENGTH = 3;
/** Silence duration (ms) after which scanner auto-fires */
const SCANNER_AUTO_FIRE_MS = 30;
/** Debounce for manual text search (ms) */
const SEARCH_DEBOUNCE = 300;

// ============================================================================
// TYPES
// ============================================================================

export interface PriceLookupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storeId: string | null;
    /** Optional — if provided, shows "Add to Cart" button on each result */
    onAddProduct?: (item: SellableItem) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Discount pill — green, matches product.utils colour convention */
function DiscountBadge({ discountPct }: { discountPct: number }) {
    if (discountPct <= 0) return null;
    return (
        <Badge className="text-[10px] px-1.5 gap-0.5 bg-green-100 text-green-800 border-green-300 hover:bg-green-100 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
            <TrendingDown className="h-2.5 w-2.5" />
            {discountPct}% off MRP
        </Badge>
    );
}

/** Stock availability badge — mirrors getStockStatusColor conventions */
function StockBadge({ stock, reorderPoint }: { stock: number; reorderPoint: number }) {
    if (stock <= 0)
        return (
            <Badge className="text-[10px] px-1.5 bg-red-100 text-red-800 border-red-300 hover:bg-red-100 dark:bg-red-900 dark:text-red-300 dark:border-red-700">
                Out of stock
            </Badge>
        );
    if (stock <= reorderPoint)
        return (
            <Badge className="text-[10px] px-1.5 bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-700">
                Low stock · {stock} left
            </Badge>
        );
    return (
        <Badge className="text-[10px] px-1.5 bg-green-100 text-green-800 border-green-300 hover:bg-green-100 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
            In stock · {stock}
        </Badge>
    );
}

/** GST pill */
function GstBadge({ gst, cess }: { gst: number; cess: number }) {
    if (gst <= 0 && cess <= 0) return null;
    const label = cess > 0 ? `GST ${gst}% + Cess ${cess}%` : `GST ${gst}%`;
    return (
        <Badge variant="outline" className="text-[9px] px-1.5 gap-0.5 text-blue-700 border-blue-300 bg-blue-50 dark:text-blue-300 dark:border-blue-700 dark:bg-blue-950">
            <Percent className="h-2.5 w-2.5" />
            {label}
        </Badge>
    );
}

// ============================================================================
// PRODUCT RESULT CARD
// ============================================================================

interface ProductCardProps {
    item: SellableItem;
    isHighlighted: boolean;
    onHover: () => void;
    onAddProduct?: (item: SellableItem) => void;
    onClose: () => void;
}

function ProductCard({ item, isHighlighted, onHover, onAddProduct, onClose }: ProductCardProps) {
    const isOutOfStock = item.stock <= 0;
    const isLowStock = !isOutOfStock && item.stock <= item.reorder_point;
    const discountPct = calculateDiscountPercentage(item.mrp, item.price);
    const hasDiscount = discountPct > 0;

    // Tax breakdown for the selling price (intra-state as default for display)
    const tax = calculateProductTax(
        item.price,
        item.gst_percentage,
        item.cess_percentage,
        false // intra-state default for display
    );
    const taxIncluded = item.gst_percentage > 0;

    // Detect barcode type label for display
    const barcodeType = item.barcode ? detectBarcodeType(item.barcode) : null;
    const barcodeLabel = barcodeType ? getBarcodeTypeLabel(barcodeType) : null;

    const handleAdd = () => {
        if (onAddProduct && !isOutOfStock) {
            onAddProduct(item);
            onClose();
        }
    };

    return (
        <div
            onMouseEnter={onHover}
            className={cn(
                "rounded-lg border transition-all duration-150",
                isHighlighted
                    ? "border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "bg-card border-border hover:border-primary/20 hover:bg-accent/30",
                isOutOfStock && "opacity-55"
            )}
        >
            {/* Top strip — coloured by stock status */}
            <div
                className={cn(
                    "h-0.5 rounded-t-lg w-full",
                    isOutOfStock
                        ? "bg-red-500"
                        : isLowStock
                          ? "bg-amber-400"
                          : "bg-green-500"
                )}
            />

            <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                    {/* ── LEFT — product info ── */}
                    <div className="min-w-0 flex-1 space-y-2">
                        {/* Product name */}
                        <p className="text-md font-semibold leading-tight">{item.name}</p>

                        {/* Badges row: stock / GST / has_batch */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <StockBadge stock={item.stock} reorderPoint={item.reorder_point} />
                            <GstBadge gst={item.gst_percentage} cess={item.cess_percentage} />
                            {item.has_batch && (
                                <Badge variant="outline" className="text-[9px] px-1.5 gap-0.5 text-indigo-700 border-indigo-300 bg-indigo-50 dark:text-indigo-300 dark:border-indigo-700 dark:bg-indigo-950">
                                    <Layers className="h-2.5 w-2.5" />
                                    Batch tracked
                                </Badge>
                            )}
                        </div>

                        {/* SKU + barcode */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground font-mono">{item.sku}</span>
                            {item.barcode && (
                                <Badge variant="outline" className="text-[9px] font-mono px-1.5 gap-0.5 text-purple-700 border-purple-300 bg-purple-50 dark:text-purple-300 dark:border-purple-700 dark:bg-purple-950">
                                    <Barcode className="h-2.5 w-2.5" />
                                    {item.barcode}
                                    {barcodeLabel && (
                                        <span className="text-muted-foreground/60 ml-0.5">· {barcodeLabel}</span>
                                    )}
                                </Badge>
                            )}
                        </div>

                        {/* Meta: unit / brand / HSN */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                            {item.unit_name && (
                                <span className="flex items-center gap-0.5">
                                    <Package className="h-3 w-3" />
                                    {item.unit_name}
                                </span>
                            )}
                            {item.brand && (
                                <span className="text-muted-foreground/80 font-medium">{item.brand}</span>
                            )}
                            {item.hsn_code && (
                                <span className="flex items-center gap-0.5">
                                    <ReceiptText className="h-3 w-3" />
                                    HSN {item.hsn_code}
                                </span>
                            )}
                        </div>

                        {/* Tax breakdown (only when GST > 0) */}
                        {taxIncluded && (
                            <p className="text-[10px] text-muted-foreground/80">
                                Taxable {formatCurrency(item.price)} · CGST {formatCurrency(tax.cgst)} · SGST {formatCurrency(tax.sgst)}
                                {tax.cess > 0 && ` · Cess ${formatCurrency(tax.cess)}`}
                            </p>
                        )}
                    </div>

                    {/* ── RIGHT — PRICE block ── */}
                    <div className="flex-shrink-0 text-right space-y-1.5 min-w-[110px]">
                        {/* Selling price — primary highlight */}
                        <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Selling Price</p>
                            <p
                                className={cn(
                                    "text-2xl font-extrabold tabular-nums leading-none",
                                    isOutOfStock
                                        ? "text-muted-foreground"
                                        : isLowStock
                                          ? "text-amber-600 dark:text-amber-400"
                                          : "text-green-700 dark:text-green-400"
                                )}
                            >
                                {formatCurrency(item.price)}
                            </p>
                        </div>

                        {/* MRP */}
                        {item.mrp > 0 && (
                            <div>
                                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">MRP</p>
                                <p
                                    className={cn(
                                        "text-sm tabular-nums font-semibold",
                                        hasDiscount
                                            ? "line-through text-muted-foreground/60"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {formatCurrency(item.mrp)}
                                </p>
                            </div>
                        )}

                        {/* Discount badge */}
                        {hasDiscount && (
                            <div className="flex justify-end">
                                <DiscountBadge discountPct={discountPct} />
                            </div>
                        )}

                        {/* Add to Cart */}
                        {onAddProduct && (
                            <Button
                                size="sm"
                                variant={isOutOfStock ? "outline" : "default"}
                                className="mt-1 gap-1.5 text-xs h-7 w-full"
                                disabled={isOutOfStock}
                                onClick={handleAdd}
                                tabIndex={-1}
                            >
                                <ShoppingCart className="h-3.5 w-3.5" />
                                {isOutOfStock ? "Unavailable" : "Add to Cart"}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// PRICE LOOKUP DIALOG
// ============================================================================

export function PriceLookupDialog({
    open,
    onOpenChange,
    storeId,
    onAddProduct,
}: PriceLookupDialogProps) {
    const search = usePosCatalogStore((s) => s.search);
    const lookupBarcode = usePosCatalogStore((s) => s.lookupBarcode);
    const status = usePosCatalogStore((s) => s.status);
    const catalogLoading = status === "loading";

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SellableItem[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [isScanning, setIsScanning] = useState(false);
    const [noResults, setNoResults] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    // ── Scanner detection refs ─────────────────────────────────────────────
    const keystrokeTimestamps = useRef<number[]>([]);
    const scannerBufferRef = useRef<string>("");
    const isScannerInputRef = useRef(false);
    const scanLockRef = useRef(false);
    const scannerAutoFireRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Stable ref for barcode handler (used by auto-fire timer) ──────────
    const handleBarcodeScanRef = useRef<((barcode: string) => void) | null>(null);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (open) {
            setQuery("");
            setResults([]);
            setHighlightedIndex(-1);
            setIsScanning(false);
            setNoResults(false);
            // Focus input after animation settles
            const t = setTimeout(() => inputRef.current?.focus(), 80);
            return () => clearTimeout(t);
        } else {
            // Cleanup timers on close
            if (scannerAutoFireRef.current) clearTimeout(scannerAutoFireRef.current);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        }
    }, [open]);

    // ── Barcode scan handler ───────────────────────────────────────────────
    const handleBarcodeScan = useCallback(
        async (barcode: string) => {
            if (!storeId || scanLockRef.current) return;
            scanLockRef.current = true;
            setIsScanning(true);
            setNoResults(false);

            try {
                const item = await lookupBarcode(storeId, barcode.trim());
                if (item) {
                    setResults([item]);
                    setHighlightedIndex(0);
                    setNoResults(false);
                } else {
                    setResults([]);
                    setNoResults(true);
                }
            } finally {
                setIsScanning(false);
                scanLockRef.current = false;
                isScannerInputRef.current = false;
                keystrokeTimestamps.current = [];
                scannerBufferRef.current = "";
            }
        },
        [storeId, lookupBarcode]
    );

    // Keep ref current
    handleBarcodeScanRef.current = handleBarcodeScan;

    // ── Text search handler ────────────────────────────────────────────────
    const runTextSearch = useCallback(
        (q: string) => {
            if (q.length < 2) {
                setResults([]);
                setNoResults(false);
                return;
            }
            const found = search(q, 20);
            setResults(found);
            setNoResults(found.length === 0);
            setHighlightedIndex(found.length > 0 ? 0 : -1);
        },
        [search]
    );

    // ── Input change with scanner detection ────────────────────────────────
    const handleInputChange = useCallback(
        (value: string) => {
            const now = Date.now();
            const timestamps = keystrokeTimestamps.current;
            timestamps.push(now);

            const recentCutoff = now - 1000;
            keystrokeTimestamps.current = timestamps.filter((t) => t > recentCutoff);

            // Cancel pending auto-fire (more chars incoming)
            if (scannerAutoFireRef.current) {
                clearTimeout(scannerAutoFireRef.current);
                scannerAutoFireRef.current = null;
            }

            // Detect scanner: fast consecutive keystrokes
            if (timestamps.length >= 3) {
                const recentGaps: number[] = [];
                for (let i = Math.max(0, timestamps.length - 6); i < timestamps.length - 1; i++) {
                    recentGaps.push(timestamps[i + 1] - timestamps[i]);
                }
                const avgGap = recentGaps.reduce((a, b) => a + b, 0) / recentGaps.length;

                if (avgGap < SCANNER_KEYSTROKE_GAP && recentGaps.length >= 2) {
                    isScannerInputRef.current = true;
                    scannerBufferRef.current = value;

                    // Auto-fire after SCANNER_AUTO_FIRE_MS of silence
                    scannerAutoFireRef.current = setTimeout(() => {
                        const barcode = scannerBufferRef.current.trim();
                        if (barcode.length >= SCANNER_MIN_LENGTH) {
                            handleBarcodeScanRef.current?.(barcode);
                        }
                        scannerAutoFireRef.current = null;
                    }, SCANNER_AUTO_FIRE_MS);
                }
            }

            setQuery(value);

            if (debounceRef.current) clearTimeout(debounceRef.current);

            if (!isScannerInputRef.current) {
                // Manual text: debounce search
                debounceRef.current = setTimeout(() => {
                    runTextSearch(value);
                }, SEARCH_DEBOUNCE);
            }
        },
        [runTextSearch]
    );

    // ── Keyboard navigation ────────────────────────────────────────────────
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case "Enter": {
                    e.preventDefault();

                    // Cancel pending auto-fire (user pressed Enter manually)
                    if (scannerAutoFireRef.current) {
                        clearTimeout(scannerAutoFireRef.current);
                        scannerAutoFireRef.current = null;
                    }

                    // If item highlighted, add to cart
                    const highlighted = results[highlightedIndex];
                    if (highlighted && onAddProduct && highlighted.stock > 0) {
                        onAddProduct(highlighted);
                        onOpenChange(false);
                        return;
                    }

                    // Otherwise treat as barcode lookup
                    const trimmed = query.trim();
                    if (trimmed.length >= SCANNER_MIN_LENGTH && !isScannerInputRef.current) {
                        handleBarcodeScan(trimmed);
                    }
                    isScannerInputRef.current = false;
                    keystrokeTimestamps.current = [];
                    scannerBufferRef.current = "";
                    break;
                }
                case "ArrowDown":
                    e.preventDefault();
                    setHighlightedIndex((p) =>
                        results.length > 0 ? (p < results.length - 1 ? p + 1 : 0) : -1
                    );
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setHighlightedIndex((p) =>
                        results.length > 0 ? (p > 0 ? p - 1 : results.length - 1) : -1
                    );
                    break;
                case "Escape":
                    onOpenChange(false);
                    break;
            }
        },
        [results, highlightedIndex, query, onAddProduct, onOpenChange, handleBarcodeScan]
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-3xl w-full p-0 gap-0 overflow-hidden"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader className="px-5 pt-5 pb-0 pb-3">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Tag className="h-4 w-4 text-primary" />
                        Price Lookup
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Scan a barcode or search by name / SKU to check pricing and stock.
                        {onAddProduct && " Press Enter or click Add to Cart to add to current bill."}
                    </DialogDescription>
                </DialogHeader>
                {/* Search Input */}
                <div className="px-5 py-3">
                    <div className="relative">
                        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Scan barcode or type product name / SKU..."
                            className="pl-9 pr-9"
                            autoComplete="off"
                            spellCheck={false}
                            data-price-lookup-search="true"
                        />
                        {isScanning ? (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
                        ) : catalogLoading ? (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                        ) : (
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        )}
                    </div>
                    {/* Keyboard hint */}
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                        <kbd className="font-mono border rounded px-1 bg-muted/50">↑</kbd>{" "}
                        <kbd className="font-mono border rounded px-1 bg-muted/50">↓</kbd> navigate
                        {onAddProduct && (
                            <>
                                {" · "}
                                <kbd className="font-mono border rounded px-1 bg-muted/50">Enter</kbd> add to cart
                            </>
                        )}
                        {" · "}
                        <kbd className="font-mono border rounded px-1 bg-muted/50">Esc</kbd> close
                    </p>
                </div>

                {/* Results */}
                <ScrollArea className="max-h-[420px] px-5 pb-5">
                    <div className="space-y-2">
                        {/* Loading skeleton */}
                        {isScanning && (
                            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span className="text-sm">Looking up barcode…</span>
                            </div>
                        )}

                        {/* Empty / no results state */}
                        {!isScanning && noResults && (
                            <div className="flex flex-col items-center py-10 gap-2 text-center">
                                <PackageX className="h-10 w-10 text-muted-foreground/50" />
                                <p className="text-sm font-medium text-muted-foreground">No product found</p>
                                <p className="text-xs text-muted-foreground">
                                    Try searching by name, SKU, or scan the barcode again.
                                </p>
                            </div>
                        )}

                        {/* Idle prompt */}
                        {!isScanning && !noResults && results.length === 0 && (
                            <div className="flex flex-col items-center py-10 gap-2 text-center text-muted-foreground">
                                <Barcode className="h-10 w-10 opacity-30" />
                                <p className="text-sm">Scan a barcode or type to search</p>
                            </div>
                        )}

                        {/* Product cards */}
                        {!isScanning &&
                            results.map((item, index) => (
                                <ProductCard
                                    key={item.id}
                                    item={item}
                                    isHighlighted={highlightedIndex === index}
                                    onHover={() => setHighlightedIndex(index)}
                                    onAddProduct={onAddProduct}
                                    onClose={() => onOpenChange(false)}
                                />
                            ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
