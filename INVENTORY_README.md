# Inventory Module

## Overview

The Inventory module manages stock levels, stock movements (transactions), product batches with expiry tracking, stock alerts, and price history for the StorePOS multi-tenant system. It provides real-time inventory visibility with automatic stock updates via DB triggers, low-stock alerting, batch/lot tracking, and full audit trail for all stock movements. Supports role-based access control via Supabase RLS.

---

## Architecture

```
src/
├── types/
│   └── inventory.types.ts         # TypeScript interfaces, enums, request/response types
├── validations/
│   └── inventory.validation.ts    # Zod schemas for form validation
├── utils/
│   └── inventory.utils.ts         # Formatting, status helpers, stock level logic, export
├── services/
│   └── inventory.service.ts       # Supabase CRUD operations (data layer)
├── stores/
│   └── inventory.store.ts         # Zustand state management with cache & optimistic UI
supabase/
└── migrations/
    └── 5_inventory_supplier.sql   # Database tables, RLS, triggers (tables 24-29)
```

---

## Database Tables

| Table | Description |
|---|---|
| `inventory` | Current stock levels per product/variant with generated columns (`quantity_available`, `total_value`) |
| `inventory_transactions` | Stock movement history (purchases, sales, adjustments, transfers, damage, expiry) |
| `product_batches` | Batch/lot tracking with manufacturing and expiry dates |
| `stock_alerts` | Low stock and expiry notifications with resolution tracking |
| `price_history` | Price change audit trail for cost/selling/MRP prices |

### Key Constraints
- `UNIQUE(store_id, product_id, variant_id)` on `inventory` — one record per product/variant per store
- `quantity_available` is a generated column: `quantity_on_hand - quantity_reserved`
- `total_value` is a generated column: `quantity_on_hand * unit_cost`
- `inventory_transactions.transaction_type` restricted to: `PURCHASE`, `SALE`, `RETURN`, `ADJUSTMENT`, `TRANSFER_IN`, `TRANSFER_OUT`, `DAMAGE`, `EXPIRY`
- `stock_alerts.alert_type` restricted to: `LOW_STOCK`, `OUT_OF_STOCK`, `EXPIRY_WARNING`, `EXPIRY_CRITICAL`, `OVERSTOCK`
- `stock_alerts.severity` restricted to: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `price_history.price_type` restricted to: `COST`, `SELLING`, `MRP`, `WHOLESALE`, `SPECIAL`
- Foreign keys: `product_id → products`, `variant_id → product_variants`, `supplier_id → suppliers`, `batch_id → product_batches`

### Triggers
| Trigger | Description |
|---|---|
| `update_inventory_on_transaction()` | Auto-updates `inventory` table via UPSERT when `inventory_transactions` are inserted. Handles all transaction types. |
| `check_low_stock()` | Creates `stock_alerts` when `quantity_on_hand <= reorder_point`. Severity logic: `CRITICAL` when qty = 0, `HIGH` when qty ≤ 50% of reorder, `MEDIUM` otherwise. |
| `validate_barcode_format()` | Warns on non-standard barcode formats (non-numeric or length not 8/12/13). |

### RLS Policies
- **SELECT**: Users in the same store (via `get_user_store()`) or super admin
- **INSERT**: Users with `manage_inventory` permission or super admin
- **UPDATE**: Users with `manage_inventory` permission or super admin
- **DELETE**: Users with `manage_inventory` permission or super admin

### Roles with Access
| Role | Permissions |
|---|---|
| `super_admin` | Full access across all stores |
| `store_admin` | Full access within their store |
| `manager` | Full CRUD operations |
| `inventory_manager` | Full CRUD (primary user) |
| `accountant` | View-only (reports & financials) |
| `cashier` | View-only (stock queries at POS) |

---

## Types (`inventory.types.ts`)

### Enums
| Type | Values |
|---|---|
| `TransactionType` | `PURCHASE`, `SALE`, `RETURN`, `ADJUSTMENT`, `TRANSFER_IN`, `TRANSFER_OUT`, `DAMAGE`, `EXPIRY` |
| `AlertType` | `LOW_STOCK`, `OUT_OF_STOCK`, `EXPIRY_WARNING`, `EXPIRY_CRITICAL`, `OVERSTOCK` |
| `AlertSeverity` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `PriceType` | `COST`, `SELLING`, `MRP`, `WHOLESALE`, `SPECIAL` |
| `ReferenceType` | `PURCHASE_ORDER`, `SALE`, `RETURN`, `ADJUSTMENT`, `TRANSFER`, `COUNT` |
| `UnitCategory` | `weight`, `volume`, `length`, `count`, `pack` |

