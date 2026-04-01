"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import {
    Banknote,
    CreditCard,
    Smartphone,
    Wallet,
    Building2,
    FileCheck,
    Gift,
    Receipt,
    Star,
    Layers,
    Plus,
    X,
    Check,
    Info,
    HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type {
    PaymentMethod,
    CreateSalePaymentRequest,
} from "@/types/sales.types";
import { PAYMENT_METHODS } from "@/types/sales.types";
import {
    formatCurrency,
    getPaymentMethodLabel,
} from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

interface PaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    totalAmount: number;
    paidAmount?: number;
    onConfirm: (payments: CreateSalePaymentRequest[], isCreditSale: boolean, creditDueDate?: string) => void;
    isProcessing?: boolean;
    showCreditOption?: boolean;
    customerName?: string | null;
}

interface PaymentEntry {
    id: string;
    method: PaymentMethod;
    amount: number;
    details: Partial<CreateSalePaymentRequest>;
}

// ============================================================================
// TOOLTIP HELPER — small info icon that shows a tooltip on hover
// ============================================================================

function InfoTip({ text }: { text: string }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help inline-block ml-1" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs">
                {text}
            </TooltipContent>
        </Tooltip>
    );
}

// ============================================================================
// PAYMENT METHOD CONFIG
// ============================================================================

const PAYMENT_METHOD_ICONS: Record<string, React.ReactNode> = {
    CASH: <Banknote className="h-4 w-4" />,
    CARD_CREDIT: <CreditCard className="h-4 w-4" />,
    CARD_DEBIT: <CreditCard className="h-4 w-4" />,
    UPI: <Smartphone className="h-4 w-4" />,
    NET_BANKING: <Building2 className="h-4 w-4" />,
    WALLET: <Wallet className="h-4 w-4" />,
    CHEQUE: <FileCheck className="h-4 w-4" />,
    NEFT_RTGS: <Building2 className="h-4 w-4" />,
    CREDIT_NOTE: <Receipt className="h-4 w-4" />,
    LOYALTY_POINTS: <Star className="h-4 w-4" />,
    EMI: <Layers className="h-4 w-4" />,
    GIFT_CARD: <Gift className="h-4 w-4" />,
};

/** Tooltip descriptions for each payment method button */
const PAYMENT_METHOD_TOOLTIPS: Record<string, string> = {
    CASH: "Customer pays with physical cash. Enter the amount tendered and change will be calculated automatically.",
    CARD_DEBIT: "Customer pays by swiping or tapping a debit card. Optionally enter last 4 digits and authorization code.",
    CARD_CREDIT: "Customer pays by credit card. Optionally enter last 4 digits, bank name, and authorization code.",
    UPI: "Customer pays via UPI (Google Pay, PhonePe, Paytm, etc.). Enter the transaction reference number for records.",
    NET_BANKING: "Customer pays via internet banking transfer. Enter bank name and reference number.",
    WALLET: "Customer pays using a digital wallet (Paytm Wallet, Amazon Pay, etc.).",
    CHEQUE: "Customer pays by cheque. Enter cheque number, bank, and date. Payment is pending until cheque clears.",
    NEFT_RTGS: "Customer pays via NEFT or RTGS bank transfer. Enter bank name and transaction reference.",
    CREDIT_NOTE: "Apply an existing credit note issued to the customer (from a previous return or refund).",
    LOYALTY_POINTS: "Redeem customer's loyalty points as payment. Points will be deducted from their account.",
    EMI: "Customer pays via EMI (Equated Monthly Instalment). Only applies to card or financing schemes.",
    GIFT_CARD: "Customer pays using a gift card. Enter the gift card code to redeem the balance.",
};

const PRIMARY_METHODS: PaymentMethod[] = [
    "CASH",
    "CARD_DEBIT",
    "CARD_CREDIT",
    "UPI",
];

const QUICK_CASH_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

// ============================================================================
// METHOD DETAIL FIELDS
// ============================================================================

