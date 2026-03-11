"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  DollarSign,
  Clock,
  Briefcase,
  Search,
  RefreshCw,
  Building2,
} from "lucide-react";
import { useAccountant } from "@/app/accountant/_context/accountant-context";
import { useStoreUsersStore } from "@/stores/store-users.store";
import { useShiftsStore } from "@/stores/shifts.store";
import { StatCardGrid, MiniStatList } from "@/components/dashboard";
import type { DashboardStatConfig } from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// ACCOUNTANT — PAYROLL PAGE
// ============================================================================

export default function PayrollPage() {
  const { storeId } = useAccountant();

  const {
    users,
    isLoading: usersLoading,
    fetchUsers,
  } = useStoreUsersStore();

  const {
    shifts,
    dashboardStats: shiftStats,
    isLoading: shiftsLoading,
    fetchShifts,
    fetchDashboardStats: fetchShiftStats,
  } = useShiftsStore();

  const isLoading = usersLoading || shiftsLoading;
  const [search, setSearch] = useState("");

  // ========================================================================
  // FETCH
  // ========================================================================

  useEffect(() => {
    if (!storeId) return;
    fetchUsers(storeId);
    fetchShifts(storeId);
    fetchShiftStats(storeId);
  }, [storeId, fetchUsers, fetchShifts, fetchShiftStats]);

  const handleRefresh = () => {
    if (!storeId) return;
    fetchUsers(storeId);
    fetchShifts(storeId);
    fetchShiftStats(storeId);
  };

  // ========================================================================
  // COMPUTED — Employee payroll data
  // ========================================================================

  const employees = useMemo(() => {
    return users
      .filter((u) => u.employee_id != null && u.is_active)
      .map((u) => {
        // Count shifts and compute hours worked for this employee
        const userShifts = shifts.filter((s) => s.opened_by === u.user_id);
        const closedShifts = userShifts.filter((s) => s.status === "CLOSED" && s.closed_at);
        const totalHours = closedShifts.reduce((sum, s) => {
          if (!s.closed_at) return sum;
          const duration = new Date(s.closed_at).getTime() - new Date(s.opened_at).getTime();
          return sum + duration / (1000 * 60 * 60); // hours
        }, 0);

        const totalSales = closedShifts.reduce((sum, s) => sum + s.total_sales_amount, 0);

        return {
          ...u,
          shiftsWorked: closedShifts.length,
          hoursWorked: Math.round(totalHours * 100) / 100,
          totalSales,
        };
      });
  }, [users, shifts]);

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        (e.full_name ?? "").toLowerCase().includes(q) ||
        (e.employee_code ?? "").toLowerCase().includes(q) ||
        (e.phone ?? "").includes(q) ||
        (e.designation ?? "").toLowerCase().includes(q)
    );
  }, [employees, search]);

  // ── Summary stats ──────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const activeCount = employees.length;
    const totalMonthlySalary = employees.reduce((sum, e) => sum + (e.salary ?? 0), 0);
    const totalHours = employees.reduce((sum, e) => sum + e.hoursWorked, 0);
    const avgHours = activeCount > 0 ? totalHours / activeCount : 0;

    return {
      activeCount,
      totalMonthlySalary,
      totalHours,
      avgHours,
    };
  }, [employees]);

  // ── KPI Cards ──────────────────────────────────────────────────────────
  const kpiStats = useMemo<DashboardStatConfig[]>(
    () => [
      {
        label: "Active Employees",
        value: summary.activeCount.toLocaleString("en-IN"),
        icon: Users,
        color: "bg-blue-500",
        tooltip: "Number of active employees with employee records",
      },
      {
        label: "Monthly Salary Outflow",
        value: formatCurrency(summary.totalMonthlySalary),
        icon: DollarSign,
        color: "bg-emerald-500",
        isCurrency: true,
        tooltip: "Sum of monthly salaries for all active employees",
      },
      {
        label: "Total Hours Logged",
        value: `${summary.totalHours.toFixed(1)}h`,
        icon: Clock,
        color: "bg-indigo-500",
        tooltip: "Total work hours tracked from closed shifts",
      },
      {
        label: "Avg Hours / Employee",
        value: `${summary.avgHours.toFixed(1)}h`,
        icon: Briefcase,
        color: "bg-amber-500",
        tooltip: "Average hours worked per employee from shift data",
      },
    ],
    [summary]
  );

  // ── Shift performance summary ──────────────────────────────────────────
  const shiftSummaryItems = useMemo(
    () => [
      {
        label: "Shifts Today",
        value: (
          (shiftStats?.open_shifts_count ?? 0) + (shiftStats?.closed_shifts_today ?? 0)
        ).toLocaleString("en-IN"),
        tooltip: "Open + closed shifts today",
      },
      {
        label: "Avg Shift Duration",
        value: `${(shiftStats?.average_shift_duration_minutes ?? 0).toFixed(0)} min`,
        tooltip: "Average duration of closed shifts",
      },
      {
        label: "Avg Sales/Shift",
        value: formatCurrency(shiftStats?.average_sales_per_shift ?? 0),
        tooltip: "Average revenue per completed shift",
      },
    ],
    [shiftStats]
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
            <InfoTooltip content="Payroll overview showing employee salary details and work hours computed from shift data. Actual payroll processing (payslip generation, statutory deductions) requires an external payroll system — this page provides the underlying data for accountant reference." />
          </div>
          <p className="text-sm text-muted-foreground">
            Employee salaries, shift hours, and compensation overview.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* KPIs */}
      <StatCardGrid stats={kpiStats} isLoading={isLoading} columns={4} />

      {/* Summary */}
      <div className="grid gap-5 lg:grid-cols-2">
        <MiniStatList
          title="Compensation Summary"
          icon={DollarSign}
          items={[
            {
              label: "Total Monthly Salary",
              value: formatCurrency(summary.totalMonthlySalary),
              tooltip: "Sum of all employee salaries per month",
            },
            {
              label: "Total Active Staff",
              value: summary.activeCount.toLocaleString("en-IN"),
              tooltip: "Active employees with employee records",
            },
            {
              label: "Avg Salary",
              value: formatCurrency(
                summary.activeCount > 0
                  ? summary.totalMonthlySalary / summary.activeCount
                  : 0
              ),
              tooltip: "Average monthly salary per employee",
            },
          ]}
          isLoading={isLoading}
        />
        <MiniStatList
          title="Shift Performance"
          icon={Clock}
          items={shiftSummaryItems}
          isLoading={isLoading}
        />
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filteredEmployees.length} employee(s)
        </span>
      </div>

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4" />
            Employee Payroll Details
            <InfoTooltip content="Shows each employee's designation, salary, pay frequency, and hours tracked from cash register shifts. Hours are computed from shift open/close timestamps." />
          </CardTitle>
          <CardDescription>
            Sorted by salary (highest first).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">
              No employees found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pay Frequency</TableHead>
                    <TableHead className="text-right">Salary</TableHead>
                    <TableHead className="text-right">Shifts</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Sales Generated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees
                    .sort((a, b) => (b.salary ?? 0) - (a.salary ?? 0))
                    .map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div className="font-medium">{emp.full_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {emp.employee_code ?? emp.designation ?? ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {emp.role_display_name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={emp.employment_status === "active" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {emp.employment_status ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs capitalize">
                          {emp.pay_frequency?.toLowerCase().replace("_", " ") ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {emp.salary != null ? formatCurrency(emp.salary) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {emp.shiftsWorked}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {emp.hoursWorked.toFixed(1)}h
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(emp.totalSales)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
