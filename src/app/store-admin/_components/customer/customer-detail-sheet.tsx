"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Phone,
    Mail,
    MapPin,
    Building2,
    Calendar,
    CreditCard,
    Star,
    IndianRupee,
    ShoppingBag,
    AlertTriangle,
    FileText,
} from "lucide-react";
import type { Customer, CustomerLedgerEntry, CreditNote } from "@/types/customers.types";
import { useCustomerStore } from "@/stores/customers.store";
import {
    getCustomerInitials,
    getCustomerTypeLabel,
    getCustomerTypeColor,
    getGenderLabel,
    getCreditStatus,
    getCreditStatusLabel,
    getCreditStatusColor,
    getCreditUtilization,
    getRemainingCredit,
    getLedgerTransactionTypeLabel,
    getLedgerTransactionTypeColor,
    getPaymentMethodLabel,
    formatCurrency,
    formatPhone,
    formatDate,
    formatDateTime,
    formatPoints,
    formatNumber,
    isCreditNoteExpired,
} from "@/utils/customers.utils";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface CustomerDetailSheetProps {
    customer: Customer | null;
    storeId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRecordPayment?: (customer: Customer) => void;
    onAdjustLoyalty?: (customer: Customer) => void;
}

// ============================================================================
// INFO ROW HELPER
// ============================================================================

function InfoRow({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
}) {
    if (!value || value === "—") return null;
    return (
        <div className="flex items-start gap-3 py-2">
            <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm break-all">{value}</p>
            </div>
        </div>
    );
}

// ============================================================================
// STAT CARD (inline)
// ============================================================================

