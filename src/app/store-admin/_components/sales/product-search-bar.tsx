"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Barcode, PackageX, Loader2 } from "lucide-react";
import type { Product } from "@/types/product.types";
import { useProductStore } from "@/stores/product.store";
import { formatCurrency } from "@/utils/sales.utils";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface ProductSearchBarProps {
    storeId: string | null;
    onAddProduct: (product: Product) => void;
    className?: string;
    autoFocus?: boolean;
}

// ============================================================================
// SCANNER DETECTION CONFIG
// ============================================================================

/** Max time between keystrokes to consider it a barcode scanner (ms) */
const SCANNER_KEYSTROKE_GAP = 50;
/** Minimum characters for a valid barcode */
const SCANNER_MIN_LENGTH = 3;
/** Debounce for manual text search (ms) */
const SEARCH_DEBOUNCE = 300;

// ============================================================================
// PRODUCT SEARCH BAR — Barcode scanner auto-detect + text search
// ============================================================================

export function ProductSearchBar({
    storeId,
    onAddProduct,
    className,
    autoFocus = true,
}: ProductSearchBarProps) {
    const { products, isLoading: productsLoading, fetchProducts, lookupByBarcode } =
        useProductStore();

    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [isScanning, setIsScanning] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Scanner detection refs ─────────────────────────────────────────────
    // Track keystroke timing to distinguish scanner from human typing
    const keystrokeTimestamps = useRef<number[]>([]);
    const scannerBufferRef = useRef<string>("");
    const isScannerInputRef = useRef(false);
    const scanLockRef = useRef(false);

    // ── Global barcode listener (works even when input is not focused) ─────
    const globalBufferRef = useRef<string>("");
    const globalLastKeystrokeRef = useRef<number>(0);
    const globalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch products on mount
    useEffect(() => {
        if (storeId) {
            fetchProducts(storeId);
        }
    }, [storeId, fetchProducts]);

    // ── Global keyboard listener for barcode scanner ───────────────────────
    // This catches scanner input even when the search input isn't focused
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Skip if focused on our search input (handled by input events)
            if (document.activeElement === inputRef.current) return;
            // Skip if typing in other inputs/textareas
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

            const now = Date.now();
            const gap = now - globalLastKeystrokeRef.current;

            // Reset buffer if gap too large (human typing)
            if (gap > SCANNER_KEYSTROKE_GAP && globalBufferRef.current.length > 0) {
                globalBufferRef.current = "";
            }

            globalLastKeystrokeRef.current = now;

            if (e.key === "Enter") {
                const barcode = globalBufferRef.current.trim();
                if (barcode.length >= SCANNER_MIN_LENGTH) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleBarcodeScan(barcode);
                }
                globalBufferRef.current = "";
                return;
            }

            // Only accept printable single characters
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                globalBufferRef.current += e.key;
            }

            // Auto-clear after inactivity
            if (globalTimerRef.current) clearTimeout(globalTimerRef.current);
            globalTimerRef.current = setTimeout(() => {
                globalBufferRef.current = "";
            }, SCANNER_KEYSTROKE_GAP * 4);
        };

        document.addEventListener("keydown", handleGlobalKeyDown, true);
        return () => document.removeEventListener("keydown", handleGlobalKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);

    // Filter products by search query (only for manual typing)
    const filteredProducts = (!isScannerInputRef.current && query.length >= 2)
        ? products.filter(
              (p) =>
                  p.is_active &&
                  (p.name.toLowerCase().includes(query.toLowerCase()) ||
                      p.product_code.toLowerCase().includes(query.toLowerCase()) ||
                      (p.barcode && p.barcode.includes(query)))
          ).slice(0, 10)
        : [];

    // Open dropdown when results exist
    useEffect(() => {
        if (filteredProducts.length > 0 && query.length >= 2 && !isScanning) {
            setIsOpen(true);
        } else if (query.length < 2) {
            setIsOpen(false);
        }
        setHighlightedIndex(-1);
    }, [query, filteredProducts.length, isScanning]);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ── Barcode scan handler ───────────────────────────────────────────────
    const handleBarcodeScan = useCallback(
        async (barcode: string) => {
            if (!storeId || scanLockRef.current) return;
            scanLockRef.current = true;
            setIsScanning(true);
            setIsOpen(false);

            try {
                // First try exact barcode lookup via the store
                const product = await lookupByBarcode(storeId, barcode.trim());
                if (product) {
                    onAddProduct(product);
                    setQuery("");
                    setIsOpen(false);
                    inputRef.current?.focus();
                } else {
                    // Try matching in local products list
                    const localMatch = products.find(
                        (p) =>
                            p.is_active &&
                            (p.barcode === barcode.trim() ||
                             p.product_code === barcode.trim())
                    );
                    if (localMatch) {
                        onAddProduct(localMatch);
                        setQuery("");
                        setIsOpen(false);
                        inputRef.current?.focus();
                    } else {
                        // Show no results
                        setQuery(barcode);
                        setIsOpen(true);
                    }
                }
            } finally {
                setIsScanning(false);
                scanLockRef.current = false;
                // Reset scanner detection state
                isScannerInputRef.current = false;
                keystrokeTimestamps.current = [];
                scannerBufferRef.current = "";
            }
        },
        [storeId, lookupByBarcode, onAddProduct, products]
    );

    const handleSelect = useCallback(
        (product: Product) => {
            onAddProduct(product);
            setQuery("");
            setIsOpen(false);
            inputRef.current?.focus();
        },
        [onAddProduct]
    );

    // ── Input change with scanner detection ────────────────────────────────
    const handleInputChange = useCallback(
        (value: string) => {
            const now = Date.now();
            const timestamps = keystrokeTimestamps.current;
            timestamps.push(now);

            // Keep only recent timestamps
            const recentCutoff = now - 1000;
            keystrokeTimestamps.current = timestamps.filter((t) => t > recentCutoff);

            // Detect scanner: fast consecutive keystrokes
            if (timestamps.length >= 3) {
                const recentGaps: number[] = [];
                for (let i = Math.max(0, timestamps.length - 6); i < timestamps.length - 1; i++) {
                    recentGaps.push(timestamps[i + 1] - timestamps[i]);
                }
                const avgGap = recentGaps.reduce((a, b) => a + b, 0) / recentGaps.length;

                // If average gap is very fast, it's a scanner
                if (avgGap < SCANNER_KEYSTROKE_GAP && recentGaps.length >= 2) {
                    isScannerInputRef.current = true;
                    scannerBufferRef.current = value;
                }
            }

            setQuery(value);
            if (debounceRef.current) clearTimeout(debounceRef.current);

            // If not scanner input, debounce the search
            if (!isScannerInputRef.current) {
                debounceRef.current = setTimeout(() => {
                    // Trigger search (filteredProducts will update via state)
                }, SEARCH_DEBOUNCE);
            }
        },
        []
    );

    // ── Keyboard handling ──────────────────────────────────────────────────
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
                e.preventDefault();

                // If a product is highlighted in dropdown, select it
                if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
                    handleSelect(filteredProducts[highlightedIndex]);
                    return;
                }

                // Scanner sent Enter — trigger barcode lookup
                const trimmed = query.trim();
                if (trimmed.length >= SCANNER_MIN_LENGTH) {
                    handleBarcodeScan(trimmed);
                }

                // Reset scanner state
                isScannerInputRef.current = false;
                keystrokeTimestamps.current = [];
                scannerBufferRef.current = "";
                return;
            }

            if (!isOpen) return;

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setHighlightedIndex((prev) =>
                        prev < filteredProducts.length - 1 ? prev + 1 : 0
                    );
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setHighlightedIndex((prev) =>
                        prev > 0 ? prev - 1 : filteredProducts.length - 1
                    );
                    break;
                case "Escape":
                    setIsOpen(false);
                    setHighlightedIndex(-1);
                    break;
            }
        },
        [isOpen, highlightedIndex, filteredProducts, handleSelect, handleBarcodeScan, query]
    );

    return (
        <div ref={containerRef} className={cn("relative", className)} data-pos-scanner>
            <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (filteredProducts.length > 0) setIsOpen(true);
                    }}
                    placeholder="Scan barcode or search product..."
                    className="pl-9 pr-9"
                    autoFocus={autoFocus}
                    autoComplete="off"
                    spellCheck={false}
                />
                {isScanning ? (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
                ) : (
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
            </div>

            {isOpen && (
                <Card className="absolute z-50 top-full left-0 right-0 mt-1 shadow-lg max-h-[320px] overflow-y-auto">
                    <div className="p-1">
                        {productsLoading && filteredProducts.length === 0 && (
                            <div className="space-y-2 p-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <Skeleton className="h-8 w-8 rounded" />
                                        <div className="space-y-1 flex-1">
                                            <Skeleton className="h-3 w-32" />
                                            <Skeleton className="h-2.5 w-20" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!productsLoading && filteredProducts.length === 0 && query.length >= 2 && !isScanning && (
                            <div className="flex flex-col items-center py-4 text-center">
                                <PackageX className="h-6 w-6 text-muted-foreground mb-1" />
                                <p className="text-sm text-muted-foreground">No products found</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Try scanning again or check the barcode
                                </p>
                            </div>
                        )}

                        {isScanning && (
                            <div className="flex items-center justify-center py-4 gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Looking up barcode...</p>
                            </div>
                        )}

                        {filteredProducts.map((product, index) => {
                            // Check stock using product's minimum_stock as proxy
                            const isOutOfStock = false; // Stock check would come from inventory store

                            return (
                                <button
                                    key={product.id}
                                    type="button"
                                    disabled={isOutOfStock}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors",
                                        isOutOfStock
                                            ? "opacity-50 cursor-not-allowed"
                                            : "hover:bg-accent cursor-pointer",
                                        highlightedIndex === index && "bg-accent"
                                    )}
                                    onClick={() => !isOutOfStock && handleSelect(product)}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-medium truncate">
                                                {product.name}
                                            </span>
                                            {product.barcode && (
                                                <Badge variant="outline" className="text-[9px] flex-shrink-0">
                                                    {product.barcode}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{product.product_code}</span>
                                            {product.hsn_code && (
                                                <>
                                                    <span className="text-muted-foreground/50">·</span>
                                                    <span>HSN: {product.hsn_code}</span>
                                                </>
                                            )}
                                            {product.gst_percentage > 0 && (
                                                <>
                                                    <span className="text-muted-foreground/50">·</span>
                                                    <span>GST: {product.gst_percentage}%</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-bold">
                                            {formatCurrency(product.selling_price)}
                                        </p>
                                        {product.mrp !== product.selling_price && (
                                            <p className="text-xs text-muted-foreground line-through">
                                                {formatCurrency(product.mrp)}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </Card>
            )}
        </div>
    );
}
