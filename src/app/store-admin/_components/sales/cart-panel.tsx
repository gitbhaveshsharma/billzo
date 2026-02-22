"use client";

import { Minus, Plus, Trash2, Percent, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CartItem, DiscountType } from "@/types/sales.types";
import { formatCurrency } from "@/utils/sales.utils";
import { calculateItemTotals } from "@/utils/sales.utils";

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

    const handleDiscountChange = (value: string) => {
        const pct = Math.min(100, Math.max(0, Number(value) || 0));
        onApplyDiscount(item.cart_key, "PERCENTAGE", pct, 0);
    };

    return (
        <div className="flex items-start gap-2 py-2 px-2 border-b last:border-b-0 hover:bg-accent/30 transition-colors">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.product_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.product_code}</span>
                    <span>×</span>
                    <span>{formatCurrency(item.unit_price)}</span>
                </div>
            </div>

            {/* Quantity Stepper */}
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onUpdateQuantity(item.cart_key, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                >
                    <Minus className="h-3 w-3" />
                </Button>
                <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        onUpdateQuantity(item.cart_key, val);
                    }}
                    className="h-6 w-12 text-center text-xs p-0"
                    min={1}
                />
                <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onUpdateQuantity(item.cart_key, item.quantity + 1)}
                >
                    <Plus className="h-3 w-3" />
                </Button>
            </div>

            {/* Discount */}
            <div className="flex items-center gap-0.5">
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
            </div>

            {/* Line Total */}
            <div className="text-right min-w-[70px]">
                <p className="text-sm font-bold">{formatCurrency(totals.total_amount)}</p>
                {totals.discount_total > 0 && (
                    <p className="text-[10px] text-green-600">
                        -{formatCurrency(totals.discount_total)}
                    </p>
                )}
            </div>

            {/* Remove */}
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-500 hover:text-red-700 flex-shrink-0"
                onClick={() => onRemoveItem(item.cart_key)}
            >
                <Trash2 className="h-3 w-3" />
            </Button>
        </div>
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

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-2 py-1.5 border-b">
                <span className="text-xs font-medium text-muted-foreground">
                    {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
                <Badge variant="secondary" className="text-xs">
                    {items.reduce((sum, item) => sum + item.quantity, 0)} qty
                </Badge>
            </div>

            {/* Items */}
            <ScrollArea className="flex-1">
                <div className="divide-y-0">
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
                </div>
            </ScrollArea>
        </div>
    );
}
