"use client";

import { useState, useEffect } from "react";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
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
    // Basic employee fields
    first_name: z.string().min(2, "At least 2 characters").or(z.literal("")).optional(),
    last_name: z.string().min(2, "At least 2 characters").or(z.literal("")).optional(),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone").optional().or(z.literal("")),
    employee_type: z.enum(["full_time", "part_time", "contractor", "intern", "trainee"]).optional(),
    employment_status: z.enum(["active", "probation", "notice_period", "terminated", "resigned", "absconded"]).optional(),
    salary: z.coerce.number().min(0).optional(),
    pay_frequency: z.enum(["monthly", "weekly", "daily", "hourly"]).optional(),
    notes: z.string().optional(),
    // ── Advanced fields ──────────────────────────────────────────────────────
    middle_name: z.string().optional().or(z.literal("")),
    date_of_birth: z.string().optional().or(z.literal("")),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
    blood_group: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
    marital_status: z.enum(["single", "married", "divorced", "widowed", "separated"]).optional(),
    nationality: z.string().optional().or(z.literal("")),
    alternate_phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone").optional().or(z.literal("")),
    present_address: z.string().optional().or(z.literal("")),
    city: z.string().optional().or(z.literal("")),
    state: z.string().optional().or(z.literal("")),
    pincode: z.string().regex(/^\d{6}$/, "Must be 6 digits").optional().or(z.literal("")),
    emergency_contact_name: z.string().optional().or(z.literal("")),
    emergency_contact_phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone").optional().or(z.literal("")),
    emergency_contact_relation: z.string().optional().or(z.literal("")),
    bank_name: z.string().optional().or(z.literal("")),
    bank_account_number: z.string().optional().or(z.literal("")),
    ifsc_code: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC").optional().or(z.literal("")),
    aadhar_number: z.string().regex(/^\d{12}$/, "Must be 12 digits").optional().or(z.literal("")),
    pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN").optional().or(z.literal("")),
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
    const [showAdvanced, setShowAdvanced] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
    });

    // Pre-populate form whenever dialog opens (fields come from flat EnrichedStoreUser / v_employee_details)
    useEffect(() => {
        if (user && open) {
            reset({
                role_id: user.role_id || undefined,
                designation: user.designation || "",
                department: user.department || "",
                // Basic employee
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                phone: user.phone || "",
                employee_type: user.employee_type || "full_time",
                employment_status: user.employment_status || "active",
                salary: user.salary ?? undefined,
                pay_frequency: user.pay_frequency || "monthly",
                notes: user.notes || "",
                // Advanced
                middle_name: user.middle_name || "",
                date_of_birth: user.date_of_birth || "",
                gender: user.gender ?? undefined,
                blood_group: user.blood_group ?? undefined,
                marital_status: user.marital_status ?? undefined,
                nationality: user.nationality || "",
                alternate_phone: user.alternate_phone || "",
                present_address: user.present_address || "",
                city: user.city || "",
                state: user.state || "",
                pincode: user.pincode || "",
                emergency_contact_name: user.emergency_contact_name || "",
                emergency_contact_phone: user.emergency_contact_phone || "",
                emergency_contact_relation: user.emergency_contact_relation || "",
                bank_name: user.bank_name || "",
                bank_account_number: user.bank_account_number || "",
                ifsc_code: user.ifsc_code || "",
                aadhar_number: user.aadhar_number || "",
                pan_number: user.pan_number || "",
            });
            setShowAdvanced(false);
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

            // Build employee update
            const employeeUpdates: UpdateEmployeeRequest = {};
            if (values.first_name) employeeUpdates.first_name = values.first_name;
            if (values.last_name) employeeUpdates.last_name = values.last_name;
            if (values.phone) employeeUpdates.phone = values.phone;
            if (values.employee_type) employeeUpdates.employee_type = values.employee_type;
            if (values.employment_status) employeeUpdates.employment_status = values.employment_status;
            if (values.salary !== undefined && values.salary !== null) employeeUpdates.salary = values.salary;
            if (values.pay_frequency) employeeUpdates.pay_frequency = values.pay_frequency;
            if (values.notes !== undefined) employeeUpdates.notes = values.notes;
            // Advanced fields
            if (values.middle_name !== undefined) employeeUpdates.middle_name = values.middle_name || undefined;
            if (values.date_of_birth) employeeUpdates.date_of_birth = values.date_of_birth;
            if (values.gender) employeeUpdates.gender = values.gender;
            if (values.blood_group) employeeUpdates.blood_group = values.blood_group;
            if (values.marital_status) employeeUpdates.marital_status = values.marital_status;
            if (values.alternate_phone !== undefined) employeeUpdates.alternate_phone = values.alternate_phone || undefined;
            if (values.present_address !== undefined) employeeUpdates.current_address_line1 = values.present_address || undefined;
            if (values.city !== undefined) employeeUpdates.current_city = values.city || undefined;
            if (values.state !== undefined) employeeUpdates.current_state = values.state || undefined;
            if (values.pincode !== undefined) employeeUpdates.current_pincode = values.pincode || undefined;
            if (values.emergency_contact_name !== undefined) employeeUpdates.emergency_contact_name = values.emergency_contact_name || undefined;
            if (values.emergency_contact_phone !== undefined) employeeUpdates.emergency_contact_phone = values.emergency_contact_phone || undefined;
            if (values.emergency_contact_relation !== undefined) employeeUpdates.emergency_contact_relation = values.emergency_contact_relation || undefined;
            if (values.bank_name !== undefined) employeeUpdates.bank_name = values.bank_name || undefined;
            if (values.bank_account_number !== undefined) employeeUpdates.bank_account_number = values.bank_account_number || undefined;
            if (values.ifsc_code !== undefined) employeeUpdates.ifsc_code = values.ifsc_code || undefined;
            if (values.aadhar_number !== undefined) employeeUpdates.aadhar_number = values.aadhar_number || undefined;
            if (values.pan_number !== undefined) employeeUpdates.pan_number = values.pan_number || undefined;

            let success = true;

            // Update store user if there are changes
            if (Object.keys(storeUserUpdates).length > 0) {
                success = await onUpdateUser(user.user_id, storeUserUpdates);
            }

            // Update employee if there are changes and employee exists
            if (success && Object.keys(employeeUpdates).length > 0) {
                if (user.employee_id) {
                    success = await onUpdateEmployee(user.employee_id, employeeUpdates);
                } else if (employeeUpdates.first_name && employeeUpdates.last_name) {
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
                {/* Fixed Header */}
                <DialogHeader>
                    <DialogTitle>Edit Employee</DialogTitle>
                    <DialogDescription>
                        Update details for{" "}
                        {user.full_name ||
                            [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
                            user.email ||
                            "this employee"}
                    </DialogDescription>
                </DialogHeader>

                {/* Form */}
                <form
                    onSubmit={handleSubmit(handleFormSubmit)}
                    className="flex flex-col flex-1 min-h-0"
                >
                    <Tabs defaultValue="store-user" className="flex-1 min-h-0 flex flex-col">
                        {/* Fixed Tabs Header */}
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="store-user">Role & Store</TabsTrigger>
                            <TabsTrigger value="employee">Employee</TabsTrigger>
                        </TabsList>

                        {/* Single ScrollArea wrapping all TabsContent — matches CreatePODialog pattern */}
                        <ScrollArea className="flex-1 min-h-0 overflow-x-hidden">

                            {/* ── Role & Store Tab ── */}
                            <TabsContent value="store-user" className="space-y-4 p-4">
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

                            {/* ── Employee Tab ── */}
                            <TabsContent value="employee" className="space-y-4 p-4">
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
                                                <Label htmlFor="edit-middle-name">Middle Name</Label>
                                                <Input id="edit-middle-name" placeholder="Middle name" {...register("middle_name")} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="edit-dob">Date of Birth</Label>
                                                <Input id="edit-dob" type="date" {...register("date_of_birth")} />
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
                                                <Label htmlFor="edit-nationality">Nationality</Label>
                                                <Input id="edit-nationality" placeholder="e.g. Indian" {...register("nationality")} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="edit-alt-phone">Alternate Phone</Label>
                                                <Input id="edit-alt-phone" placeholder="10-digit number" {...register("alternate_phone")} />
                                                {errors.alternate_phone && (
                                                    <p className="text-xs text-destructive">{errors.alternate_phone.message}</p>
                                                )}
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Address */}
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Address</p>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="edit-address">Present Address</Label>
                                            <Input id="edit-address" placeholder="Street / locality" {...register("present_address")} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="edit-city">City</Label>
                                                <Input id="edit-city" placeholder="City" {...register("city")} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="edit-state">State</Label>
                                                <Input id="edit-state" placeholder="State" {...register("state")} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="edit-pincode">Pincode</Label>
                                                <Input id="edit-pincode" placeholder="6 digits" maxLength={6} {...register("pincode")} />
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
                                                <Label htmlFor="edit-ec-name">Name</Label>
                                                <Input id="edit-ec-name" placeholder="Full name" {...register("emergency_contact_name")} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="edit-ec-phone">Phone</Label>
                                                <Input id="edit-ec-phone" placeholder="10-digit number" {...register("emergency_contact_phone")} />
                                                {errors.emergency_contact_phone && (
                                                    <p className="text-xs text-destructive">{errors.emergency_contact_phone.message}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="edit-ec-relation">Relation</Label>
                                                <Input id="edit-ec-relation" placeholder="e.g. Spouse" {...register("emergency_contact_relation")} />
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Banking */}
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Banking</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="edit-bank-name">Bank Name</Label>
                                                <Input id="edit-bank-name" placeholder="e.g. SBI" {...register("bank_name")} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="edit-bank-acc">Account Number</Label>
                                                <Input id="edit-bank-acc" placeholder="Account number" {...register("bank_account_number")} />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="edit-ifsc">IFSC Code</Label>
                                            <Input id="edit-ifsc" placeholder="e.g. SBIN0001234" uppercase {...register("ifsc_code")} />
                                            {errors.ifsc_code && (
                                                <p className="text-xs text-destructive">{errors.ifsc_code.message}</p>
                                            )}
                                        </div>

                                        <Separator />

                                        {/* Government IDs */}
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Government IDs</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="edit-aadhar">Aadhar Number</Label>
                                                <Input id="edit-aadhar" placeholder="12-digit Aadhar" maxLength={12} {...register("aadhar_number")} />
                                                {errors.aadhar_number && (
                                                    <p className="text-xs text-destructive">{errors.aadhar_number.message}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="edit-pan">PAN Number</Label>
                                                <Input id="edit-pan" placeholder="e.g. ABCDE1234F" maxLength={10} uppercase {...register("pan_number")} />
                                                {errors.pan_number && (
                                                    <p className="text-xs text-destructive">{errors.pan_number.message}</p>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </TabsContent>

                        </ScrollArea>
                    </Tabs>

                    {/* Fixed Footer — inside form so submit button works */}
                    <DialogFooter className="pt-4 gap-2 border-t mt-2">
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