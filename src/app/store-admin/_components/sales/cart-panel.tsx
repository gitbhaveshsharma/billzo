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
    ItemGroup,
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
    formatQty,
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
// CART ITEM ROW — Uses shadcn Item component + unit-aware quantity input
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

    // Local string state for the quantity input so the user can type freely
    const [qtyInputValue, setQtyInputValue] = useState<string>(
        unitCfg.allowDecimal
            ? item.quantity.toString()
            : Math.round(item.quantity).toString()
    );

    // Sync if parent changes quantity externally (e.g. preset click)
    const displayQty = unitCfg.allowDecimal
        ? item.quantity.toString()
        : Math.round(item.quantity).toString();

    // When the input loses focus, commit the parsed value
    const commitQty = useCallback(
        (raw: string) => {
            const parsed = parseQtyInput(raw, item.unit_name);
            onUpdateQuantity(item.cart_key, parsed);
            setQtyInputValue(parsed.toString());
        },
        [item.cart_key, item.unit_name, onUpdateQuantity]
    );

    const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQtyInputValue(e.target.value);
    };

    const handleQtyBlur = () => {
        commitQty(qtyInputValue);
    };

    const handleQtyKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            commitQty(qtyInputValue);
            (e.target as HTMLInputElement).blur();
        }
    };

    const handleStepDown = () => {
        const next = Math.max(unitCfg.min, item.quantity - unitCfg.step);
        const parsed = parseQtyInput(next.toString(), item.unit_name);
        onUpdateQuantity(item.cart_key, parsed);
        setQtyInputValue(parsed.toString());
    };

    const handleStepUp = () => {
        const next = item.quantity + unitCfg.step;
        const parsed = parseQtyInput(next.toString(), item.unit_name);
        onUpdateQuantity(item.cart_key, parsed);
        setQtyInputValue(parsed.toString());
    };

    const handlePreset = (value: number) => {
        onUpdateQuantity(item.cart_key, value);
        setQtyInputValue(value.toString());
    };

    const handleDiscountChange = (value: string) => {
        const pct = Math.min(100, Math.max(0, Number(value) || 0));
        onApplyDiscount(item.cart_key, "PERCENTAGE", pct, 0);
    };

    return (
        <Item variant="default" size="sm" className="border-b rounded-none last:border-b-0 hover:bg-accent/30 gap-2">
            {/* Product info */}
            <ItemContent className="gap-0.5 min-w-0">
                <ItemTitle className="text-sm truncate">{item.product_name}</ItemTitle>
                <ItemDescription className="text-xs line-clamp-1 flex items-center gap-1.5">
                    <span className="font-mono">{item.product_code}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span>{formatCurrency(item.unit_price)}{item.unit_name ? `/${item.unit_name}` : ""}</span>
                    {item.gst_percentage > 0 && (
                        <>
                            <span className="text-muted-foreground/50">·</span>
                            <span className="text-blue-600 dark:text-blue-400">{item.gst_percentage}%</span>
                        </>
                    )}
                </ItemDescription>

                {/* Quick quantity presets for weight/volume/length units */}
                {unitCfg.presets.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                        {unitCfg.presets.map((preset) => (
                            <Button
                                key={preset.label}
                                type="button"
                                variant={item.quantity === preset.value ? "default" : "outline"}
                                size="sm"
                                className="h-5 px-1.5 text-[10px] font-medium"
                                onClick={() => handlePreset(preset.value)}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>
                )}
            </ItemContent>

            {/* Quantity + Discount + Total + Remove */}
            <ItemActions className="flex-wrap gap-1.5 items-start">
                {/* Quantity Stepper */}
                <div className="flex items-center gap-0.5">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={handleStepDown}
                        disabled={item.quantity <= unitCfg.min}
                    >
                        <Minus className="h-3 w-3" />
                    </Button>
                    <TooltipProvider delayDuration={200}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Input
                                    type="number"
                                    value={qtyInputValue}
                                    onChange={handleQtyChange}
                                    onBlur={handleQtyBlur}
                                    onKeyDown={handleQtyKeyDown}
                                    onFocus={(e) => e.target.select()}
                                    className="h-6 w-16 text-center text-xs p-0"
                                    min={unitCfg.min}
                                    step={unitCfg.step}
                                    inputMode={unitCfg.allowDecimal ? "decimal" : "numeric"}
                                />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                                {unitCfg.allowDecimal
                                    ? `Enter qty in ${item.unit_name ?? "units"} (decimals OK)`
                                    : `Qty (whole numbers)`}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={handleStepUp}
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                    {item.unit_name && (
                        <span className="text-[10px] text-muted-foreground ml-0.5">{item.unit_name}</span>
                    )}
                </div>

                {/* Discount */}
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={item.discount_percentage || ""}
                                    onChange={(e) => handleDiscountChange(e.target.value)}
                                    placeholder="0"
                                    className="h-6 w-12 text-center text-xs p-0 pr-3"
                                    min={0}
                                    max={100}
                                />
                                <Percent className="absolute right-0.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted-foreground" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                            Item discount %
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {/* Line Total */}
                <div className="text-right min-w-[70px]">
                    <p className="text-sm font-bold tabular-nums">{formatCurrency(totals.total_amount)}</p>
                    {totals.discount_total > 0 && (
                        <p className="text-[10px] text-green-600 dark:text-green-400 tabular-nums">
                            -{formatCurrency(totals.discount_total)}
                        </p>
                    )}
                </div>

                {/* Remove */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-700 dark:hover:text-red-400 flex-shrink-0"
                    onClick={() => onRemoveItem(item.cart_key)}
                >
                    <Trash2 className="h-3 w-3" />
                </Button>
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

    const totalQtyDisplay = items.reduce((sum, item) => sum + item.quantity, 0);
    const hasDecimalQty = items.some((item) => !Number.isInteger(item.quantity));

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b">
                <span className="text-xs font-medium text-muted-foreground">
                    {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
                <Badge variant="secondary" className="text-xs tabular-nums">
                    {hasDecimalQty
                        ? totalQtyDisplay.toFixed(3).replace(/\.?0+$/, "")
                        : totalQtyDisplay}{" "}
                    qty
                </Badge>
            </div>

            {/* Items */}
            <ScrollArea className="flex-1">
                <ItemGroup>
                    {items.map((item) => (
                        <CartItemRow
                            key={item.cart_key}
                            item={item}
                            isInterstate={isInterstate}
                            onUpdateQuantity={onUpdateQuantity}
                            onRemoveItem={onRemoveItem}
                            onApplyDiscount={onApplyDiscount}
                        />
                    ))}
                </ItemGroup>
            </ScrollArea>
        </div>
    );
}
