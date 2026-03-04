"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
} from "lucide-react";
import type { DashboardStatConfig } from "./types";

// ============================================================================
// StatCard – single KPI card with icon, value, trend, and optional click
// ============================================================================

interface StatCardProps extends DashboardStatConfig {
  isLoading?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
  subtitle,
  tooltip,
  onClick,
  isLoading = false,
  className,
}: StatCardProps) {
  if (isLoading) {
    return <StatCardSkeleton />;
  }

  const TrendIcon =
    trend?.direction === "up"
      ? TrendingUp
      : trend?.direction === "down"
        ? TrendingDown
        : Minus;

  const trendColor =
    trend?.direction === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : trend?.direction === "down"
        ? "text-red-600 dark:text-red-400"
        : "text-gray-500 dark:text-gray-400";

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        className
      )}
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2 min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              {label}
              {tooltip && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs font-normal normal-case tracking-normal">
                      {tooltip}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </p>
            <p className="text-2xl font-bold tracking-tight text-foreground truncate">
              {value}
            </p>
            {(trend || subtitle) && (
              <div className="flex items-center gap-1.5 text-xs">
                {trend && (
                  <>
                    <TrendIcon className={cn("h-3.5 w-3.5", trendColor)} />
                    <span className={cn("font-medium", trendColor)}>
                      {trend.value > 0 ? "+" : ""}
                      {trend.value}%
                    </span>
                    <span className="text-muted-foreground">
                      {trend.label}
                    </span>
                  </>
                )}
                {!trend && subtitle && (
                  <span className="text-muted-foreground">{subtitle}</span>
                )}
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl shrink-0",
              color
            )}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// StatCardGrid – responsive grid wrapper
// ============================================================================

interface StatCardGridProps {
  stats: DashboardStatConfig[];
  isLoading?: boolean;
  columns?: 2 | 3 | 4;
  className?: string;
}

const GRID_COLS = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const;

export function StatCardGrid({
  stats,
  isLoading = false,
  columns = 4,
  className,
}: StatCardGridProps) {
  return (
    <div className={cn("grid gap-4", GRID_COLS[columns], className)}>
      {isLoading
        ? Array.from({ length: columns }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))
        : stats.map((stat) => (
            <StatCard key={stat.label} {...stat} isLoading={false} />
          ))}
    </div>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

function StatCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </Card>
  );
}
