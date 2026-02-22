"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
    Sale,
} from "@/types/sales.types";
import { PAYMENT_METHODS } from "@/types/sales.types";
import {
    createSalePaymentSchema,
    type CreateSalePaymentFormData,
} from "@/validations/sales.validation";
import {
    formatCurrency,
    getPaymentMethodLabel,
} from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

/** For POS checkout — supports split payments & quick cash buttons */
interface PaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Total amount due */
    totalAmount: number;
    /** Already-paid amount (for adding payment to existing sale) */
    paidAmount?: number;
    /** Callback when payments are confirmed */
    onConfirm: (payments: CreateSalePaymentRequest[], isCreditSale: boolean, creditDueDate?: string) => void;
    /** Is processing */
    isProcessing?: boolean;
    /** Whether to show credit sale option */
    showCreditOption?: boolean;
    /** Customer name for display */
    customerName?: string | null;
}

interface PaymentEntry {
    id: string;
    method: PaymentMethod;
    amount: number;
    details: Partial<CreateSalePaymentRequest>;
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

/** Quick-access payment methods shown as large buttons */
const PRIMARY_METHODS: PaymentMethod[] = [
    "CASH",
    "CARD_DEBIT",
    "CARD_CREDIT",
    "UPI",
];

const QUICK_CASH_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

// ============================================================================
// METHOD DETAIL FIELDS COMPONENT
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
                    <Label className="text-xs">Cash Tendered</Label>
                    <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={details.cash_tendered ?? ""}
                        onChange={(e) =>
                            onChange({
                                cash_tendered: e.target.value ? Number(e.target.value) : undefined,
                            })
                        }
                        placeholder="Enter amount tendered"
                    />
                    {details.cash_tendered != null && details.cash_tendered > 0 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Change</span>
                            <span className="font-medium">
                                {formatCurrency(
                                    Math.max(
                                        0,
                                        (details.cash_tendered ?? 0) - (details.amount ?? 0)
                                    )
                                )}
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
                        <Label className="text-xs">Last 4 Digits</Label>
                        <Input
                            maxLength={4}
                            value={details.card_last_four ?? ""}
                            onChange={(e) =>
                                onChange({
                                    card_last_four: e.target.value.replace(/\D/g, "").slice(0, 4),
                                })
                            }
                            placeholder="1234"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Bank</Label>
                        <Input
                            value={details.card_bank ?? ""}
                            onChange={(e) => onChange({ card_bank: e.target.value })}
                            placeholder="Bank name"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Auth Code</Label>
                        <Input
                            value={details.authorization_code ?? ""}
                            onChange={(e) =>
                                onChange({ authorization_code: e.target.value })
                            }
                            placeholder="Auth code"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Terminal ID</Label>
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
                        <Label className="text-xs">UPI ID</Label>
                        <Input
                            value={details.upi_id ?? ""}
                            onChange={(e) => onChange({ upi_id: e.target.value })}
                            placeholder="name@upi"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Ref Number *</Label>
                        <Input
                            value={details.upi_ref_number ?? ""}
                            onChange={(e) =>
                                onChange({ upi_ref_number: e.target.value })
                            }
                            placeholder="Transaction ref"
                        />
                    </div>
                </div>
            );