function MiniStatCard({
    label,
    value,
    icon: Icon,
    className,
}: {
    label: string;
    value: string;
    icon: React.ElementType;
    className?: string;
}) {
    return (
        <Card>
            <CardContent className="p-3">
                <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", className)} />
                    <div>
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                        <p className="text-sm font-semibold">{value}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// LEDGER TABLE
// ============================================================================

function LedgerTable({
    entries,
    isLoading,
}: {
    entries: CustomerLedgerEntry[];
    isLoading: boolean;
}) {
    if (isLoading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-8">
                No ledger entries found.
            </p>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Ref</TableHead>
                    <TableHead className="text-xs text-right">Debit</TableHead>
                    <TableHead className="text-xs text-right">Credit</TableHead>
                    <TableHead className="text-xs text-right">Balance</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {entries.map((entry) => (
                    <TableRow key={entry.id}>
                        <TableCell className="text-xs">
                            {formatDate(entry.entry_date)}
                        </TableCell>
                        <TableCell>
                            <Badge
                                variant="secondary"
                                className={cn("text-[9px]", getLedgerTransactionTypeColor(entry.transaction_type))}
                            >
                                {getLedgerTransactionTypeLabel(entry.transaction_type)}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                            {entry.reference_number ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-right text-red-600">
                            {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : ""}
                        </TableCell>
                        <TableCell className="text-xs text-right text-green-600">
                            {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : ""}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">
                            {formatCurrency(entry.balance)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

// ============================================================================
// CREDIT NOTES TABLE
// ============================================================================

function CreditNotesTable({
    creditNotes,
    isLoading,
}: {
    creditNotes: CreditNote[];
    isLoading: boolean;
}) {
    if (isLoading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
        );
    }

    if (creditNotes.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-8">
                No credit notes found.
            </p>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="text-xs">CN Number</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs text-right">Remaining</TableHead>
                    <TableHead className="text-xs">Issued</TableHead>
                    <TableHead className="text-xs">Expiry</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {creditNotes.map((cn) => {
                    const expired = isCreditNoteExpired(cn);
                    const isGrey = cn.is_fully_redeemed || expired || !cn.is_active;
                    return (
                        <TableRow key={cn.id} className={isGrey ? "opacity-50" : ""}>
                            <TableCell className="text-xs font-medium">
                                {cn.credit_note_number}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                                {formatCurrency(cn.amount)}
                            </TableCell>
                            <TableCell className="text-xs text-right font-medium">
                                {formatCurrency(cn.amount_remaining)}
                            </TableCell>
                            <TableCell className="text-xs">
                                {formatDate(cn.issued_date)}
                            </TableCell>
                            <TableCell className="text-xs">
                                {cn.expiry_date ? formatDate(cn.expiry_date) : "No expiry"}
                            </TableCell>
                            <TableCell>
                                <Badge
                                    variant="secondary"
                                    className={cn.is_fully_redeemed
                                        ? "text-[9px] bg-gray-100 text-gray-600"
                                        : expired
                                            ? "text-[9px] bg-red-100 text-red-600"
                                            : "text-[9px] bg-green-100 text-green-600"
                                    }
                                >
                                    {cn.is_fully_redeemed ? "Redeemed" : expired ? "Expired" : "Active"}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}

// ============================================================================
// CREDIT UTILIZATION BAR
// ============================================================================

function CreditUtilizationBar({ customer }: { customer: Customer }) {
    if (!customer.is_credit_allowed) return null;
    const utilization = getCreditUtilization(customer);
    const remaining = getRemainingCredit(customer);
    const status = getCreditStatus(customer);

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Credit Utilization</span>
                <span className="font-medium">{utilization.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full transition-all",
                        status === "over_limit" ? "bg-red-500" :
                            status === "near_limit" ? "bg-amber-500" :
                                "bg-green-500"
                    )}
                    style={{ width: `${Math.min(100, utilization)}%` }}
                />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Used: {formatCurrency(customer.outstanding_balance)}</span>
                <span>Remaining: {formatCurrency(remaining)}</span>
            </div>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CustomerDetailSheet({
    customer,
    storeId,
    open,
    onOpenChange,
    onRecordPayment,
    onAdjustLoyalty,
}: CustomerDetailSheetProps) {
    const {
        ledgerEntries,
        creditNotes,
        fetchLedger,
        fetchCreditNotes,
    } = useCustomerStore();

    const [activeTab, setActiveTab] = useState("overview");
    const [isLoadingLedger, setIsLoadingLedger] = useState(false);
    const [isLoadingCreditNotes, setIsLoadingCreditNotes] = useState(false);

    // Fetch ledger when tab changes
    const loadLedger = useCallback(async () => {
        if (!storeId || !customer) return;
        setIsLoadingLedger(true);
        await fetchLedger(storeId, customer.id);
        setIsLoadingLedger(false);
    }, [storeId, customer, fetchLedger]);

    const loadCreditNotes = useCallback(async () => {
        if (!storeId || !customer) return;
        setIsLoadingCreditNotes(true);
        await fetchCreditNotes(storeId, customer.id);
        setIsLoadingCreditNotes(false);
    }, [storeId, customer, fetchCreditNotes]);

    useEffect(() => {
        if (open && activeTab === "ledger") {
            loadLedger();
        }
    }, [open, activeTab, loadLedger]);

    useEffect(() => {
        if (open && activeTab === "credit-notes") {
            loadCreditNotes();
        }
    }, [open, activeTab, loadCreditNotes]);

    if (!customer) return null;

    const creditStatus = getCreditStatus(customer);
    const initials = getCustomerInitials(customer.name);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl flex flex-col p-0">
                <SheetHeader className="px-6 pt-6 pb-4 flex-shrink-0">
                    {/* Header card */}
                    <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarFallback className="text-lg bg-primary/10 text-primary">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <SheetTitle className="flex items-center gap-2 text-lg">
                                {customer.name}
                                {customer.is_blacklisted && (
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                )}
                            </SheetTitle>
                            <SheetDescription className="flex items-center gap-2 flex-wrap">
                                <span>{customer.customer_code}</span>
                                <Badge
                                    variant="secondary"
                                    className={cn("text-[10px]", getCustomerTypeColor(customer.customer_type))}
                                >
                                    {getCustomerTypeLabel(customer.customer_type)}
                                </Badge>
                                {customer.is_blacklisted && (
                                    <Badge variant="destructive" className="text-[10px]">Blacklisted</Badge>
                                )}
                                {!customer.is_active && !customer.is_blacklisted && (
                                    <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                                )}
                            </SheetDescription>
                        </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex gap-2 mt-3">
                        {customer.outstanding_balance > 0 && onRecordPayment && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => onRecordPayment(customer)}
                            >
                                <CreditCard className="mr-1 h-3 w-3" />
                                Record Payment
                            </Button>
                        )}
                        {onAdjustLoyalty && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => onAdjustLoyalty(customer)}
                            >
                                <Star className="mr-1 h-3 w-3" />
                                Adjust Points
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                <Separator />

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-6 py-3">
                    <MiniStatCard
                        label="Total Purchases"
                        value={formatCurrency(customer.total_purchases)}
                        icon={ShoppingBag}
                        className="text-blue-500"
                    />
                    <MiniStatCard
                        label="Outstanding"
                        value={formatCurrency(customer.outstanding_balance)}
                        icon={IndianRupee}
                        className={customer.outstanding_balance > 0 ? "text-red-500" : "text-green-500"}
                    />
                    <MiniStatCard
                        label="Loyalty Points"
                        value={formatPoints(customer.loyalty_points)}
                        icon={Star}
                        className="text-amber-500"
                    />
                    <MiniStatCard
                        label="Total Visits"
                        value={formatNumber(customer.total_visits)}
                        icon={ShoppingBag}
                        className="text-purple-500"
                    />
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
                    <TabsList className="mx-6 grid w-auto grid-cols-3">
                        <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                        <TabsTrigger value="ledger" className="text-xs">Ledger</TabsTrigger>
                        <TabsTrigger value="credit-notes" className="text-xs">Credit Notes</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="flex-1 min-h-0">
                        {/* ===== OVERVIEW TAB ===== */}
                        <TabsContent value="overview" className="px-6 pb-6 mt-2 space-y-4">
                            {/* Personal Details */}
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Personal Details
                                </h4>
                                <InfoRow icon={Phone} label="Phone" value={formatPhone(customer.phone)} />
                                {customer.alternate_phone && (
                                    <InfoRow icon={Phone} label="Alternate Phone" value={formatPhone(customer.alternate_phone)} />
                                )}
                                <InfoRow icon={Mail} label="Email" value={customer.email} />
                                <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(customer.date_of_birth)} />
                                <InfoRow icon={Calendar} label="Anniversary" value={formatDate(customer.anniversary_date)} />
                                <InfoRow icon={Calendar} label="Gender" value={getGenderLabel(customer.gender)} />
                            </div>

                            <Separator />

                            {/* Address */}
                            {(customer.address_line1 || customer.city) && (
                                <>
                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                            Address
                                        </h4>
                                        <InfoRow
                                            icon={MapPin}
                                            label="Address"
                                            value={[
                                                customer.address_line1,
                                                customer.address_line2,
                                                customer.city,
                                                customer.state,
                                                customer.pincode,
                                            ].filter(Boolean).join(", ")}
                                        />
                                    </div>
                                    <Separator />
                                </>
                            )}

                            {/* GST / Business */}
                            {(customer.gstin || customer.company_name || customer.pan_number) && (
                                <>
                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                            Business / GST
                                        </h4>
                                        <InfoRow icon={Building2} label="Company" value={customer.company_name} />
                                        <InfoRow icon={FileText} label="GSTIN" value={customer.gstin} />
                                        <InfoRow icon={FileText} label="PAN" value={customer.pan_number} />
                                    </div>
                                    <Separator />
                                </>
                            )}

                            {/* Credit Info */}
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Credit Settings
                                </h4>
                                {customer.is_credit_allowed ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="secondary"
                                                className={cn("text-[10px]", getCreditStatusColor(creditStatus))}
                                            >
                                                {getCreditStatusLabel(creditStatus)}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                Limit: {formatCurrency(customer.credit_limit)} · {customer.credit_days} days
                                            </span>
                                        </div>
                                        <CreditUtilizationBar customer={customer} />
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Credit not enabled</p>
                                )}
                            </div>

                            {/* Tags */}
                            {customer.tags && customer.tags.length > 0 && (
                                <>
                                    <Separator />
                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                            Tags
                                        </h4>
                                        <div className="flex flex-wrap gap-1">
                                            {customer.tags.map((tag) => (
                                                <Badge key={tag} variant="outline" className="text-[10px]">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Notes */}
                            {customer.notes && (
                                <>
                                    <Separator />
                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                            Notes
                                        </h4>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                            {customer.notes}
                                        </p>
                                    </div>
                                </>
                            )}

                            {/* Last purchase */}
                            {customer.last_purchase_date && (
                                <>
                                    <Separator />
                                    <div className="text-xs text-muted-foreground space-y-1">
                                        <p>Last Purchase: {formatDate(customer.last_purchase_date)} · {formatCurrency(customer.last_purchase_amount)}</p>
                                        <p>Average Purchase: {formatCurrency(customer.average_purchase_value)}</p>
                                        <p>Created: {formatDateTime(customer.created_at)}</p>
                                    </div>
                                </>
                            )}
                        </TabsContent>

                        {/* ===== LEDGER TAB ===== */}
                        <TabsContent value="ledger" className="px-6 pb-6 mt-2">
                            <LedgerTable entries={ledgerEntries} isLoading={isLoadingLedger} />
                        </TabsContent>

                        {/* ===== CREDIT NOTES TAB ===== */}
                        <TabsContent value="credit-notes" className="px-6 pb-6 mt-2">
                            <CreditNotesTable creditNotes={creditNotes} isLoading={isLoadingCreditNotes} />
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}
