"use client";

import { useMemo } from "react";
import {
  Users,
  UserCheck,
  UserX,
  ShieldBan,
  Clock,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  StatCardGrid,
  DonutChartCard,
  MiniStatList,
  ShiftStatusWidget,
} from "@/components/dashboard";
import type {
  DashboardStatConfig,
  ChartDataPoint,
} from "@/components/dashboard";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// Staff Report Page – /store-admin/reports/staff
// Staff composition, shift performance and activity overview
// ============================================================================

export default function StaffReportPage() {
  const data = useDashboardData();

  const staff = data.staffStats;
  const sh = data.shiftStats;

  // ── Staff overview stats ───────────────────────────────────────────────
  const staffOverviewStats = useMemo<DashboardStatConfig[]>(() => {
    return [
      {
        label: "Total Staff",
        value: (staff?.total_users ?? 0).toString(),
        icon: Users,
        color: "bg-blue-500",
        subtitle: `${staff?.active_users ?? 0} active`,
      },
      {
        label: "Active Users",
        value: (staff?.active_users ?? 0).toString(),
        icon: UserCheck,
        color: "bg-emerald-500",
        subtitle: `${staff?.recent_logins ?? 0} logged in (7d)`,
      },
      {
        label: "Inactive",
        value: (staff?.inactive_users ?? 0).toString(),
        icon: UserX,
        color: "bg-amber-500",
        subtitle: `${staff?.never_logged_in ?? 0} never logged in`,
      },
      {
        label: "Banned",
        value: (staff?.banned_users ?? 0).toString(),
        icon: ShieldBan,
        color: "bg-red-500",
        subtitle: "Suspended accounts",
      },
    ];
  }, [staff]);

  // ── Role distribution chart ────────────────────────────────────────────
  const roleChart = useMemo<ChartDataPoint[]>(() => {
    if (!staff?.by_role) return [];

    const roleColors: Record<string, string> = {
      store_admin: "#3b82f6",
      manager: "#8b5cf6",
      cashier: "#10b981",
      accountant: "#f59e0b",
      inventory_clerk: "#06b6d4",
      salesperson: "#ec4899",
    };

    return Object.entries(staff.by_role)
      .filter(([, count]) => count > 0)
      .map(([role, count]) => ({
        label: role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: count,
        color: roleColors[role] ?? "#6b7280",
      }));
  }, [staff]);

  // ── Department distribution chart ──────────────────────────────────────
  const departmentChart = useMemo<ChartDataPoint[]>(() => {
    if (!staff?.by_department) return [];
    return Object.entries(staff.by_department)
      .filter(([, count]) => count > 0)
      .map(([dept, count]) => ({
        label: dept.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: count,
      }));
  }, [staff]);

  // ── Employment status chart ────────────────────────────────────────────
  const employmentStatusChart = useMemo<ChartDataPoint[]>(() => {
    if (!staff?.by_employment_status) return [];

    const statusColors: Record<string, string> = {
      active: "#10b981",
      probation: "#f59e0b",
      notice_period: "#f97316",
      terminated: "#ef4444",
      resigned: "#6b7280",
      on_leave: "#8b5cf6",
    };

    return Object.entries(staff.by_employment_status)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: count,
        color: statusColors[status] ?? "#6b7280",
      }));
  }, [staff]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Report</h1>
          <p className="text-muted-foreground text-sm">
            Staff composition, activity and shift performance
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => data.refresh()}
          disabled={data.isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${data.isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Staff overview */}
      <StatCardGrid stats={staffOverviewStats} isLoading={data.isLoading} columns={4} />

      {/* Role + Department distribution */}
      <div className="grid gap-5 lg:grid-cols-2">
        <DonutChartCard
          title="Staff by Role"
          data={roleChart}
          isLoading={data.isLoading}
        />
        {departmentChart.length > 0 ? (
          <DonutChartCard
            title="Staff by Department"
            data={departmentChart}
            isLoading={data.isLoading}
          />
        ) : (
          <DonutChartCard
            title="Employment Status"
            data={employmentStatusChart}
            isLoading={data.isLoading}
          />
        )}
      </div>

      {/* Shift performance + employment status */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ShiftStatusWidget
          openCount={sh?.open_shifts_count ?? 0}
          closedToday={sh?.closed_shifts_today ?? 0}
          avgDuration={sh?.average_shift_duration_minutes ?? 0}
          avgSalesPerShift={sh?.average_sales_per_shift ?? 0}
          formatter={formatCurrency}
          isLoading={data.isLoading}
        />

        <MiniStatList
          title="Activity Overview"
          icon={BarChart3}
          items={[
            {
              label: "Total Users",
              value: (staff?.total_users ?? 0).toString(),
            },
            {
              label: "Active",
              value: (staff?.active_users ?? 0).toString(),
              color: "text-emerald-600 dark:text-emerald-400",
            },
            {
              label: "Recent Logins (7d)",
              value: (staff?.recent_logins ?? 0).toString(),
            },
            {
              label: "Never Logged In",
              value: (staff?.never_logged_in ?? 0).toString(),
              color:
                (staff?.never_logged_in ?? 0) > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : undefined,
            },
            {
              label: "Banned Accounts",
              value: (staff?.banned_users ?? 0).toString(),
              color:
                (staff?.banned_users ?? 0) > 0
                  ? "text-red-600 dark:text-red-400"
                  : undefined,
            },
          ]}
          isLoading={data.isLoading}
        />
      </div>

      {/* Employment status (shown separately if department chart was used above) */}
      {departmentChart.length > 0 && employmentStatusChart.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          <DonutChartCard
            title="Employment Status"
            data={employmentStatusChart}
            isLoading={data.isLoading}
          />
          <MiniStatList
            title="Shift Metrics"
            icon={Clock}
            items={[
              {
                label: "Open Shifts",
                value: (sh?.open_shifts_count ?? 0).toString(),
              },
              {
                label: "Closed Today",
                value: (sh?.closed_shifts_today ?? 0).toString(),
              },
              {
                label: "Avg Duration",
                value: `${sh?.average_shift_duration_minutes ?? 0} min`,
              },
              {
                label: "Avg Sales/Shift",
                value: formatCurrency(sh?.average_sales_per_shift ?? 0),
              },
              {
                label: "Cash In Today",
                value: formatCurrency(sh?.total_cash_in_today ?? 0),
              },
              {
                label: "Cash Out Today",
                value: formatCurrency(sh?.total_cash_out_today ?? 0),
              },
            ]}
            isLoading={data.isLoading}
          />
        </div>
      )}
    </div>
  );
}
