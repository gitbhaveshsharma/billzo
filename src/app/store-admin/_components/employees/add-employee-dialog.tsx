"use client";

import { useState } from "react";
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
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { addStoreUserSchema } from "@/validations/store-users.validation";
import type { AddStoreUserRequest, AvailableRolesResponse } from "@/types/store-users.types";
import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

interface AddEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableRoles: AvailableRolesResponse | null;
    onSubmit: (data: AddStoreUserRequest) => Promise<boolean>;
}

// Form schema — extends the base addStoreUserSchema with optional employee fields
const formSchema = addStoreUserSchema.extend({
    create_employee: z.boolean().default(false),
    first_name: z.string().min(2, "First name is required").optional(),
    last_name: z.string().min(2, "Last name is required").optional(),
    employee_code: z
        .string()
        .min(3, "At least 3 characters")
        .regex(/^[A-Z0-9_-]+$/, "Uppercase letters, numbers, hyphens, underscores only")
        .optional(),
    phone: z
        .string()
        .regex(/^[6-9]\d{9}$/, "Invalid Indian phone number")
        .optional(),
    employee_type: z.enum(["full_time", "part_time", "contractor", "intern", "trainee"]).optional(),
    joining_date: z.string().optional(),
    pay_frequency: z.enum(["monthly", "weekly", "daily", "hourly"]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

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
    const [createEmployee, setCreateEmployee] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
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
            create_employee: false,
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
            
            // Include employee data if creating employee record
            if (createEmployee && values.first_name && values.last_name && values.employee_code) {
                request.create_employee = true;
                request.employee_data = {
                    employee_code: values.employee_code,
                    first_name: values.first_name,
                    last_name: values.last_name,
                    employee_type: values.employee_type || "full_time",
                    joining_date: values.joining_date || new Date().toISOString().slice(0, 10),
                    pay_frequency: values.pay_frequency || "monthly",
                };
            }

            const success = await onSubmit(request);

            if (success) {
                toast.success("Employee added successfully", { id: toastId });
                reset();
                setCreateEmployee(false);
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
            setCreateEmployee(false);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Employee</DialogTitle>
                    <DialogDescription>
                        Add a new employee to this store. They will receive an invitation if not already registered.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                    <Tabs defaultValue="basic">
                        <TabsList className="w-full">
                            <TabsTrigger value="basic" className="flex-1">Basic Info</TabsTrigger>
                            <TabsTrigger value="employee" className="flex-1">Employee Details</TabsTrigger>
                        </TabsList>

                        {/* Basic Info Tab */}
                        <TabsContent value="basic" className="space-y-4 mt-4">
                            {/* Email */}
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email *</Label>
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
                                <Label htmlFor="role_id">Role *</Label>
                                <Select id="role_id" {...register("role_id")}>
                                    <option value="">Select a role</option>
                                    {availableRoles?.roles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.role_display_name}
                                        </option>
                                    ))}
                                </Select>
                                {errors.role_id && (
                                    <p className="text-xs text-destructive">{errors.role_id.message}</p>
                                )}
                            </div>

                            {/* Designation */}
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

                            {/* Department */}
                            <div className="space-y-1.5">
                                <Label htmlFor="department">Department</Label>
                                <Input
                                    id="department"
                                    placeholder="e.g. Sales, Inventory"
                                    {...register("department")}
                                />
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                    <Label className="text-sm font-medium">Active</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Allow this user to log in immediately
                                    </p>
                                </div>
                                <Switch
                                    checked={watch("is_active")}
                                    onCheckedChange={(checked) => setValue("is_active", checked)}
                                />
                            </div>
                        </TabsContent>

                        {/* Employee Details Tab */}
                        <TabsContent value="employee" className="space-y-4 mt-4">
                            {/* Toggle to create employee record */}
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                    <Label className="text-sm font-medium">Create Employee Record</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Create a detailed employee profile with staff ID
                                    </p>
                                </div>
                                <Switch
                                    checked={createEmployee}
                                    onCheckedChange={(checked) => {
                                        setCreateEmployee(checked);
                                        setValue("create_employee", checked);
                                    }}
                                />
                            </div>

                            {createEmployee && (
                                <div className="space-y-4">
                                    {/* Employee Code */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="employee_code">Staff ID / Employee Code *</Label>
                                        <Input
                                            id="employee_code"
                                            placeholder="e.g. EMP-001"
                                            {...register("employee_code")}
                                        />
                                        {errors.employee_code && (
                                            <p className="text-xs text-destructive">{errors.employee_code.message}</p>
                                        )}
                                    </div>

                                    {/* Names */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="first_name">First Name *</Label>
                                            <Input id="first_name" placeholder="First name" {...register("first_name")} />
                                            {errors.first_name && (
                                                <p className="text-xs text-destructive">{errors.first_name.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="last_name">Last Name *</Label>
                                            <Input id="last_name" placeholder="Last name" {...register("last_name")} />
                                            {errors.last_name && (
                                                <p className="text-xs text-destructive">{errors.last_name.message}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input id="phone" placeholder="10-digit Indian phone" {...register("phone")} />
                                        {errors.phone && (
                                            <p className="text-xs text-destructive">{errors.phone.message}</p>
                                        )}
                                    </div>

                                    {/* Employee type + Pay frequency */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="employee_type">Employee Type</Label>
                                            <Select id="employee_type" {...register("employee_type")}>
                                                <option value="full_time">Full Time</option>
                                                <option value="part_time">Part Time</option>
                                                <option value="contractor">Contractor</option>
                                                <option value="intern">Intern</option>
                                                <option value="trainee">Trainee</option>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="pay_frequency">Pay Frequency</Label>
                                            <Select id="pay_frequency" {...register("pay_frequency")}>
                                                <option value="monthly">Monthly</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="daily">Daily</option>
                                                <option value="hourly">Hourly</option>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Joining date */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="joining_date">Joining Date</Label>
                                        <Input
                                            id="joining_date"
                                            type="date"
                                            defaultValue={new Date().toISOString().slice(0, 10)}
                                            {...register("joining_date")}
                                        />
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Employee
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