### Core Interfaces
| Interface | Description |
|---|---|
| `InventoryRecord` | Current stock level per product/variant (matches DB schema) |
| `InventoryTransaction` | Single stock movement entry with quantity, reference, cost |
| `ProductBatch` | Batch/lot with manufacturing/expiry dates and quantity tracking |
| `StockAlert` | Alert for low stock or expiry with resolution tracking |
| `PriceHistory` | Price change record with old/new values and reason |

### Enriched Types
| Interface | Description |
|---|---|
| `EnrichedInventoryRecord` | Inventory + joined product name, SKU, barcode, category, variant details |
| `EnrichedInventoryTransaction` | Transaction + product name, SKU, variant info |
| `EnrichedStockAlert` | Alert + product name, SKU, batch number |
| `EnrichedProductBatch` | Batch + product name, SKU, supplier name/company |

### Request Types
| Type | Use |
|---|---|
| `CreateStockAdjustmentRequest` | Adjust stock (ADJUSTMENT sets qty, DAMAGE/EXPIRY reduce qty) |
| `CreateStockTransferRequest` | Transfer stock between locations (creates OUT + IN pair) |
| `UpdateInventoryRecordRequest` | Update reorder point, max stock, location, warehouse |
| `CreateProductBatchRequest` | Create a new batch with quantities and dates |
| `UpdateProductBatchRequest` | Partial batch update |
| `ResolveStockAlertRequest` | Resolve an alert with notes |
| `StockCountRequest` | Physical stock count audit (array of items with actual counts) |

### Filter Types
| Type | Fields |
|---|---|
| `InventoryFilters` | `search`, `category_id`, `warehouse`, `location`, `low_stock_only`, `out_of_stock_only`, `overstock_only`, `min_quantity`, `max_quantity` |
| `TransactionFilters` | `product_id`, `variant_id`, `transaction_type`, `date_from`, `date_to`, `reference_type`, `search` |
| `BatchFilters` | `product_id`, `supplier_id`, `is_active`, `expiry_from`, `expiry_to`, `search` |
| `AlertFilters` | `alert_type`, `severity`, `is_resolved`, `product_id` |

### Response Types
| Type | Use |
|---|---|
| `InventoryListResponse` | Paginated inventory list with total/pages |
| `TransactionListResponse` | Paginated transaction list with total/pages |
| `BatchListResponse` | Paginated batch list with total/pages |

### Stats Types
| Type | Use |
|---|---|
| `InventoryDashboardStats` | Total products, stock values, low/out/expiring counts, top moving products, value by category |
| `InventoryValuationSummary` | Total/average cost, category/warehouse breakdowns |
| `StockMovementSummary` | Period-based movement totals (in/out/adjustments) |

---

## Validation (`inventory.validation.ts`)

All forms are validated with Zod. Schemas auto-transform and sanitize inputs.

| Schema | Description |
|---|---|
| `createStockAdjustmentSchema` | Adjustment with type-specific validation (new_quantity for ADJUSTMENT, quantity for DAMAGE/EXPIRY) |
| `createStockTransferSchema` | Transfer between locations with source/destination validation |
| `updateInventoryRecordSchema` | Update non-quantity fields (reorder point, max stock, location) |
| `createProductBatchSchema` | Batch with manufacturing/expiry date validation and quantity checks |
| `updateProductBatchSchema` | Partial batch update |
| `resolveStockAlertSchema` | Resolution with required notes |
| `createStockAlertSchema` | Manual alert creation |
| `createPriceHistorySchema` | Price change record |
| `stockCountSchema` | Physical audit with array of items |
| `inventoryFiltersSchema` | Validate inventory filter params |
| `transactionFiltersSchema` | Validate transaction filter params |
| `batchFiltersSchema` | Validate batch filter params |
| `alertFiltersSchema` | Validate alert filter params |
| `inventoryPaginationSchema` | Validate inventory sort/page params |
| `transactionPaginationSchema` | Validate transaction sort/page params |

### Cross-Field Validations
- **Expiry > Manufacturing date**: Batches must have expiry after manufacturing
- **Current qty ≤ Initial qty**: Batch current quantity cannot exceed initial
- **ADJUSTMENT type**: Requires `new_quantity` field
- **DAMAGE/EXPIRY type**: Requires `quantity > 0`
- **Stock transfer**: `from_location` and `to_location` must be different

