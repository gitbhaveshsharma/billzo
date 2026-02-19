"use client";

import { useEffect, useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { EnrichedProduct, Category, UnitOfMeasure } from "@/types/product.types";
import {
    formatCurrency,
    formatDate,
    formatPercentage,
    getStockStatusLabel,
    getStockStatusColor,
    calculateDiscountPercentage,
    calculateProfitMargin,
} from "@/utils/product.utils";
import { VariantManager } from "./variant-manager";
import { BarcodeManager } from "./barcode-manager";
import { InventoryPanel } from "./inventory-panel";
import { BatchManager } from "./batch-manager";
import { SupplierProductMapper } from "./supplier-product-mapper";
import { StockMovementHistory } from "./stock-movement-history";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface ProductDetailSheetProps {
    product: EnrichedProduct | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storeId: string;
    categories: Category[];
    units: UnitOfMeasure[];
}

// ============================================================================
// DETAIL ITEM
// ============================================================================

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-sm">{value || "—"}</p>
        </div>
    );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProductDetailSheet({
    product,
    open,
    onOpenChange,
    storeId,
    categories,
    units,
}: ProductDetailSheetProps) {
    const [activeTab, setActiveTab] = useState("overview");

    // Reset tab when product changes
    useEffect(() => {
        if (open) setActiveTab("overview");
    }, [open, product?.id]);

    if (!product) return null;

    const categoryName = product.category_id
        ? categories.find((c) => c.id === product.category_id)?.name
        : undefined;

    const unitName = product.unit_id
        ? units.find((u) => u.id === product.unit_id)?.name
        : undefined;

    const discount = calculateDiscountPercentage(product.mrp, product.selling_price);
    const margin = calculateProfitMargin(product.selling_price, product.purchase_price);
    const stockLabel = product.inventory ? getStockStatusLabel(product.inventory) : "No inventory";
    const stockColor = product.inventory ? getStockStatusColor(product.inventory) : "";

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">
                <SheetHeader className="p-6 pb-4 flex-shrink-0">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <SheetTitle className="truncate">{product.name}</SheetTitle>
                            <SheetDescription className="flex items-center gap-2 mt-1">
                                <span>#{product.product_code}</span>
                                {product.barcode && (
                                    <>
                                        <span>·</span>
                                        <span>{product.barcode}</span>
                                    </>
                                )}
                            </SheetDescription>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant={product.is_active ? "success" : "secondary"}>
                                {product.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {product.inventory && (
                                <Badge className={cn("text-xs", stockColor)} variant="outline">
                                    {stockLabel}
                                </Badge>
                            )}
                        </div>
                    </div>
                </SheetHeader>

                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex-1 min-h-0 flex flex-col"
                >
                    <TabsList className="mx-6 grid grid-cols-4 flex-shrink-0">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="variants">
                            Variants
                            {product.variants?.length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                                    {product.variants.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="inventory">Inventory</TabsTrigger>
                        <TabsTrigger value="more">More</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="flex-1 min-h-0">
                        {/* ==================== OVERVIEW ==================== */}
                        <TabsContent value="overview" className="p-6 pt-4 space-y-6 mt-0">
                            {/* Pricing Section */}
                            <div>
                                <h4 className="text-sm font-medium mb-3">Pricing</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <DetailItem label="MRP" value={formatCurrency(product.mrp)} />
                                    <DetailItem label="Selling Price" value={formatCurrency(product.selling_price)} />
                                    <DetailItem label="Purchase Price" value={formatCurrency(product.purchase_price)} />
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-3">
                                    <DetailItem label="Discount" value={`${discount}%`} />
                                    <DetailItem label="Margin" value={`${margin}%`} />
                                    <DetailItem label="Avg. Cost" value={formatCurrency(product.inventory?.average_cost)} />
                                </div>
                            </div>

                            <Separator />

                            {/* Tax Section */}
                            <div>
                                <h4 className="text-sm font-medium mb-3">Tax & Compliance</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <DetailItem label="HSN Code" value={product.hsn_code} />
                                    <DetailItem
                                        label="GST Rate"
                                        value={product.gst_percentage === 0 ? "Exempt" : `${product.gst_percentage}%`}
                                    />
                                    <DetailItem label="Cess" value={formatPercentage(product.cess_percentage)} />
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-3">
                                    <DetailItem label="Taxable" value={product.is_taxable ? "Yes" : "No"} />
                                </div>
                            </div>

                            <Separator />

                            {/* Classification Section */}
                            <div>
                                <h4 className="text-sm font-medium mb-3">Classification</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <DetailItem label="Category" value={categoryName} />
                                    <DetailItem label="Brand" value={product.brand} />
                                    <DetailItem label="Model" value={product.model} />
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-3">
                                    <DetailItem label="Unit" value={unitName} />
                                    <DetailItem label="Batch Tracked" value={product.is_batch_tracked ? "Yes" : "No"} />
                                </div>
                            </div>

                            <Separator />

                            {/* Stock Settings */}
                            <div>
                                <h4 className="text-sm font-medium mb-3">Inventory Settings</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <DetailItem label="Minimum Stock" value={product.minimum_stock} />
                                    <DetailItem label="Reorder Level" value={product.reorder_level} />
                                    <DetailItem
                                        label="Max Stock"
                                        value={product.inventory?.maximum_stock ?? "—"}
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Dates */}
                            <div>
                                <h4 className="text-sm font-medium mb-3">Dates</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailItem label="Created" value={formatDate(product.created_at)} />
                                    <DetailItem label="Updated" value={formatDate(product.updated_at)} />
                                </div>
                            </div>
                        </TabsContent>

                        {/* ==================== VARIANTS & BARCODES ==================== */}
                        <TabsContent value="variants" className="p-6 pt-4 space-y-6 mt-0">
                            <VariantManager
                                product={product}
                                storeId={storeId}
                            />
                            <Separator />
                            <BarcodeManager
                                product={product}
                                storeId={storeId}
                            />
                        </TabsContent>

                        {/* ==================== INVENTORY ==================== */}
                        <TabsContent value="inventory" className="p-6 pt-4 space-y-6 mt-0">
                            <InventoryPanel
                                product={product}
                                storeId={storeId}
                            />
                            {product.is_batch_tracked && (
                                <>
                                    <Separator />
                                    <BatchManager
                                        productId={product.id}
                                        storeId={storeId}
                                    />
                                </>
                            )}
                        </TabsContent>

                        {/* ==================== MORE ==================== */}
                        <TabsContent value="more" className="p-6 pt-4 space-y-6 mt-0">
                            <SupplierProductMapper
                                productId={product.id}
                                storeId={storeId}
                            />
                            <Separator />
                            <StockMovementHistory
                                productId={product.id}
                                storeId={storeId}
                            />
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}
