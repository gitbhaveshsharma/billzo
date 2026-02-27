"use client";

import { useEffect, useCallback, useRef } from "react";
import { useSalesStore } from "@/stores/sales.store";
import { usePurchaseStore } from "@/stores/purchase.store";
import { useInventoryStore } from "@/stores/inventory.store";
import { useProductStore } from "@/stores/product.store";
import { useShiftsStore } from "@/stores/shifts.store";
import { useCustomerStore } from "@/stores/customers.store";
import { useSupplierStore } from "@/stores/supplier.store";
import { useStoreUsersStore } from "@/stores/store-users.store";
import { useAuth } from "@/hooks/use-auth";

// ============================================================================
// useDashboardData – aggregates all store data needed for the dashboard
// Shared by store_admin and manager dashboards
// ============================================================================

export function useDashboardData() {
  const { appUser } = useAuth();
  const storeId = appUser?.storeId ?? null;
  const hasFetched = useRef(false);

  // ── Sales ──────────────────────────────────────────────────────────────
  const salesStats = useSalesStore((s) => s.dashboardStats);
  const salesLoading = useSalesStore((s) => s.isLoading);
  const fetchSalesStats = useSalesStore((s) => s.fetchDashboardStats);
  const holdBills = useSalesStore((s) => s.holdBills);
  const fetchHoldBills = useSalesStore((s) => s.fetchHoldBills);

  // ── Purchase ───────────────────────────────────────────────────────────
  const purchaseStats = usePurchaseStore((s) => s.dashboardStats);
  const purchaseLoading = usePurchaseStore((s) => s.isLoading);
  const fetchPurchaseStats = usePurchaseStore((s) => s.fetchDashboardStats);
  const recentOrders = usePurchaseStore((s) => s.recentOrders);
  const overdueOrders = usePurchaseStore((s) => s.overdueOrders);
  const fetchRecentOrders = usePurchaseStore((s) => s.fetchRecentOrders);
  const fetchOverdueOrders = usePurchaseStore((s) => s.fetchOverdueOrders);

  // ── Inventory ──────────────────────────────────────────────────────────
  const inventoryDashStats = useInventoryStore((s) => s.dashboardStats);
  const inventoryLoading = useInventoryStore((s) => s.isLoading);
  const fetchInventoryStats = useInventoryStore((s) => s.fetchDashboardStats);
  const lowStockItems = useInventoryStore((s) => s.lowStockItems);
  const expiringBatches = useInventoryStore((s) => s.expiringBatches);
  const unresolvedAlertCount = useInventoryStore((s) => s.unresolvedAlertCount);
  const fetchLowStock = useInventoryStore((s) => s.fetchLowStock);
  const fetchExpiringBatches = useInventoryStore((s) => s.fetchExpiringBatches);
  const fetchUnresolvedAlertCount = useInventoryStore(
    (s) => s.fetchUnresolvedAlertCount
  );
  const valuationSummary = useInventoryStore((s) => s.valuationSummary);
  const fetchValuationSummary = useInventoryStore(
    (s) => s.fetchValuationSummary
  );

  // ── Product ────────────────────────────────────────────────────────────
  const productStats = useProductStore((s) => s.dashboardStats);
  const productLoading = useProductStore((s) => s.isLoading);
  const fetchProductStats = useProductStore((s) => s.fetchDashboardStats);
  const stockAlerts = useProductStore((s) => s.stockAlerts);
  const fetchStockAlerts = useProductStore((s) => s.fetchStockAlerts);

  // ── Shifts ─────────────────────────────────────────────────────────────
  const shiftStats = useShiftsStore((s) => s.dashboardStats);
  const shiftLoading = useShiftsStore((s) => s.isLoading);
  const fetchShiftStats = useShiftsStore((s) => s.fetchDashboardStats);
  const openShifts = useShiftsStore((s) => s.openShifts);
  const fetchOpenShifts = useShiftsStore((s) => s.fetchOpenShifts);

  // ── Customers ──────────────────────────────────────────────────────────
  const customerStats = useCustomerStore((s) => s.dashboardStats);
  const customerLoading = useCustomerStore((s) => s.isLoading);
  const fetchCustomerStats = useCustomerStore((s) => s.fetchDashboardStats);

  // ── Suppliers ──────────────────────────────────────────────────────────
  const supplierStats = useSupplierStore((s) => s.stats);
  const supplierLoading = useSupplierStore((s) => s.isLoading);
  const fetchSupplierStats = useSupplierStore((s) => s.fetchStats);

  // ── Staff ──────────────────────────────────────────────────────────────
  const staffStats = useStoreUsersStore((s) => s.stats);
  const staffLoading = useStoreUsersStore((s) => s.isLoading);
  const fetchStaffStats = useStoreUsersStore((s) => s.fetchStats);

  // ── Initial fetch ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!storeId) return;

    await Promise.allSettled([
      fetchSalesStats(storeId),
      fetchPurchaseStats(storeId),
      fetchInventoryStats(storeId),
      fetchProductStats(storeId),
      fetchShiftStats(storeId),
      fetchCustomerStats(storeId),
      fetchSupplierStats(storeId),
      fetchStaffStats(storeId),
      fetchLowStock(storeId),
      fetchExpiringBatches(storeId),
      fetchUnresolvedAlertCount(storeId),
      fetchValuationSummary(storeId),
      fetchOpenShifts(storeId),
      fetchHoldBills(storeId),
      fetchRecentOrders(storeId),
      fetchOverdueOrders(storeId),
      fetchStockAlerts(storeId),
    ]);
  }, [
    storeId,
    fetchSalesStats,
    fetchPurchaseStats,
    fetchInventoryStats,
    fetchProductStats,
    fetchShiftStats,
    fetchCustomerStats,
    fetchSupplierStats,
    fetchStaffStats,
    fetchLowStock,
    fetchExpiringBatches,
    fetchUnresolvedAlertCount,
    fetchValuationSummary,
    fetchOpenShifts,
    fetchHoldBills,
    fetchRecentOrders,
    fetchOverdueOrders,
    fetchStockAlerts,
  ]);

  useEffect(() => {
    if (storeId && !hasFetched.current) {
      hasFetched.current = true;
      fetchAll();
    }
  }, [storeId, fetchAll]);

  // ── Derived loading state ──────────────────────────────────────────────
  const isLoading =
    salesLoading ||
    purchaseLoading ||
    inventoryLoading ||
    productLoading ||
    shiftLoading ||
    customerLoading ||
    supplierLoading ||
    staffLoading;

  return {
    storeId,
    isLoading,
    // Stats
    salesStats,
    purchaseStats: purchaseStats,
    inventoryStats: inventoryDashStats,
    productStats,
    shiftStats,
    customerStats,
    supplierStats,
    staffStats,
    // Lists
    holdBills,
    lowStockItems,
    expiringBatches,
    unresolvedAlertCount,
    valuationSummary,
    openShifts,
    recentOrders,
    overdueOrders,
    stockAlerts,
    // Actions
    refresh: fetchAll,
  } as const;
}