---

## Service (`inventory.service.ts`)

All methods return `ServiceResponse<T>` (`{ data: T | null, error: string | null }`).

### Inventory CRUD
| Method | Description |
|---|---|
| `getList(storeId, filters?, pagination?)` | Paginated, filtered list with product/variant joins |
| `getById(storeId, inventoryId)` | Single enriched inventory record |
| `getByProduct(storeId, productId, variantId?)` | Lookup by product (and optional variant) |
| `update(storeId, inventoryId, data)` | Update reorder point, max stock, location, warehouse |
| `getLowStock(storeId)` | All items where `quantity_on_hand ≤ reorder_point` |
| `getOutOfStock(storeId)` | All items where `quantity_on_hand = 0` |

### Stock Transactions
| Method | Description |
|---|---|
| `getTransactions(storeId, filters?, pagination?)` | Paginated transaction list with all filters |
| `getProductTransactions(storeId, productId)` | All transactions for a specific product |
| `createStockAdjustment(storeId, data)` | Create adjustment (auto-calculates quantities from current stock) |
| `createStockTransfer(storeId, data)` | Transfer stock (creates TRANSFER_OUT + TRANSFER_IN pair, validates sufficient stock) |
| `performStockCount(storeId, data)` | Physical audit — creates ADJUSTMENT transactions for discrepancies, updates `last_counted_at` |

### Product Batches
| Method | Description |
|---|---|
| `getBatches(storeId, filters?)` | Paginated batch list with product/supplier joins |
| `getBatchById(storeId, batchId)` | Single enriched batch |
| `createBatch(storeId, data)` | Create new batch |
| `updateBatch(storeId, batchId, data)` | Update batch fields |
| `deleteBatch(storeId, batchId)` | Delete batch |
| `getExpiringBatches(storeId, withinDays?)` | Batches expiring within N days (default 30) |
| `getExpiredBatches(storeId)` | All expired batches |

### Stock Alerts
| Method | Description |
|---|---|
| `getAlerts(storeId, filters?)` | Filtered alert list with product/batch joins |
| `getUnresolvedAlertCount(storeId)` | Count of unresolved alerts |
| `resolveAlert(storeId, alertId, data)` | Resolve single alert with notes |
| `bulkResolveAlerts(storeId, alertIds, notes)` | Bulk resolve multiple alerts |

### Price History
| Method | Description |
|---|---|
| `getPriceHistory(storeId, productId, variantId?)` | Price change history for product |
| `recordPriceChange(storeId, productId, priceType, oldPrice, newPrice, reason?, variantId?)` | Record a new price change |

