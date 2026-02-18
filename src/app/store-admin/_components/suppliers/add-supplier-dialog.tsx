"use client";

import { useState } from "react";
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
import { createSupplierSchema } from "@/validations/supplier.validation";
import { SUPPLIER_TYPES, PAYMENT_TERMS } from "@/types/supplier.types";
import type { CreateSupplierRequest, SupplierType, PaymentTerm } from "@/types/supplier.types";
import { getSupplierTypeLabel, getPaymentTermLabel } from "@/utils/supplier.utils";
import { INDIAN_STATES } from "@/constants/states";

// ============================================================================
// TYPES
// ============================================================================

interface AddSupplierDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: CreateSupplierRequest) => Promise<boolean>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AddSupplierDialog({
    open,
    onOpenChange,
    onSubmit,
}: AddSupplierDialogProps) {
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
        resolver: zodResolver(createSupplierSchema),
        defaultValues: {
            supplier_code: "",
            name: "",
            legal_name: "",
            type: "distributor" as SupplierType,
            gstin: "",
            pan_number: "",
            tan_number: "",
            msme_number: "",
            contact_person: "",
            email: "",
            phone: "",
            alternate_phone: "",
            whatsapp: "",
            address_line1: "",
            address_line2: "",
            landmark: "",
            city: "",
            state: "",
            pincode: "",
            country: "India",
            bank_name: "",
            bank_account_number: "",
            ifsc_code: "",
            bank_branch: "",
            upi_id: "",
            payment_terms: "immediate" as PaymentTerm,
            credit_limit: undefined as number | undefined,
            credit_days: 0,
            default_discount_percentage: 0,
            tax_inclusive: false,
            is_preferred: false,
            website: "",
            notes: "",
            tags: [] as string[],
        },
    });

    const watchType = watch("type");
    const watchPaymentTerms = watch("payment_terms");
    const watchState = watch("state");
    const watchTaxInclusive = watch("tax_inclusive");
    const watchIsPreferred = watch("is_preferred");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFormSubmit = async (data: any) => {
        setIsSubmitting(true);
        const toastId = toast.loading("Creating supplier...");

        try {
            const success = await onSubmit(data as CreateSupplierRequest);
            if (success) {
                toast.success("Supplier created successfully", { id: toastId });
                reset();
                setActiveTab("basic");
                onOpenChange(false);
            } else {
                toast.error("Failed to create supplier", { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            reset();
            setActiveTab("basic");
        }
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle>Add New Supplier</DialogTitle>
                    <DialogDescription>
                        Create a new supplier record. Fill in the required fields and any additional details.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col p-1">
                    <TabsList className="grid w-full grid-cols-4 flex-shrink-0 ">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="contact">Contact</TabsTrigger>
                        <TabsTrigger value="address">Address</TabsTrigger>
                        <TabsTrigger value="bank">Bank & Payment</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="flex-1 min-h-0 p-4 overflow-x-auto">
                        {/* ================================ BASIC INFO ================================ */}
                        <TabsContent value="basic" className="space-y-4 mt-0 px-4">
                            {/* Supplier Code + Name */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="supplier_code">
                                        Supplier Code <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="supplier_code"
                                        placeholder="e.g., SUP-001"
                                        {...register("supplier_code")}
                                    />
                                    {errors.supplier_code && (
                                        <p className="text-xs text-destructive">{errors.supplier_code.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">
                                        Supplier Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g., ABC Distributors"
                                        {...register("name")}
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-destructive">{errors.name.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Legal Name + Type */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="legal_name">Legal Name</Label>
                                    <Input
                                        id="legal_name"
                                        placeholder="Registered legal name"
                                        {...register("legal_name")}
                                    />
                                    {errors.legal_name && (
                                        <p className="text-xs text-destructive">{errors.legal_name.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select
                                        value={watchType}
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

                            {/* GSTIN + PAN */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="gstin">GSTIN</Label>
                                    <Input
                                        id="gstin"
                                        placeholder="22AAAAA0000A1Z5"
                                        {...register("gstin")}
                                    />
                                    {errors.gstin && (
                                        <p className="text-xs text-destructive">{errors.gstin.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pan_number">PAN Number</Label>
                                    <Input
                                        id="pan_number"
                                        placeholder="AAAAA0000A"
                                        {...register("pan_number")}
                                    />
                                    {errors.pan_number && (
                                        <p className="text-xs text-destructive">{errors.pan_number.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* TAN + MSME */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="tan_number">TAN Number</Label>
                                    <Input
                                        id="tan_number"
                                        placeholder="ABCD12345E"
                                        {...register("tan_number")}
                                    />
                                    {errors.tan_number && (
                                        <p className="text-xs text-destructive">{errors.tan_number.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="msme_number">MSME Number</Label>
                                    <Input
                                        id="msme_number"
                                        placeholder="UDYAM-XX-00-0000000"
                                        {...register("msme_number")}
                                    />
                                    {errors.msme_number && (
                                        <p className="text-xs text-destructive">{errors.msme_number.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Preferred + Website */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="website">Website</Label>
                                    <Input
                                        id="website"
                                        placeholder="https://example.com"
                                        {...register("website")}
                                    />
                                    {errors.website && (
                                        <p className="text-xs text-destructive">{errors.website.message}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 pt-6">
                                    <Switch
                                        id="is_preferred"
                                        checked={watchIsPreferred}
                                        onCheckedChange={(checked) =>
                                            setValue("is_preferred", checked)
                                        }
                                    />
                                    <Label htmlFor="is_preferred">Mark as Preferred</Label>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Any additional notes about this supplier..."
                                    rows={3}
                                    {...register("notes")}
                                />
                                {errors.notes && (
                                    <p className="text-xs text-destructive">{errors.notes.message}</p>
                                )}
                            </div>
                        </TabsContent>

                        {/* ================================ CONTACT ================================ */}
                        <TabsContent value="contact" className="space-y-4 mt-0">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contact_person">Contact Person</Label>
                                    <Input
                                        id="contact_person"
                                        placeholder="Full name"
                                        {...register("contact_person")}
                                    />
                                    {errors.contact_person && (
                                        <p className="text-xs text-destructive">{errors.contact_person.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="supplier@example.com"
                                        {...register("email")}
                                    />
                                    {errors.email && (
                                        <p className="text-xs text-destructive">{errors.email.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        placeholder="+91 98765 43210"
                                        {...register("phone")}
                                    />
                                    {errors.phone && (
                                        <p className="text-xs text-destructive">{errors.phone.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="alternate_phone">Alternate Phone</Label>
                                    <Input
                                        id="alternate_phone"
                                        placeholder="+91 98765 43210"
                                        {...register("alternate_phone")}
                                    />
                                    {errors.alternate_phone && (
                                        <p className="text-xs text-destructive">{errors.alternate_phone.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="whatsapp">WhatsApp</Label>
                                <Input
                                    id="whatsapp"
                                    placeholder="+91 98765 43210"
                                    {...register("whatsapp")}
                                />
                                {errors.whatsapp && (
                                    <p className="text-xs text-destructive">{errors.whatsapp.message}</p>
                                )}
                            </div>
                        </TabsContent>

                        {/* ================================ ADDRESS ================================ */}
                        <TabsContent value="address" className="space-y-4 mt-0">
                            <div className="space-y-2">
                                <Label htmlFor="address_line1">Address Line 1</Label>
                                <Input
                                    id="address_line1"
                                    placeholder="Street address, building number"
                                    {...register("address_line1")}
                                />
                                {errors.address_line1 && (
                                    <p className="text-xs text-destructive">{errors.address_line1.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address_line2">Address Line 2</Label>
                                <Input
                                    id="address_line2"
                                    placeholder="Area, locality"
                                    {...register("address_line2")}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="landmark">Landmark</Label>
                                    <Input
                                        id="landmark"
                                        placeholder="Near landmark"
                                        {...register("landmark")}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city">City</Label>
                                    <Input
                                        id="city"
                                        placeholder="City name"
                                        {...register("city")}
                                    />
                                    {errors.city && (
                                        <p className="text-xs text-destructive">{errors.city.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>State</Label>
                                    <Select
                                        value={watchState || ""}
                                        onValueChange={(val) =>
                                            setValue("state", val || undefined, { shouldValidate: true })
                                        }
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
                                    <Label htmlFor="pincode">Pincode</Label>
                                    <Input
                                        id="pincode"
                                        placeholder="600001"
                                        {...register("pincode")}
                                    />
                                    {errors.pincode && (
                                        <p className="text-xs text-destructive">{errors.pincode.message}</p>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        {/* ================================ BANK & PAYMENT ================================ */}
                        <TabsContent value="bank" className="space-y-4 mt-0">
                            {/* Bank Details */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-muted-foreground">Bank Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="bank_name">Bank Name</Label>
                                        <Input
                                            id="bank_name"
                                            placeholder="e.g., State Bank of India"
                                            {...register("bank_name")}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bank_account_number">Account Number</Label>
                                        <Input
                                            id="bank_account_number"
                                            placeholder="Account number"
                                            {...register("bank_account_number")}
                                        />
                                        {errors.bank_account_number && (
                                            <p className="text-xs text-destructive">{errors.bank_account_number.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="ifsc_code">IFSC Code</Label>
                                        <Input
                                            id="ifsc_code"
                                            placeholder="SBIN0000001"
                                            {...register("ifsc_code")}
                                        />
                                        {errors.ifsc_code && (
                                            <p className="text-xs text-destructive">{errors.ifsc_code.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bank_branch">Branch</Label>
                                        <Input
                                            id="bank_branch"
                                            placeholder="Branch name"
                                            {...register("bank_branch")}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="upi_id">UPI ID</Label>
                                    <Input
                                        id="upi_id"
                                        placeholder="supplier@upi"
                                        {...register("upi_id")}
                                    />
                                    {errors.upi_id && (
                                        <p className="text-xs text-destructive">{errors.upi_id.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Payment Terms */}
                            <div className="space-y-4 pt-2">
                                <h4 className="text-sm font-medium text-muted-foreground">Payment Terms</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Payment Terms</Label>
                                        <Select
                                            value={watchPaymentTerms}
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
                                        <Label htmlFor="credit_days">Credit Days</Label>
                                        <Input
                                            id="credit_days"
                                            type="number"
                                            min={0}
                                            max={365}
                                            {...register("credit_days", { valueAsNumber: true })}
                                        />
                                        {errors.credit_days && (
                                            <p className="text-xs text-destructive">{errors.credit_days.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="credit_limit">Credit Limit (₹)</Label>
                                        <Input
                                            id="credit_limit"
                                            type="number"
                                            min={0}
                                            placeholder="0.00"
                                            {...register("credit_limit", { valueAsNumber: true })}
                                        />
                                        {errors.credit_limit && (
                                            <p className="text-xs text-destructive">{errors.credit_limit.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="default_discount_percentage">Default Discount (%)</Label>
                                        <Input
                                            id="default_discount_percentage"
                                            type="number"
                                            min={0}
                                            max={100}
                                            step={0.01}
                                            {...register("default_discount_percentage", { valueAsNumber: true })}
                                        />
                                        {errors.default_discount_percentage && (
                                            <p className="text-xs text-destructive">{errors.default_discount_percentage.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Switch
                                        id="tax_inclusive"
                                        checked={watchTaxInclusive}
                                        onCheckedChange={(checked) =>
                                            setValue("tax_inclusive", checked)
                                        }
                                    />
                                    <Label htmlFor="tax_inclusive">Prices are tax-inclusive</Label>
                                </div>
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>

                <DialogFooter className="flex-shrink-0 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleClose(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" onClick={handleSubmit(onFormSubmit)} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Supplier
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}