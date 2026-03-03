"use client";

import { useState, useCallback } from "react";
import { Minus, Plus, Trash2, Percent, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    Item,
    ItemContent,
    ItemTitle,
    ItemDescription,
    ItemActions,
    ItemSeparator,
} from "@/components/ui/item";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CartItem, DiscountType } from "@/types/sales.types";
import {
    formatCurrency,
    calculateItemTotals,
    getUnitInputConfig,
    parseQtyInput,
    humanReadableQty,
} from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

interface CartPanelProps {
    items: CartItem[];
    isInterstate: boolean;
    onUpdateQuantity: (cartKey: string, quantity: number) => void;
    onRemoveItem: (cartKey: string) => void;
    onApplyDiscount: (
        cartKey: string,
        discountType: DiscountType,
        discountPercentage: number,
        discountAmount: number
    ) => void;
}

// ============================================================================
// CART ITEM ROW
// Layout: [LEFT: name+info 2 rows] [RIGHT: controls 2 rows]
// Row 1 left : Product name  |  qty badge
// Row 2 left : ₹38/kg · GST 5% · SKU
// Row 1 right: [−][qty input][+]  [disc %]
// Row 2 right: ₹5.98  🗑
// ============================================================================

function CartItemRow({
    item,
    isInterstate,
    onUpdateQuantity,
    onRemoveItem,
    onApplyDiscount,
}: {
    item: CartItem;
    isInterstate: boolean;
    onUpdateQuantity: (cartKey: string, quantity: number) => void;
    onRemoveItem: (cartKey: string) => void;
    onApplyDiscount: (
        cartKey: string,
        discountType: DiscountType,
        discountPercentage: number,
        discountAmount: number
    ) => void;
}) {
    const totals = calculateItemTotals(
        {
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_type: item.discount_type,
            discount_percentage: item.discount_percentage,
            discount_amount: item.discount_amount,
            gst_percentage: item.gst_percentage,
            cess_percentage: item.cess_percentage,
        },
        isInterstate
    );

    const unitCfg = getUnitInputConfig(item.unit_name);

    const [qtyInputValue, setQtyInputValue] = useState<string>(
        unitCfg.allowDecimal
            ? item.quantity.toString()
            : Math.round(item.quantity).toString()
    );

    const commitQty = useCallback(
        (raw: string) => {
            const parsed = parseQtyInput(raw, item.unit_name);
            onUpdateQuantity(item.cart_key, parsed);
            setQtyInputValue(parsed.toString());
        },
        [item.cart_key, item.unit_name, onUpdateQuantity]
    );

    const handleQtyChange  = (e: React.ChangeEvent<HTMLInputElement>) => setQtyInputValue(e.target.value);
    const handleQtyBlur    = () => commitQty(qtyInputValue);
    const handleQtyKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") { e.preventDefault(); commitQty(qtyInputValue); (e.target as HTMLInputElement).blur(); }
    };

    const handleStepDown = () => {
        const next   = Math.max(unitCfg.min, item.quantity - unitCfg.step);
        const parsed = parseQtyInput(next.toString(), item.unit_name);
        onUpdateQuantity(item.cart_key, parsed);
        setQtyInputValue(parsed.toString());
    };
    const handleStepUp = () => {
        const next   = item.quantity + unitCfg.step;
        const parsed = parseQtyInput(next.toString(), item.unit_name);
        onUpdateQuantity(item.cart_key, parsed);
        setQtyInputValue(parsed.toString());
    };
    const handleDiscountChange = (value: string) => {
        const pct = Math.min(100, Math.max(0, Number(value) || 0));
        onApplyDiscount(item.cart_key, "PERCENTAGE", pct, 0);
    };

    const readableQty = humanReadableQty(item.quantity, item.unit_name);

    // Build description text: ₹38/kg · GST 5% · SKU-...
    const descParts: string[] = [];
    descParts.push(
        item.unit_name
            ? `${formatCurrency(item.unit_price)} / ${item.unit_name}`
            : formatCurrency(item.unit_price)
    );
    if (item.gst_percentage > 0) descParts.push(`GST ${item.gst_percentage}%`);
    descParts.push(item.product_code);

    return (
        <Item
    variant="default"
    className="bg-white dark:bg-card hover:text-primary hover:bg-primary/10 dark:hover:text-primary dark:hover:bg-primary/10 hover:scale-[1.01] transition-all duration-150 items-center gap-3 px-3 py-2.5 rounded-md shadow-sm"
>
            {/* ── LEFT: 2-row product info ──────────────────────────────── */}
            <ItemContent className="gap-0.5 min-w-0">
                {/* Row 1: name + readable qty badge + optional discount badge */}
                <ItemTitle className="flex items-center gap-1.5 flex-wrap  h-7">
                    <span className="font-bold text-[15px] leading-tight truncate max-w-[180px] sm:max-w-none ">
                        {item.product_name}
                    </span>
                    <Badge
                        variant="secondary"
                        className="text-[13px] font-bold tabular-nums px-1.5 py-0 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-0 shrink-0"
                    >
                        {readableQty}
                    </Badge>
                    {item.discount_percentage > 0 && (
                        <Badge
                            variant="secondary"
                            className="text-[13px] font-medium px-1.5 py-0 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-0 shrink-0"
                        >
                            {item.discount_percentage}% off
                        </Badge>
                    )}
                </ItemTitle>

                {/* Row 2: rate · GST · SKU — single truncated line */}
                <ItemDescription className="text-xs truncate">
                    {descParts.join(" · ")}
                </ItemDescription>
            </ItemContent>

            {/* ── RIGHT: 2-row controls ────────────────────────────────── */}
            <ItemActions className="flex-col items-end gap-1.5 self-center shrink-0">
                {/* Row 1: qty stepper + discount input */}
                <div className="flex items-center gap-1">
                    {/* Qty stepper */}
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={handleStepDown}
                                    disabled={item.quantity <= unitCfg.min}
                                >
                                    <Minus className="h-3 w-3" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">Decrease</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Input
                                    type="number"
                                    value={qtyInputValue}
                                    onChange={handleQtyChange}
                                    onBlur={handleQtyBlur}
                                    onKeyDown={handleQtyKeyDown}
                                    onFocus={(e) => e.target.select()}
                                    className="h-6 w-14 text-center text-xs p-0"
                                    min={unitCfg.min}
                                    step={unitCfg.step}
                                    inputMode={unitCfg.allowDecimal ? "decimal" : "numeric"}
                                />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                                {unitCfg.allowDecimal
                                    ? `Quantity in ${item.unit_name ?? "units"} (e.g. 0.5 = 500g)`
                                    : "Quantity"}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={handleStepUp}
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">Increase</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Discount % input */}
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={item.discount_percentage || ""}
                                        onChange={(e) => handleDiscountChange(e.target.value)}
                                        placeholder="0"
                                        className="h-6 w-11 text-center text-xs p-0 pr-3"
                                        min={0}
                                        max={100}
                                    />
                                    <Percent className="absolute right-0.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted-foreground pointer-events-none" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">Item discount %</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* Row 2: line total + delete */}
                <div className="flex items-center gap-1.5">
                    <div className="text-right">
                        <span className="text-sm font-bold tabular-nums">
                            {formatCurrency(totals.total_amount)}
                        </span>
                        {totals.discount_total > 0 && (
                            <span className="ml-1 text-[10px] text-green-600 dark:text-green-400 tabular-nums">
                                -{formatCurrency(totals.discount_total)}
                            </span>
                        )}
                    </div>
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive/50 hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => onRemoveItem(item.cart_key)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">Remove item</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </ItemActions>
        </Item>
    );
}

