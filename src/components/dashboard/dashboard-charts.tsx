"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { ChartDataPoint } from "./types";

// ============================================================================
// Color palette for charts
// ============================================================================

const CHART_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
] as const;

// ============================================================================
// Shared chart tooltip
// ============================================================================

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
  formatter?: (value: number) => string;
}

function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      {label && (
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {label}
        </p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold text-foreground">
          {formatter ? formatter(entry.value) : entry.value.toLocaleString("en-IN")}
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// BarChartCard – horizontal or vertical bar chart
// ============================================================================

interface BarChartCardProps {
  title: string;
  data: ChartDataPoint[];
  formatter?: (value: number) => string;
  isLoading?: boolean;
  height?: number;
  layout?: "vertical" | "horizontal";
  color?: string;
  className?: string;
  emptyMessage?: string;
}

export function BarChartCard({
  title,
  data,
  formatter,
  isLoading = false,
  height = 280,
  layout = "vertical",
  color = CHART_COLORS[0],
  className,
  emptyMessage = "No data available",
}: BarChartCardProps) {
  if (isLoading) {
    return <ChartSkeleton title={title} height={height} />;
  }

  const hasData = data.length > 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={height}>
            {layout === "horizontal" ? (
              <BarChart
                data={data}
                layout="horizontal"
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <XAxis
                  dataKey="label"
                  type="category"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    formatter ? formatter(v) : v.toLocaleString("en-IN")
                  }
                />
                <Tooltip
                  content={<ChartTooltipContent formatter={formatter} />}
                />
                <Bar
                  dataKey="value"
                  fill={color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            ) : (
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    formatter ? formatter(v) : v.toLocaleString("en-IN")
                  }
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip
                  content={<ChartTooltipContent formatter={formatter} />}
                />
                <Bar
                  dataKey="value"
                  fill={color}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <EmptyChartState message={emptyMessage} height={height} />
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// DonutChartCard – pie/donut chart
// ============================================================================

interface DonutChartCardProps {
  title: string;
  data: ChartDataPoint[];
  formatter?: (value: number) => string;
  isLoading?: boolean;
  height?: number;
  className?: string;
  emptyMessage?: string;
  innerRadius?: number;
  outerRadius?: number;
}

export function DonutChartCard({
  title,
  data,
  formatter,
  isLoading = false,
  height = 280,
  className,
  emptyMessage = "No data available",
  innerRadius = 50,
  outerRadius = 90,
}: DonutChartCardProps) {
  if (isLoading) {
    return <ChartSkeleton title={title} height={height} />;
  }

  const hasData = data.length > 0 && data.some((d) => d.value > 0);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={2}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {data.map((entry, i) => (
                  <Cell
                    key={entry.label}
                    fill={entry.color ?? CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={<ChartTooltipContent formatter={formatter} />}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChartState message={emptyMessage} height={height} />
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PaymentBreakdownChart – specialized for payment method breakdown
// ============================================================================

interface PaymentBreakdownProps {
  cash: number;
  card: number;
  upi: number;
  other: number;
  credit: number;
  formatter: (value: number) => string;
  isLoading?: boolean;
  className?: string;
}

export function PaymentBreakdownChart({
  cash,
  card,
  upi,
  other,
  credit,
  formatter,
  isLoading = false,
  className,
}: PaymentBreakdownProps) {
  const total = cash + card + upi + other + credit;
  const data: ChartDataPoint[] = [
    { label: "Cash", value: cash, color: "#10b981" },
    { label: "Card", value: card, color: "#3b82f6" },
    { label: "UPI", value: upi, color: "#8b5cf6" },
    { label: "Credit", value: credit, color: "#f59e0b" },
    { label: "Other", value: other, color: "#6b7280" },
  ].filter((d) => d.value > 0);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Payment Breakdown
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Total: {formatter(total)}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : data.length > 0 ? (
          <div className="space-y-3">
            {data.map((item) => {
              const pct = total > 0 ? (item.value / total) * 100 : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-foreground">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {pct.toFixed(1)}%
                      </span>
                      <span className="font-semibold text-foreground min-w-[80px] text-right">
                        {formatter(item.value)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No payment data
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function EmptyChartState({
  message,
  height,
}: {
  message: string;
  height: number;
}) {
  return (
    <div
      className="flex items-center justify-center text-sm text-muted-foreground"
      style={{ height }}
    >
      {message}
    </div>
  );
}

function ChartSkeleton({ title, height }: { title: string; height: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full rounded-lg" style={{ height }} />
      </CardContent>
    </Card>
  );
}

export { CHART_COLORS };
