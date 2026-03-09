"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  Shield,
  ShieldPlus,
  RotateCcw,
} from "lucide-react";
import {
  getPermissionsByCategory,
  ROLE_CATEGORY_ACCESS,
  type PermissionCategory,
  type PermissionDef,
} from "@/constants/roles";
import {
  getRoleDisplayName,
  getRoleBadgeColor,
} from "@/utils/store-users.utils";
import type { EnrichedStoreUser, UpdateStoreUserRequest } from "@/types/store-users.types";
import type { Json } from "@/types/database.types";

// ============================================================================
// TYPES
// ============================================================================

interface ManagePermissionsDialogProps {
  user: EnrichedStoreUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateUser: (userId: string, data: UpdateStoreUserRequest) => Promise<boolean>;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Check whether a JSONB permissions object grants a specific key */
function permEnabled(perms: Json | null | undefined, key: string): boolean {
  if (!perms || typeof perms !== "object" || Array.isArray(perms)) return false;
  const obj = perms as Record<string, unknown>;
  return obj["all"] === true || obj[key] === true;
}

/** Build a clean Record from the custom_permissions JSONB (only true keys) */
function parseCustomPerms(perms: Json | null | undefined): Record<string, boolean> {
  if (!perms || typeof perms !== "object" || Array.isArray(perms)) return {};
  const obj = perms as Record<string, unknown>;
  const result: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === true) result[key] = true;
  }
  return result;
}

// ============================================================================
// PERMISSION ROW
// ============================================================================