        case "WALLET":
            return (
                <div className="space-y-1">
                    <Label className="text-xs">Wallet Name</Label>
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
                        <Label className="text-xs">Bank Name</Label>
                        <Input
                            value={details.bank_name ?? ""}
                            onChange={(e) => onChange({ bank_name: e.target.value })}
                            placeholder="Bank"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Reference</Label>
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
                        <Label className="text-xs">Cheque Number *</Label>
                        <Input
                            value={details.cheque_number ?? ""}
                            onChange={(e) => onChange({ cheque_number: e.target.value })}
                            placeholder="Cheque #"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Bank</Label>
                        <Input
                            value={details.cheque_bank ?? ""}
                            onChange={(e) => onChange({ cheque_bank: e.target.value })}
                            placeholder="Bank name"
                        />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Cheque Date</Label>
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
                    <Label className="text-xs">Gift Card Code</Label>
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

    // Payment entries (for split payments)
    const [entries, setEntries] = useState<PaymentEntry[]>([]);
    const [isCreditSale, setIsCreditSale] = useState(false);
    const [creditDueDate, setCreditDueDate] = useState("");
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("CASH");
    const [showMoreMethods, setShowMoreMethods] = useState(false);

    // Calculate amounts
    const totalEntered = useMemo(
        () => entries.reduce((sum, e) => sum + e.amount, 0),
        [entries]
    );
    const remaining = dueAmount - totalEntered;
    const changeAmount = remaining < 0 ? Math.abs(remaining) : 0;
    const isFullyPaid = totalEntered >= dueAmount;

    // Reset on open
    useEffect(() => {
        if (open) {
            setEntries([]);
            setIsCreditSale(false);
            setCreditDueDate("");
            setSelectedMethod("CASH");
            setShowMoreMethods(false);
        }
    }, [open]);

    // Add a quick full-amount payment
    const addFullPayment = useCallback(
        (method: PaymentMethod) => {
            const amount = Math.max(0, dueAmount - totalEntered);
            if (amount <= 0) return;

            const id = crypto.randomUUID();
            const newEntry: PaymentEntry = {
                id,
                method,
                amount,
                details: {
                    payment_method: method,
                    amount,
                    ...(method === "CASH" ? { cash_tendered: amount, change_returned: 0 } : {}),
                },
            };
            setEntries((prev) => [...prev, newEntry]);
        },
        [dueAmount, totalEntered]
    );

    // Add an entry for split payment
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

    // Update an existing entry
    const updateEntry = useCallback(
        (id: string, updates: Partial<PaymentEntry>) => {
            setEntries((prev) =>
                prev.map((e) => {
                    if (e.id !== id) return e;
                    const updated = { ...e, ...updates };
                    // Sync details.amount
                    if (updates.amount !== undefined) {
                        updated.details = {
                            ...updated.details,
                            amount: updates.amount,
                        };
                    }
                    if (updates.method !== undefined) {
                        updated.details = {
                            ...updated.details,
                            payment_method: updates.method,
                        };
                    }
                    return updated;
                })
            );
        },
        []
    );

    // Update entry details
    const updateEntryDetails = useCallback(
        (id: string, detailUpdates: Partial<CreateSalePaymentRequest>) => {
            setEntries((prev) =>
                prev.map((e) =>
                    e.id === id
                        ? { ...e, details: { ...e.details, ...detailUpdates } }
                        : e
                )
            );
        },
        []
    );

    // Remove an entry
    const removeEntry = useCallback((id: string) => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
    }, []);

    // Handle cash quick amounts
    const applyCashTendered = useCallback(
        (entryId: string, tendered: number) => {
            const entry = entries.find((e) => e.id === entryId);
            if (!entry) return;
            const change = Math.max(0, tendered - entry.amount);
            updateEntryDetails(entryId, {
                cash_tendered: tendered,
                change_returned: change,
            });
        },
        [entries, updateEntryDetails]
    );

    // Confirm
    const handleConfirm = useCallback(() => {
        if (!isCreditSale && !isFullyPaid) {
            toast.error("Payment amount does not cover the due amount");
            return;
        }

        // Build payment requests
        const payments: CreateSalePaymentRequest[] = entries.map((e) => ({
            payment_method: e.method,
            amount: e.amount,
            ...e.details,
            // For cash: compute change
            ...(e.method === "CASH" && e.details.cash_tendered
                ? {
                      change_returned: Math.max(
                          0,
                          (e.details.cash_tendered ?? 0) - e.amount
                      ),
                  }
                : {}),
        }));

        onConfirm(
            payments,
            isCreditSale,
            isCreditSale && creditDueDate ? creditDueDate : undefined
        );
    }, [entries, isCreditSale, isFullyPaid, creditDueDate, onConfirm]);

