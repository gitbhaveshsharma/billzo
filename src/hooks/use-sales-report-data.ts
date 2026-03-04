"use client";

import { useState, useCallback, useEffect } from "react";
import { salesService } from "@/services/sales.service";
import { useAuth } from "@/hooks/use-auth";
import type { SalesDashboardStats, ProductSalesReport, SaleSummaryView } from "@/types/sales.types";
import { getEmptySalesDashboardStats } from "@/utils/sales.utils";

// ============================================================================
// useSalesReportData – date-range-aware report data for store-admin reports
// POS stays today-only; this hook drives admin analytics with any date range.
// ============================================================================

export interface SalesReportData {
  stats: SalesDashboardStats;
  productReport: ProductSalesReport[];
  summaries: SaleSummaryView[];
  isLoading: boolean;
  error: string | null;
  /** Reload with the current date range */
  refresh: () => Promise<void>;
}

export function useSalesReportData(dateFrom: string | null, dateTo: string | null): SalesReportData {
  const { appUser } = useAuth();
  const storeId = appUser?.storeId ?? null;

  const [stats, setStats] = useState<SalesDashboardStats>(getEmptySalesDashboardStats());
  const [productReport, setProductReport] = useState<ProductSalesReport[]>([]);
  const [summaries, setSummaries] = useState<SaleSummaryView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!storeId || !dateFrom || !dateTo) return;

    setIsLoading(true);
    setError(null);

    try {
      // Parallel fetch: summaries, payment breakdown, returns, product report
      const [summaryRes, paymentRes, returnsRes, productRes] = await Promise.all([
        salesService.getSalesByDateRange(storeId, dateFrom, dateTo),
        salesService.getPaymentBreakdownByDateRange(storeId, dateFrom, dateTo),
        salesService.getReturnsByDateRange(storeId, dateFrom, dateTo),
        salesService.getProductSalesReport(storeId, dateFrom, dateTo),
      ]);

      const salesData = summaryRes.data ?? [];
      const payBreakdown = paymentRes.data ?? { cash: 0, card: 0, upi: 0, other: 0 };
      const returnsTotals = returnsRes.data ?? { total_returns_amount: 0, returns_count: 0 };

      // Compute stats from summaries (same logic as sales.store fetchDashboardStats)
      const completedSales = salesData.filter(
        (s) =>
          s.status === "COMPLETED" ||
          s.status === "CREDIT" ||
          s.status === "PARTIAL_PAID"
      );

      const totalSalesAmount = completedSales.reduce((sum, s) => sum + s.total_amount, 0);
      const creditSales = salesData.filter((s) => s.is_credit_sale);

      // Build top products from product report
      const topProducts = (productRes.data ?? [])
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 10)
        .map((p) => ({
          product_name: p.product_name,
          product_code: p.product_code,
          quantity_sold: p.net_quantity_sold,
          revenue: p.total_revenue,
        }));

      const computed: SalesDashboardStats = {
        today_sales_count: completedSales.length,
        today_sales_amount: totalSalesAmount,
        today_returns_count: returnsTotals.returns_count,
        today_returns_amount: returnsTotals.total_returns_amount,
        today_discount_total: completedSales.reduce((sum, s) => sum + s.discount_total, 0),
        today_tax_total: completedSales.reduce((sum, s) => sum + s.tax_amount, 0),
        today_cash: payBreakdown.cash,
        today_card: payBreakdown.card,
        today_upi: payBreakdown.upi,
        today_other: payBreakdown.other,
        today_credit_sales: creditSales.length,
        today_credit_amount: creditSales.reduce((sum, s) => sum + s.total_amount, 0),
        total_outstanding: salesData.reduce((sum, s) => sum + s.due_amount, 0),
        average_bill_value:
          completedSales.length > 0
            ? totalSalesAmount / completedSales.length
            : 0,
        average_items_per_bill:
          completedSales.length > 0
            ? completedSales.reduce((sum, s) => sum + (s.total_quantity ?? 0), 0) / completedSales.length
            : 0,
        hold_bills_count: salesData.filter((s) => s.status === "HOLD").length,
        top_products: topProducts,
      };

      setStats(computed);
      setProductReport(productRes.data ?? []);
      setSummaries(salesData);
    } catch {
      setError("Failed to fetch report data");
    } finally {
      setIsLoading(false);
    }
  }, [storeId, dateFrom, dateTo]);

  // Auto-fetch on mount and when date range changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    stats,
    productReport,
    summaries,
    isLoading,
    error,
    refresh: fetchData,
  };
}
