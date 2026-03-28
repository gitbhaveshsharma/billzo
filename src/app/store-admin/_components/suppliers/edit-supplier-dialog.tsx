"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { updateSupplierSchema } from "@/validations/supplier.validation";
import { SUPPLIER_TYPES, PAYMENT_TERMS } from "@/types/supplier.types";
import type { Supplier, UpdateSupplierRequest, SupplierType, PaymentTerm } from "@/types/supplier.types";
import { getSupplierTypeLabel, getPaymentTermLabel } from "@/utils/supplier.utils";
import { INDIAN_STATES } from "@/constants/states";

// ============================================================================
// TYPES
// ============================================================================

interface EditSupplierDialogProps {
    supplier: Supplier | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (supplierId: string, data: UpdateSupplierRequest) => Promise<boolean>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EditSupplierDialog({
    supplier,
    open,
    onOpenChange,
    onSubmit,
}: EditSupplierDialogProps) {
    const [activeTab, setActiveTab] = useState("basic");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(updateSupplierSchema),
    });

    // Populate form when supplier changes
    useEffect(() => {
        if (supplier && open) {
            reset({
                supplier_code: supplier.supplier_code,
                name: supplier.name,
                legal_name: supplier.legal_name ?? undefined,
                type: supplier.type,
                gstin: supplier.gstin ?? undefined,
                pan_number: supplier.pan_number ?? undefined,
                tan_number: supplier.tan_number ?? undefined,
                msme_number: supplier.msme_number ?? undefined,
                contact_person: supplier.contact_person ?? undefined,
                email: supplier.email ?? undefined,
                phone: supplier.phone ?? undefined,
                alternate_phone: supplier.alternate_phone ?? undefined,
                whatsapp: supplier.whatsapp ?? undefined,
                address_line1: supplier.address_line1 ?? undefined,
                address_line2: supplier.address_line2 ?? undefined,
                landmark: supplier.landmark ?? undefined,
                city: supplier.city ?? undefined,
                state: supplier.state ?? undefined,
                pincode: supplier.pincode ?? undefined,
                country: supplier.country,
                bank_name: supplier.bank_name ?? undefined,
                bank_account_number: supplier.bank_account_number ?? undefined,
                ifsc_code: supplier.ifsc_code ?? undefined,
                bank_branch: supplier.bank_branch ?? undefined,
                upi_id: supplier.upi_id ?? undefined,
                payment_terms: supplier.payment_terms,
                credit_limit: supplier.credit_limit ?? undefined,
                credit_days: supplier.credit_days,
                default_discount_percentage: supplier.default_discount_percentage,
                tax_inclusive: supplier.tax_inclusive,
                is_preferred: supplier.is_preferred,
                is_active: supplier.is_active,
                website: supplier.website ?? undefined,
                notes: supplier.notes ?? undefined,
            });
        }
    }, [supplier, open, reset]);

    const watchType = watch("type");
    const watchPaymentTerms = watch("payment_terms");
    const watchState = watch("state");
    const watchTaxInclusive = watch("tax_inclusive");
    const watchIsPreferred = watch("is_preferred");
    const watchIsActive = watch("is_active");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFormSubmit = async (data: any) => {
        if (!supplier) return;
        setIsSubmitting(true);
        const toastId = toast.loading("Updating supplier...");

        try {
            const success = await onSubmit(supplier.id, data as UpdateSupplierRequest);
            if (success) {
                toast.success("Supplier updated successfully", { id: toastId });
                setActiveTab("basic");
                onOpenChange(false);
            } else {
                toast.error("Failed to update supplier", { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            setActiveTab("basic");
        }
        onOpenChange(isOpen);
    };

    if (!supplier) return null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Edit Supplier</DialogTitle>
                    <DialogDescription>
                        Update &ldquo;{supplier.name}&rdquo; ({supplier.supplier_code}) details.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onFormSubmit)}>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="basic">Basic Info</TabsTrigger>
                            <TabsTrigger value="contact">Contact</TabsTrigger>
                            <TabsTrigger value="address">Address</TabsTrigger>
                            <TabsTrigger value="bank">Bank & Payment</TabsTrigger>
                        </TabsList>
                    <ScrollArea className="flex-1 min-h-0 p-4 overflow-x-auto">

                            {/* ================================ BASIC INFO ================================ */}
                            <TabsContent value="basic" className="space-y-4 mt-0">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_supplier_code">
                                            Supplier Code <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="edit_supplier_code"
                                            placeholder="e.g., SUP-001"
                                            uppercase
                                            {...register("supplier_code")}
                                        />
                                        {errors.supplier_code && (
                                            <p className="text-xs text-destructive">{errors.supplier_code.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_name">
                                            Supplier Name <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="edit_name"
                                            placeholder="e.g., ABC Distributors"
                                            {...register("name")}
                                        />
                                        {errors.name && (
                                            <p className="text-xs text-destructive">{errors.name.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_legal_name">Legal Name</Label>
                                        <Input
                                            id="edit_legal_name"
                                            placeholder="Registered legal name"
                                            {...register("legal_name")}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Type</Label>
                                        <Select
                                            value={watchType || supplier.type}
                                            onValueChange={(val) =>
                                                setValue("type", val as SupplierType, { shouldValidate: true })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SUPPLIER_TYPES.map((type) => (
                                                    <SelectItem key={type} value={type}>
                                                        {getSupplierTypeLabel(type)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_gstin">GSTIN</Label>
                                        <Input id="edit_gstin" placeholder="22AAAAA0000A1Z5" uppercase {...register("gstin")} />
                                        {errors.gstin && <p className="text-xs text-destructive">{errors.gstin.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_pan_number">PAN Number</Label>
                                        <Input id="edit_pan_number" placeholder="AAAAA0000A" uppercase {...register("pan_number")} />
                                        {errors.pan_number && <p className="text-xs text-destructive">{errors.pan_number.message}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_tan_number">TAN Number</Label>
                                        <Input id="edit_tan_number" placeholder="ABCD12345E" uppercase {...register("tan_number")} />
                                        {errors.tan_number && <p className="text-xs text-destructive">{errors.tan_number.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_msme_number">MSME Number</Label>
                                        <Input id="edit_msme_number" placeholder="UDYAM-XX-00-0000000" uppercase {...register("msme_number")} />
                                        {errors.msme_number && <p className="text-xs text-destructive">{errors.msme_number.message}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_website">Website</Label>
                                        <Input id="edit_website" placeholder="https://example.com" {...register("website")} />
                                        {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
                                    </div>
                                    <div className="flex flex-col gap-3 pt-2">
                                        <div className="flex items-center gap-3">
                                            <Switch
                                                id="edit_is_preferred"
                                                checked={watchIsPreferred ?? supplier.is_preferred}
                                                onCheckedChange={(checked) => setValue("is_preferred", checked)}
                                            />
                                            <Label htmlFor="edit_is_preferred">Preferred</Label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Switch
                                                id="edit_is_active"
                                                checked={watchIsActive ?? supplier.is_active}
                                                onCheckedChange={(checked) => setValue("is_active", checked)}
                                            />
                                            <Label htmlFor="edit_is_active">Active</Label>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit_notes">Notes</Label>
                                    <Textarea id="edit_notes" placeholder="Notes..." rows={3} {...register("notes")} />
                                </div>
                            </TabsContent>

                            {/* ================================ CONTACT ================================ */}
                            <TabsContent value="contact" className="space-y-4 mt-0">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_contact_person">Contact Person</Label>
                                        <Input id="edit_contact_person" placeholder="Full name" {...register("contact_person")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_email">Email</Label>
                                        <Input id="edit_email" type="email" placeholder="supplier@example.com" {...register("email")} />
                                        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_phone">Phone</Label>
                                        <Input id="edit_phone" placeholder="+91 98765 43210" {...register("phone")} />
                                        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_alternate_phone">Alternate Phone</Label>
                                        <Input id="edit_alternate_phone" placeholder="+91 98765 43210" {...register("alternate_phone")} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_whatsapp">WhatsApp</Label>
                                    <Input id="edit_whatsapp" placeholder="+91 98765 43210" {...register("whatsapp")} />
                                </div>
                            </TabsContent>

                            {/* ================================ ADDRESS ================================ */}
                            <TabsContent value="address" className="space-y-4 mt-0">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_address_line1">Address Line 1</Label>
                                    <Input id="edit_address_line1" placeholder="Street address" {...register("address_line1")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_address_line2">Address Line 2</Label>
                                    <Input id="edit_address_line2" placeholder="Area, locality" {...register("address_line2")} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_landmark">Landmark</Label>
                                        <Input id="edit_landmark" placeholder="Near landmark" {...register("landmark")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_city">City</Label>
                                        <Input id="edit_city" placeholder="City name" {...register("city")} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>State</Label>
                                        <Select
                                            value={watchState || ""}
                                            onValueChange={(val) => setValue("state", val || undefined, { shouldValidate: true })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select state" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {INDIAN_STATES.map((state) => (
                                                    <SelectItem key={state.code} value={state.name}>
                                                        {state.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_pincode">Pincode</Label>
                                        <Input id="edit_pincode" placeholder="600001" {...register("pincode")} />
                                        {errors.pincode && <p className="text-xs text-destructive">{errors.pincode.message}</p>}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* ================================ BANK & PAYMENT ================================ */}
                            <TabsContent value="bank" className="space-y-4 mt-0">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-muted-foreground">Bank Details</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_bank_name">Bank Name</Label>
                                            <Input id="edit_bank_name" placeholder="e.g., State Bank of India" {...register("bank_name")} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_bank_account_number">Account Number</Label>
                                            <Input id="edit_bank_account_number" placeholder="Account number" {...register("bank_account_number")} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_ifsc_code">IFSC Code</Label>
                                            <Input id="edit_ifsc_code" placeholder="SBIN0000001" uppercase {...register("ifsc_code")} />
                                            {errors.ifsc_code && <p className="text-xs text-destructive">{errors.ifsc_code.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_bank_branch">Branch</Label>
                                            <Input id="edit_bank_branch" placeholder="Branch name" {...register("bank_branch")} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_upi_id">UPI ID</Label>
                                        <Input id="edit_upi_id" placeholder="supplier@upi" {...register("upi_id")} />
                                        {errors.upi_id && <p className="text-xs text-destructive">{errors.upi_id.message}</p>}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <h4 className="text-sm font-medium text-muted-foreground">Payment Terms</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Payment Terms</Label>
                                            <Select
                                                value={watchPaymentTerms || supplier.payment_terms}
                                                onValueChange={(val) =>
                                                    setValue("payment_terms", val as PaymentTerm, { shouldValidate: true })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {PAYMENT_TERMS.map((term) => (
                                                        <SelectItem key={term} value={term}>
                                                            {getPaymentTermLabel(term)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_credit_days">Credit Days</Label>
                                            <Input
                                                id="edit_credit_days"
                                                type="number"
                                                min={0}
                                                max={365}
                                                {...register("credit_days", { valueAsNumber: true })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_credit_limit">Credit Limit (₹)</Label>
                                            <Input
                                                id="edit_credit_limit"
                                                type="number"
                                                min={0}
                                                placeholder="0.00"
                                                {...register("credit_limit", { valueAsNumber: true })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_default_discount">Default Discount (%)</Label>
                                            <Input
                                                id="edit_default_discount"
                                                type="number"
                                                min={0}
                                                max={100}
                                                step={0.01}
                                                {...register("default_discount_percentage", { valueAsNumber: true })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id="edit_tax_inclusive"
                                            checked={watchTaxInclusive ?? supplier.tax_inclusive}
                                            onCheckedChange={(checked) => setValue("tax_inclusive", checked)}
                                        />
                                        <Label htmlFor="edit_tax_inclusive">Prices are tax-inclusive</Label>
                                    </div>
                                </div>
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>
                    <DialogFooter className="mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleClose(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
