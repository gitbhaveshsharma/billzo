"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import {
  AlertTriangle,
  Trash2,
  Timer,
  Wrench,
  TrendingDown,
} from "lucide-react";
import { useInventory } from "@/app/inventory/_context/inventory-context";
import { useInventoryStore } from "@/stores/inventory.store";
import { TransactionsPanel } from "@/app/store-admin/_components/stock";
import { StatCardGrid } from "@/components/dashboard";
import type { DashboardStatConfig } from "@/components/dashboard";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatCurrency } from "@/utils/sales.utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  TransactionFilters,
  TransactionPagination,
  TransactionType,
} from "@/types/inventory.types";

// ============================================================================
// SHRINKAGE TYPES
// ============================================================================

const SHRINKAGE_TYPES: TransactionType[] = ["DAMAGE", "EXPIRY", "ADJUSTMENT"];

// ============================================================================
// INVENTORY MANAGER — SHRINKAGE ANALYSIS PAGE
// ============================================================================

export default function ShrinkageReportPage() {
  const { storeId } = useInventory();

  const {
    transactions,
    totalTransactions,
    transactionFilters,
    transactionPagination,
    isLoading,
    setTransactionFilters,
    setTransactionPagination,
    fetchTransactions,
  } = useInventoryStore();

  const [activeTab, setActiveTab] = useState<"all" | "damage" | "expiry" | "adjustment">("all");

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  useEffect(() => {
    if (!storeId) return;

    // Set initial filter to shrinkage types
    const typeFilter: TransactionType | undefined =
      activeTab === "all" ? undefined :
      activeTab === "damage" ? "DAMAGE" :
      activeTab === "expiry" ? "EXPIRY" : "ADJUSTMENT";

    setTransactionFilters({ transaction_type: typeFilter });
    setTransactionPagination({ page: 1 });
    fetchTransactions(storeId, true);
  }, [storeId, activeTab, setTransactionFilters, setTransactionPagination, fetchTransactions]);

  // ── Filtered data (shrinkage only) ────────────────────────────────────
  const shrinkageTransactions = useMemo(() => {
    if (activeTab !== "all") return transactions;
    return transactions.filter((tx) =>
      SHRINKAGE_TYPES.includes(tx.transaction_type as TransactionType)
    );
  }, [transactions, activeTab]);

  // ── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo<DashboardStatConfig[]>(() => {
    const all = transactions.filter((tx) =>
      SHRINKAGE_TYPES.includes(tx.transaction_type as TransactionType)
    );

    const damageCount = all.filter((t) => t.transaction_type === "DAMAGE").length;
    const expiryCount = all.filter((t) => t.transaction_type === "EXPIRY").length;
    const adjustmentCount = all.filter((t) => t.transaction_type === "ADJUSTMENT").length;

    const totalLoss = all.reduce((sum, t) => sum + (t.total_cost ?? 0), 0);

    return [
      {
        label: "Total Shrinkage Loss",
        value: formatCurrency(totalLoss),
        icon: TrendingDown,
        color: "bg-red-500",
        isCurrency: true,
        tooltip: "Total monetary loss from damage, expiry and adjustments",
      },
      {
        label: "Damage Entries",
        value: damageCount.toLocaleString("en-IN"),
        icon: Trash2,
        color: "bg-orange-500",
        tooltip: "Entries where stock was reduced due to physical damage",
      },
      {
        label: "Expiry Entries",
        value: expiryCount.toLocaleString("en-IN"),
        icon: Timer,
        color: "bg-yellow-500",
        tooltip: "Entries where stock was written off due to expiration",
      },
      {
        label: "Adjustments",
        value: adjustmentCount.toLocaleString("en-IN"),
        icon: Wrench,
        color: "bg-blue-500",
        tooltip: "Manual stock corrections (overcount, miscount, etc.)",
      },
    ];
  }, [transactions]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleFiltersChange = useCallback(
    (partial: Partial<TransactionFilters>) => {
      setTransactionFilters(partial);
      setTransactionPagination({ page: 1 });
      if (storeId) fetchTransactions(storeId, true);
    },
    [storeId, setTransactionFilters, setTransactionPagination, fetchTransactions]
  );

  const handlePaginationChange = useCallback(
    (partial: Partial<TransactionPagination>) => {
      setTransactionPagination(partial);
      if (storeId) fetchTransactions(storeId, true);
    },
    [storeId, setTransactionPagination, fetchTransactions]
  );

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Shrinkage Analysis</h1>
          <InfoTooltip content="Inventory shrinkage tracks stock losses from damage, product expiry, and manual adjustments. Monitoring shrinkage helps identify waste patterns and areas for improvement." />
        </div>
        <p className="text-sm text-muted-foreground">
          Track and analyse stock losses from damage, expiry and adjustments.
        </p>
      </div>

      {/* Stats */}
      <StatCardGrid stats={stats} isLoading={isLoading} columns={4} />

      {/* Tabs for type filtering */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> All Shrinkage
          </TabsTrigger>
          <TabsTrigger value="damage" className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Damage
          </TabsTrigger>
          <TabsTrigger value="expiry" className="gap-1.5">
            <Timer className="h-3.5 w-3.5" /> Expiry
          </TabsTrigger>
          <TabsTrigger value="adjustment" className="gap-1.5">
            <Wrench className="h-3.5 w-3.5" /> Adjustments
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <TransactionsPanel
            transactions={shrinkageTransactions}
            total={activeTab === "all" ? shrinkageTransactions.length : totalTransactions}
            filters={transactionFilters}
            pagination={transactionPagination}
            isLoading={isLoading}
            onFiltersChange={handleFiltersChange}
            onPaginationChange={handlePaginationChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
