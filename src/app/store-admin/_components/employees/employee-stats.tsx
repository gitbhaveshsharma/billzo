"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Users,
    UserCheck,
    UserX,
    Ban,
    Clock,
    AlertCircle,
} from "lucide-react";
import type { StoreUserStats } from "@/types/store-users.types";
import { calculateEngagementRate } from "@/utils/store-users.utils";

// ============================================================================
// TYPES
// ============================================================================

interface EmployeeStatsProps {
    stats: StoreUserStats | null;
    isLoading: boolean;
}

interface StatCardProps {
    label: string;
    value: number | string;
    icon: React.ReactNode;
    tooltip: string;
    color: string;
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({ label, value, icon, tooltip, color }: StatCardProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Card className="cursor-default">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                                {icon}
                            </div>
                            <div className="min-w-0">
                                <p className="text-2xl font-bold">{value}</p>
                                <p className="text-xs text-muted-foreground truncate">{label}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom">{tooltip}</TooltipContent>
        </Tooltip>
    );
}

function StatSkeleton() {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-1">
                        <Skeleton className="h-6 w-12" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EmployeeStats({ stats, isLoading }: EmployeeStatsProps) {
    if (isLoading || !stats) {
        return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <StatSkeleton key={i} />
                ))}
            </div>
        );
    }

    const engagement = calculateEngagementRate(stats);

    const items: StatCardProps[] = [
        {
            label: "Total",
            value: stats.total_users,
            icon: <Users className="h-5 w-5 text-blue-600" />,
            tooltip: "Total employees in this store",
            color: "bg-blue-100 dark:bg-blue-900/30",
        },
        {
            label: "Active",
            value: stats.active_users,
            icon: <UserCheck className="h-5 w-5 text-green-600" />,
            tooltip: "Active employees who can log in",
            color: "bg-green-100 dark:bg-green-900/30",
        },
        {
            label: "Inactive",
            value: stats.inactive_users,
            icon: <UserX className="h-5 w-5 text-gray-600" />,
            tooltip: "Deactivated employees",
            color: "bg-gray-100 dark:bg-gray-800",
        },
        {
            label: "Banned",
            value: stats.banned_users,
            icon: <Ban className="h-5 w-5 text-red-600" />,
            tooltip: "Banned employees who cannot log in",
            color: "bg-red-100 dark:bg-red-900/30",
        },
        {
            label: "Recent Logins",
            value: stats.recent_logins,
            icon: <Clock className="h-5 w-5 text-purple-600" />,
            tooltip: "Employees who logged in within the last 7 days",
            color: "bg-purple-100 dark:bg-purple-900/30",
        },
        {
            label: "Engagement",
            value: `${engagement}%`,
            icon: <AlertCircle className="h-5 w-5 text-orange-600" />,
            tooltip: `${engagement}% of employees logged in recently`,
            color: "bg-orange-100 dark:bg-orange-900/30",
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {items.map((item) => (
                <StatCard key={item.label} {...item} />
            ))}
        </div>
    );
}
