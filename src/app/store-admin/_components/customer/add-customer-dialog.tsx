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
import {
    createCustomerSchema,
    type CreateCustomerFormData,
} from "@/validations/customers.validation";
import { CUSTOMER_TYPES } from "@/types/customers.types";
import type { CreateCustomerRequest, CustomerType } from "@/types/customers.types";
import type { GenderType } from "@/types/database.types";
import { getCustomerTypeLabel, getGenderLabel } from "@/utils/customers.utils";
import { INDIAN_STATES } from "@/constants/states";

// ============================================================================
// TYPES
// ============================================================================

const GENDER_OPTIONS: GenderType[] = ["male", "female", "other", "prefer_not_to_say"];

interface AddCustomerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: CreateCustomerRequest) => Promise<boolean>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AddCustomerDialog({
    open,
    onOpenChange,
    onSubmit,
}: AddCustomerDialogProps) {
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
        resolver: zodResolver(createCustomerSchema),
        defaultValues: {
            name: "",
            phone: "",
            alternate_phone: "",
            email: "",
            date_of_birth: "",
            anniversary_date: "",
            gender: undefined,
            customer_type: "RETAIL",
            gstin: "",
            company_name: "",
            pan_number: "",
            address_line1: "",
            address_line2: "",
            city: "",
            state: "",
            pincode: "",
            country: "India",
            credit_limit: 0,
            credit_days: 0,
            is_credit_allowed: false,
            notes: "",
            tags: [],
        },
    });

    const watchCustomerType = watch("customer_type");
    const watchGender = watch("gender");
    const watchState = watch("state");
    const watchIsCreditAllowed = watch("is_credit_allowed");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFormSubmit = async (data: any) => {
        setIsSubmitting(true);
        const toastId = toast.loading("Creating customer...");

        try {
            const success = await onSubmit(data as CreateCustomerRequest);
            if (success) {
                toast.success("Customer created successfully", { id: toastId });
                reset();
                setActiveTab("basic");
                onOpenChange(false);
            } else {
                toast.error("Failed to create customer", { id: toastId });
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
                    <DialogTitle>Add New Customer</DialogTitle>
                    <DialogDescription>
                        Create a new customer record. Fill in the required fields and any additional details.
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
                            {/* Name + Phone (required) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">
                                        Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g., Rajesh Kumar"
                                        {...register("name")}
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-destructive">{errors.name.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">
                                        Phone <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="phone"
                                        placeholder="9876543210"
                                        {...register("phone")}
                                    />
                                    {errors.phone && (
                                        <p className="text-xs text-destructive">{errors.phone.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Alternate Phone + Email */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="alternate_phone">Alternate Phone</Label>
                                    <Input
                                        id="alternate_phone"
                                        placeholder="Optional"
                                        {...register("alternate_phone")}
                                    />
                                    {errors.alternate_phone && (
                                        <p className="text-xs text-destructive">{errors.alternate_phone.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="email@example.com"
                                        {...register("email")}
                                    />
                                    {errors.email && (
                                        <p className="text-xs text-destructive">{errors.email.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Date of Birth + Anniversary */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                                    <Input
                                        id="date_of_birth"
                                        type="date"
                                        {...register("date_of_birth")}
                                    />
                                    {errors.date_of_birth && (
                                        <p className="text-xs text-destructive">{errors.date_of_birth.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="anniversary_date">Anniversary Date</Label>
                                    <Input
                                        id="anniversary_date"
                                        type="date"
                                        {...register("anniversary_date")}
                                    />
                                    {errors.anniversary_date && (
                                        <p className="text-xs text-destructive">{errors.anniversary_date.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Gender + Customer Type */}
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
                                        value={watchCustomerType}
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
                                <Label htmlFor="company_name">Company Name</Label>
                                <Input
                                    id="company_name"
                                    placeholder="Required if GSTIN is provided"
                                    {...register("company_name")}
                                />
                                {errors.company_name && (
                                    <p className="text-xs text-destructive">{errors.company_name.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="gstin">GSTIN</Label>
                                    <Input
                                        id="gstin"
                                        placeholder="27AAAPL1234C1Z5"
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
                                        placeholder="ABCDE1234F"
                                        {...register("pan_number")}
                                    />
                                    {errors.pan_number && (
                                        <p className="text-xs text-destructive">{errors.pan_number.message}</p>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        {/* ================================ ADDRESS ================================ */}
                        <TabsContent value="address" className="space-y-4 mt-0 px-4">
                            <div className="space-y-2">
                                <Label htmlFor="address_line1">Address Line 1</Label>
                                <Input
                                    id="address_line1"
                                    placeholder="Street address"
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
                                    placeholder="Apartment, floor, etc."
                                    {...register("address_line2")}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="city">City</Label>
                                    <Input
                                        id="city"
                                        placeholder="City"
                                        {...register("city")}
                                    />
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
                                    <Label htmlFor="pincode">Pincode</Label>
                                    <Input
                                        id="pincode"
                                        placeholder="560001"
                                        {...register("pincode")}
                                    />
                                    {errors.pincode && (
                                        <p className="text-xs text-destructive">{errors.pincode.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="country">Country</Label>
                                    <Input
                                        id="country"
                                        {...register("country")}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* ================================ CREDIT & NOTES ================================ */}
                        <TabsContent value="credit" className="space-y-4 mt-0 px-4">
                            {/* Credit toggle */}
                            <div className="flex items-center gap-3">
                                <Switch
                                    id="is_credit_allowed"
                                    checked={watchIsCreditAllowed}
                                    onCheckedChange={(checked) =>
                                        setValue("is_credit_allowed", checked, { shouldValidate: true })
                                    }
                                />
                                <Label htmlFor="is_credit_allowed">Enable Credit for this Customer</Label>
                            </div>

                            {/* Credit limit & days (only visible when credit enabled) */}
                            {watchIsCreditAllowed && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="credit_limit">
                                            Credit Limit (₹) <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="credit_limit"
                                            type="number"
                                            min={0}
                                            placeholder="50000"
                                            {...register("credit_limit", { valueAsNumber: true })}
                                        />
                                        {errors.credit_limit && (
                                            <p className="text-xs text-destructive">{errors.credit_limit.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="credit_days">Credit Days</Label>
                                        <Input
                                            id="credit_days"
                                            type="number"
                                            min={0}
                                            placeholder="30"
                                            {...register("credit_days", { valueAsNumber: true })}
                                        />
                                        {errors.credit_days && (
                                            <p className="text-xs text-destructive">{errors.credit_days.message}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    rows={3}
                                    placeholder="Any additional notes about the customer..."
                                    {...register("notes")}
                                />
                                {errors.notes && (
                                    <p className="text-xs text-destructive">{errors.notes.message}</p>
                                )}
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
                        Create Customer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
