"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
    Pause,
    ShoppingCart,
    Trash2,
    Receipt,
    Tag,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePosData } from "@/hooks/use-pos-data";
import { useHardware } from "@/hooks/use-hardware";
import { useSalesStore } from "@/stores/sales.store";
import { usePosCatalogStore } from "@/stores/pos-catalog.store";
import { useShiftsStore } from "@/stores/shifts.store";
import { useStoreStore } from "@/stores/store.store";
import { useOrganizationStore } from "@/stores/organization.store";
import { persistStoreInfo, type CachedStoreInfo } from "@/lib/pos-cache";
import {
    NoShiftGuard,
    ProductSearchBar,
    CartPanel,
    CartTotalsPanel,
    CustomerSection,
    PaymentDialog,
    HoldBillsDrawer,
    HardwareStatusIndicator,
    PosRefreshButton,
    PriceLookupDialog,
} from "../store-admin/_components/sales";
import { PostSaleActionsDialog } from "../store-admin/_components/sales/post-sale-actions-dialog";
import { AddCustomerDialog } from "../store-admin/_components/customer";
import { customerService } from "@/services/customers.service";
import type { CreateCustomerRequest } from "@/types/customers.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
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
    const cachedStoreInfo = usePosCatalogStore((s) => s.storeInfo);
    const setStoreInfoInCatalog = usePosCatalogStore((s) => s.setStoreInfo);
    const organization = useOrganizationStore((s) => s.organization);

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

    // Hardware hook — provides printReceipt with Bridge → USB (no browser fallback)
    const {
        printReceipt,
        hasBridgePrinter,
        bridgeStatus,
        detectAllDevices,
    } = useHardware();

    // Store info for receipt
    const store = useStoreStore((s) => s.store);
    const fetchStore = useStoreStore((s) => s.fetchStore);
    const receiptConfig = useStoreStore((s) => s.receiptConfig);
    const markReceiptPrinted = useSalesStore((s) => s.markReceiptPrinted);

    // Dialog state
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [holdDrawerOpen, setHoldDrawerOpen] = useState(false);
    const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
    const [lastCompletedSale, setLastCompletedSale] = useState<EnrichedSale | null>(null);
    const [addCustomerOpen, setAddCustomerOpen] = useState(false);
    const [priceLookupOpen, setPriceLookupOpen] = useState(false);

    // ========================================================================
    // INITIAL DATA LOAD — Shift & hold bills only (catalog loaded by usePosData)
    // ========================================================================

    useEffect(() => {
        if (storeId) {
            fetchActiveShift(storeId);
            fetchHoldBills(storeId);
            fetchStore(storeId);  // Fetch full store record for receipt printing
        }
    }, [storeId, fetchActiveShift, fetchHoldBills, fetchStore]);

    // Build & cache store info for receipts once store data is available.
    // Always rebuild when store/org changes so org GSTIN fallback is applied.
    useEffect(() => {
        if (!store) return;
        const addressParts = [
            store.address_line1,
            store.address_line2,
            store.city,
            store.state,
            store.pincode,
        ].filter(Boolean);
        // Use store GSTIN first; fall back to org GSTIN (e.g. store has no GSTIN registered yet)
        const effectiveGstin = store.gstin ?? organization?.gstin ?? null;
        const info: CachedStoreInfo = {
            name: store.display_name || store.name,
            address: addressParts.join(", "),
            phone: store.phone ?? null,
            gstin: effectiveGstin,
            orgGstin: organization?.gstin ?? null,
        };
        setStoreInfoInCatalog(info);
        persistStoreInfo(info).catch(() => {});
    }, [store, organization, setStoreInfoInCatalog]);

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

    const handleCreateCustomer = useCallback(
        async (data: CreateCustomerRequest): Promise<boolean> => {
            if (!storeId) return false;
            const result = await customerService.create(storeId, data);
            if (result.error || !result.data) {
                toast.error(result.error ?? "Failed to create customer");
                return false;
            }
            // Auto-select the newly created customer
            setCartCustomer(
                result.data.id,
                result.data.name,
                result.data.phone,
                result.data.gstin ?? null
            );
            if (result.data.gstin) {
                setCartGstType("B2B");
            }
            toast.success(`Customer "${result.data.name}" created and selected`);
            return true;
        },
        [storeId, setCartCustomer, setCartGstType]
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

            // ── Fetch completed sale for receipt display ────────────────
            if (result.sale_id) {
                const enrichedSale = await fetchSaleById(storeId, result.sale_id);
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
    // POST-SALE RECEIPT ACTION — Track print/sms/email in database
    // ========================================================================

    const handleReceiptAction = useCallback(
        (action: "print" | "sms" | "email" | "skip") => {
            if (!storeId || !lastCompletedSale) return;

            const saleId = lastCompletedSale.id;

            // Fire-and-forget — don't block POS flow
            switch (action) {
                case "print":
                    markReceiptPrinted(storeId, saleId, {
                        receipt_printed: true,
                        receipt_print_count: (lastCompletedSale.receipt_print_count ?? 0) + 1,
                    });
                    break;
                case "sms":
                    markReceiptPrinted(storeId, saleId, { sms_sent: true });
                    break;
                case "email":
                    markReceiptPrinted(storeId, saleId, { email_sent: true });
                    break;
                // "skip" — no DB update needed
            }
        },
        [storeId, lastCompletedSale, markReceiptPrinted]
    );

    // ========================================================================
    // POS KEYBOARD SHORTCUTS
    //   F2 = Hold current bill     F3 = Open held bills
    //   F8 = Charge (open payment) F4 = Clear cart
    //   F9 = Focus product search  Esc = Close dialogs/drawers
    // ========================================================================

    const searchInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        function handlePosKey(e: KeyboardEvent) {
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName.toLowerCase() ?? "";
            const isInput = tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
            // Allow function keys even when focused on input
            const isFKey = e.key.startsWith("F") && e.key.length <= 3;

            // Don't intercept when dialog open (let dialog handle it)
            if (paymentOpen || addCustomerOpen || receiptDialogOpen || priceLookupOpen) return;

            if (!isFKey && isInput) return;

            switch (e.key) {
                case "F2":
                    e.preventDefault();
                    if (cart.length > 0) handleHold();
                    break;
                case "F5":
                    e.preventDefault();
                    setPriceLookupOpen(true);
                    break;
                case "F3":
                    e.preventDefault();
                    setHoldDrawerOpen(true);
                    break;
                case "F4":
                    e.preventDefault();
                    if (cart.length > 0) {
                        clearCart();
                        toast.success("Cart cleared");
                    }
                    break;
                case "F8":
                    e.preventDefault();
                    handleCharge();
                    break;
                case "F9":
                    e.preventDefault();
                    // Focus the product search bar
                    const searchEl = document.querySelector<HTMLInputElement>(
                        '[data-pos-search="true"], input[placeholder*="Search"], input[placeholder*="Scan"]'
                    );
                    if (searchEl) searchEl.focus();
                    break;
                case "Escape":
                    if (holdDrawerOpen) {
                        e.preventDefault();
                        setHoldDrawerOpen(false);
                    }
                    break;
            }
        }

        document.addEventListener("keydown", handlePosKey);
        return () => document.removeEventListener("keydown", handlePosKey);
    }, [cart.length, handleHold, handleCharge, clearCart, paymentOpen, addCustomerOpen, receiptDialogOpen, holdDrawerOpen, priceLookupOpen]);

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
            <div className="flex flex-col lg:flex-row h-full overflow-hidden">
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
                            <kbd className="ml-0.5 text-[10px] font-mono text-muted-foreground border rounded px-1 bg-muted/50 hidden sm:inline">F2</kbd>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => setPriceLookupOpen(true)}
                        >
                            <Tag className="h-3.5 w-3.5" />
                            Price   
                            <kbd className="ml-0.5 text-[10px] font-mono text-muted-foreground border rounded px-1 bg-muted/50 hidden sm:inline">F5</kbd>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs relative"
                            onClick={() => setHoldDrawerOpen(true)}
                        >
                            <Receipt className="h-3.5 w-3.5" />
                            Bills
                            <kbd className="ml-0.5 text-[10px] font-mono text-muted-foreground border rounded px-1 bg-muted/50 hidden sm:inline">F3</kbd>
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
                            variant="destructive"
                            size="sm"
                            className="text-xs hover:bg-red-600 gap-1"
                            onClick={() => {
                                if (cart.length === 0) return;
                                clearCart();
                                toast.success("Cart cleared");
                            }}
                            disabled={cart.length === 0}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Clear
                            <kbd className="ml-0.5 text-[10px] font-mono text-muted-foreground border rounded px-1 bg-muted/50 hidden sm:inline">F4</kbd>
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
                            onAddNew={() => setAddCustomerOpen(true)}
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
                    <div className="flex items-center justify-center mb-2 opacity-60 hover:opacity-100 transition-opacity">
                            <Image
                                src="/billzo-logo.png"
                                alt="Billzo"
                                width={172}
                                height={122}
                                className="h-full w-auto object-contain"
                                priority
                            />
                        </div>
                    {/*  Charge Button */}
                    <div className="p-3 border-t">
                        {/* Branding strip */}
                        
                        <Button
                            className="w-full h-12 text-base font-bold gap-2"
                            onClick={handleCharge}
                            disabled={cart.length === 0 || isSaving}
                        >
                            <ShoppingCart className="h-5 w-5" />
                            Charge {formatCurrency(cartTotals.total_amount)}
                            <kbd className="ml-1 text-[10px] font-mono text-primary-foreground/70 border border-primary-foreground/30 rounded px-1 bg-primary-foreground/10">F8</kbd>
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

            {/* Add Customer Dialog */}
            <AddCustomerDialog
                open={addCustomerOpen}
                onOpenChange={setAddCustomerOpen}
                onSubmit={handleCreateCustomer}
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

            {/* Price Lookup Dialog */}
            <PriceLookupDialog
                open={priceLookupOpen}
                onOpenChange={setPriceLookupOpen}
                storeId={storeId}
                onAddProduct={handleProductSelect}
            />

            {/* Post-Sale Receipt Actions Dialog */}
            <PostSaleActionsDialog
                open={receiptDialogOpen}
                onOpenChange={setReceiptDialogOpen}
                sale={lastCompletedSale}
                storeName={cachedStoreInfo?.name ?? appUser?.storeName ?? store?.name ?? "Store"}
                storeAddress={cachedStoreInfo?.address ?? store?.address_line1 ?? ""}
                storeGstin={cachedStoreInfo?.gstin ?? store?.gstin}
                storePhone={cachedStoreInfo?.phone ?? store?.phone}
                receiptConfig={receiptConfig}
                printFn={printReceipt}
                hasBridgePrinter={hasBridgePrinter}
                bridgeStatus={bridgeStatus}
                onRetryBridge={detectAllDevices}
                onActionComplete={handleReceiptAction}
            />
        </NoShiftGuard>
    );
}