// ============================================================================
// EMPTY CART
// ============================================================================

function EmptyCart() {
    return (
        <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="bg-muted rounded-full p-4 mb-3">
                <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Cart is empty</p>
            <p className="text-xs text-muted-foreground mt-1">
                Scan a barcode or search for products to add
            </p>
        </div>
    );
}

// ============================================================================
// CART PANEL
// ============================================================================

export function CartPanel({
    items,
    isInterstate,
    onUpdateQuantity,
    onRemoveItem,
    onApplyDiscount,
}: CartPanelProps) {
    if (items.length === 0) {
        return <EmptyCart />;
    }

    const qtyChips = items.map((item) =>
        humanReadableQty(item.quantity, item.unit_name)
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
                <span className="text-xs font-medium text-muted-foreground">
                    {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
                <Badge variant="default" className="text-xs tabular-nums font-medium">
                    {qtyChips.length <= 3 ? qtyChips.join(" · ") : `${qtyChips.length} items`}
                </Badge>
            </div>

            {/* Items */}
            <ScrollArea className="flex-1 overflow-x-auto">
                <div className="flex flex-col gap-0.5 p-4">
                    {items.map((item, index) => (
                        <div key={item.cart_key}>
                            <CartItemRow
                                item={item}
                                isInterstate={isInterstate}
                                onUpdateQuantity={onUpdateQuantity}
                                onRemoveItem={onRemoveItem}
                                onApplyDiscount={onApplyDiscount}
                            />
                            {index < items.length - 1 && <ItemSeparator className="my-0.5" />}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
