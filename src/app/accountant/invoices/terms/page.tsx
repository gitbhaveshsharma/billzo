"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  CreditCard,
  AlertTriangle,
  Shield,
  Users,
  Search,
} from "lucide-react";
import { useAccountant } from "@/app/accountant/_context/accountant-context";
import { useCustomerStore } from "@/stores/customers.store";
import { StatCardGrid, MiniStatList } from "@/components/dashboard";
import type { DashboardStatConfig } from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import type { Customer } from "@/types/customers.types";

// ============================================================================
// ACCOUNTANT — PAYMENT TERMS PAGE
// ============================================================================

export default function PaymentTermsPage() {
  const { storeId } = useAccountant();

  const {
    customers,
    dashboardStats,
    isLoading,
    fetchCustomers,
    fetchDashboardStats,
  } = useCustomerStore();

  const [search, setSearch] = useState("");

  // ========================================================================
  // FETCH
  // ========================================================================

  useEffect(() => {
    if (!storeId) return;
    fetchCustomers(storeId);
    fetchDashboardStats(storeId);
  }, [storeId, fetchCustomers, fetchDashboardStats]);

  // ========================================================================
  // FILTERED — customers with credit enabled
  // ========================================================================

  const creditCustomers = useMemo(() => {
    let list = customers.filter((c) => c.is_credit_allowed);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.customer_code.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.credit_limit - a.credit_limit);
  }, [customers, search]);

  // ── Computed stats ─────────────────────────────────────────────────────
  const terms = useMemo(() => {
    const creditEnabled = customers.filter((c) => c.is_credit_allowed);
    const totalCreditLimit = creditEnabled.reduce((sum, c) => sum + c.credit_limit, 0);
    const totalUtilised = creditEnabled.reduce((sum, c) => sum + c.outstanding_balance, 0);
    const utilisation = totalCreditLimit > 0 ? (totalUtilised / totalCreditLimit) * 100 : 0;
    const avgCreditDays =
      creditEnabled.length > 0
        ? creditEnabled.reduce((sum, c) => sum + c.credit_days, 0) / creditEnabled.length
        : 0;
    const overLimitCount = creditEnabled.filter(
      (c) => c.outstanding_balance > c.credit_limit && c.credit_limit > 0
    ).length;

    return {
      creditEnabled: creditEnabled.length,
      totalCreditLimit,
      totalUtilised,
      utilisation,
      avgCreditDays,
      overLimitCount,
    };
  }, [customers]);

  // ── KPI Cards ──────────────────────────────────────────────────────────
  const kpiStats = useMemo<DashboardStatConfig[]>(
    () => [
      {
        label: "Credit Customers",
        value: terms.creditEnabled.toLocaleString("en-IN"),
        icon: Users,
        color: "bg-blue-500",
        tooltip: "Number of customers with credit allowed",
      },
      {
        label: "Total Credit Limit",
        value: formatCurrency(terms.totalCreditLimit),
        icon: CreditCard,
        color: "bg-emerald-500",
        isCurrency: true,
        tooltip: "Sum of credit limits across all credit-enabled customers",
      },
      {
        label: "Credit Utilisation",
        value: `${terms.utilisation.toFixed(1)}%`,
        icon: Clock,
        color: terms.utilisation > 80 ? "bg-red-500" : terms.utilisation > 50 ? "bg-amber-500" : "bg-emerald-500",
        tooltip: "Outstanding ÷ Total Credit Limit — higher values mean more credit risk",
      },
      {
        label: "Over Limit",
        value: terms.overLimitCount.toLocaleString("en-IN"),
        icon: AlertTriangle,
        color: terms.overLimitCount > 0 ? "bg-red-500" : "bg-emerald-500",
        tooltip: "Customers whose outstanding exceeds their credit limit",
      },
    ],
    [terms]
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Payment Terms</h1>
          <InfoTooltip content="Review credit terms assigned to customers — credit limits, credit days, and current utilisation. This view helps identify customers who exceed their limits or terms. Payment terms are configured by the store admin." />
        </div>
        <p className="text-sm text-muted-foreground">
          Credit limits, credit days, and risk assessment.
        </p>
      </div>

      {/* KPIs */}
      <StatCardGrid stats={kpiStats} isLoading={isLoading} columns={4} />

      {/* Summary */}
      <div className="grid gap-5 lg:grid-cols-2">
        <MiniStatList
          title="Credit Overview"
          icon={CreditCard}
          items={[
            {
              label: "Total Credit Limit",
              value: formatCurrency(terms.totalCreditLimit),
              tooltip: "Aggregate credit limit across all customers",
            },
            {
              label: "Total Outstanding",
              value: formatCurrency(terms.totalUtilised),
              color: terms.totalUtilised > 0 ? "text-red-600 dark:text-red-400" : undefined,
              tooltip: "Sum of all outstanding balances",
            },
            {
              label: "Available Credit",
              value: formatCurrency(terms.totalCreditLimit - terms.totalUtilised),
              color: "text-emerald-600 dark:text-emerald-400",
              tooltip: "Remaining credit available across all customers",
            },
            {
              label: "Average Credit Days",
              value: `${terms.avgCreditDays.toFixed(0)} days`,
              tooltip: "Average number of credit days allowed",
            },
          ]}
          isLoading={isLoading}
        />
        <MiniStatList
          title="Risk Indicators"
          icon={Shield}
          items={[
            {
              label: "Over Limit",
              value: terms.overLimitCount.toLocaleString("en-IN"),
              color: terms.overLimitCount > 0 ? "text-red-600 dark:text-red-400" : undefined,
              tooltip: "Customers whose outstanding exceeds their limit",
            },
            {
              label: "Credit Utilisation",
              value: `${terms.utilisation.toFixed(1)}%`,
              color:
                terms.utilisation > 80
                  ? "text-red-600 dark:text-red-400"
                  : terms.utilisation > 50
                  ? "text-amber-600 dark:text-amber-400"
                  : undefined,
              tooltip: "Percentage of total credit limit currently utilised",
            },
            {
              label: "Blacklisted",
              value: (dashboardStats?.blacklisted_customers ?? 0).toLocaleString("en-IN"),
              color: (dashboardStats?.blacklisted_customers ?? 0) > 0 ? "text-red-600 dark:text-red-400" : undefined,
              tooltip: "Customers currently blacklisted from credit",
            },
          ]}
          isLoading={isLoading}
        />
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search credit customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {creditCustomers.length} credit customer(s)
        </span>
      </div>

      {/* Credit Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="h-4 w-4" />
            Credit Terms by Customer
            <InfoTooltip content="Lists all customers with credit enabled, showing their credit limit, outstanding balance, credit days, and utilisation percentage." />
          </CardTitle>
          <CardDescription>
            Sorted by credit limit (highest first).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : creditCustomers.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">
              No credit customers found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Credit Limit</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead className="text-right">Utilisation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditCustomers.map((c) => {
                    const available = c.credit_limit - c.outstanding_balance;
                    const utilPct =
                      c.credit_limit > 0
                        ? (c.outstanding_balance / c.credit_limit) * 100
                        : 0;
                    const isOverLimit =
                      c.outstanding_balance > c.credit_limit && c.credit_limit > 0;

                    return (
                      <TableRow key={c.id} className={isOverLimit ? "bg-red-50 dark:bg-red-500/5" : ""}>
                        <TableCell>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.phone}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {c.customer_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(c.credit_limit)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span
                            className={
                              isOverLimit
                                ? "text-red-600 font-semibold"
                                : c.outstanding_balance > 0
                                ? "text-amber-600"
                                : ""
                            }
                          >
                            {formatCurrency(c.outstanding_balance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={available < 0 ? "text-red-600" : "text-emerald-600"}>
                            {formatCurrency(available)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {c.credit_days}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          <span
                            className={
                              utilPct > 100
                                ? "text-red-600 font-semibold"
                                : utilPct > 80
                                ? "text-amber-600"
                                : ""
                            }
                          >
                            {utilPct.toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {isOverLimit ? (
                            <Badge variant="destructive" className="text-xs">
                              Over Limit
                            </Badge>
                          ) : c.is_blacklisted ? (
                            <Badge variant="destructive" className="text-xs">
                              Blacklisted
                            </Badge>
                          ) : !c.is_active ? (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-emerald-600">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