### Dashboard & Analytics
| Method | Description |
|---|---|
| `getDashboardStats(storeId)` | Aggregated stats (4 parallel queries: inventory, alerts, today's transactions, expiring batches) |
| `getValuationSummary(storeId)` | Inventory valuation with category/warehouse breakdown |

---

## Store (`inventory.store.ts`)

Zustand store with `devtools` middleware for debugging.

### State Shape
```typescript
{
  // Inventory Records
  items: EnrichedInventoryRecord[];
  currentItem: EnrichedInventoryRecord | null;
  lowStockItems: EnrichedInventoryRecord[];
  outOfStockItems: EnrichedInventoryRecord[];

  // Transactions
  transactions: EnrichedInventoryTransaction[];

  // Batches
  batches: EnrichedProductBatch[];
  expiringBatches: EnrichedProductBatch[];
  expiredBatches: EnrichedProductBatch[];

  // Alerts
  alerts: EnrichedStockAlert[];
  unresolvedAlertCount: number;

  // Price History
  priceHistory: PriceHistory[];

  // Dashboard
  dashboardStats: InventoryDashboardStats | null;
  valuationSummary: InventoryValuationSummary | null;

  // Filters & Pagination
  inventoryFilters: InventoryFilters;
  inventoryPagination: InventoryPagination; // default: page 1, limit 20, sort by last_updated_at desc
  transactionFilters: TransactionFilters;
  transactionPagination: TransactionPagination; // default: page 1, limit 20, sort by transaction_date desc
  batchFilters: BatchFilters;

  // UI
  isLoading: boolean;
  isRefreshing: boolean;
  isSaving: boolean;
  error: string | null;
  selectedItemIds: string[];

  // Cache
  lastFetch: number | null;
  cacheTimeout: number; // 5 minutes
  transactionCache: Map<productId, { data, fetchedAt }>;
  batchCache: Map<productId, { data, fetchedAt }>;
  priceHistoryCache: Map<productId, { data, fetchedAt }>;
}
```

### Key Features

#### Optimistic UI Updates
All mutations (update inventory, resolve alert, bulk resolve, update batch, delete batch) apply changes **immediately** to the local state before the server responds. If the server returns an error, the previous state is **restored automatically**.

```typescript
// Example: Resolve alert
const success = await resolveAlert(storeId, alertId, { resolution_notes: "Restocked" });
// UI updates instantly. If server fails, reverts to old state.
```

#### Cache Strategy
- **List cache**: 5-minute TTL on inventory list. Invalidated on mutations/filter/pagination changes.
- **Transaction cache**: Per-product Map cache with 5-minute TTL.
- **Batch cache**: Per-product Map cache with 5-minute TTL.
- **Price history cache**: Per-product Map cache with 5-minute TTL.
- `forceRefresh` parameter bypasses cache on any fetch.
- `invalidateCache()` / `clearTransactionCache()` / `clearBatchCache()` / `clearPriceHistoryCache()` for manual control.

#### Filter & Pagination
- `setInventoryFilters()` resets to page 1 and invalidates cache automatically.
- `setInventoryPagination()` invalidates cache for fresh server data.
- `setTransactionFilters()` resets transaction page to 1.
- Server-side filtering for most criteria, client-side for search/category/overstock.

---

## Utils (`inventory.utils.ts`)

### Display
| Function | Description |
|---|---|
| `getTransactionTypeLabel(type)` | Human-readable transaction type name |
| `getTransactionTypeColor(type)` | Tailwind badge classes (dark mode support) |
| `getAlertTypeLabel(type)` | Alert type display name |
| `getAlertTypeColor(type)` | Alert type badge classes |
| `getAlertSeverityLabel(severity)` | Severity display name |
| `getAlertSeverityColor(severity)` | Severity badge classes |
| `getPriceTypeLabel(type)` | Price type display name |

### Stock Level
| Function | Description |
|---|---|
| `getStockLevelStatus(record)` | Returns stock status: `out_of_stock`, `critical`, `low`, `normal`, `overstock` |
| `getStockLevelLabel(status)` | Human-readable stock level name |
| `getStockLevelColor(status)` | Tailwind badge classes for stock level |

### Formatting
| Function | Description |
|---|---|
| `formatCurrency(amount)` | INR formatting (₹1,234.56) |
| `formatQuantity(quantity)` | Number with up to 2 decimal places |
| `formatQuantityWithUnit(quantity, unit)` | "10.5 kg" |
| `formatDate(dateString)` | Localized date (en-IN) |
| `formatRelativeTime(dateString)` | "2d ago", "3mo ago" |
| `formatPercentage(value)` | "12.50%" |

### Batch & Expiry
| Function | Description |
|---|---|
| `getDaysUntilExpiry(expiryDate)` | Days remaining (negative if expired) |
| `getExpiryStatusLabel(expiryDate)` | "Expired", "7 days left", "45 days left" |
| `getExpiryStatusColor(expiryDate)` | Color based on urgency |
| `isBatchExpired(batch)` | Boolean check |
| `isBatchExpiringSoon(batch, days?)` | Boolean check (default 30 days) |

### Transaction Helpers
| Function | Description |
|---|---|
| `isStockIncrease(type)` | True for PURCHASE, RETURN, TRANSFER_IN, positive ADJUSTMENT |
| `isStockDecrease(type)` | True for SALE, TRANSFER_OUT, DAMAGE, EXPIRY |
| `getTransactionSign(type)` | `+`, `-`, or `~` prefix |

### Search & Filter
| Function | Description |
|---|---|
| `filterInventoryBySearch(items, query)` | Client-side multi-field search (product name, SKU, barcode, warehouse) |
| `filterTransactionsBySearch(txns, query)` | Client-side transaction search |
| `sortInventoryRecords(items, sortBy, order)` | Client-side sorting |
| `sortTransactions(txns, sortBy, order)` | Client-side transaction sorting |

### Export
| Function | Description |
|---|---|
| `exportInventoryToCSV(items)` | Generate CSV for inventory list |
| `exportTransactionsToCSV(transactions)` | Generate CSV for transactions |
| `exportBatchesToCSV(batches)` | Generate CSV for batches |
| `downloadCSV(csv, filename)` | Trigger browser download |

### Dashboard
| Function | Description |
|---|---|
| `getEmptyInventoryDashboardStats()` | Default empty stats object |
| `computeInventoryStats(items)` | Client-side stats computation from inventory array |
| `computeStockMovementSummary(transactions, startDate, endDate)` | Period-based movement totals |

### Location
| Function | Description |
|---|---|
| `getUniqueWarehouses(items)` | Extract unique warehouse names |
| `getUniqueLocations(items)` | Extract unique location strings |

### Valuation
| Function | Description |
|---|---|
| `calculateWeightedAverageCost(transactions)` | WAC from transaction history |
| `calculateTotalInventoryValue(items)` | Sum of all item values |

---

## Usage Examples

### Fetch inventory with filters
```tsx
const { items, fetchInventory, setInventoryFilters, isLoading } = useInventoryStore();

useEffect(() => {
  fetchInventory(storeId);
}, [storeId]);

// Filter by low stock
setInventoryFilters({ low_stock_only: true });
fetchInventory(storeId, true);
```

### Create stock adjustment with validation
```tsx
import { createStockAdjustmentSchema } from "@/validations/inventory.validation";

const parsed = createStockAdjustmentSchema.safeParse({
  product_id: productId,
  transaction_type: "ADJUSTMENT",
  new_quantity: 50,
  reason: "Physical count correction",
  notes: "Shelf audit 2025-01-15",
});

if (parsed.success) {
  const txn = await createStockAdjustment(storeId, parsed.data);
  // Inventory updates via DB trigger, store re-fetches automatically
}
```

### Transfer stock between locations
```tsx
const txns = await createStockTransfer(storeId, {
  product_id: productId,
  quantity: 25,
  from_location: "Warehouse A",
  to_location: "Warehouse B",
  reason: "Rebalance stock",
});
// Creates TRANSFER_OUT + TRANSFER_IN pair
// Validates sufficient stock at source location
```

### Perform physical stock count
```tsx
const success = await performStockCount(storeId, {
  counted_by: userId,
  notes: "Monthly audit - January 2025",
  items: [
    { inventory_id: inv1, product_id: prod1, actual_quantity: 48 },
    { inventory_id: inv2, product_id: prod2, variant_id: var1, actual_quantity: 100 },
  ],
});
// Creates ADJUSTMENT transactions only for discrepancies
// Updates last_counted_at and last_counted_by
```

### Resolve alerts
```tsx
// Single alert
await resolveAlert(storeId, alertId, { resolution_notes: "Restocked from supplier" });
// UI updates instantly via optimistic update

// Bulk resolve
await bulkResolveAlerts(storeId, selectedAlertIds, "Batch restock completed");
```

### Track batch expiry
```tsx
import { getDaysUntilExpiry, getExpiryStatusLabel, isBatchExpiringSoon } from "@/utils/inventory.utils";

const daysLeft = getDaysUntilExpiry(batch.expiry_date);
const label = getExpiryStatusLabel(batch.expiry_date); // "7 days left"
const isUrgent = isBatchExpiringSoon(batch, 14); // true if < 14 days
```

### Export inventory to CSV
```tsx
import { exportInventoryToCSV, downloadCSV } from "@/utils/inventory.utils";

const csv = exportInventoryToCSV(items);
downloadCSV(csv, `inventory-${new Date().toISOString().split("T")[0]}.csv`);
```

### Stock level status display
```tsx
import { getStockLevelStatus, getStockLevelLabel, getStockLevelColor } from "@/utils/inventory.utils";

const status = getStockLevelStatus(record); // "low" | "critical" | "out_of_stock" | "normal" | "overstock"
const label = getStockLevelLabel(status);    // "Low Stock"
const color = getStockLevelColor(status);    // "bg-yellow-100 text-yellow-800 ..."
```

---

## File Reference

| File | Purpose |
|---|---|
| `src/types/inventory.types.ts` | All interfaces, enums, request/response types |
| `src/validations/inventory.validation.ts` | Zod schemas for all inventory forms |
| `src/utils/inventory.utils.ts` | Display, stock level, batch/expiry, export helpers |
| `src/services/inventory.service.ts` | Supabase CRUD + transactions + batches + alerts + analytics |
| `src/stores/inventory.store.ts` | Zustand state with cache + optimistic UI |
| `supabase/migrations/5_inventory_supplier.sql` | Tables + RLS + triggers (tables 24-29) |