function PermissionToggleRow({
  perm,
  roleGranted,
  customGranted,
  onToggle,
}: {
  perm: PermissionDef;
  /** Whether the role's base permissions grant this */
  roleGranted: boolean;
  /** Whether custom_permissions grants this (additive) */
  customGranted: boolean;
  onToggle: (key: string, enabled: boolean) => void;
}) {
  const effective = roleGranted || customGranted;

  return (
    <div className="flex items-center justify-between py-2 px-1">
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium leading-none truncate">
            {perm.label}
          </p>
          {roleGranted && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                    Role
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Granted by role — cannot be revoked here
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {customGranted && !roleGranted && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              Custom
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {perm.description}
        </p>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Switch
                checked={effective}
                disabled={roleGranted}
                onCheckedChange={(checked) => onToggle(perm.key, checked)}
                aria-label={perm.label}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            {roleGranted
              ? "Granted by role — cannot be changed"
              : customGranted
                ? "Custom grant — click to revoke"
                : "Not granted — click to add"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// ============================================================================
// CATEGORY GROUP
// ============================================================================

function CategoryGroupToggle({
  label,
  description,
  permissions,
  rolePerms,
  customPerms,
  isRoleAll,
  onToggle,
  defaultOpen,
}: {
  label: string;
  description: string;
  permissions: PermissionDef[];
  rolePerms: Json | null | undefined;
  customPerms: Record<string, boolean>;
  isRoleAll: boolean;
  onToggle: (key: string, enabled: boolean) => void;
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const stats = useMemo(() => {
    let enabled = 0;
    let customCount = 0;
    for (const p of permissions) {
      const roleGranted = isRoleAll || permEnabled(rolePerms, p.key);
      const customGranted = !!customPerms[p.key];
      if (roleGranted || customGranted) enabled++;
      if (customGranted && !roleGranted) customCount++;
    }
    return { enabled, total: permissions.length, customCount };
  }, [permissions, rolePerms, customPerms, isRoleAll]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2.5 px-3 rounded-md hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div className="text-left">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {stats.customCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              +{stats.customCount}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs tabular-nums">
            {stats.enabled}/{stats.total}
          </Badge>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 pl-2 border-l border-border/50 space-y-0">
          {permissions.map((perm) => (
            <PermissionToggleRow
              key={perm.key}
              perm={perm}
              roleGranted={isRoleAll || permEnabled(rolePerms, perm.key)}
              customGranted={!!customPerms[perm.key]}
              onToggle={onToggle}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// MAIN DIALOG
// ============================================================================

export function ManagePermissionsDialog({
  user,
  open,
  onOpenChange,
  onUpdateUser,
}: ManagePermissionsDialogProps) {
  const [customPerms, setCustomPerms] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const categorized = useMemo(() => {
    const all = getPermissionsByCategory();
    if (!user) return all;
    const access = ROLE_CATEGORY_ACCESS[user.role_name];
    if (access === "all") return all;
    return all.filter((g) => access.includes(g.category as PermissionCategory));
  }, [user]);

  // Role-level permissions
  const rolePerms = user?.permissions ?? null;
  const isRoleAll = permEnabled(rolePerms, "all");

  // Seed local state whenever the dialog opens or the user changes
  useEffect(() => {
    if (open && user) {
      setCustomPerms(parseCustomPerms(user.custom_permissions));
      setIsDirty(false);
    }
  }, [open, user]);

  // Only guard against closing while a save is in-flight
  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!isSubmitting) onOpenChange(v);
    },
    [isSubmitting, onOpenChange]
  );

  // Toggle a single custom permission
  const handleToggle = useCallback(
    (key: string, enabled: boolean) => {
      setCustomPerms((prev) => {
        const next = { ...prev };
        if (enabled) {
          next[key] = true;
        } else {
          delete next[key];
        }
        return next;
      });
      setIsDirty(true);
    },
    []
  );

  // Reset custom permissions to empty (role defaults only)
  const handleReset = useCallback(() => {
    setCustomPerms({});
    setIsDirty(true);
  }, []);

  // Count custom overrides
  const customCount = Object.keys(customPerms).filter(
    (key) => !permEnabled(rolePerms, key) && !isRoleAll
  ).length;

  // Save
  const handleSave = async () => {
    if (!user) return;
    setIsSubmitting(true);

    const toastId = toast.loading("Updating permissions...");

    try {
      // Build clean JSONB — only keep keys that aren't already granted by role
      const cleaned: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(customPerms)) {
        if (val && !isRoleAll && !permEnabled(rolePerms, key)) {
          cleaned[key] = true;
        }
      }

      const payload: UpdateStoreUserRequest = {
        custom_permissions: Object.keys(cleaned).length > 0 ? cleaned : null,
      };

      const success = await onUpdateUser(user.user_id, payload);

      if (success) {
        toast.success("Permissions updated", { id: toastId });
        setIsDirty(false);
        onOpenChange(false);
      } else {
        toast.error("Failed to update permissions", { id: toastId });
      }
    } catch {
      toast.error("An unexpected error occurred", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldPlus className="h-5 w-5" />
            Manage Permissions
          </DialogTitle>
          <DialogDescription>
            Customise permissions for{" "}
            <span className="font-medium text-foreground">
              {user?.full_name || user?.email}
            </span>
            . Custom grants are additive — they extend the role&apos;s base
            permissions.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 max-h-[85vh] overflow-x-auto">
        {user && (
          <>
            {/* Role info bar */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Base role:</span>
                <Badge className={getRoleBadgeColor(user.role_name)}>
                  {getRoleDisplayName(user.role_name)}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {customCount > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {customCount} custom grant{customCount !== 1 ? "s" : ""}
                  </Badge>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        disabled={Object.keys(customPerms).length === 0}
                        className="h-7 px-2 text-xs"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear all custom permissions</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {isRoleAll && (
              <div className="flex items-center gap-2 mx-1 p-2.5 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                <Info className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                <p className="text-xs text-green-700 dark:text-green-300">
                  This role has <strong>all permissions</strong> granted.
                  Custom overrides have no effect.
                </p>
              </div>
            )}

            <Separator />

            {/* Permission categories */}
            <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
              <div className="space-y-1 pb-4">
                {categorized.map((group, idx) => (
                  <CategoryGroupToggle
                    key={group.category}
                    label={group.label}
                    description={group.description}
                    permissions={group.permissions}
                    rolePerms={rolePerms}
                    customPerms={customPerms}
                    isRoleAll={isRoleAll}
                    onToggle={handleToggle}
                    defaultOpen={idx === 0}
                  />
                ))}
              </div>
            </ScrollArea>
          </>
        )}
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || !isDirty}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
