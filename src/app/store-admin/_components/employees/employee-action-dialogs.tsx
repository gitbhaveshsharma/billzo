"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertTriangle, Ban, Shield, RotateCcw, Trash2 } from "lucide-react";
import type {
    EnrichedStoreUser,
    BanUserRequest,
    ResetUserAccessRequest,
    AvailableRolesResponse,
} from "@/types/store-users.types";

// ============================================================================
// BAN USER DIALOG
// ============================================================================

interface BanDialogProps {
    user: EnrichedStoreUser | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onBan: (userId: string, request: BanUserRequest) => Promise<boolean>;
    currentUserId: string;
}

export function BanUserDialog({
    user,
    open,
    onOpenChange,
    onBan,
    currentUserId,
}: BanDialogProps) {
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleBan = async () => {
        if (!user || reason.length < 10) return;
        setIsSubmitting(true);

        const toastId = toast.loading("Banning user...");

        try {
            const success = await onBan(user.user_id, {
                reason,
                banned_by: currentUserId,
            });

            if (success) {
                toast.success(`${user.full_name || user.email} has been banned`, { id: toastId });
                setReason("");
                onOpenChange(false);
            } else {
                toast.error("Failed to ban user", { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-orange-600">
                        <Ban className="h-5 w-5" />
                        Ban Employee
                    </DialogTitle>
                    <DialogDescription>
                        This will immediately revoke {user?.full_name || "this user"}&apos;s access and terminate all active sessions.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="ban-reason">Reason for ban *</Label>
                        <Textarea
                            id="ban-reason"
                            placeholder="Explain why this user is being banned (min 10 characters)..."
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                        {reason.length > 0 && reason.length < 10 && (
                            <p className="text-xs text-destructive">
                                Reason must be at least 10 characters
                            </p>
                        )}
                    </div>

                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                            <div className="text-xs text-orange-700 dark:text-orange-300">
                                <p className="font-medium">Warning</p>
                                <p>All active sessions will be terminated immediately. The user will not be able to log in until unbanned.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleBan}
                        disabled={isSubmitting || reason.length < 10}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ban User
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// CHANGE ROLE DIALOG
// ============================================================================

interface ChangeRoleDialogProps {
    user: EnrichedStoreUser | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableRoles: AvailableRolesResponse | null;
    onChangeRole: (userId: string, roleId: string) => Promise<boolean>;
}

export function ChangeRoleDialog({
    user,
    open,
    onOpenChange,
    availableRoles,
    onChangeRole,
}: ChangeRoleDialogProps) {
    const [selectedRole, setSelectedRole] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChangeRole = async () => {
        if (!user || !selectedRole) return;
        setIsSubmitting(true);

        const toastId = toast.loading("Changing role...");

        try {
            const roleName = availableRoles?.roles.find((r) => r.id === selectedRole)?.role_display_name;
            const success = await onChangeRole(user.user_id, selectedRole);

            if (success) {
                toast.success(`Role changed to ${roleName}`, { id: toastId });
                setSelectedRole("");
                onOpenChange(false);
            } else {
                toast.error("Failed to change role", { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Change Role
                    </DialogTitle>
                    <DialogDescription>
                        Change the role for {user?.full_name || user?.email}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label>Current Role</Label>
                        <Input value={user?.role_display_name || ""} disabled />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="new-role">New Role *</Label>
                        <Select
                            id="new-role"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                        >
                            <option value="">Select a new role</option>
                            {availableRoles?.roles
                                .filter((r) => r.id !== user?.role_id)
                                .map((role) => (
                                    <option key={role.id} value={role.id}>
                                        {role.role_display_name}
                                    </option>
                                ))}
                        </Select>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleChangeRole} disabled={isSubmitting || !selectedRole}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Change Role
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// RESET ACCESS DIALOG
// ============================================================================

interface ResetAccessDialogProps {
    user: EnrichedStoreUser | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onReset: (userId: string, request: ResetUserAccessRequest) => Promise<boolean>;
}

export function ResetAccessDialog({
    user,
    open,
    onOpenChange,
    onReset,
}: ResetAccessDialogProps) {
    const [options, setOptions] = useState<ResetUserAccessRequest>({
        reset_login_attempts: true,
        unlock_account: true,
        reset_2fa: false,
        clear_ban: false,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleOption = (key: keyof ResetUserAccessRequest) => {
        setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleReset = async () => {
        if (!user) return;
        setIsSubmitting(true);

        const toastId = toast.loading("Resetting access...");

        try {
            const success = await onReset(user.user_id, options);

            if (success) {
                toast.success("Access has been reset", { id: toastId });
                onOpenChange(false);
            } else {
                toast.error("Failed to reset access", { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetOptions = [
        {
            key: "reset_login_attempts" as const,
            label: "Reset Login Attempts",
            description: "Clear failed login counter",
        },
        {
            key: "unlock_account" as const,
            label: "Unlock Account",
            description: "Remove account lock if locked",
        },
        {
            key: "reset_2fa" as const,
            label: "Reset 2FA",
            description: "Disable two-factor authentication",
        },
        {
            key: "clear_ban" as const,
            label: "Clear Ban",
            description: "Remove ban status from the user",
        },
    ];

    return (
        <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RotateCcw className="h-5 w-5" />
                        Reset Access
                    </DialogTitle>
                    <DialogDescription>
                        Reset access settings for {user?.full_name || user?.email}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    {resetOptions.map((option) => (
                        <div
                            key={option.key}
                            className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer"
                            onClick={() => toggleOption(option.key)}
                        >
                            <Checkbox
                                checked={!!options[option.key]}
                                onCheckedChange={() => toggleOption(option.key)}
                            />
                            <div>
                                <p className="text-sm font-medium">{option.label}</p>
                                <p className="text-xs text-muted-foreground">{option.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleReset} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Reset Access
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// DELETE CONFIRMATION DIALOG
// ============================================================================

interface DeleteDialogProps {
    user: EnrichedStoreUser | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDelete: (userId: string) => Promise<boolean>;
}

export function DeleteEmployeeDialog({
    user,
    open,
    onOpenChange,
    onDelete,
}: DeleteDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleDelete = async () => {
        if (!user) return;
        setIsSubmitting(true);

        const toastId = toast.loading("Removing employee...");

        try {
            const success = await onDelete(user.user_id);

            if (success) {
                toast.success(`${user.full_name || user.email} has been removed`, { id: toastId });
                onOpenChange(false);
            } else {
                toast.error("Failed to remove employee", { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Remove Employee
                    </DialogTitle>
                    <DialogDescription>
                        This will soft-delete {user?.full_name || "this user"} from the store.
                        They will be deactivated and all sessions terminated.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                        <div className="text-xs text-red-700 dark:text-red-300">
                            <p className="font-medium">This action cannot be easily undone</p>
                            <p>The employee will lose access to the store immediately.</p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Remove Employee
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// BULK ACTION DIALOG
// ============================================================================

interface BulkActionDialogProps {
    action: "activate" | "deactivate" | "ban" | "change-role" | null;
    selectedCount: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableRoles: AvailableRolesResponse | null;
    onConfirm: (options?: { reason?: string; roleId?: string }) => Promise<boolean>;
}

export function BulkActionDialog({
    action,
    selectedCount,
    open,
    onOpenChange,
    availableRoles,
    onConfirm,
}: BulkActionDialogProps) {
    const [reason, setReason] = useState("");
    const [roleId, setRoleId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const config = {
        activate: {
            title: "Bulk Activate",
            description: `Activate ${selectedCount} selected employees?`,
            buttonText: "Activate All",
            variant: "default" as const,
        },
        deactivate: {
            title: "Bulk Deactivate",
            description: `Deactivate ${selectedCount} selected employees? Their sessions will be terminated.`,
            buttonText: "Deactivate All",
            variant: "destructive" as const,
        },
        ban: {
            title: "Bulk Ban",
            description: `Ban ${selectedCount} selected employees? All sessions will be terminated.`,
            buttonText: "Ban All",
            variant: "destructive" as const,
        },
        "change-role": {
            title: "Bulk Change Role",
            description: `Change role for ${selectedCount} selected employees?`,
            buttonText: "Change Role",
            variant: "default" as const,
        },
    };

    const currentConfig = action ? config[action] : null;

    const handleConfirm = async () => {
        setIsSubmitting(true);

        const toastId = toast.loading(`${currentConfig?.title}...`);

        try {
            const success = await onConfirm({
                reason: action === "ban" ? reason : undefined,
                roleId: action === "change-role" ? roleId : undefined,
            });

            if (success) {
                toast.success(`${currentConfig?.title} completed`, { id: toastId });
                setReason("");
                setRoleId("");
                onOpenChange(false);
            } else {
                toast.error(`${currentConfig?.title} failed`, { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!currentConfig) return null;

    const canSubmit =
        action === "ban"
            ? reason.length >= 10
            : action === "change-role"
                ? !!roleId
                : true;

    return (
        <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{currentConfig.title}</DialogTitle>
                    <DialogDescription>{currentConfig.description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    {action === "ban" && (
                        <div className="space-y-1.5">
                            <Label htmlFor="bulk-ban-reason">Reason *</Label>
                            <Textarea
                                id="bulk-ban-reason"
                                placeholder="Reason for banning (min 10 characters)..."
                                rows={3}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>
                    )}

                    {action === "change-role" && (
                        <div className="space-y-1.5">
                            <Label htmlFor="bulk-role">New Role *</Label>
                            <Select
                                id="bulk-role"
                                value={roleId}
                                onChange={(e) => setRoleId(e.target.value)}
                            >
                                <option value="">Select a role</option>
                                {availableRoles?.roles.map((role) => (
                                    <option key={role.id} value={role.id}>
                                        {role.role_display_name}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        variant={currentConfig.variant}
                        onClick={handleConfirm}
                        disabled={isSubmitting || !canSubmit}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {currentConfig.buttonText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
