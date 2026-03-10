"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, UserPlus, Info, ShieldPlus, Pencil, Scroll } from "lucide-react";
import { addStoreUserSchema } from "@/validations/store-users.validation";
import type { AddStoreUserRequest, AvailableRolesResponse } from "@/types/store-users.types";
import { z } from "zod";
import { ScrollArea } from "@/components/ui/scroll-area";

// ============================================================================
// SCHEMA
// ============================================================================

const formSchema = addStoreUserSchema;

type FormValues = z.infer<typeof formSchema>;

// ============================================================================
// PROPS
// ============================================================================

interface AddEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableRoles: AvailableRolesResponse | null;
    onSubmit: (data: AddStoreUserRequest) => Promise<{ success: boolean; invited?: boolean }>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AddEmployeeDialog({
    open,
    onOpenChange,
    availableRoles,
    onSubmit,
}: AddEmployeeDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors },
        setValue,
        watch,
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            email: "",
            role_id: "",
            designation: "",
            department: "",
            is_active: true,
        },
    });

    const handleFormSubmit = async (values: FormValues) => {
        setIsSubmitting(true);
        const toastId = toast.loading("Adding employee...");
        try {
            const request: AddStoreUserRequest = {
                email: values.email,
                role_id: values.role_id,
                designation: values.designation,
                department: values.department,
                is_active: values.is_active,
            };

            const result = await onSubmit(request);
            if (result.success) {
                toast.success(
                    result.invited
                        ? `Invitation sent to ${request.email}`
                        : "Employee added successfully",
                    { id: toastId }
                );
                reset();
                onOpenChange(false);
            } else {
                toast.error("Failed to add employee", { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            reset();
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl Max-h-[90vh] ">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <UserPlus className="h-5 w-5 text-primary" />
                        Add Employee
                    </DialogTitle>
                    <DialogDescription>
                        Add a new employee to this store. They will receive an invitation if not already registered.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 max-h-[70vh] overflow-x-auto">
                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 p-4">

                    {/* Email */}
                    <div className="space-y-1.5">
                        <Label htmlFor="email">
                            Email <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="employee@example.com"
                            {...register("email")}
                        />
                        {errors.email && (
                            <p className="text-xs text-destructive">{errors.email.message}</p>
                        )}
                    </div>

                    {/* Role */}
                    <div className="space-y-1.5">
                        <Label>
                            Role <span className="text-destructive">*</span>
                        </Label>
                        <Controller
                            name="role_id"
                            control={control}
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableRoles?.roles.map((role) => (
                                            <SelectItem key={role.id} value={role.id}>
                                                {role.role_display_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.role_id && (
                            <p className="text-xs text-destructive">{errors.role_id.message}</p>
                        )}
                    </div>

                    {/* Designation + Department */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="designation">Designation</Label>
                            <Input
                                id="designation"
                                placeholder="e.g. Senior Cashier"
                                {...register("designation")}
                            />
                            {errors.designation && (
                                <p className="text-xs text-destructive">{errors.designation.message}</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="department">Department</Label>
                            <Input
                                id="department"
                                placeholder="e.g. Sales, Inventory"
                                {...register("department")}
                            />
                        </div>
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Active</Label>
                            <p className="text-xs text-muted-foreground">
                                Allow this user to log in immediately after adding
                            </p>
                        </div>
                        <Switch
                            checked={watch("is_active")}
                            onCheckedChange={(checked) => setValue("is_active", checked)}
                        />
                    </div>

                    {/* Info callout */}
                    <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                        <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                            <p className="font-medium">After adding, you can:</p>
                            <ul className="space-y-0.5 list-none">
                                <li className="flex items-center gap-1.5">
                                    <Pencil className="h-3 w-3 shrink-0" />
                                    Edit employee details (name, phone, salary, etc.) via <strong>Edit Employee</strong>
                                </li>
                                <li className="flex items-center gap-1.5">
                                    <ShieldPlus className="h-3 w-3 shrink-0" />
                                    Grant extra permissions via <strong>Manage Permissions</strong>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <UserPlus className="mr-2 h-4 w-4" />
                            )}
                            Invite Employee
                        </Button>
                    </DialogFooter>
                </form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}