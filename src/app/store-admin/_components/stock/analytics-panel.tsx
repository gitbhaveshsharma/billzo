"use client";

import {
    BarChart3,
    TrendingUp,
    Package,
    DollarSign,
    ArrowDownUp,
    AlertTriangle,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatQuantity } from "@/utils/inventory.utils";
import type {
    InventoryDashboardStats,
    InventoryValuationSummary,
    StockMovementSummary,
} from "@/types/inventory.types";

// ============================================================================
// TYPES
// ============================================================================

interface AnalyticsPanelProps {
    dashboardStats: InventoryDashboardStats | null;
    valuationSummary: InventoryValuationSummary | null;
    movementSummary: StockMovementSummary[];
    isLoading: boolean;
}

// ============================================================================
// ANALYTICS PANEL
// ============================================================================

export function AnalyticsPanel({
    dashboardStats,
    valuationSummary,
    movementSummary,
    isLoading,
}: AnalyticsPanelProps) {
    if (isLoading) {
        return <AnalyticsSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Valuation Summary */}
            {valuationSummary && (
                <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        Stock Valuation
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <ValuationCard
                            title="Total Items"
                            value={formatQuantity(valuationSummary.total_items)}
                            icon={<Package className="h-4 w-4" />}
                        />
                        <ValuationCard
                            title="Total Quantity"
                            value={formatQuantity(valuationSummary.total_quantity)}
                            icon={<BarChart3 className="h-4 w-4" />}
                        />
                        <ValuationCard
                            title="Total Value"
                            value={formatCurrency(valuationSummary.total_value)}
                            icon={<DollarSign className="h-4 w-4" />}
                            highlight
                        />
                        <ValuationCard
                            title="Avg Cost/Unit"
                            value={formatCurrency(valuationSummary.average_cost_per_unit)}
                            icon={<TrendingUp className="h-4 w-4" />}
                        />
                    </div>

                    {valuationSummary.highest_value_product && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-md text-sm">
                            <span className="text-muted-foreground">Highest value product: </span>
                            <span className="font-medium">
                                {valuationSummary.highest_value_product.product_name}
                            </span>
                            <span className="text-muted-foreground"> — </span>
                            <span className="font-mono font-medium">
                                {formatCurrency(valuationSummary.highest_value_product.total_value)}
                            </span>
                        </div>
                    )}
                </div>
            )}

            <Separator />

            {/* Category Breakdown */}
            {dashboardStats?.stock_value_by_category &&
                dashboardStats.stock_value_by_category.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            Value by Category
                        </h3>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Items</TableHead>
                                        <TableHead className="text-right">Total Value</TableHead>
                                        <TableHead>Share</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dashboardStats.stock_value_by_category.map((cat) => {
                                        const share =
                                            dashboardStats.total_stock_value > 0
                                                ? (cat.total_value / dashboardStats.total_stock_value) *
                                                  100
                                                : 0;
                                        return (
                                            <TableRow key={cat.category_id ?? "uncategorized"}>
                                                <TableCell className="font-medium">
                                                    {cat.category_name}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {cat.item_count}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {formatCurrency(cat.total_value)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary rounded-full"
                                                                style={{ width: `${Math.min(share, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-mono text-muted-foreground">
                                                            {share.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

            <Separator />

            {/* Top Moving Products */}
            {dashboardStats?.top_moving_products &&
                dashboardStats.top_moving_products.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <ArrowDownUp className="h-5 w-5 text-primary" />
                            Top Moving Products
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {dashboardStats.top_moving_products.map((p, i) => (
                                <Card key={p.product_id} className="p-3">
                                    <div className="flex items-start gap-3">
                                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                                            #{i + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">
                                                {p.product_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatQuantity(p.total_quantity_moved)} units moved
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

            <Separator />

            {/* Stock Movement Summary Table */}
            {movementSummary.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Stock Movement Summary
                    </h3>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-background z-10">
                                        Product
                                    </TableHead>
                                    <TableHead className="text-right">Opening</TableHead>
                                    <TableHead className="text-right">Purchases</TableHead>
                                    <TableHead className="text-right">Sales</TableHead>
                                    <TableHead className="text-right">Returns</TableHead>
                                    <TableHead className="text-right">Adjustments</TableHead>
                                    <TableHead className="text-right">In</TableHead>
                                    <TableHead className="text-right">Out</TableHead>
                                    <TableHead className="text-right">Damages</TableHead>
                                    <TableHead className="text-right">Expired</TableHead>
                                    <TableHead className="text-right font-semibold">
                                        Closing
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movementSummary.map((row) => (
                                    <TableRow key={row.product_id}>
                                        <TableCell className="sticky left-0 bg-background z-10">
                                            <div className="min-w-0">
                                                <p className="font-medium truncate max-w-[150px]">
                                                    {row.product_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground font-mono">
                                                    {row.product_code}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatQuantity(row.opening_stock)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-green-600">
                                            {row.purchases > 0 ? `+${formatQuantity(row.purchases)}` : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-red-600">
                                            {row.sales > 0 ? `-${formatQuantity(row.sales)}` : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {row.returns > 0 ? formatQuantity(row.returns) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {row.adjustments !== 0 ? formatQuantity(row.adjustments) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-green-600">
                                            {row.transfers_in > 0 ? `+${formatQuantity(row.transfers_in)}` : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-red-600">
                                            {row.transfers_out > 0 ? `-${formatQuantity(row.transfers_out)}` : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-orange-600">
                                            {row.damages > 0 ? formatQuantity(row.damages) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-orange-600">
                                            {row.expired > 0 ? formatQuantity(row.expired) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-semibold">
                                            {formatQuantity(row.closing_stock)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Summary Alerts */}
            {dashboardStats && (
                <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-primary" />
                        Quick Stats
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-red-600 border-red-200">
                            Out of Stock: {dashboardStats.out_of_stock_count}
                        </Badge>
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                            Low Stock: {dashboardStats.low_stock_count}
                        </Badge>
                        <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                            Overstock: {dashboardStats.overstock_count}
                        </Badge>
                        <Badge variant="outline" className="text-purple-600 border-purple-200">
                            Expiring Soon: {dashboardStats.expiring_soon_count}
                        </Badge>
                        <Badge variant="outline" className="text-gray-600 border-gray-200">
                            Expired: {dashboardStats.expired_count}
                        </Badge>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ValuationCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    highlight?: boolean;
}

function ValuationCard({ title, value, icon, highlight }: ValuationCardProps) {
    return (
        <Card className={highlight ? "border-primary/30 bg-primary/5" : ""}>
            <CardHeader className="pb-2 pt-3 px-4">
                <CardDescription className="flex items-center gap-1.5 text-xs">
                    {icon}
                    {title}
                </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-3">
                <p className={`text-xl font-bold font-mono ${highlight ? "text-primary" : ""}`}>
                    {value}
                </p>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// SKELETON
// ============================================================================

function AnalyticsSkeleton() {
    return (
        <div className="space-y-6">
            <div>
                <Skeleton className="h-6 w-40 mb-3" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2 pt-3 px-4">
                                <Skeleton className="h-3 w-20" />
                            </CardHeader>
                            <CardContent className="px-4 pb-3">
                                <Skeleton className="h-7 w-24" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
            <Separator />
            <div>
                <Skeleton className="h-6 w-40 mb-3" />
                <Skeleton className="h-48 w-full rounded-md" />
            </div>
        </div>
    );
}
