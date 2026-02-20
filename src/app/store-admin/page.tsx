"use client";

import {
    Building2,
    Store,
    MapPin,
    Phone,
    Mail,
    Hash,
    Calendar,
    CheckCircle2,
    Clock,
    XCircle,
    ShieldAlert,
    BadgeInfo,
    User,
    ChevronRight,
    Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useStoreStore } from "@/stores/store.store";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    getRoleDisplayName,
    getRoleBadgeColor,
    formatDate,
    getUserInitials,
    getAvatarColor,
} from "@/utils/store-users.utils";
import type { RoleName } from "@/types/database.types";

// ============================================================================
// Status config
// ============================================================================

type StoreStatus = "active" | "pending" | "suspended" | "inactive";

const STATUS_CONFIG: Record<
    StoreStatus,
    {
        label: string;
        icon: typeof CheckCircle2;
        variant: "success" | "warning" | "destructive" | "secondary";
        dot: string;
    }
> = {
    active: { label: "Active", icon: CheckCircle2, variant: "success", dot: "bg-emerald-500" },
    pending: { label: "Pending", icon: Clock, variant: "warning", dot: "bg-amber-500" },
    suspended: { label: "Suspended", icon: ShieldAlert, variant: "destructive", dot: "bg-red-500" },
    inactive: { label: "Inactive", icon: XCircle, variant: "secondary", dot: "bg-gray-400" },
};

// ============================================================================
// Sub-components
// ============================================================================

function StatusPill({ status }: { status: string | null }) {
    if (!status) return null;
    const cfg = STATUS_CONFIG[status as StoreStatus] ?? {
        label: status,
        icon: BadgeInfo,
        variant: "secondary" as const,
        dot: "bg-gray-400",
    };
    const Icon = cfg.icon;
    return (
        <Badge variant={cfg.variant} className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${cfg.dot}`} />
            <Icon className="h-3 w-3" />
            {cfg.label}
        </Badge>
    );
}

function InfoField({
    label,
    value,
    icon: Icon,
    mono = false,
}: {
    label: string;
    value: string | null | undefined;
    icon: React.ElementType;
    mono?: boolean;
}) {
    if (!value) return null;
    return (
        <div className="group flex items-start gap-3 py-3 border-b border-dashed border-gray-100 dark:border-gray-800 last:border-0">
            <span className="mt-0.5 flex items-center justify-center w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 shrink-0">
                <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">
                    {label}
                </p>
                <p className={`text-sm text-gray-800 dark:text-gray-100 leading-snug break-all ${mono ? "font-mono text-xs" : "font-medium"}`}>
                    {value}
                </p>
            </div>
        </div>
    );
}

function Avatar({ name }: { name: string | null }) {
    const initials = getUserInitials(name);
    const bg = getAvatarColor(name);
    return (
        <div
            className={`${bg} flex items-center justify-center w-11 h-11 rounded-2xl text-white text-sm font-bold shadow-sm shrink-0`}
        >
            {initials}
        </div>
    );
}

function SectionCard({
    title,
    icon: Icon,
    accent,
    badge,
    children,
}: {
    title: string;
    icon: React.ElementType;
    accent: string;
    badge?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Subtle top accent line */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />

            <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <Icon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    </span>
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 tracking-tight">
                        {title}
                    </h2>
                </div>
                {badge}
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-800 mx-5" />

            <div className="px-5 pt-1 pb-5">{children}</div>
        </div>
    );
}

// ============================================================================
// Loading skeleton
// ============================================================================

function OverviewSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div>
                <Skeleton className="h-7 w-56 mb-2" />
                <Skeleton className="h-4 w-80" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-64 rounded-2xl" />
                <Skeleton className="h-64 rounded-2xl" />
            </div>
        </div>
    );
}

// ============================================================================
// Page
// ============================================================================

export default function StoreAdminOverviewPage() {
    const { appUser } = useAuth();
    const { store, isLoading } = useStoreStore();

    if (isLoading) return <OverviewSkeleton />;

    const fullAddress = store
        ? [
            store.address_line1,
            store.address_line2,
            store.landmark,
            store.city,
            store.state,
            store.pincode,
        ]
            .filter(Boolean)
            .join(", ")
        : null;

    const openedOn = store?.opening_date
        ? formatDate(store.opening_date)
        : null;

    const storeStatus = store?.status ?? appUser?.storeStatus ?? null;
    const roleName = appUser?.role as RoleName | undefined;
    const roleLabel = roleName ? getRoleDisplayName(roleName) : null;
    const roleBadgeClass = roleName ? getRoleBadgeColor(roleName) : "";

    return (
        <div className="space-y-7">
            {/* ── Header ── */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-2 font-medium tracking-wide">
                        <Sparkles className="h-3 w-3" />
                        <span>Dashboard</span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-gray-600 dark:text-gray-300">Store Overview</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Store Admin Overview
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Your organization and active store at a glance.
                    </p>
                </div>
            </div>

            {/* ── Cards Grid ── */}
            <div className="grid gap-5 lg:grid-cols-2">

                {/* Organization Card */}
                <SectionCard
                    title="Organization"
                    icon={Building2}
                    accent="bg-gradient-to-r from-blue-500 to-indigo-500"
                >
                    {appUser?.organizationName ? (
                        <div className="pt-1">
                            {/* Identity header */}
                            <div className="flex items-center gap-3 py-3 mb-1">
                                <Avatar name={appUser.organizationName} />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                        {appUser.organizationName}
                                    </p>
                                    {roleLabel && (
                                        <Badge className={`mt-1 text-[11px] ${roleBadgeClass}`}>
                                            {roleLabel}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 dark:bg-gray-800 mb-1" />

                            <InfoField icon={Hash} label="Organization ID" value={appUser.organizationId} mono />
                            <InfoField icon={User} label="Your Role" value={roleLabel} />
                            <InfoField icon={Mail} label="Email" value={appUser.email} />
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">
                            No organization information found.
                        </p>
                    )}
                </SectionCard>

                {/* Store Card */}
                <SectionCard
                    title="Current Store"
                    icon={Store}
                    accent="bg-gradient-to-r from-violet-500 to-purple-500"
                    badge={<StatusPill status={storeStatus} />}
                >
                    {store ? (
                        <div className="pt-1">
                            {/* Store identity header */}
                            <div className="flex items-center gap-3 py-3 mb-1">
                                <Avatar name={store.display_name ?? store.name} />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                        {store.display_name ?? store.name}
                                    </p>
                                    {store.store_code && (
                                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                            #{store.store_code}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 dark:bg-gray-800 mb-1" />

                            <InfoField
                                icon={BadgeInfo}
                                label="Store Type"
                                value={
                                    store.store_type
                                        ? store.store_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                                        : null
                                }
                            />
                            <InfoField icon={MapPin} label="Address" value={fullAddress} />
                            <InfoField icon={Phone} label="Phone" value={store.phone} />
                            <InfoField icon={Mail} label="Email" value={store.email} />
                            <InfoField icon={Calendar} label="Opened On" value={openedOn} />
                            {store.gstin && (
                                <InfoField icon={Hash} label="GSTIN" value={store.gstin} mono />
                            )}
                        </div>
                    ) : appUser?.storeName ? (
                        <div className="pt-2">
                            <InfoField icon={Store} label="Store Name" value={appUser.storeName} />
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">
                            No store information available.
                        </p>
                    )}
                </SectionCard>
            </div>
        </div>
    );
}