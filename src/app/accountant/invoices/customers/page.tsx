"use client";

import { useEffect, useCallback, useState, useMemo } from "react";
import {
  Users,
  CreditCard,
  AlertTriangle,
  DollarSign,
  Eye,
  Phone,
} from "lucide-react";
import { useAccountant } from "@/app/accountant/_context/accountant-context";
import { useCustomerStore } from "@/stores/customers.store";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatCurrency, formatDate } from "@/utils/sales.utils";
import type { Customer, CustomerLedgerEntry } from "@/types/customers.types";

// ============================================================================
// ACCOUNTANT — CUSTOMER ACCOUNTS PAGE
// ============================================================================

export default function CustomerAccountsPage() {
  const { storeId } = useAccountant();

  const {
    customers,
    dashboardStats,
    ledgerEntries,
    isLoading,
    fetchCustomers,
    fetchDashboardStats,
    fetchCustomersWithOutstanding,
    fetchLedger,
  } = useCustomerStore();

  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showLedger, setShowLedger] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // ========================================================================
  // FETCH
  // ========================================================================

  useEffect(() => {
    if (!storeId) return;
    fetchCustomers(storeId);
    fetchDashboardStats(storeId);
    fetchCustomersWithOutstanding(storeId);
  }, [storeId, fetchCustomers, fetchDashboardStats, fetchCustomersWithOutstanding]);

  // ========================================================================
  // FILTER — customers with outstanding balance
  // ========================================================================

  const filteredCustomers = useMemo(() => {
    let list = customers.filter((c) => c.outstanding_balance > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.customer_code.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.outstanding_balance - a.outstanding_balance);
  }, [customers, search]);

  // ── All customers (for full view) ──────────────────────────────────────
  const allCustomersFiltered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.customer_code.toLowerCase().includes(q)
    );
  }, [customers, search]);

  // ========================================================================
  // VIEW LEDGER
  // ========================================================================

  const handleViewLedger = useCallback(
    async (customer: Customer) => {
      if (!storeId) return;
      setSelectedCustomer(customer);
      setShowLedger(true);
      setLedgerLoading(true);
      await fetchLedger(storeId, customer.id);
      setLedgerLoading(false);
    },
    [storeId, fetchLedger]
  );

  // ── KPI Stats ──────────────────────────────────────────────────────────
  const kpiStats = useMemo<DashboardStatConfig[]>(() => {
    const s = dashboardStats;
    return [
      {
        label: "Total Customers",
        value: (s?.total_customers ?? 0).toLocaleString("en-IN"),
        icon: Users,
        color: "bg-blue-500",
        tooltip: "Total number of registered customers",
      },
      {
        label: "With Credit",
        value: (s?.customers_with_credit ?? 0).toLocaleString("en-IN"),
        icon: CreditCard,
        color: "bg-amber-500",
        tooltip: "Customers who currently have an outstanding balance",
      },
      {
        label: "Total Outstanding",
        value: formatCurrency(s?.total_outstanding ?? 0),
        icon: DollarSign,
        color: (s?.total_outstanding ?? 0) > 0 ? "bg-red-500" : "bg-emerald-500",
        isCurrency: true,
        tooltip: "Sum of all unpaid amounts across all customers",
      },
      {
        label: "Overdue Accounts",
        value: filteredCustomers
          .filter((c) => c.credit_days > 0 && isOverdue(c))
          .length.toLocaleString("en-IN"),
        icon: AlertTriangle,
        color: "bg-red-500",
        tooltip: "Customers whose outstanding has exceeded their credit terms",
      },
    ];
  }, [dashboardStats, filteredCustomers]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Customer Accounts
          </h1>
          <InfoTooltip content="View customer outstanding balances, ledger history, and credit details. This is a read-only view for the accountant role — payment recording is done by the cashier or manager." />
        </div>
        <p className="text-sm text-muted-foreground">
          Outstanding balances, credit limits, and ledger history.
        </p>
      </div>

      {/* KPIs */}
      <StatCardGrid stats={kpiStats} isLoading={isLoading} columns={4} />

      {/* Search */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by name, phone, or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">
          {filteredCustomers.length} customer(s) with outstanding
        </span>
      </div>

      {/* Outstanding Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="h-4 w-4" />
            Customers with Outstanding Balances
            <InfoTooltip content="Sorted by outstanding amount (highest first). Click 'View Ledger' to see payment and transaction history for a customer." />
          </CardTitle>
          <CardDescription>
            {filteredCustomers.length} account(s) with pending receivables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">
              No customers with outstanding balances.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Credit Limit</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Credit Days</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <div>
                          {c.name}
                          <div className="text-xs text-muted-foreground">
                            {c.customer_code}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{c.phone}</TableCell>
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
                            c.outstanding_balance > c.credit_limit
                              ? "text-red-600 font-semibold"
                              : c.outstanding_balance > 0
                              ? "text-amber-600"
                              : ""
                          }
                        >
                          {formatCurrency(c.outstanding_balance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {c.credit_days > 0 ? (
                          <span>
                            {c.credit_days}d
                            {isOverdue(c) && (
                              <Badge variant="destructive" className="ml-1 text-xs">
                                Overdue
                              </Badge>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewLedger(c)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ledger
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ledger Sheet */}
      <Sheet open={showLedger} onOpenChange={setShowLedger}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Ledger — {selectedCustomer?.name}
            </SheetTitle>
            <SheetDescription>
              {selectedCustomer?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {selectedCustomer.phone}
                </span>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Customer summary */}
            {selectedCustomer && (
              <MiniStatList
                title="Account Summary"
                icon={CreditCard}
                items={[
                  {
                    label: "Outstanding",
                    value: formatCurrency(selectedCustomer.outstanding_balance),
                    color:
                      selectedCustomer.outstanding_balance > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-600 dark:text-emerald-400",
                  },
                  {
                    label: "Credit Limit",
                    value: formatCurrency(selectedCustomer.credit_limit),
                  },
                  {
                    label: "Total Purchases",
                    value: formatCurrency(selectedCustomer.total_purchases),
                  },
                  {
                    label: "Last Purchase",
                    value: selectedCustomer.last_purchase_date
                      ? formatDate(selectedCustomer.last_purchase_date)
                      : "—",
                  },
                ]}
                isLoading={ledgerLoading}
              />
            )}

            {/* Ledger entries */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Transaction Ledger</CardTitle>
              </CardHeader>
              <CardContent>
                {ledgerLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : ledgerEntries.length === 0 ? (
                  <p className="text-center py-6 text-sm text-muted-foreground">
                    No ledger entries found.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledgerEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-xs">
                              {formatDate(entry.entry_date)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {entry.transaction_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-red-600">
                              {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-emerald-600">
                              {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {formatCurrency(entry.balance)}
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
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============================================================================
// HELPER
// ============================================================================

function isOverdue(customer: Customer): boolean {
  if (customer.credit_days <= 0 || !customer.last_purchase_date) return false;
  const lastPurchase = new Date(customer.last_purchase_date);
  const dueDate = new Date(lastPurchase);
  dueDate.setDate(dueDate.getDate() + customer.credit_days);
  return dueDate < new Date() && customer.outstanding_balance > 0;
}
