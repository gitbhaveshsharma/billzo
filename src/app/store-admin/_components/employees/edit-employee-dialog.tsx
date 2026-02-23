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
import { ScrollArea } from "@/components/ui/scroll-area";
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
    onCreateEmployee: (
        storeUserId: string,
        email: string,
        data: { first_name: string; last_name: string; phone?: string; employee_type?: string; employment_status?: string; salary?: number; pay_frequency?: string; notes?: string }
    ) => Promise<boolean>;
}

const formSchema = updateStoreUserSchema.extend({
    // Allow empty string for optional text fields — empty means "not provided / unchanged"
    designation: z.string().min(2, "At least 2 characters").or(z.literal("")).optional(),
    department: z.string().min(2, "At least 2 characters").or(z.literal("")).optional(),
    // Employee fields
    first_name: z.string().min(2, "At least 2 characters").or(z.literal("")).optional(),
    last_name: z.string().min(2, "At least 2 characters").or(z.literal("")).optional(),
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
    onCreateEmployee,
}: EditEmployeeDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
    });

    // Pre-populate form with current employee data whenever dialog opens
    useEffect(() => {
        if (user && open) {
            reset({
                role_id: user.role_id || undefined,
                designation: user.designation || "",
                department: user.department || "",
                first_name: user.employee?.first_name || "",
                last_name: user.employee?.last_name || "",
                phone: user.employee?.phone || "",
                employee_type: user.employee?.employee_type || "full_time",
                employment_status: user.employee?.employment_status || "active",
                salary: user.employee?.salary ?? undefined,
                pay_frequency: user.employee?.pay_frequency || "monthly",
                notes: user.employee?.notes || "",
            });
        }
    }, [user, open, reset]);

    const handleFormSubmit = async (values: FormValues) => {
        if (!user) return;
        setIsSubmitting(true);

        const toastId = toast.loading("Updating employee...");

        try {
            // Build store user update — only include fields that have values
            const storeUserUpdates: UpdateStoreUserRequest = {};
            if (values.role_id) storeUserUpdates.role_id = values.role_id;
            if (values.designation) storeUserUpdates.designation = values.designation;
            if (values.department) storeUserUpdates.department = values.department;

            // Build employee update — always send all relevant fields so the DB reflects what the user sees
            const employeeUpdates: UpdateEmployeeRequest = {};
            if (values.first_name) employeeUpdates.first_name = values.first_name;
            if (values.last_name) employeeUpdates.last_name = values.last_name;
            if (values.phone) employeeUpdates.phone = values.phone;
            if (values.employee_type) employeeUpdates.employee_type = values.employee_type;
            if (values.employment_status) employeeUpdates.employment_status = values.employment_status;
            if (values.salary !== undefined && values.salary !== null) employeeUpdates.salary = values.salary;
            if (values.pay_frequency) employeeUpdates.pay_frequency = values.pay_frequency;
            if (values.notes !== undefined) employeeUpdates.notes = values.notes;

            let success = true;

            // Update store user if there are changes
            if (Object.keys(storeUserUpdates).length > 0) {
                success = await onUpdateUser(user.user_id, storeUserUpdates);
            }

            // Update employee if there are changes and employee exists
            if (success && Object.keys(employeeUpdates).length > 0) {
                if (user.employee?.id) {
                    // Employee record exists — update it
                    success = await onUpdateEmployee(user.employee.id, employeeUpdates);
                } else if (
                    employeeUpdates.first_name &&
                    employeeUpdates.last_name
                ) {
                    // No employee record yet — create one
                    success = await onCreateEmployee(user.id, user.email, employeeUpdates as any);
                }
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
            <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle>Edit Employee</DialogTitle>
                    <DialogDescription>
                        Update details for{" "}
                        {user.full_name ||
                            (user.employee
                                ? `${user.employee.first_name} ${user.employee.last_name}`.trim()
                                : null) ||
                            user.email ||
                            "this employee"}
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit(handleFormSubmit)}
                    className="flex flex-col flex-1 min-h-0"
                >
                    <Tabs defaultValue="store-user" className="flex-1 min-h-0 flex flex-col">
                        <TabsList className="w-full grid grid-cols-2 flex-shrink-0">
                            <TabsTrigger value="store-user" className="flex-1">Role & Store</TabsTrigger>
                            <TabsTrigger value="employee" className="flex-1">Employee</TabsTrigger>
                        </TabsList>

                        <ScrollArea className="flex-1 min-h-0 px-1">

                            {/* Store User Tab */}
                            <TabsContent value="store-user" className="space-y-4 mt-4 px-3">
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

                            {/* Employee Tab — always shown */}
                            <TabsContent value="employee" className="space-y-4 mt-4 px-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-first-name">First Name</Label>
                                        <Input id="edit-first-name" placeholder="First name" {...register("first_name")} />
                                        {errors.first_name && (
                                            <p className="text-xs text-destructive">{errors.first_name.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-last-name">Last Name</Label>
                                        <Input id="edit-last-name" placeholder="Last name" {...register("last_name")} />
                                        {errors.last_name && (
                                            <p className="text-xs text-destructive">{errors.last_name.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-phone">Phone</Label>
                                    <Input id="edit-phone" placeholder="10-digit phone number" {...register("phone")} />
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
                                            placeholder="0"
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

                        </ScrollArea>
                    </Tabs>

                    <DialogFooter className="flex-shrink-0 pt-4 gap-2">
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