function MethodDetailFields({
    method,
    details,
    onChange,
}: {
    method: PaymentMethod;
    details: Partial<CreateSalePaymentRequest>;
    onChange: (updates: Partial<CreateSalePaymentRequest>) => void;
}) {
    switch (method) {
        case "CASH":
            return (
                <div className="space-y-2">
                    <Label className="text-xs">
                        Cash Tendered
                        <InfoTip text="The actual amount of cash the customer hands over. Change returned will be calculated automatically." />
                    </Label>
                    <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={details.cash_tendered ?? ""}
                        onChange={(e) =>
                            onChange({ cash_tendered: e.target.value ? Number(e.target.value) : undefined })
                        }
                        placeholder="Enter amount tendered"
                    />
                    {details.cash_tendered != null && details.cash_tendered > 0 && (
                        <div className="flex items-center justify-between text-xs bg-muted/40 px-2 py-1 rounded">
                            <span className="text-muted-foreground flex items-center gap-1">
                                Change to return
                                <InfoTip text="Amount you need to return to the customer as change." />
                            </span>
                            <span className="font-semibold text-green-600">
                                {formatCurrency(Math.max(0, (details.cash_tendered ?? 0) - (details.amount ?? 0)))}
                            </span>
                        </div>
                    )}
                </div>
            );

        case "CARD_CREDIT":
        case "CARD_DEBIT":
            return (
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">
                            Last 4 Digits
                            <InfoTip text="Last 4 digits of the card used. Optional — helps identify the card in case of dispute." />
                        </Label>
                        <Input
                            maxLength={4}
                            value={details.card_last_four ?? ""}
                            onChange={(e) =>
                                onChange({ card_last_four: e.target.value.replace(/\D/g, "").slice(0, 4) })
                            }
                            placeholder="1234"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">
                            Bank
                            <InfoTip text="Name of the bank that issued the card (e.g. HDFC, ICICI, SBI)." />
                        </Label>
                        <Input
                            value={details.card_bank ?? ""}
                            onChange={(e) => onChange({ card_bank: e.target.value })}
                            placeholder="Bank name"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">
                            Auth Code
                            <InfoTip text="Authorization code from the card terminal receipt. Proves the transaction was approved by the bank." />
                        </Label>
                        <Input
                            value={details.authorization_code ?? ""}
                            onChange={(e) => onChange({ authorization_code: e.target.value })}
                            placeholder="Auth code"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">
                            Terminal ID
                            <InfoTip text="ID of the card swipe machine (POS terminal) used. Found on the terminal or its receipt." />
                        </Label>
                        <Input
                            value={details.terminal_id ?? ""}
                            onChange={(e) => onChange({ terminal_id: e.target.value })}
                            placeholder="Terminal"
                        />
                    </div>
                </div>
            );

        case "UPI":
            return (
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">
                            UPI ID
                            <InfoTip text="Customer's UPI ID (e.g. name@okaxis, 9876543210@ybl). Optional." />
                        </Label>
                        <Input
                            value={details.upi_id ?? ""}
                            onChange={(e) => onChange({ upi_id: e.target.value })}
                            placeholder="name@upi"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">
                            Ref Number
                            <InfoTip text="UPI transaction reference number (UTR). Shown on the customer's payment app after successful payment. Important for reconciliation." />
                        </Label>
                        <Input
                            value={details.upi_ref_number ?? ""}
                            onChange={(e) => onChange({ upi_ref_number: e.target.value })}
                            placeholder="Transaction ref"
                        />
                    </div>
                </div>
            );

        case "WALLET":
            return (
                <div className="space-y-1">
                    <Label className="text-xs">
                        Wallet Name
                        <InfoTip text="Name of the digital wallet used (e.g. Paytm Wallet, Amazon Pay, Mobikwik)." />
                    </Label>
                    <Input
                        value={details.wallet_name ?? ""}
                        onChange={(e) => onChange({ wallet_name: e.target.value })}
                        placeholder="e.g. Paytm, PhonePe"
                    />
                </div>
            );

        case "NET_BANKING":
        case "NEFT_RTGS":
            return (
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">
                            Bank Name
                            <InfoTip text="Name of the customer's bank that initiated the transfer." />
                        </Label>
                        <Input
                            value={details.bank_name ?? ""}
                            onChange={(e) => onChange({ bank_name: e.target.value })}
                            placeholder="Bank"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">
                            Reference
                            <InfoTip text="Bank transaction reference / UTR number. Used to match the payment in your bank statement." />
                        </Label>
                        <Input
                            value={details.bank_reference ?? ""}
                            onChange={(e) => onChange({ bank_reference: e.target.value })}
                            placeholder="Ref number"
                        />
                    </div>
                </div>
            );

        case "CHEQUE":
            return (
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">
                            Cheque Number
                            <InfoTip text="6-digit cheque number printed on the bottom of the cheque. Required for tracking." />
                        </Label>
                        <Input
                            value={details.cheque_number ?? ""}
                            onChange={(e) => onChange({ cheque_number: e.target.value })}
                            placeholder="Cheque #"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">
                            Bank
                            <InfoTip text="Name of the bank printed on the cheque." />
                        </Label>
                        <Input
                            value={details.cheque_bank ?? ""}
                            onChange={(e) => onChange({ cheque_bank: e.target.value })}
                            placeholder="Bank name"
                        />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <Label className="text-xs">
                            Cheque Date
                            <InfoTip text="Date written on the cheque. Post-dated cheques are common — ensure this matches what is written." />
                        </Label>
                        <Input
                            type="date"
                            value={details.cheque_date ?? ""}
                            onChange={(e) => onChange({ cheque_date: e.target.value })}
                        />
                    </div>
                </div>
            );

        case "GIFT_CARD":
            return (
                <div className="space-y-1">
                    <Label className="text-xs">
                        Gift Card Code
                        <InfoTip text="The code printed on the gift card. The balance on this card will be applied to the sale." />
                    </Label>
                    <Input
                        value={details.gift_card_code ?? ""}
                        onChange={(e) => onChange({ gift_card_code: e.target.value })}
                        placeholder="Enter code"
                    />
                </div>
            );

        default:
            return (
                <div className="space-y-1">
                    <Label className="text-xs">Notes</Label>
                    <Input
                        value={details.notes ?? ""}
                        onChange={(e) => onChange({ notes: e.target.value })}
                        placeholder="Payment notes"
                    />
                </div>
            );
    }
}