    // Non-primary methods for "more" panel
    const secondaryMethods = PAYMENT_METHODS.filter(
        (m) => !PRIMARY_METHODS.includes(m)
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Collect Payment</DialogTitle>
                    <DialogDescription>
                        {customerName
                            ? `Customer: ${customerName}`
                            : "Walk-in Customer"}
                        {" · "}
                        Total: {formatCurrency(totalAmount)}
                        {paidAmount > 0 && ` · Paid: ${formatCurrency(paidAmount)}`}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-2">
                    <div className="space-y-4">
                        {/* Amount summary bar */}
                        <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">Due</p>
                                <p className="text-lg font-bold">
                                    {formatCurrency(dueAmount)}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">Entered</p>
                                <p className="text-lg font-bold text-green-600">
                                    {formatCurrency(totalEntered)}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">
                                    {remaining > 0 ? "Remaining" : "Change"}
                                </p>
                                <p
                                    className={`text-lg font-bold ${
                                        remaining > 0 ? "text-red-500" : "text-green-600"
                                    }`}
                                >
                                    {formatCurrency(remaining > 0 ? remaining : changeAmount)}
                                </p>
                            </div>
                        </div>

                        {/* Quick method buttons (when no entries yet) */}
                        {entries.length === 0 && (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    {PRIMARY_METHODS.map((method) => (
                                        <Button
                                            key={method}
                                            variant="outline"
                                            className="h-14 flex flex-col gap-1"
                                            onClick={() => addFullPayment(method)}
                                        >
                                            {PAYMENT_METHOD_ICONS[method]}
                                            <span className="text-xs">
                                                {getPaymentMethodLabel(method)}
                                            </span>
                                        </Button>
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
                                            <Button
                                                key={method}
                                                variant="outline"
                                                size="sm"
                                                className="h-10 text-xs flex gap-1"
                                                onClick={() => addFullPayment(method)}
                                            >
                                                {PAYMENT_METHOD_ICONS[method]}
                                                {getPaymentMethodLabel(method)}
                                            </Button>
                                        ))}
                                    </div>
                                )}

                                {/* Split payment option */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-xs gap-1"
                                    onClick={addSplitEntry}
                                >
                                    <Layers className="h-3 w-3" />
                                    Split Payment
                                </Button>
                            </>
                        )}

                        {/* Payment entries */}
                        {entries.length > 0 && (
                            <div className="space-y-3">
                                {entries.map((entry, idx) => (
                                    <div
                                        key={entry.id}
                                        className="border rounded-md p-3 space-y-2"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="text-xs">
                                                    #{idx + 1}
                                                </Badge>
                                                <Select
                                                    value={entry.method}
                                                    onValueChange={(v) =>
                                                        updateEntry(entry.id, {
                                                            method: v as PaymentMethod,
                                                        })
                                                    }
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
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-muted-foreground"
                                                onClick={() => removeEntry(entry.id)}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>

                                        {/* Amount input */}
                                        <div className="space-y-1">
                                            <Label className="text-xs">Amount</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                step={0.01}
                                                value={entry.amount || ""}
                                                onChange={(e) =>
                                                    updateEntry(entry.id, {
                                                        amount: Number(e.target.value) || 0,
                                                    })
                                                }
                                            />
                                        </div>

                                        {/* Cash quick buttons */}
                                        {entry.method === "CASH" && (
                                            <div className="flex flex-wrap gap-1">
                                                {QUICK_CASH_AMOUNTS.filter(
                                                    (a) => a >= entry.amount
                                                ).map((amt) => (
                                                    <Button
                                                        key={amt}
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-6 text-xs px-2"
                                                        onClick={() =>
                                                            applyCashTendered(entry.id, amt)
                                                        }
                                                    >
                                                        ₹{amt}
                                                    </Button>
                                                ))}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 text-xs px-2"
                                                    onClick={() =>
                                                        applyCashTendered(entry.id, entry.amount)
                                                    }
                                                >
                                                    Exact
                                                </Button>
                                            </div>
                                        )}

                                        {/* Method-specific detail fields */}
                                        <MethodDetailFields
                                            method={entry.method}
                                            details={{ ...entry.details, amount: entry.amount }}
                                            onChange={(updates) =>
                                                updateEntryDetails(entry.id, updates)
                                            }
                                        />
                                    </div>
                                ))}

                                {/* Add another split */}
                                {remaining > 0 && (
                                    <div className="flex gap-2">
                                        <Select
                                            value={selectedMethod}
                                            onValueChange={(v) =>
                                                setSelectedMethod(v as PaymentMethod)
                                            }
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
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs gap-1"
                                            onClick={addSplitEntry}
                                        >
                                            <Plus className="h-3 w-3" />
                                            Add
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        <Separator />

                        {/* Credit Sale Option */}
                        {showCreditOption && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-medium">
                                            Credit Sale
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
                                        <Label className="text-xs">Due Date</Label>
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
                    >
                        Cancel
                    </Button>
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
                                    ? `Confirm Credit Sale`
                                    : entries.length > 0
                                    ? `Charge ${formatCurrency(totalEntered)}`
                                    : "Confirm Payment"}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
