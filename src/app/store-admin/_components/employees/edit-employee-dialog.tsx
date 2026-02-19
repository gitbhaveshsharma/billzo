"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { updateStoreUserSchema } from "@/validations/store-users.validation";
import type {
    EnrichedStoreUser,
    UpdateStoreUserRequest,
    UpdateEmployeeRequest,
    AvailableRolesResponse,
} from "@/types/store-users.types";
import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

interface EditEmployeeDialogProps {
    user: EnrichedStoreUser | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableRoles: AvailableRolesResponse | null;
    onUpdateUser: (userId: string, data: UpdateStoreUserRequest) => Promise<boolean>;
    onUpdateEmployee: (employeeId: string, data: UpdateEmployeeRequest) => Promise<boolean>;
}

const formSchema = updateStoreUserSchema.extend({
    // Employee fields
    first_name: z.string().min(2).optional(),
    last_name: z.string().min(2).optional(),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone").optional().or(z.literal("")),
    employee_type: z.enum(["full_time", "part_time", "contractor", "intern", "trainee"]).optional(),
    employment_status: z.enum(["active", "probation", "notice_period", "terminated", "resigned", "absconded"]).optional(),
    salary: z.coerce.number().min(0).optional(),
    pay_frequency: z.enum(["monthly", "weekly", "daily", "hourly"]).optional(),
    notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export function EditEmployeeDialog({
    user,
    open,
    onOpenChange,
    availableRoles,
    onUpdateUser,
    onUpdateEmployee,
}: EditEmployeeDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, dirtyFields },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
    });

    // Reset form when user changes
    useEffect(() => {
        if (user) {
            reset({
                role_id: user.role_id || undefined,
                designation: user.designation || undefined,
                department: user.department || undefined,
                first_name: user.employee?.first_name || undefined,
                last_name: user.employee?.last_name || undefined,
                phone: user.employee?.phone || undefined,
                employee_type: user.employee?.employee_type || undefined,
                employment_status: user.employee?.employment_status || undefined,
                salary: user.employee?.salary || undefined,
                pay_frequency: user.employee?.pay_frequency || undefined,
                notes: user.employee?.notes || undefined,
            });
        }
    }, [user, reset]);

    const handleFormSubmit = async (values: FormValues) => {
        if (!user) return;
        setIsSubmitting(true);

        const toastId = toast.loading("Updating employee...");

        try {
            // Separate store user updates from employee updates
            const storeUserFields: (keyof UpdateStoreUserRequest)[] = [
                "role_id",
                "designation",
                "department",
                "reporting_manager_id",
                "is_active",
                "custom_permissions",
                "work_schedule",
            ];

            const employeeFields: (keyof UpdateEmployeeRequest)[] = [
                "first_name",
                "last_name",
                "phone",
                "employee_type",
                "employment_status",
                "salary",
                "pay_frequency",
                "notes",
            ];

            // Build update objects from dirty fields only
            const storeUserUpdates: UpdateStoreUserRequest = {};
            const employeeUpdates: UpdateEmployeeRequest = {};

            for (const key of Object.keys(dirtyFields) as (keyof FormValues)[]) {
                if (storeUserFields.includes(key as keyof UpdateStoreUserRequest)) {
                    (storeUserUpdates as any)[key] = values[key];
                }
                if (employeeFields.includes(key as keyof UpdateEmployeeRequest)) {
                    (employeeUpdates as any)[key] = values[key];
                }
            }

            let success = true;

            // Update store user if there are changes
            if (Object.keys(storeUserUpdates).length > 0) {
                success = await onUpdateUser(user.user_id, storeUserUpdates);
            }

            // Update employee if there are changes and employee exists
            if (success && Object.keys(employeeUpdates).length > 0 && user.employee?.id) {
                success = await onUpdateEmployee(user.employee.id, employeeUpdates);
            }

            if (success) {
                toast.success("Employee updated successfully", { id: toastId });
                onOpenChange(false);
            } else {
                toast.error("Failed to update employee", { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Employee</DialogTitle>
                    <DialogDescription>
                        Update details for {user.full_name || user.email}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                    <Tabs defaultValue="store-user">
                        <TabsList className="w-full">
                            <TabsTrigger value="store-user" className="flex-1">Role & Store</TabsTrigger>
                            {user.employee && (
                                <TabsTrigger value="employee" className="flex-1">Employee</TabsTrigger>
                            )}
                        </TabsList>

                        {/* Store User Tab */}
                        <TabsContent value="store-user" className="space-y-4 mt-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-role">Role</Label>
                                <select
                                    id="edit-role"
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    {...register("role_id")}
                                >
                                    <option value="">Select a role</option>
                                    {availableRoles?.roles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.role_display_name}
                                        </option>
                                    ))}
                                </select>
                                {errors.role_id && (
                                    <p className="text-xs text-destructive">{errors.role_id.message}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-designation">Designation</Label>
                                <Input
                                    id="edit-designation"
                                    placeholder="e.g. Senior Cashier"
                                    {...register("designation")}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-department">Department</Label>
                                <Input
                                    id="edit-department"
                                    placeholder="e.g. Sales"
                                    {...register("department")}
                                />
                            </div>
                        </TabsContent>

                        {/* Employee Tab */}
                        {user.employee && (
                            <TabsContent value="employee" className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-first-name">First Name</Label>
                                        <Input id="edit-first-name" {...register("first_name")} />
                                        {errors.first_name && (
                                            <p className="text-xs text-destructive">{errors.first_name.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-last-name">Last Name</Label>
                                        <Input id="edit-last-name" {...register("last_name")} />
                                        {errors.last_name && (
                                            <p className="text-xs text-destructive">{errors.last_name.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-phone">Phone</Label>
                                    <Input id="edit-phone" {...register("phone")} />
                                    {errors.phone && (
                                        <p className="text-xs text-destructive">{errors.phone.message}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-emp-type">Employee Type</Label>
                                        <select
                                            id="edit-emp-type"
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            {...register("employee_type")}
                                        >
                                            <option value="full_time">Full Time</option>
                                            <option value="part_time">Part Time</option>
                                            <option value="contractor">Contractor</option>
                                            <option value="intern">Intern</option>
                                            <option value="trainee">Trainee</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-emp-status">Status</Label>
                                        <select
                                            id="edit-emp-status"
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            {...register("employment_status")}
                                        >
                                            <option value="active">Active</option>
                                            <option value="probation">Probation</option>
                                            <option value="notice_period">Notice Period</option>
                                            <option value="terminated">Terminated</option>
                                            <option value="resigned">Resigned</option>
                                            <option value="absconded">Absconded</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-salary">Salary (₹)</Label>
                                        <Input
                                            id="edit-salary"
                                            type="number"
                                            min={0}
                                            {...register("salary")}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-pay-freq">Pay Frequency</Label>
                                        <select
                                            id="edit-pay-freq"
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            {...register("pay_frequency")}
                                        >
                                            <option value="monthly">Monthly</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="daily">Daily</option>
                                            <option value="hourly">Hourly</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-notes">Notes</Label>
                                    <Textarea
                                        id="edit-notes"
                                        placeholder="Internal notes about this employee..."
                                        rows={3}
                                        {...register("notes")}
                                    />
                                </div>
                            </TabsContent>
                        )}
                    </Tabs>

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
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
