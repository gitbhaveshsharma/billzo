"use client";

import { useMemo, useState } from "react";
import { Shield, ChevronDown, ChevronRight, Info, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
  PERMISSION_REGISTRY,
  getPermissionsByCategory,
  ROLE_PRIORITY,
  type PermissionCategory,
  type PermissionDef,
} from "@/constants/roles";
import {
  getRoleDisplayName,
  getRoleBadgeColor,
} from "@/utils/store-users.utils";
import type { RoleName, Json } from "@/types/database.types";
import type { AvailableRolesResponse } from "@/types/store-users.types";

// ============================================================================
// TYPES
// ============================================================================

interface RolePermissionsViewProps {
  /** Available roles from the store context (with DB permissions) */
  availableRoles: AvailableRolesResponse | null;
  /** Current user's role — determines what they can see/edit */
  currentUserRole: RoleName | null;
  /** Whether user counts should be shown per role */
  roleCounts?: Record<string, number>;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Safely check if a JSONB permissions object has a given key set to true */
function permEnabled(perms: Json | null | undefined, key: string): boolean {
  if (!perms || typeof perms !== "object" || Array.isArray(perms)) return false;
  const obj = perms as Record<string, unknown>;
  return obj["all"] === true || obj[key] === true;
}

/** Sort roles by priority descending (highest first) */
function sortByPriority(roles: AvailableRolesResponse["roles"]): AvailableRolesResponse["roles"] {
  return [...roles].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Single permission row inside a category */
function PermissionRow({
  perm,
  enabled,
  isAllGrant,
}: {
  perm: PermissionDef;
  enabled: boolean;
  isAllGrant: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-1">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium leading-none truncate">
          {perm.label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {perm.description}
        </p>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Switch
                checked={enabled}
                disabled
                aria-label={perm.label}
                className="data-[state=checked]:bg-green-600 cursor-default"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isAllGrant
              ? "Granted via 'all' permission"
              : enabled
                ? "Enabled for this role"
                : "Not granted"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

/** Permission category group (collapsible) */
function CategoryGroup({
  category,
  label,
  description,
  permissions,
  rolePerms,
  isAllGrant,
  defaultOpen,
}: {
  category: PermissionCategory;
  label: string;
  description: string;
  permissions: PermissionDef[];
  rolePerms: Json | null | undefined;
  isAllGrant: boolean;
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const enabledCount = permissions.filter(
    (p) => isAllGrant || permEnabled(rolePerms, p.key)
  ).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2.5 px-3 rounded-md hover:bg-muted/50 transition-colors group">
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
        <Badge variant="secondary" className="text-xs tabular-nums">
          {enabledCount}/{permissions.length}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 pl-2 border-l border-border/50 space-y-0">
          {permissions.map((perm) => (
            <PermissionRow
              key={perm.key}
              perm={perm}
              enabled={isAllGrant || permEnabled(rolePerms, perm.key)}
              isAllGrant={isAllGrant}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// ROLE CARD — shows one role and all its permissions by category
// ============================================================================

function RoleCard({
  role,
  userCount,
}: {
  role: AvailableRolesResponse["roles"][number];
  userCount?: number;
}) {
  const categorized = useMemo(() => getPermissionsByCategory(), []);

  const isAllGrant = permEnabled(role.permissions, "all");

  const totalPerms = PERMISSION_REGISTRY.length;
  const enabledPerms = isAllGrant
    ? totalPerms
    : PERMISSION_REGISTRY.filter((p) => permEnabled(role.permissions, p.key)).length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {role.role_display_name}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-0.5">
                <span>Priority: {role.priority}</span>
                {userCount !== undefined && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {userCount} {userCount === 1 ? "user" : "users"}
                    </span>
                  </>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getRoleBadgeColor(role.role_name)}>
              {getRoleDisplayName(role.role_name)}
            </Badge>
            <Badge variant="outline" className="tabular-nums">
              {enabledPerms}/{totalPerms}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isAllGrant && (
          <div className="flex items-center gap-2 mb-3 p-2.5 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
            <Info className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-300">
              This role has <strong>all permissions</strong> granted. Every permission is enabled by default.
            </p>
          </div>
        )}

        <div className="space-y-1">
          {categorized.map((group, idx) => (
            <CategoryGroup
              key={group.category}
              category={group.category}
              label={group.label}
              description={group.description}
              permissions={group.permissions}
              rolePerms={role.permissions}
              isAllGrant={isAllGrant}
              defaultOpen={idx === 0}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUMMARY BAR — permission matrix overview
// ============================================================================

function PermissionSummary({
  roles,
}: {
  roles: AvailableRolesResponse["roles"];
}) {
  const categories = useMemo(() => getPermissionsByCategory(), []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Permission Overview</CardTitle>
        <CardDescription>
          Quick view of which categories each role covers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                  Category
                </th>
                {sortByPriority(roles).map((role) => (
                  <th
                    key={role.role_name}
                    className="text-center py-2 px-3 font-medium text-muted-foreground whitespace-nowrap"
                  >
                    {getRoleDisplayName(role.role_name)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.category} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{cat.label}</td>
                  {sortByPriority(roles).map((role) => {
                    const isAll = permEnabled(role.permissions, "all");
                    const count = cat.permissions.filter(
                      (p) => isAll || permEnabled(role.permissions, p.key)
                    ).length;
                    const total = cat.permissions.length;
                    const ratio = total > 0 ? count / total : 0;

                    return (
                      <td key={role.role_name} className="text-center py-2 px-3">
                        <Badge
                          variant={ratio === 0 ? "secondary" : "default"}
                          className={
                            ratio === 1
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : ratio > 0
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                : ""
                          }
                        >
                          {count}/{total}
                        </Badge>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RolesPermissionsView({
  availableRoles,
  currentUserRole,
  roleCounts,
}: RolePermissionsViewProps) {
  const sortedRoles = useMemo(() => {
    if (!availableRoles?.roles) return [];
    return sortByPriority(availableRoles.roles);
  }, [availableRoles]);

  if (!availableRoles || sortedRoles.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-muted-foreground">No roles found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary matrix */}
      <PermissionSummary roles={sortedRoles} />

      <Separator />

      {/* Individual role cards */}
      <div className="space-y-4">
        {sortedRoles.map((role) => (
          <RoleCard
            key={role.role_name}
            role={role}
            userCount={roleCounts?.[role.role_name]}
          />
        ))}
      </div>
    </div>
  );
}
