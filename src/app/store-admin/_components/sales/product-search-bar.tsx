"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Barcode, PackageX } from "lucide-react";
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
// PRODUCT SEARCH BAR — Barcode scanner + text search
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

    // Fetch products on mount
    useEffect(() => {
        if (storeId) {
            fetchProducts(storeId);
        }
    }, [storeId, fetchProducts]);

    // Filter products by search query
    const filteredProducts = query.length >= 2
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

    // Handle barcode scan (Enter key on fast input)
    const handleBarcodeScan = useCallback(
        async (barcode: string) => {
            if (!storeId) return;
            setIsScanning(true);

            const product = await lookupByBarcode(storeId, barcode.trim());
            if (product) {
                onAddProduct(product);
                setQuery("");
                setIsOpen(false);
            } else {
                // Show no results for a moment
                setIsOpen(true);
            }
            setIsScanning(false);
        },
        [storeId, lookupByBarcode, onAddProduct]
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

    const handleInputChange = useCallback(
        (value: string) => {
            setQuery(value);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        },
        []
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
                e.preventDefault();

                // If a product is highlighted, select it
                if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
                    handleSelect(filteredProducts[highlightedIndex]);
                    return;
                }

                // Otherwise try barcode scan
                if (query.trim().length >= 3) {
                    handleBarcodeScan(query);
                }
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
        <div ref={containerRef} className={cn("relative", className)}>
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
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

                        {!productsLoading && filteredProducts.length === 0 && query.length >= 2 && (
                            <div className="flex flex-col items-center py-4 text-center">
                                <PackageX className="h-6 w-6 text-muted-foreground mb-1" />
                                <p className="text-sm text-muted-foreground">No products found</p>
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
