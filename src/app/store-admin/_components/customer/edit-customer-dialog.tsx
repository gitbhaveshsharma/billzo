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
import { updateCustomerSchema } from "@/validations/customers.validation";
import { CUSTOMER_TYPES } from "@/types/customers.types";
import type { Customer, UpdateCustomerRequest, CustomerType } from "@/types/customers.types";
import type { GenderType } from "@/types/database.types";
import { getCustomerTypeLabel, getGenderLabel } from "@/utils/customers.utils";
import { INDIAN_STATES } from "@/constants/states";

// ============================================================================
// TYPES
// ============================================================================

const GENDER_OPTIONS: GenderType[] = ["male", "female", "other", "prefer_not_to_say"];

interface EditCustomerDialogProps {
    customer: Customer | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (customerId: string, data: UpdateCustomerRequest) => Promise<boolean>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EditCustomerDialog({
    customer,
    open,
    onOpenChange,
    onSubmit,
}: EditCustomerDialogProps) {
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
        resolver: zodResolver(updateCustomerSchema),
    });

    // Populate form with customer data when dialog opens
    useEffect(() => {
        if (customer && open) {
            reset({
                name: customer.name,
                phone: customer.phone,
                alternate_phone: customer.alternate_phone ?? "",
                email: customer.email ?? "",
                date_of_birth: customer.date_of_birth ?? "",
                anniversary_date: customer.anniversary_date ?? "",
                gender: customer.gender ?? undefined,
                customer_type: customer.customer_type,
                gstin: customer.gstin ?? "",
                company_name: customer.company_name ?? "",
                pan_number: customer.pan_number ?? "",
                address_line1: customer.address_line1 ?? "",
                address_line2: customer.address_line2 ?? "",
                city: customer.city ?? "",
                state: customer.state ?? "",
                pincode: customer.pincode ?? "",
                country: customer.country ?? "India",
                credit_limit: customer.credit_limit,
                credit_days: customer.credit_days,
                is_credit_allowed: customer.is_credit_allowed,
                notes: customer.notes ?? "",
            });
            setActiveTab("basic");
        }
    }, [customer, open, reset]);

    const watchCustomerType = watch("customer_type");
    const watchGender = watch("gender");
    const watchState = watch("state");
    const watchIsCreditAllowed = watch("is_credit_allowed");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFormSubmit = async (data: any) => {
        if (!customer) return;
        setIsSubmitting(true);
        const toastId = toast.loading("Updating customer...");

        try {
            const success = await onSubmit(customer.id, data as UpdateCustomerRequest);
            if (success) {
                toast.success("Customer updated successfully", { id: toastId });
                onOpenChange(false);
            } else {
                toast.error("Failed to update customer", { id: toastId });
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

    if (!customer) return null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle>Edit Customer</DialogTitle>
                    <DialogDescription>
                        Update details for <strong>{customer.name}</strong> ({customer.customer_code}).
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col p-1">
                    <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="business">Business / GST</TabsTrigger>
                        <TabsTrigger value="address">Address</TabsTrigger>
                        <TabsTrigger value="credit">Credit & Notes</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="flex-1 min-h-0 p-4 overflow-x-auto">
                        {/* ================================ BASIC INFO ================================ */}
                        <TabsContent value="basic" className="space-y-4 mt-0 px-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_name">Name</Label>
                                    <Input id="edit_name" {...register("name")} />
                                    {errors.name && (
                                        <p className="text-xs text-destructive">{errors.name.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_phone">Phone</Label>
                                    <Input id="edit_phone" {...register("phone")} />
                                    {errors.phone && (
                                        <p className="text-xs text-destructive">{errors.phone.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_alternate_phone">Alternate Phone</Label>
                                    <Input id="edit_alternate_phone" {...register("alternate_phone")} />
                                    {errors.alternate_phone && (
                                        <p className="text-xs text-destructive">{errors.alternate_phone.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_email">Email</Label>
                                    <Input id="edit_email" type="email" {...register("email")} />
                                    {errors.email && (
                                        <p className="text-xs text-destructive">{errors.email.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_date_of_birth">Date of Birth</Label>
                                    <Input id="edit_date_of_birth" type="date" {...register("date_of_birth")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_anniversary_date">Anniversary Date</Label>
                                    <Input id="edit_anniversary_date" type="date" {...register("anniversary_date")} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Gender</Label>
                                    <Select
                                        value={watchGender || ""}
                                        onValueChange={(val) =>
                                            setValue("gender", val as GenderType, { shouldValidate: true })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select gender" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {GENDER_OPTIONS.map((g) => (
                                                <SelectItem key={g} value={g}>
                                                    {getGenderLabel(g)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Customer Type</Label>
                                    <Select
                                        value={watchCustomerType || ""}
                                        onValueChange={(val) =>
                                            setValue("customer_type", val as CustomerType, { shouldValidate: true })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CUSTOMER_TYPES.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {getCustomerTypeLabel(type)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </TabsContent>

                        {/* ================================ BUSINESS / GST ================================ */}
                        <TabsContent value="business" className="space-y-4 mt-0 px-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit_company_name">Company Name</Label>
                                <Input id="edit_company_name" {...register("company_name")} />
                                {errors.company_name && (
                                    <p className="text-xs text-destructive">{errors.company_name.message}</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_gstin">GSTIN</Label>
                                    <Input id="edit_gstin" uppercase {...register("gstin")} />
                                    {errors.gstin && (
                                        <p className="text-xs text-destructive">{errors.gstin.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_pan_number">PAN Number</Label>
                                    <Input id="edit_pan_number" uppercase {...register("pan_number")} />
                                    {errors.pan_number && (
                                        <p className="text-xs text-destructive">{errors.pan_number.message}</p>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        {/* ================================ ADDRESS ================================ */}
                        <TabsContent value="address" className="space-y-4 mt-0 px-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit_address_line1">Address Line 1</Label>
                                <Input id="edit_address_line1" {...register("address_line1")} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit_address_line2">Address Line 2</Label>
                                <Input id="edit_address_line2" {...register("address_line2")} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_city">City</Label>
                                    <Input id="edit_city" {...register("city")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>State</Label>
                                    <Select
                                        value={watchState || ""}
                                        onValueChange={(val) =>
                                            setValue("state", val, { shouldValidate: true })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select state" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {INDIAN_STATES.map((s) => (
                                                <SelectItem key={s.code} value={s.name}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_pincode">Pincode</Label>
                                    <Input id="edit_pincode" {...register("pincode")} />
                                    {errors.pincode && (
                                        <p className="text-xs text-destructive">{errors.pincode.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_country">Country</Label>
                                    <Input id="edit_country" {...register("country")} />
                                </div>
                            </div>
                        </TabsContent>

                        {/* ================================ CREDIT & NOTES ================================ */}
                        <TabsContent value="credit" className="space-y-4 mt-0 px-4">
                            <div className="flex items-center gap-3">
                                <Switch
                                    id="edit_is_credit_allowed"
                                    checked={watchIsCreditAllowed ?? false}
                                    onCheckedChange={(checked) =>
                                        setValue("is_credit_allowed", checked, { shouldValidate: true })
                                    }
                                />
                                <Label htmlFor="edit_is_credit_allowed">Enable Credit</Label>
                            </div>

                            {watchIsCreditAllowed && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_credit_limit">Credit Limit (₹)</Label>
                                        <Input
                                            id="edit_credit_limit"
                                            type="number"
                                            min={0}
                                            {...register("credit_limit", { valueAsNumber: true })}
                                        />
                                        {errors.credit_limit && (
                                            <p className="text-xs text-destructive">{errors.credit_limit.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_credit_days">Credit Days</Label>
                                        <Input
                                            id="edit_credit_days"
                                            type="number"
                                            min={0}
                                            {...register("credit_days", { valueAsNumber: true })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="edit_notes">Notes</Label>
                                <Textarea
                                    id="edit_notes"
                                    rows={3}
                                    {...register("notes")}
                                />
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>

                <DialogFooter className="flex-shrink-0 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleClose(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit(onFormSubmit)}
                        disabled={isSubmitting}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
