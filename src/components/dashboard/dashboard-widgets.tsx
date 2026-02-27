"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Package,
  Clock,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DashboardAlertItem } from "./types";

// ============================================================================
// AlertBanner – critical notifications banner
// ============================================================================

interface AlertBannerProps {
  alerts: DashboardAlertItem[];
  isLoading?: boolean;
  className?: string;
}

const SEVERITY_STYLES = {
  critical:
    "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200",
  warning:
    "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200",
  info: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-200",
} as const;

const SEVERITY_BADGE = {
  critical: "destructive" as const,
  warning: "warning" as const,
  info: "secondary" as const,
};

export function AlertBanner({
  alerts,
  isLoading = false,
  className,
}: AlertBannerProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {alerts.map((alert) => {
        const Icon = alert.icon;
        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg border",
              SEVERITY_STYLES[alert.severity]
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{alert.title}</p>
              <p className="text-xs opacity-75">{alert.description}</p>
            </div>
            <Badge variant={SEVERITY_BADGE[alert.severity]} className="shrink-0">
              {alert.severity}
            </Badge>
            {alert.action && (
              <button
                onClick={alert.action.onClick}
                className="text-xs font-medium underline underline-offset-2 shrink-0 hover:opacity-80"
              >
                {alert.action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// TopProductsTable – top selling products widget
// ============================================================================

interface TopProductsTableProps {
  products: Array<{
    product_name: string;
    product_code: string;
    quantity_sold: number;
    revenue: number;
  }>;
  formatter: (value: number) => string;
  isLoading?: boolean;
  className?: string;
}

export function TopProductsTable({
  products,
  formatter,
  isLoading = false,
  className,
}: TopProductsTableProps) {
  if (isLoading) {
    return <ListWidgetSkeleton title="Top Selling Products" rows={5} />;
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Top Selling Products
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {products.length > 0 ? (
          <div className="divide-y divide-border">
            {products.map((product, i) => (
              <div
                key={product.product_code}
                className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {product.product_name}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {product.product_code}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">
                    {formatter(product.revenue)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {product.quantity_sold} sold
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8 px-6">
            No sales data yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// StockAlertsList – low stock / expiring items widget
// ============================================================================

interface StockAlertsListProps {
  title: string;
  icon?: LucideIcon;
  items: Array<{
    id?: string;
    name: string;
    detail: string;
    severity?: "critical" | "warning" | "info";
  }>;
  isLoading?: boolean;
  maxItems?: number;
  onViewAll?: () => void;
  className?: string;
}

export function StockAlertsList({
  title,
  icon: TitleIcon = AlertTriangle,
  items,
  isLoading = false,
  maxItems = 5,
  onViewAll,
  className,
}: StockAlertsListProps) {
  if (isLoading) {
    return <ListWidgetSkeleton title={title} rows={3} />;
  }

  const displayed = items.slice(0, maxItems);
  const remaining = items.length - maxItems;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TitleIcon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </div>
          {items.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {items.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {displayed.length > 0 ? (
          <div className="divide-y divide-border">
            {displayed.map((item, i) => (
              <div
                key={item.id ?? i}
                className="flex items-center gap-3 px-6 py-3"
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    item.severity === "critical"
                      ? "bg-red-500"
                      : item.severity === "warning"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            ))}
            {remaining > 0 && onViewAll && (
              <button
                onClick={onViewAll}
                className="flex items-center justify-center gap-1.5 w-full px-6 py-3 text-xs font-medium text-primary hover:bg-muted/50 transition-colors"
              >
                View {remaining} more
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8 px-6">
            No alerts
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// QuickActions – grid of quick action cards with navigation
// ============================================================================

interface QuickActionsProps {
  actions: Array<{
    label: string;
    description: string;
    icon: LucideIcon;
    href: string;
    color: string;
  }>;
  onNavigate: (href: string) => void;
  className?: string;
}

export function QuickActions({
  actions,
  onNavigate,
  className,
}: QuickActionsProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.href}
                onClick={() => onNavigate(action.href)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:bg-muted/50 hover:border-primary/20 transition-all group"
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-lg",
                    action.color
                  )}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-foreground leading-tight">
                    {action.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 hidden sm:block">
                    {action.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ShiftStatusWidget – open shifts summary
// ============================================================================

interface ShiftStatusWidgetProps {
  openCount: number;
  closedToday: number;
  avgDuration: number;
  avgSalesPerShift: number;
  formatter: (value: number) => string;
  isLoading?: boolean;
  className?: string;
}

export function ShiftStatusWidget({
  openCount,
  closedToday,
  avgDuration,
  avgSalesPerShift,
  formatter,
  isLoading = false,
  className,
}: ShiftStatusWidgetProps) {
  if (isLoading) {
    return <ListWidgetSkeleton title="Shift Status" rows={4} />;
  }

  const items = [
    {
      label: "Open Shifts",
      value: openCount.toString(),
      icon: Clock,
      dot: openCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-gray-400",
    },
    {
      label: "Closed Today",
      value: closedToday.toString(),
      icon: Package,
      dot: "bg-blue-500",
    },
    {
      label: "Avg Duration",
      value: `${Math.round(avgDuration)}m`,
      icon: Clock,
      dot: "bg-violet-500",
    },
    {
      label: "Avg Sales/Shift",
      value: formatter(avgSalesPerShift),
      icon: Package,
      dot: "bg-amber-500",
    },
  ];

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Shift Status</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-6 py-3"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn("w-2 h-2 rounded-full shrink-0", item.dot)}
                />
                <span className="text-sm text-muted-foreground">
                  {item.label}
                </span>
              </div>
              <span className="text-sm font-semibold text-foreground">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MiniStatList – compact key/value list
// ============================================================================

interface MiniStatListProps {
  title: string;
  icon?: LucideIcon;
  items: Array<{
    label: string;
    value: string | number;
    color?: string;
  }>;
  isLoading?: boolean;
  className?: string;
}

export function MiniStatList({
  title,
  icon: TitleIcon,
  items,
  isLoading = false,
  className,
}: MiniStatListProps) {
  if (isLoading) {
    return <ListWidgetSkeleton title={title} rows={items.length || 4} />;
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {TitleIcon && (
            <TitleIcon className="h-4 w-4 text-muted-foreground" />
          )}
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-6 py-3"
            >
              <span className="text-sm text-muted-foreground">
                {item.label}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  item.color ?? "text-foreground"
                )}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Skeleton helpers
// ============================================================================

function ListWidgetSkeleton({
  title,
  rows,
}: {
  title: string;
  rows: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
