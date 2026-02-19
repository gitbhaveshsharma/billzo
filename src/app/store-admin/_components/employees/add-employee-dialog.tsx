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
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, UserPlus, Briefcase } from "lucide-react";
import { addStoreUserSchema } from "@/validations/store-users.validation";
import type { AddStoreUserRequest, AvailableRolesResponse } from "@/types/store-users.types";
import { z } from "zod";

// ============================================================================
// SCHEMA
// ============================================================================

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
// PROPS
// ============================================================================

interface AddEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableRoles: AvailableRolesResponse | null;
    onSubmit: (data: AddStoreUserRequest) => Promise<boolean>;
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
    const [createEmployee, setCreateEmployee] = useState(false);

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
            create_employee: false,
            employee_type: "full_time",
            pay_frequency: "monthly",
            joining_date: new Date().toISOString().slice(0, 10),
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
            {/* Same structure as AddSupplierDialog: max-h-[95vh] flex flex-col */}
            <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col">
                {/* Header — flex-shrink-0 so it never gets squeezed */}
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <UserPlus className="h-5 w-5 text-primary" />
                        Add Employee
                    </DialogTitle>
                    <DialogDescription>
                        Add a new employee to this store. They will receive an invitation if not already registered.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit(handleFormSubmit)}
                    className="flex flex-col flex-1 min-h-0"
                >
                    {/* Tabs take remaining space, same as supplier dialog */}
                    <Tabs defaultValue="basic" className="flex-1 min-h-0 flex flex-col p-1">
                        {/* TabsList — flex-shrink-0, always visible */}
                        <TabsList className="w-full grid grid-cols-2 flex-shrink-0">
                            <TabsTrigger value="basic" className="flex items-center gap-2">
                                <UserPlus className="h-3.5 w-3.5" />
                                Basic Info
                            </TabsTrigger>
                            <TabsTrigger value="employee" className="flex items-center gap-2">
                                <Briefcase className="h-3.5 w-3.5" />
                                Employee Details
                            </TabsTrigger>
                        </TabsList>

                        {/*
                            Single ScrollArea wrapping ALL TabsContent — exactly like supplier dialog.
                            flex-1 + min-h-0 makes it fill leftover space and scroll when needed.
                        */}
                        <ScrollArea className="flex-1 min-h-0 p-4">

                            {/* ── Basic Info Tab ── */}
                            <TabsContent value="basic" className="space-y-5 mt-0 px-2">
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
                            </TabsContent>

                            {/* ── Employee Details Tab ── */}
                            <TabsContent value="employee" className="space-y-5 mt-0 px-2">
                                {/* Toggle */}
                                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-medium">Create Employee Record</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Create a detailed employee profile with a staff ID
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
                                    <div className="space-y-5">
                                        <Separator />

                                        {/* Staff ID */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="employee_code">
                                                Staff ID / Employee Code <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id="employee_code"
                                                placeholder="e.g. EMP-001"
                                                {...register("employee_code")}
                                            />
                                            {errors.employee_code && (
                                                <p className="text-xs text-destructive">{errors.employee_code.message}</p>
                                            )}
                                        </div>

                                        {/* First + Last Name */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="first_name">
                                                    First Name <span className="text-destructive">*</span>
                                                </Label>
                                                <Input id="first_name" placeholder="First name" {...register("first_name")} />
                                                {errors.first_name && (
                                                    <p className="text-xs text-destructive">{errors.first_name.message}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="last_name">
                                                    Last Name <span className="text-destructive">*</span>
                                                </Label>
                                                <Input id="last_name" placeholder="Last name" {...register("last_name")} />
                                                {errors.last_name && (
                                                    <p className="text-xs text-destructive">{errors.last_name.message}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Phone */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="phone">Phone</Label>
                                            <Input id="phone" placeholder="10-digit Indian phone number" {...register("phone")} />
                                            {errors.phone && (
                                                <p className="text-xs text-destructive">{errors.phone.message}</p>
                                            )}
                                        </div>

                                        {/* Employee Type + Pay Frequency */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label>Employee Type</Label>
                                                <Controller
                                                    name="employee_type"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Select value={field.value} onValueChange={field.onChange}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="full_time">Full Time</SelectItem>
                                                                <SelectItem value="part_time">Part Time</SelectItem>
                                                                <SelectItem value="contractor">Contractor</SelectItem>
                                                                <SelectItem value="intern">Intern</SelectItem>
                                                                <SelectItem value="trainee">Trainee</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>Pay Frequency</Label>
                                                <Controller
                                                    name="pay_frequency"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Select value={field.value} onValueChange={field.onChange}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select frequency" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="monthly">Monthly</SelectItem>
                                                                <SelectItem value="weekly">Weekly</SelectItem>
                                                                <SelectItem value="daily">Daily</SelectItem>
                                                                <SelectItem value="hourly">Hourly</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        {/* Joining Date */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="joining_date">Joining Date</Label>
                                            <Input
                                                id="joining_date"
                                                type="date"
                                                {...register("joining_date")}
                                            />
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                        </ScrollArea>
                    </Tabs>

                    {/* Footer — flex-shrink-0, always anchored at bottom */}
                    <DialogFooter className="flex-shrink-0 pt-4 gap-2">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <UserPlus className="mr-2 h-4 w-4" />
                            )}
                            Add Employee
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}