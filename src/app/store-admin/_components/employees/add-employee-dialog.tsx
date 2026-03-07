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
import { Loader2, UserPlus, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import { addStoreUserSchema } from "@/validations/store-users.validation";
import type { AddStoreUserRequest, AvailableRolesResponse } from "@/types/store-users.types";
import { z } from "zod";

// ============================================================================
// SCHEMA
// ============================================================================

const formSchema = addStoreUserSchema.extend({
    create_employee: z.boolean().default(false),
    // ── Basic employee fields ──────────────────────────────────────────────
    first_name: z.string().min(2, "First name is required").optional(),
    last_name: z.string().min(2, "Last name is required").optional(),
    employee_code: z
        .string()
        .min(3, "At least 3 characters")
        .regex(/^[A-Z0-9_-]+$/, "Uppercase letters, numbers, hyphens, underscores only")
        .optional(),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian phone number").optional().or(z.literal("")),
    employee_type: z.enum(["full_time", "part_time", "contractor", "intern", "trainee"]).optional(),
    joining_date: z.string().optional(),
    pay_frequency: z.enum(["monthly", "weekly", "daily", "hourly"]).optional(),
    salary: z.coerce.number().min(0).optional(),
    // ── Advanced employee fields ───────────────────────────────────────────
    middle_name: z.string().optional().or(z.literal("")),
    date_of_birth: z.string().optional().or(z.literal("")),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
    blood_group: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
    marital_status: z.enum(["single", "married", "divorced", "widowed", "separated"]).optional(),
    nationality: z.string().optional().or(z.literal("")),
    alternate_phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone").optional().or(z.literal("")),
    // Address
    present_address: z.string().optional().or(z.literal("")),
    city: z.string().optional().or(z.literal("")),
    state: z.string().optional().or(z.literal("")),
    pincode: z.string().regex(/^\d{6}$/, "6-digit pincode").optional().or(z.literal("")),
    // Emergency contact
    emergency_contact_name: z.string().optional().or(z.literal("")),
    emergency_contact_phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone").optional().or(z.literal("")),
    emergency_contact_relation: z.string().optional().or(z.literal("")),
    // Banking
    bank_name: z.string().optional().or(z.literal("")),
    bank_account_number: z.string().optional().or(z.literal("")),
    ifsc_code: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC").optional().or(z.literal("")),
    // Government IDs
    aadhar_number: z.string().regex(/^\d{12}$/, "12-digit Aadhar").optional().or(z.literal("")),
    pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN").optional().or(z.literal("")),
});

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
    const [createEmployee, setCreateEmployee] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

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
            nationality: "Indian",
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
                    middle_name: values.middle_name || undefined,
                    last_name: values.last_name,
                    employee_type: values.employee_type || "full_time",
                    joining_date: values.joining_date || new Date().toISOString().slice(0, 10),
                    pay_frequency: values.pay_frequency || "monthly",
                    salary: values.salary,
                    // Advanced
                    date_of_birth: values.date_of_birth || undefined,
                    gender: values.gender,
                    blood_group: values.blood_group,
                    marital_status: values.marital_status,
                    alternate_phone: values.alternate_phone || undefined,
                    emergency_contact_name: values.emergency_contact_name || undefined,
                    emergency_contact_phone: values.emergency_contact_phone || undefined,
                    emergency_contact_relation: values.emergency_contact_relation || undefined,
                    current_address_line1: values.present_address || undefined,
                    current_city: values.city || undefined,
                    current_state: values.state || undefined,
                    current_pincode: values.pincode || undefined,
                    bank_name: values.bank_name || undefined,
                    bank_account_number: values.bank_account_number || undefined,
                    ifsc_code: values.ifsc_code || undefined,
                    aadhar_number: values.aadhar_number || undefined,
                    pan_number: values.pan_number || undefined,
                };
            }

            const result = await onSubmit(request);
            if (result.success) {
                toast.success(
                    result.invited
                        ? `Invitation sent to ${request.email}`
                        : "Employee added successfully",
                    { id: toastId }
                );
                reset();
                setCreateEmployee(false);
                setShowAdvanced(false);
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
            setShowAdvanced(false);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col">
                {/* Fixed Header */}
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
                    <Tabs defaultValue="basic" className="flex-1 min-h-0 flex flex-col">
                        {/* Fixed Tabs Header */}
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

                        {/* Single ScrollArea wrapping ALL TabsContent — matches CreatePODialog pattern */}
                        <ScrollArea className="flex-1 min-h-0 overflow-x-hidden">

                            {/* ── Basic Info Tab ── */}
                            <TabsContent value="basic" className="space-y-5 p-4 mt-0">
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
                            <TabsContent value="employee" className="space-y-5 p-4 mt-0">
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
                                            if (!checked) setShowAdvanced(false);
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

                                        {/* Joining Date + Salary */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="joining_date">Joining Date</Label>
                                                <Input
                                                    id="joining_date"
                                                    type="date"
                                                    {...register("joining_date")}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="salary">Salary (₹)</Label>
                                                <Input
                                                    id="salary"
                                                    type="number"
                                                    min={0}
                                                    placeholder="0"
                                                    {...register("salary")}
                                                />
                                            </div>
                                        </div>

                                        {/* ── Advanced Toggle ── */}
                                        <button
                                            type="button"
                                            onClick={() => setShowAdvanced((v) => !v)}
                                            className="flex items-center gap-2 w-full rounded-md border border-dashed border-muted-foreground/40 px-3 py-2 text-sm text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
                                        >
                                            {showAdvanced ? (
                                                <ChevronUp className="h-4 w-4 shrink-0" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 shrink-0" />
                                            )}
                                            {showAdvanced ? "Hide advanced details" : "Show advanced details"}
                                        </button>

                                        {/* ── Advanced Section ── */}
                                        {showAdvanced && (
                                            <div className="space-y-5 rounded-lg border bg-muted/20 p-4">

                                                {/* Personal */}
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Personal</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="middle_name">Middle Name</Label>
                                                        <Input id="middle_name" placeholder="Middle name" {...register("middle_name")} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="date_of_birth">Date of Birth</Label>
                                                        <Input id="date_of_birth" type="date" {...register("date_of_birth")} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label>Gender</Label>
                                                        <Controller
                                                            name="gender"
                                                            control={control}
                                                            render={({ field }) => (
                                                                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                                                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="male">Male</SelectItem>
                                                                        <SelectItem value="female">Female</SelectItem>
                                                                        <SelectItem value="other">Other</SelectItem>
                                                                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label>Blood Group</Label>
                                                        <Controller
                                                            name="blood_group"
                                                            control={control}
                                                            render={({ field }) => (
                                                                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                                                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                                                                            <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label>Marital Status</Label>
                                                        <Controller
                                                            name="marital_status"
                                                            control={control}
                                                            render={({ field }) => (
                                                                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                                                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="single">Single</SelectItem>
                                                                        <SelectItem value="married">Married</SelectItem>
                                                                        <SelectItem value="divorced">Divorced</SelectItem>
                                                                        <SelectItem value="widowed">Widowed</SelectItem>
                                                                        <SelectItem value="separated">Separated</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="nationality">Nationality</Label>
                                                        <Input id="nationality" placeholder="e.g. Indian" {...register("nationality")} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="alternate_phone">Alternate Phone</Label>
                                                        <Input id="alternate_phone" placeholder="10-digit number" {...register("alternate_phone")} />
                                                        {errors.alternate_phone && (
                                                            <p className="text-xs text-destructive">{errors.alternate_phone.message}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <Separator />

                                                {/* Address */}
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Address</p>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="present_address">Present Address</Label>
                                                    <Input id="present_address" placeholder="Street / locality" {...register("present_address")} />
                                                </div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="city">City</Label>
                                                        <Input id="city" placeholder="City" {...register("city")} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="state">State</Label>
                                                        <Input id="state" placeholder="State" {...register("state")} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="pincode">Pincode</Label>
                                                        <Input id="pincode" placeholder="6 digits" maxLength={6} {...register("pincode")} />
                                                        {errors.pincode && (
                                                            <p className="text-xs text-destructive">{errors.pincode.message}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <Separator />

                                                {/* Emergency Contact */}
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Emergency Contact</p>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="emergency_contact_name">Name</Label>
                                                        <Input id="emergency_contact_name" placeholder="Full name" {...register("emergency_contact_name")} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="emergency_contact_phone">Phone</Label>
                                                        <Input id="emergency_contact_phone" placeholder="10-digit number" {...register("emergency_contact_phone")} />
                                                        {errors.emergency_contact_phone && (
                                                            <p className="text-xs text-destructive">{errors.emergency_contact_phone.message}</p>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="emergency_contact_relation">Relation</Label>
                                                        <Input id="emergency_contact_relation" placeholder="e.g. Spouse" {...register("emergency_contact_relation")} />
                                                    </div>
                                                </div>

                                                <Separator />

                                                {/* Banking */}
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Banking</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="bank_name">Bank Name</Label>
                                                        <Input id="bank_name" placeholder="e.g. SBI" {...register("bank_name")} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="bank_account_number">Account Number</Label>
                                                        <Input id="bank_account_number" placeholder="Account number" {...register("bank_account_number")} />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="ifsc_code">IFSC Code</Label>
                                                    <Input id="ifsc_code" placeholder="e.g. SBIN0001234" className="uppercase" {...register("ifsc_code")} />
                                                    {errors.ifsc_code && (
                                                        <p className="text-xs text-destructive">{errors.ifsc_code.message}</p>
                                                    )}
                                                </div>

                                                <Separator />

                                                {/* Government IDs */}
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Government IDs</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="aadhar_number">Aadhar Number</Label>
                                                        <Input id="aadhar_number" placeholder="12-digit Aadhar" maxLength={12} {...register("aadhar_number")} />
                                                        {errors.aadhar_number && (
                                                            <p className="text-xs text-destructive">{errors.aadhar_number.message}</p>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="pan_number">PAN Number</Label>
                                                        <Input id="pan_number" placeholder="e.g. ABCDE1234F" maxLength={10} className="uppercase" {...register("pan_number")} />
                                                        {errors.pan_number && (
                                                            <p className="text-xs text-destructive">{errors.pan_number.message}</p>
                                                        )}
                                                    </div>
                                                </div>

                                            </div>
                                        )}
                                    </div>
                                )}
                            </TabsContent>

                        </ScrollArea>
                    </Tabs>

                    {/* Fixed Footer — inside form so submit works */}
                    <DialogFooter className="flex-shrink-0 pt-4 gap-2 border-t mt-2">
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