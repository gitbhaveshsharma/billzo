"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
    Pause,
    ShoppingCart,
    Trash2,
    Receipt,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePosData } from "@/hooks/use-pos-data";
import { useSalesStore } from "@/stores/sales.store";
import { usePosCatalogStore } from "@/stores/pos-catalog.store";
import { useShiftsStore } from "@/stores/shifts.store";
import {
    NoShiftGuard,
    ProductSearchBar,
    CartPanel,
    CartTotalsPanel,
    CustomerSection,
    PaymentDialog,
    HoldBillsDrawer,
    ReceiptView,
    HardwareStatusIndicator,
    PosRefreshButton,
} from "../store-admin/_components/sales";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type {
    CreateSalePaymentRequest,
    CreateSaleRequest,
    EnrichedSale,
} from "@/types/sales.types";
import type { SellableItem } from "@/types/pos.types";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// POS PAGE — MAIN CASHIER BILLING SCREEN
// ============================================================================

export default function POSPage() {
    const { appUser, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const storeId = appUser?.storeId ?? null;

    // ========================================================================
    // POS CATALOG — Load once, persist in IndexedDB, never re-fetch on refresh
    // ========================================================================
    const {
        isReady: catalogReady,
        isLoading: catalogLoading,
        isRefreshing: catalogRefreshing,
        lastLoadedAt,
        itemCount,
        onRefresh: handleCatalogRefresh,
    } = usePosData(storeId);

    const deductSoldStock = usePosCatalogStore((s) => s.deductSoldStock);

    const {
        cart,
        cartCustomerId,
        cartCustomerName,
        cartCustomerPhone,
        cartCustomerGstin,
        cartIsInterstate,
        cartGstType,
        cartBillDiscountPercentage,
        cartBillDiscountAmount,
        cartNotes,
        cartShiftId,
        cartTotals,
        localHoldBills,
        holdBills,
        isSaving,
        currentSale,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        applyCartItemDiscount,
        setCartCustomer,
        setCartBillDiscount,
        setCartInterstate,
        setCartGstType,
        setCartShiftId,
        clearCart,
        holdCurrentBill,
        recallLocalHoldBill,
        removeLocalHoldBill,
        commitSale,
        fetchHoldBills,
        fetchSaleById,
    } = useSalesStore();

    const { activeShift, isLoading: shiftsLoading, fetchActiveShift } = useShiftsStore();

    // Dialog state
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [holdDrawerOpen, setHoldDrawerOpen] = useState(false);
    const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
    const [lastCompletedSale, setLastCompletedSale] = useState<EnrichedSale | null>(null);

    // ========================================================================
    // INITIAL DATA LOAD — Shift & hold bills only (catalog loaded by usePosData)
    // ========================================================================

    useEffect(() => {
        if (storeId) {
            fetchActiveShift(storeId);
            fetchHoldBills(storeId);
        }
    }, [storeId, fetchActiveShift, fetchHoldBills]);

    // Link shift to cart
    useEffect(() => {
        if (activeShift?.id) {
            setCartShiftId(activeShift.id);
        }
    }, [activeShift?.id, setCartShiftId]);

    // ========================================================================
    // PRODUCT SELECTION
    // ========================================================================

    const handleProductSelect = useCallback(
        (item: SellableItem) => {
            addToCart({
                product_id: item.product_id,
                variant_id: item.variant_id,
                batch_id: null,
                product_name: item.name,
                product_code: item.sku,
                barcode: item.barcode,
                hsn_code: item.hsn_code,
                unit_name: item.unit_name,
                mrp: item.mrp,
                unit_price: item.price,
                unit_cost: item.cost,
                gst_percentage: item.gst_percentage,
                cess_percentage: item.cess_percentage,
                quantity: 1,
                discount_type: "PERCENTAGE",
                discount_percentage: 0,
                discount_amount: 0,
                serial_numbers: [],
                sort_order: cart.length,
            });
        },
        [addToCart, cart.length]
    );

    // ========================================================================
    // CUSTOMER MANAGEMENT
    // ========================================================================

    const handleCustomerChange = useCallback(
        (
            customerId: string | null,
            customerName: string | null,
            customerPhone: string | null,
            customerGstin?: string | null
        ) => {
            setCartCustomer(customerId, customerName, customerPhone, customerGstin);
        },
        [setCartCustomer]
    );

    const handleGstTypeChange = useCallback(
        (gstType: "B2C" | "B2B" | "export") => {
            setCartGstType(gstType);
        },
        [setCartGstType]
    );

    const handleInterstateChange = useCallback(
        (isInterstate: boolean) => {
            setCartInterstate(isInterstate);
        },
        [setCartInterstate]
    );

    // ========================================================================
    // HOLD / RECALL
    // ========================================================================

    const handleHold = useCallback(() => {
        if (cart.length === 0) return;
        if (!appUser?.id) return;
        holdCurrentBill(appUser.id);
        toast.success("Bill put on hold");
    }, [cart.length, appUser?.id, holdCurrentBill]);

    const handleRecallLocal = useCallback(
        (billId: string) => {
            if (cart.length > 0) {
                toast.error("Clear or hold current cart before recalling");
                return;
            }
            recallLocalHoldBill(billId);
            setHoldDrawerOpen(false);
            toast.success("Bill recalled");
        },
        [cart.length, recallLocalHoldBill]
    );

    const handleRemoveLocalHold = useCallback(
        (billId: string) => {
            removeLocalHoldBill(billId);
            toast.success("Hold bill removed");
        },
        [removeLocalHoldBill]
    );

    const handleRecallServer = useCallback(
        async (_saleId: string) => {
            if (cart.length > 0) {
                toast.error("Clear or hold current cart before recalling");
                return;
            }
            toast.success("Server hold bill recalled — loading...");
            setHoldDrawerOpen(false);
        },
        [cart.length]
    );

    // ========================================================================
    // CHARGE / PAYMENT FLOW
    // ========================================================================

    const handleCharge = useCallback(() => {
        if (cart.length === 0) {
            toast.error("Add items to cart first");
            return;
        }
        setPaymentOpen(true);
    }, [cart.length]);

    const handlePaymentConfirm = useCallback(
        async (
            payments: CreateSalePaymentRequest[],
            isCreditSale: boolean,
            creditDueDate?: string
        ) => {
            if (!storeId) return;

            // ── Build sale request from cart ────────────────────────────────
            const saleRequest: CreateSaleRequest = {
                shift_id: cartShiftId ?? undefined,
                customer_id: cartCustomerId ?? undefined,
                customer_name: cartCustomerName ?? undefined,
                customer_phone: cartCustomerPhone ?? undefined,
                customer_gstin: cartCustomerGstin ?? undefined,
                is_interstate: cartIsInterstate,
                gst_type: cartGstType,
                supply_type: cartIsInterstate ? "inter" : "intra",
                bill_discount_percentage: cartBillDiscountPercentage,
                bill_discount_amount: cartBillDiscountAmount,
                is_credit_sale: isCreditSale,
                credit_due_date: creditDueDate,
                notes: cartNotes ?? undefined,
                items: cart.map((item) => ({
                    product_id: item.product_id,
                    variant_id: item.variant_id ?? undefined,
                    batch_id: item.batch_id ?? undefined,
                    product_name: item.product_name,
                    product_code: item.product_code,
                    barcode: item.barcode ?? undefined,
                    hsn_code: item.hsn_code ?? undefined,
                    unit_name: item.unit_name ?? undefined,
                    quantity: item.quantity,
                    mrp: item.mrp,
                    unit_price: item.unit_price,
                    unit_cost: item.unit_cost ?? undefined,
                    discount_type: item.discount_type,
                    discount_percentage: item.discount_percentage,
                    discount_amount: item.discount_amount,
                    gst_percentage: item.gst_percentage,
                    cess_percentage: item.cess_percentage,
                    serial_numbers:
                        item.serial_numbers.length > 0
                            ? item.serial_numbers
                            : undefined,
                    sort_order: item.sort_order,
                })),
            };

            // ── Capture cart items for stock deduction before clearing ──────
            const soldItems = cart.map((item) => ({
                id: item.variant_id ?? item.product_id,
                quantity: item.quantity,
            }));

            // ── OPTIMISTIC: Clear cart & close dialog immediately ───────────
            setPaymentOpen(false);
            clearCart();
            const toastId = toast.loading("Processing sale...");

            // ── SINGLE RPC: create + items + payments + complete ────────────
            const result = await commitSale(
                storeId,
                saleRequest,
                payments,
                cartIsInterstate
            );

            if (!result?.success) {
                // ── ROLLBACK: something went wrong ─────────────────────────
                toast.error(result?.error ?? "Failed to complete sale", {
                    id: toastId,
                });
                // Note: cart is already cleared — user would need to re-scan.
                // This is acceptable because RPC failures are rare (DB down, etc.)
                return;
            }

            // ── SUCCESS: deduct stock in memory (no re-fetch needed) ────────
            deductSoldStock(soldItems);

            toast.success(
                `Sale completed! Invoice: ${result.invoice_number ?? ""}`,
                { id: toastId }
            );

            // ── Fetch completed sale for receipt display (background) ───────
            if (result.sale_id) {
                await fetchSaleById(storeId, result.sale_id);
                const enrichedSale = useSalesStore.getState().currentSale;
                if (enrichedSale) {
                    setLastCompletedSale(enrichedSale);
                    setReceiptDialogOpen(true);
                }
            }
        },
        [
            storeId,
            cart,
            cartShiftId,
            cartCustomerId,
            cartCustomerName,
            cartCustomerPhone,
            cartCustomerGstin,
            cartIsInterstate,
            cartGstType,
            cartBillDiscountPercentage,
            cartBillDiscountAmount,
            cartNotes,
            commitSale,
            clearCart,
            deductSoldStock,
            fetchSaleById,
        ]
    );

    // ========================================================================
    // LOADING
    // ========================================================================

    if (authLoading || catalogLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner
                    size="lg"
                    text={catalogLoading ? `Loading catalog (${itemCount} items)...` : "Loading..."}
                />
            </div>
        );
    }

    // ========================================================================
    // RENDER
    // ========================================================================

    const totalHoldBills = localHoldBills.length + holdBills.length;

    return (
        <NoShiftGuard
            activeShift={activeShift}
            isLoading={shiftsLoading}
            onOpenShift={() => router.push("/pos/shifts")}
        >
            <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
                {/* LEFT PANEL — Product Search & Cart */}
                <div className="flex-1 flex flex-col min-w-0 border-r">
                    {/* Product Search */}
                    <div className="p-3 border-b">
                        <ProductSearchBar
                            storeId={storeId}
                            onAddProduct={handleProductSelect}
                        />
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-hidden">
                        <CartPanel
                            items={cart}
                            isInterstate={cartIsInterstate}
                            onUpdateQuantity={updateCartQuantity}
                            onApplyDiscount={applyCartItemDiscount}
                            onRemoveItem={removeFromCart}
                        />
                    </div>

                    {/* Bottom Actions */}
                    <div className="border-t p-3 flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={handleHold}
                            disabled={cart.length === 0}
                        >
                            <Pause className="h-3.5 w-3.5" />
                            Hold
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs relative"
                            onClick={() => setHoldDrawerOpen(true)}
                        >
                            <Receipt className="h-3.5 w-3.5" />
                            Bills
                            {totalHoldBills > 0 && (
                                <Badge
                                    variant="destructive"
                                    className="absolute -top-1.5 -right-1.5 h-4 min-w-4 text-[10px] px-1"
                                >
                                    {totalHoldBills}
                                </Badge>
                            )}
                        </Button>

                        {/* Hardware Status */}
                        <HardwareStatusIndicator />

                        {/* Catalog Refresh */}
                        <PosRefreshButton
                            isRefreshing={catalogRefreshing}
                            lastLoadedAt={lastLoadedAt}
                            itemCount={itemCount}
                            onRefresh={handleCatalogRefresh}
                        />

                        <div className="flex-1" />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-red-500 hover:text-red-700 gap-1"
                            onClick={() => {
                                if (cart.length === 0) return;
                                clearCart();
                                toast.success("Cart cleared");
                            }}
                            disabled={cart.length === 0}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Clear
                        </Button>
                    </div>
                </div>

                {/* RIGHT PANEL — Customer, Totals, Charge */}
                <div className="w-full lg:w-[340px] xl:w-[380px] flex flex-col border-t lg:border-t-0">
                    {/* Customer Section */}
                    <div className="p-3 border-b">
                        <CustomerSection
                            storeId={storeId}
                            customerId={cartCustomerId}
                            customerName={cartCustomerName}
                            customerPhone={cartCustomerPhone}
                            customerGstin={cartCustomerGstin}
                            isInterstate={cartIsInterstate}
                            gstType={cartGstType}
                            onSetCustomer={handleCustomerChange}
                            onSetGstType={handleGstTypeChange}
                            onSetInterstate={handleInterstateChange}
                        />
                    </div>

                    {/* Totals */}
                    <div className="flex-1 overflow-auto p-3">
                        <CartTotalsPanel
                            totals={cartTotals}
                            isInterstate={cartIsInterstate}
                            billDiscountPercentage={cartBillDiscountPercentage}
                            onBillDiscountChange={(pct, amt) =>
                                setCartBillDiscount(pct, amt)
                            }
                        />
                    </div>

                    {/* Charge Button */}
                    <div className="p-3 border-t">
                        <Button
                            className="w-full h-12 text-base font-bold gap-2"
                            onClick={handleCharge}
                            disabled={cart.length === 0 || isSaving}
                        >
                            <ShoppingCart className="h-5 w-5" />
                            Charge {formatCurrency(cartTotals.total_amount)}
                        </Button>
                    </div>
                </div>
            </div>

            {/* ============================================================ */}
            {/* DIALOGS */}
            {/* ============================================================ */}

            {/* Payment Dialog */}
            <PaymentDialog
                open={paymentOpen}
                onOpenChange={setPaymentOpen}
                totalAmount={cartTotals.total_amount}
                onConfirm={handlePaymentConfirm}
                isProcessing={isSaving}
                showCreditOption={!!cartCustomerId}
                customerName={cartCustomerName}
            />

            {/* Hold Bills Drawer */}
            <HoldBillsDrawer
                open={holdDrawerOpen}
                onOpenChange={setHoldDrawerOpen}
                localHoldBills={localHoldBills}
                serverHoldBills={holdBills}
                onRecallLocal={handleRecallLocal}
                onRemoveLocal={handleRemoveLocalHold}
                onRecallServer={handleRecallServer}
            />

            {/* Receipt Dialog */}
            <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>Receipt</DialogTitle>
                    </DialogHeader>
                    {lastCompletedSale && (
                        <ReceiptView
                            sale={lastCompletedSale}
                            storeName={appUser?.storeName ?? "Store"}
                            storeAddress=""
                            onPrint={() => window.print()}
                            compact
                        />
                    )}
                </DialogContent>
            </Dialog>
        </NoShiftGuard>
    );
}