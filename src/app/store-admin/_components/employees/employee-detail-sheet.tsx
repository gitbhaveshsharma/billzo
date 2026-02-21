"use client";

import { useMemo } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Mail,
    Phone,
    MapPin,
    Building2,
    Calendar,
    Clock,
    Shield,
    Globe,
    Fingerprint,
    CreditCard,
    GraduationCap,
    FileText,
} from "lucide-react";
import type { EnrichedStoreUser } from "@/types/store-users.types";
import {
    getUserInitials,
    getAvatarColor,
    getRoleBadgeColor,
    getUserStatusBadge,
    getEmploymentStatusDisplayName,
    getEmployeeTypeDisplayName,
    formatDate,
    formatRelativeTime,
    formatPhoneNumber,
    formatSalary,
    calculateTenure,
    formatTenure,
    isOnProbation,
    getRemainingProbationDays,
} from "@/utils/store-users.utils";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface EmployeeDetailSheetProps {
    user: EnrichedStoreUser | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// ============================================================================
// INFO ROW
// ============================================================================

function InfoRow({
    icon,
    label,
    value,
    tooltip,
}: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    tooltip?: string;
}) {
    const content = (
        <div className="flex items-start gap-3 py-2">
            <div className="mt-0.5 text-muted-foreground">{icon}</div>
            <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium truncate">{value || "—"}</p>
            </div>
        </div>
    );

    if (tooltip) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>{content}</TooltipTrigger>
                <TooltipContent>{tooltip}</TooltipContent>
            </Tooltip>
        );
    }

    return content;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EmployeeDetailSheet({
    user,
    open,
    onOpenChange,
}: EmployeeDetailSheetProps) {
    if (!user) return null;

    const status = getUserStatusBadge(user);
    const initials = getUserInitials(user.full_name);
    const avatarColor = getAvatarColor(user.full_name);
    const roleBadgeColor = getRoleBadgeColor(user.role_name);
    const employee = user.employee;
    const tenure = employee ? calculateTenure(employee.joining_date) : 0;
    const onProbation = employee ? isOnProbation(employee) : false;
    const remainingProbation = employee ? getRemainingProbationDays(employee) : 0;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader className="pb-4">
                    {/* Employee Header */}
                    <div className="flex items-center gap-4 ">
                        <Avatar className="h-14 w-14">
                            <AvatarImage src={user.profile_picture || undefined} />
                            <AvatarFallback className={cn("text-white text-lg", avatarColor)}>
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <SheetTitle className="text-lg truncate">
                                {user.full_name || "Unnamed Employee"}
                            </SheetTitle>
                            <SheetDescription className="truncate">{user.email}</SheetDescription>
                            <div className="flex items-center gap-2 mt-1.5">
                                <Badge className={cn("text-xs", roleBadgeColor)} variant="outline">
                                    {user.role_display_name}
                                </Badge>
                                <Badge className={cn("text-xs", status.color)} variant="outline">
                                    {status.text}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                <Separator className="my-2" />

                <Tabs defaultValue="overview" className="mt-4 px-4">
                    <TabsList className="w-full">
                        <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
                        <TabsTrigger value="contact" className="flex-1 text-xs">Contact</TabsTrigger>
                        {employee && (
                            <TabsTrigger value="employment" className="flex-1 text-xs">Employment</TabsTrigger>
                        )}
                        <TabsTrigger value="access" className="flex-1 text-xs">Access</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="mt-4 space-y-1 ">
                        <InfoRow
                            icon={<Shield className="h-4 w-4" />}
                            label="Role"
                            value={user.role_display_name}
                            tooltip={`Priority: ${user.role_priority}`}
                        />
                        <InfoRow
                            icon={<Building2 className="h-4 w-4" />}
                            label="Department"
                            value={user.department}
                        />
                        <InfoRow
                            icon={<FileText className="h-4 w-4" />}
                            label="Designation"
                            value={user.designation}
                        />
                        {user.employee_code && (
                            <InfoRow
                                icon={<Fingerprint className="h-4 w-4" />}
                                label="Staff ID"
                                value={`#${user.employee_code}`}
                            />
                        )}
                        <InfoRow
                            icon={<Building2 className="h-4 w-4" />}
                            label="Store"
                            value={`${user.store_name} (${user.store_code})`}
                        />
                        <InfoRow
                            icon={<Building2 className="h-4 w-4" />}
                            label="Organization"
                            value={user.organization_name}
                        />
                        <InfoRow
                            icon={<Calendar className="h-4 w-4" />}
                            label="Joined"
                            value={formatDate(user.created_at)}
                            tooltip={`Member since ${formatDate(user.created_at)}`}
                        />
                        {employee && (
                            <>
                                <InfoRow
                                    icon={<Calendar className="h-4 w-4" />}
                                    label="Tenure"
                                    value={formatTenure(tenure)}
                                />
                                {onProbation && (
                                    <InfoRow
                                        icon={<Clock className="h-4 w-4" />}
                                        label="Probation"
                                        value={
                                            <span className="text-yellow-600">
                                                {remainingProbation} days remaining
                                            </span>
                                        }
                                    />
                                )}
                            </>
                        )}

                        {user.banned_reason && (
                            <>
                                <Separator className="my-2" />
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                                    <p className="text-xs font-medium text-red-800 dark:text-red-300">Ban Reason</p>
                                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                                        {user.banned_reason}
                                    </p>
                                    {user.banned_at && (
                                        <p className="text-xs text-red-500 mt-1">
                                            Banned on {formatDate(user.banned_at, true)}
                                        </p>
                                    )}
                                </div>
                            </>
                        )}

                        {employee?.notes ? (
                            <>
                                <Separator className="my-2" />
                                <div className="rounded-lg border p-3">
                                    <p className="text-xs font-medium text-muted-foreground">Notes</p>
                                    <p className="text-sm mt-1">{employee?.notes || "No notes"}</p>
                                </div>
                            </>
                        ) : null}
                    </TabsContent>

                    {/* Contact Tab */}
                    <TabsContent value="contact" className="mt-4 space-y-1">
                        <InfoRow
                            icon={<Mail className="h-4 w-4" />}
                            label="Email"
                            value={user.email}
                        />
                        <InfoRow
                            icon={<Phone className="h-4 w-4" />}
                            label="Phone"
                            value={formatPhoneNumber(user.phone)}
                        />
                        {employee?.alternate_email && (
                            <InfoRow
                                icon={<Mail className="h-4 w-4" />}
                                label="Alternate Email"
                                value={employee.alternate_email}
                            />
                        )}
                        {employee?.alternate_phone && (
                            <InfoRow
                                icon={<Phone className="h-4 w-4" />}
                                label="Alternate Phone"
                                value={formatPhoneNumber(employee.alternate_phone)}
                            />
                        )}
                        {employee?.whatsapp_number && (
                            <InfoRow
                                icon={<Phone className="h-4 w-4" />}
                                label="WhatsApp"
                                value={formatPhoneNumber(employee.whatsapp_number)}
                            />
                        )}

                        {/* Emergency Contact */}
                        {employee?.emergency_contact_name && (
                            <>
                                <Separator className="my-2" />
                                <p className="text-xs font-medium text-muted-foreground">Emergency Contact</p>
                                <InfoRow
                                    icon={<Phone className="h-4 w-4" />}
                                    label={employee.emergency_contact_relation || "Emergency"}
                                    value={`${employee.emergency_contact_name} — ${formatPhoneNumber(employee.emergency_contact_phone)}`}
                                />
                            </>
                        )}

                        {/* Address */}
                        {employee?.current_address_line1 && (
                            <>
                                <Separator className="my-2" />
                                <InfoRow
                                    icon={<MapPin className="h-4 w-4" />}
                                    label="Current Address"
                                    value={
                                        [
                                            employee.current_address_line1,
                                            employee.current_address_line2,
                                            employee.current_city,
                                            employee.current_state,
                                            employee.current_pincode,
                                        ]
                                            .filter(Boolean)
                                            .join(", ")
                                    }
                                />
                            </>
                        )}
                    </TabsContent>

                    {/* Employment Tab */}
                    {employee && (
                        <TabsContent value="employment" className="mt-4 space-y-1">
                            <InfoRow
                                icon={<Building2 className="h-4 w-4" />}
                                label="Employee Type"
                                value={getEmployeeTypeDisplayName(employee.employee_type)}
                            />
                            <InfoRow
                                icon={<Shield className="h-4 w-4" />}
                                label="Employment Status"
                                value={getEmploymentStatusDisplayName(employee.employment_status)}
                            />
                            <InfoRow
                                icon={<Calendar className="h-4 w-4" />}
                                label="Joining Date"
                                value={formatDate(employee.joining_date)}
                            />
                            {employee.confirmation_date && (
                                <InfoRow
                                    icon={<Calendar className="h-4 w-4" />}
                                    label="Confirmation Date"
                                    value={formatDate(employee.confirmation_date)}
                                />
                            )}
                            <InfoRow
                                icon={<Clock className="h-4 w-4" />}
                                label="Notice Period"
                                value={`${employee.notice_period_days} days`}
                            />
                            <InfoRow
                                icon={<CreditCard className="h-4 w-4" />}
                                label="Salary"
                                value={formatSalary(employee.salary)}
                                tooltip={`Pay frequency: ${employee.pay_frequency}`}
                            />

                            {/* Government IDs */}
                            <Separator className="my-2" />
                            <p className="text-xs font-medium text-muted-foreground">Government IDs</p>
                            {employee.aadhar_number && (
                                <InfoRow
                                    icon={<Fingerprint className="h-4 w-4" />}
                                    label="Aadhar"
                                    value={`XXXX-XXXX-${employee.aadhar_number.slice(-4)}`}
                                    tooltip="Masked for security"
                                />
                            )}
                            {employee.pan_number && (
                                <InfoRow
                                    icon={<CreditCard className="h-4 w-4" />}
                                    label="PAN"
                                    value={employee.pan_number}
                                />
                            )}

                            {/* Qualifications */}
                            {(employee.qualification || employee.experience_years) && (
                                <>
                                    <Separator className="my-2" />
                                    <p className="text-xs font-medium text-muted-foreground">Qualifications</p>
                                    {employee.qualification && (
                                        <InfoRow
                                            icon={<GraduationCap className="h-4 w-4" />}
                                            label="Qualification"
                                            value={employee.qualification}
                                        />
                                    )}
                                    {employee.experience_years !== null && (
                                        <InfoRow
                                            icon={<Clock className="h-4 w-4" />}
                                            label="Experience"
                                            value={`${employee.experience_years} years`}
                                        />
                                    )}
                                    {employee.skills && employee.skills.length > 0 && (
                                        <div className="flex items-start gap-3 py-2">
                                            <div className="mt-0.5 text-muted-foreground">
                                                <GraduationCap className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Skills</p>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {employee.skills.map((skill) => (
                                                        <Badge key={skill} variant="secondary" className="text-xs">
                                                            {skill}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Bank details */}
                            {employee.bank_name && (
                                <>
                                    <Separator className="my-2" />
                                    <p className="text-xs font-medium text-muted-foreground">Bank Details</p>
                                    <InfoRow
                                        icon={<CreditCard className="h-4 w-4" />}
                                        label="Bank"
                                        value={`${employee.bank_name} — ${employee.bank_branch || ""}`}
                                    />
                                    {employee.bank_account_number && (
                                        <InfoRow
                                            icon={<CreditCard className="h-4 w-4" />}
                                            label="Account"
                                            value={`XXXX${employee.bank_account_number.slice(-4)}`}
                                            tooltip="Masked for security"
                                        />
                                    )}
                                </>
                            )}
                        </TabsContent>
                    )}

                    {/* Access Tab */}
                    <TabsContent value="access" className="mt-4 space-y-1">
                        <InfoRow
                            icon={<Clock className="h-4 w-4" />}
                            label="Last Login"
                            value={formatRelativeTime(user.last_login_at)}
                            tooltip={user.last_login_at ? formatDate(user.last_login_at, true) : "Never"}
                        />
                        {user.last_login_ip && (
                            <InfoRow
                                icon={<Globe className="h-4 w-4" />}
                                label="Last Login IP"
                                value={user.last_login_ip}
                            />
                        )}
                        <InfoRow
                            icon={<Shield className="h-4 w-4" />}
                            label="Two-Factor Auth"
                            value={user.two_factor_enabled ? "Enabled" : "Disabled"}
                        />
                        <InfoRow
                            icon={<Clock className="h-4 w-4" />}
                            label="Login Attempts"
                            value={String(user.login_attempts)}
                        />
                        {user.locked_until && (
                            <InfoRow
                                icon={<Shield className="h-4 w-4" />}
                                label="Locked Until"
                                value={formatDate(user.locked_until, true)}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}