// ============================================================================
// PAYMENT DIALOG
// ============================================================================

export function PaymentDialog({
    open,
    onOpenChange,
    totalAmount,
    paidAmount = 0,
    onConfirm,
    isProcessing = false,
    showCreditOption = true,
    customerName,
}: PaymentDialogProps) {
    const dueAmount = totalAmount - paidAmount;

    const [entries, setEntries] = useState<PaymentEntry[]>([]);
    const [isCreditSale, setIsCreditSale] = useState(false);
    const [creditDueDate, setCreditDueDate] = useState("");
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("CASH");
    const [showMoreMethods, setShowMoreMethods] = useState(false);

    const totalEntered = useMemo(() => entries.reduce((sum, e) => sum + e.amount, 0), [entries]);
    const remaining = dueAmount - totalEntered;
    const changeAmount = remaining < 0 ? Math.abs(remaining) : 0;
    const isFullyPaid = totalEntered >= dueAmount;

    useEffect(() => {
        if (open) {
            setEntries([]);
            setIsCreditSale(false);
            setCreditDueDate("");
            setSelectedMethod("CASH");
            setShowMoreMethods(false);
        }
    }, [open]);

    const addFullPayment = useCallback(
        (method: PaymentMethod) => {
            const amount = Math.max(0, dueAmount - totalEntered);
            if (amount <= 0) return;
            const id = crypto.randomUUID();
            setEntries((prev) => [
                ...prev,
                {
                    id,
                    method,
                    amount,
                    details: {
                        payment_method: method,
                        amount,
                        ...(method === "CASH" ? { cash_tendered: amount, change_returned: 0 } : {}),
                    },
                },
            ]);
        },
        [dueAmount, totalEntered]
    );

    const addSplitEntry = useCallback(() => {
        const amount = Math.max(0, dueAmount - totalEntered);
        const id = crypto.randomUUID();
        setEntries((prev) => [
            ...prev,
            {
                id,
                method: selectedMethod,
                amount,
                details: {
                    payment_method: selectedMethod,
                    amount,
                    ...(selectedMethod === "CASH" ? { cash_tendered: amount, change_returned: 0 } : {}),
                },
            },
        ]);
    }, [dueAmount, totalEntered, selectedMethod]);

    const updateEntry = useCallback((id: string, updates: Partial<PaymentEntry>) => {
        setEntries((prev) =>
            prev.map((e) => {
                if (e.id !== id) return e;
                const updated = { ...e, ...updates };
                if (updates.amount !== undefined) updated.details = { ...updated.details, amount: updates.amount };
                if (updates.method !== undefined) updated.details = { ...updated.details, payment_method: updates.method };
                return updated;
            })
        );
    }, []);

    const updateEntryDetails = useCallback((id: string, detailUpdates: Partial<CreateSalePaymentRequest>) => {
        setEntries((prev) =>
            prev.map((e) => (e.id === id ? { ...e, details: { ...e.details, ...detailUpdates } } : e))
        );
    }, []);

    const removeEntry = useCallback((id: string) => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
    }, []);

    const applyCashTendered = useCallback(
        (entryId: string, tendered: number) => {
            const entry = entries.find((e) => e.id === entryId);
            if (!entry) return;
            updateEntryDetails(entryId, {
                cash_tendered: tendered,
                change_returned: Math.max(0, tendered - entry.amount),
            });
        },
        [entries, updateEntryDetails]
    );

    const handleConfirm = useCallback(() => {
        if (!isCreditSale && !isFullyPaid) {
            toast.error("Payment amount does not cover the due amount");
            return;
        }
        const payments: CreateSalePaymentRequest[] = entries.map((e) => ({
            payment_method: e.method,
            amount: e.amount,
            ...e.details,
            ...(e.method === "CASH" && e.details.cash_tendered
                ? { change_returned: Math.max(0, (e.details.cash_tendered ?? 0) - e.amount) }
                : {}),
        }));
        onConfirm(payments, isCreditSale, isCreditSale && creditDueDate ? creditDueDate : undefined);
    }, [entries, isCreditSale, isFullyPaid, creditDueDate, onConfirm]);

    const secondaryMethods = PAYMENT_METHODS.filter((m) => !PRIMARY_METHODS.includes(m));

    // ========================================================================
    // KEYBOARD SHORTCUTS — Enter to confirm, 1-4 to select primary methods
    // ========================================================================
    useEffect(() => {
        if (!open) return;

        function handleKeyDown(e: KeyboardEvent) {
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName.toLowerCase() ?? "";
            const isInteractiveTarget = Boolean(
                target?.closest(
                    "button, [role='button'], [role='tab'], [role='menuitem'], a[href], [data-radix-collection-item]"
                )
            );

            // Enter → Confirm payment (unless focused on an input field)
            if (e.key === "Enter" && tag !== "input" && tag !== "textarea" && tag !== "select") {
                // Preserve native Enter behavior for focused controls selected via arrow navigation.
                if (isInteractiveTarget) return;

                e.preventDefault();
                // Only allow confirm when valid
                const canConfirm = !isProcessing && (entries.length > 0 || isCreditSale) && (isCreditSale || isFullyPaid);
                if (canConfirm) {
                    handleConfirm();
                }
                return;
            }

            // Number keys 1-4 to quick-select primary payment methods (only when no entries yet)
            if (entries.length === 0 && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                if (tag === "input" || tag === "textarea" || tag === "select") return;
                const idx = parseInt(e.key, 10);
                if (idx >= 1 && idx <= PRIMARY_METHODS.length) {
                    e.preventDefault();
                    addFullPayment(PRIMARY_METHODS[idx - 1]);
                    return;
                }
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, entries.length, isCreditSale, isFullyPaid, isProcessing, handleConfirm, addFullPayment]);

    return (
        <TooltipProvider delayDuration={300}>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-xl max-h-[95vh]">
                    <DialogHeader>
                        <DialogTitle>Collect Payment</DialogTitle>
                        <DialogDescription>
                            {customerName ? `Customer: ${customerName}` : "Walk-in Customer"}
                            {" · "}
                            Total: {formatCurrency(totalAmount)}
                            {paidAmount > 0 && ` · Paid: ${formatCurrency(paidAmount)}`}
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[95vh] overflow-y-auto">
                        <div className="space-y-4 px-4 py-1">

                            {/* Amount summary bar */}
                            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                        Due
                                        <InfoTip text="Total amount the customer needs to pay for this sale." />
                                    </p>
                                    <p className="text-lg font-bold">{formatCurrency(dueAmount)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                        Entered
                                        <InfoTip text="Total amount entered across all payment methods so far." />
                                    </p>
                                    <p className="text-lg font-bold text-green-600">{formatCurrency(totalEntered)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                        {remaining > 0 ? "Remaining" : "Change"}
                                        <InfoTip text={remaining > 0
                                            ? "Amount still to be collected from the customer."
                                            : "Amount to be returned to the customer as change."
                                        } />
                                    </p>
                                    <p className={`text-lg font-bold ${remaining > 0 ? "text-red-500" : "text-green-600"}`}>
                                        {formatCurrency(remaining > 0 ? remaining : changeAmount)}
                                    </p>
                                </div>
                            </div>

                            {/* Quick method buttons */}
                            {entries.length === 0 && (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        {PRIMARY_METHODS.map((method, idx) => (
                                            <Tooltip key={method}>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="h-14 flex flex-col gap-1 relative"
                                                        onClick={() => addFullPayment(method)}
                                                    >
                                                        <kbd className="absolute top-1 left-1.5 text-[10px] font-mono text-muted-foreground border rounded px-1 bg-muted/50">
                                                            {idx + 1}
                                                        </kbd>
                                                        {PAYMENT_METHOD_ICONS[method]}
                                                        <span className="text-xs">
                                                            {getPaymentMethodLabel(method)}
                                                        </span>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" className="max-w-[200px] text-xs">
                                                    {PAYMENT_METHOD_TOOLTIPS[method]}
                                                    <br /><span className="text-muted-foreground">Press {idx + 1} to select</span>
                                                </TooltipContent>
                                            </Tooltip>
                                        ))}
                                    </div>

                                    {!showMoreMethods ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-xs"
                                            onClick={() => setShowMoreMethods(true)}
                                        >
                                            More payment methods...
                                        </Button>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {secondaryMethods.map((method) => (
                                                <Tooltip key={method}>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-10 text-xs flex gap-1"
                                                            onClick={() => addFullPayment(method)}
                                                        >
                                                            {PAYMENT_METHOD_ICONS[method]}
                                                            {getPaymentMethodLabel(method)}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" className="max-w-[200px] text-xs">
                                                        {PAYMENT_METHOD_TOOLTIPS[method]}
                                                    </TooltipContent>
                                                </Tooltip>
                                            ))}
                                        </div>
                                    )}

                                    {/* Split payment */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full text-xs gap-1"
                                                onClick={addSplitEntry}
                                            >
                                                <Layers className="h-3 w-3" />
                                                Split Payment
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                                            Customer pays using more than one method — e.g. part cash, part UPI. Click to add multiple payment entries.
                                        </TooltipContent>
                                    </Tooltip>
                                </>
                            )}

                            {/* Payment entries */}
                            {entries.length > 0 && (
                                <div className="space-y-3">
                                    {entries.map((entry, idx) => (
                                        <div key={entry.id} className="border rounded-md p-3 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Badge variant="secondary" className="text-xs cursor-default">
                                                                #{idx + 1}
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="text-xs">
                                                            Payment entry {idx + 1} of {entries.length}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    <Select
                                                        value={entry.method}
                                                        onValueChange={(v) => updateEntry(entry.id, { method: v as PaymentMethod })}
                                                    >
                                                        <SelectTrigger className="w-[140px] h-7 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {PAYMENT_METHODS.map((m) => (
                                                                <SelectItem key={m} value={m}>
                                                                    {getPaymentMethodLabel(m)}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 text-muted-foreground"
                                                            onClick={() => removeEntry(entry.id)}
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="text-xs">
                                                        Remove this payment entry
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>

                                            {/* Amount input */}
                                            <div className="space-y-1">
                                                <Label className="text-xs">
                                                    Amount
                                                    <InfoTip text="Amount the customer is paying via this method. Adjust if splitting payment across multiple methods." />
                                                </Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step={0.01}
                                                    value={entry.amount || ""}
                                                    onChange={(e) =>
                                                        updateEntry(entry.id, { amount: Number(e.target.value) || 0 })
                                                    }
                                                />
                                            </div>

                                            {/* Cash quick buttons */}
                                            {entry.method === "CASH" && (
                                                <div className="space-y-1">
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        Quick cash
                                                        <InfoTip text="Common cash denominations. Click the note the customer hands over — change will be calculated automatically." />
                                                    </p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {QUICK_CASH_AMOUNTS.filter((a) => a >= entry.amount).map((amt) => (
                                                            <Tooltip key={amt}>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-6 text-xs px-2"
                                                                        onClick={() => applyCashTendered(entry.id, amt)}
                                                                    >
                                                                        ₹{amt}
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-xs">
                                                                    Customer pays with ₹{amt} note — change: {formatCurrency(Math.max(0, amt - entry.amount))}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        ))}
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-6 text-xs px-2"
                                                                    onClick={() => applyCashTendered(entry.id, entry.amount)}
                                                                >
                                                                    Exact
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="text-xs">
                                                                Customer pays exact amount — no change to return.
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            )}

                                            <MethodDetailFields
                                                method={entry.method}
                                                details={{ ...entry.details, amount: entry.amount }}
                                                onChange={(updates) => updateEntryDetails(entry.id, updates)}
                                            />
                                        </div>
                                    ))}

                                    {/* Add another split */}
                                    {remaining > 0 && (
                                        <div className="flex gap-2">
                                            <Select
                                                value={selectedMethod}
                                                onValueChange={(v) => setSelectedMethod(v as PaymentMethod)}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {PAYMENT_METHODS.map((m) => (
                                                        <SelectItem key={m} value={m}>
                                                            {getPaymentMethodLabel(m)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 text-xs gap-1"
                                                        onClick={addSplitEntry}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                        Add
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="text-xs">
                                                    Add another payment method for the remaining {formatCurrency(remaining)}
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* Credit Sale toggle */}
                            {showCreditOption && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-medium flex items-center gap-1">
                                                Credit Sale
                                                <InfoTip text="Enable this if the customer is not paying the full amount now. The remaining balance will be added to their credit account and tracked as an outstanding due." />
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                Allow partial/no payment now
                                            </p>
                                        </div>
                                        <Switch
                                            checked={isCreditSale}
                                            onCheckedChange={setIsCreditSale}
                                        />
                                    </div>
                                    {isCreditSale && (
                                        <div className="space-y-1">
                                            <Label className="text-xs">
                                                Due Date
                                                <InfoTip text="The date by which the customer should clear the remaining balance. A reminder can be sent when this date approaches." />
                                            </Label>
                                            <Input
                                                type="date"
                                                value={creditDueDate}
                                                onChange={(e) => setCreditDueDate(e.target.value)}
                                                min={new Date().toISOString().split("T")[0]}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isProcessing}
                            className="gap-1"
                        >
                            Cancel
                            <kbd className="ml-1 text-[10px] font-mono text-muted-foreground border rounded px-1 bg-muted/50">Esc</kbd>
                        </Button>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={handleConfirm}
                                    disabled={
                                        isProcessing ||
                                        (entries.length === 0 && !isCreditSale) ||
                                        (!isCreditSale && !isFullyPaid)
                                    }
                                    className="gap-1"
                                >
                                    {isProcessing ? (
                                        "Processing..."
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4" />
                                            {isCreditSale
                                                ? "Confirm Credit Sale"
                                                : entries.length > 0
                                                    ? `Charge ${formatCurrency(totalEntered)}`
                                                    : "Confirm Payment"}
                                            <kbd className="ml-1 text-[10px] font-mono text-muted-foreground/80 border rounded px-1 bg-muted/30">↵</kbd>
                                        </>
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs max-w-[220px]">
                                {!isCreditSale && !isFullyPaid
                                    ? `Still ${formatCurrency(remaining)} remaining. Add more payment to proceed.`
                                    : isCreditSale
                                        ? "Confirm sale with outstanding balance added to customer's credit account."
                                        : "Finalise the sale and generate invoice."}
                            </TooltipContent>
                        </Tooltip>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
}