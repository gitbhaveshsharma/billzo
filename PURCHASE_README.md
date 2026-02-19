# Purchase Module

## Overview

The Purchase module manages purchase orders, payments, returns, and inventory receiving for the StorePOS multi-tenant system. It provides full lifecycle management with Indian GST support (CGST/SGST intra-state, IGST inter-state), role-based access control via Supabase RLS, and tight integration with existing supplier, product, and inventory tables.

---

## Architecture

```
src/
├── types/
│   └── purchase.types.ts         # TypeScript interfaces, enums, request/response types
├── validations/
│   └── purchase.validation.ts    # Zod schemas for form validation
├── utils/
│   └── purchase.utils.ts         # Formatting, tax calc, status helpers, export
├── services/
│   └── purchase.service.ts       # Supabase CRUD operations (data layer)
├── stores/
│   └── purchase.store.ts         # Zustand state management with cache & optimistic UI
supabase/
└── migrations/
    └── 6_purchase_orders.sql     # Database tables, RLS, triggers, RPC functions
```

---

## Database Tables

| Table | Description |
|---|---|
| `purchase_orders` | Core PO master with supplier ref, GST treatment, totals, payment/delivery status |
| `purchase_order_items` | Line items referencing products/variants/units, with per-item GST breakdown |
| `purchase_payments` | Payment records (cash, cheque, bank transfer, UPI, credit note) |
| `purchase_returns` | Return headers linked to a PO with refund tracking |
| `purchase_return_items` | Individual return line items with quantity, reason, condition |

### Key Constraints
- `UNIQUE(store_id, po_number)` — PO number unique per store
- `po_number` auto-generated: `PO-{STORE_CODE}-{YYYYMMDD}-{SEQ}`
- `payment_number` auto-generated: `PAY-{STORE_CODE}-{YYYYMMDD}-{SEQ}`
- `return_number` auto-generated: `RET-{STORE_CODE}-{YYYYMMDD}-{SEQ}`
- Foreign keys: `supplier_id → suppliers`, `product_id → products`, `variant_id → product_variants`, `unit_id → units_of_measure`
- Triggers auto-recalculate PO totals on item changes
- Triggers auto-update payment status on payment insert/update/delete
- Triggers prevent deletion of non-draft orders
- Triggers update inventory when items received (creates `inventory_transactions`)
- Triggers handle purchase return completion (inventory adjustment)

### RLS Policies
- **SELECT**: Users with `manage_inventory`, `manage_suppliers`, `view_reports`, or `view_financials` permission, or super admin
- **INSERT**: Users with `manage_inventory` or `manage_suppliers` permission
- **UPDATE**: Users with `manage_inventory` or `manage_suppliers` permission
- **DELETE**: Users with `manage_inventory` or `manage_suppliers` permission (DB trigger restricts to draft-only)

### Roles with Access
| Role | Permissions |
|---|---|
| `super_admin` | Full access across all stores |
| `store_admin` | Full access within their store |
| `manager` | Full CRUD operations |
| `inventory_manager` | Full CRUD (primary user) |
| `accountant` | View-only (reports & financials) |

---

## Types (`purchase.types.ts`)

### Enums
| Type | Values |
|---|---|
| `PurchaseOrderStatus` | `draft`, `confirmed`, `partially_received`, `received`, `cancelled`, `closed` |
| `PaymentStatus` | `unpaid`, `partially_paid`, `paid`, `overpaid` |
| `PaymentMethod` | `cash`, `cheque`, `bank_transfer`, `upi`, `credit_note` |
| `PurchasePaymentStatus` | `pending`, `completed`, `cancelled`, `bounced` |
| `POItemStatus` | `pending`, `partially_received`, `received`, `cancelled` |
| `ReturnStatus` | `draft`, `confirmed`, `completed`, `cancelled` |
| `RefundStatus` | `pending`, `processed`, `credited` |
| `ReturnReason` | `defective`, `damaged`, `wrong_item`, `expired`, `quality_issue`, `excess_quantity`, `other` |

### Core Interfaces
| Interface | Description |
|---|---|
| `PurchaseOrder` | Full PO record (matches DB schema) |
| `PurchaseOrderItem` | Line item with product, GST, quantity tracking |
| `PurchasePayment` | Payment record with method, reference, status |
| `PurchaseReturn` | Return header with totals and refund status |
| `PurchaseReturnItem` | Return line item with reason, condition, amount |
| `EnrichedPurchaseOrder` | PO + items + payments + returns + supplier details |

### Request Types
| Type | Use |
|---|---|
| `CreatePurchaseOrderRequest` | Create a new PO with items |
| `UpdatePurchaseOrderRequest` | Partial update (draft only) |
| `CreatePurchaseOrderItemRequest` | Add line item to PO |
| `ReceiveItemRequest` | Record item receipt with batch/expiry |
| `CreatePurchasePaymentRequest` | Record a payment against PO |
| `CreatePurchaseReturnRequest` | Create a return with items |
| `ConfirmPurchaseOrderRequest` | Confirm with optional expected delivery |
| `CancelPurchaseOrderRequest` | Cancel with reason |
| `PurchaseOrderFilters` | Filter params (status, supplier, date range, search, tags) |
| `PurchaseOrderPagination` | Sort + pagination parameters |

### Response Types
| Type | Use |
|---|---|
| `PurchaseOrderListResponse` | Paginated list with metadata |
| `PurchaseDashboardStats` | Aggregated stats (totals, counts by status, top suppliers) |
| `SupplierPurchaseSummary` | Per-supplier purchase aggregates |

---

## Validation (`purchase.validation.ts`)

All forms are validated with Zod. Schemas auto-transform and sanitize inputs.

| Schema | Description |
|---|---|
| `createPurchaseOrderSchema` | Full PO validation with items array (min 1), supplier, GST treatment, dates |
| `updatePurchaseOrderSchema` | Partial update (all optional) |
| `createPurchaseOrderItemSchema` | Item with product_id, quantity, unit_price, GST rates |
| `updatePurchaseOrderItemSchema` | Partial item update |
| `receiveItemSchema` | Single item receive with received_quantity, batch, expiry |
| `receiveItemsSchema` | Batch receive (array of receiveItemSchema) |
| `createPurchasePaymentSchema` | Payment with method-specific validation |
| `createPurchaseReturnSchema` | Return with items array (min 1), reason, condition |
| `cancelPurchaseOrderSchema` | Cancellation with required reason |
| `purchaseOrderFiltersSchema` | Validate filter inputs |
| `purchaseOrderPaginationSchema` | Validate page/limit/sort params |

### Cross-Field Validations
- **Expiry > Manufacturing date**: Items with both dates are validated
- **Delivery date ≥ Order date**: Ensures logical ordering
- **Cheque payments**: `cheque_number` required when method is `cheque`
- **Bank transfers**: `transaction_reference` required when method is `bank_transfer`

---

## Service (`purchase.service.ts`)

All methods return `ServiceResponse<T>` (`{ data: T | null, error: string | null }`).

### Purchase Order CRUD
| Method | Description |
|---|---|
| `create(storeId, data)` | Create PO with items (auto-calculates GST per item) |
| `getById(storeId, poId)` | Get enriched PO with items, payments, returns, supplier |
| `getList(storeId, filters?, pagination?)` | Paginated, filtered, sorted list |
| `update(storeId, poId, data)` | Update PO fields (draft only) |
| `delete(storeId, poId)` | Hard delete (draft only, enforced by DB trigger) |
| `confirm(storeId, poId)` | Transition to confirmed status |
| `cancel(storeId, poId, request)` | Cancel with reason |

### Items
| Method | Description |
|---|---|
| `getItems(poId)` | List all items for a PO |
| `addItem(storeId, poId, item, isInterState)` | Add item with auto GST calculation |
| `updateItem(storeId, itemId, data)` | Update item fields |
| `removeItem(storeId, itemId)` | Remove item from PO |
| `receiveItems(storeId, poId, items)` | Batch receive items (triggers inventory update) |

### Payments
| Method | Description |
|---|---|
| `getPayments(poId)` | List all payments for a PO |
| `addPayment(storeId, poId, data)` | Record a payment |
| `cancelPayment(storeId, paymentId)` | Cancel a payment |

### Returns
| Method | Description |
|---|---|
| `getReturns(poId)` | List all returns for a PO |
| `createReturn(storeId, data)` | Create return with items and auto GST calc |
| `completeReturn(storeId, returnId)` | Complete return (triggers inventory adjustment) |

### Statistics & Utilities
| Method | Description |
|---|---|
| `getDashboardStats(storeId)` | Aggregated stats via RPC function |
| `getSupplierPurchaseSummary(storeId, supplierId)` | Per-supplier summary via RPC function |
| `isPONumberUnique(storeId, poNumber)` | Check PO number uniqueness |
| `getRecent(storeId, limit?)` | Recent purchase orders |
| `getOverdue(storeId)` | Overdue orders (past expected delivery, not received/closed) |

---

## Store (`purchase.store.ts`)

Zustand store with `devtools` middleware for debugging.

### State Shape
```typescript
{
  orders: PurchaseOrder[];
  currentOrder: EnrichedPurchaseOrder | null;
  dashboardStats: PurchaseDashboardStats | null;
  recentOrders: PurchaseOrder[];
  overdueOrders: PurchaseOrder[];
  filters: PurchaseOrderFilters;
  pagination: PurchaseOrderPagination;
  totalOrders: number;
  totalPages: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isSaving: boolean;
  error: string | null;
  selectedOrderIds: string[];
  lastFetch: number | null;
  cacheTimeout: number; // 5 minutes
  itemsCache: Map<poId, { data, fetchedAt }>;
  paymentsCache: Map<poId, { data, fetchedAt }>;
}
```

### Key Features

#### Optimistic UI Updates
All mutations (create, update, delete, confirm, cancel) apply changes **immediately** to the local state before the server responds. If the server returns an error, the previous state is **restored automatically**.

```typescript
// Example: Confirm order
const success = await confirmOrder(storeId, poId);
// UI updates instantly. If server fails, reverts to old status.
```

#### Cache Strategy
- **List cache**: 5-minute TTL on order list. Invalidated on create/filter/pagination changes.
- **Items cache**: Per-PO Map cache with 5-minute TTL.
- **Payments cache**: Per-PO Map cache with 5-minute TTL.
- `forceRefresh` parameter bypasses cache on any fetch.
- `invalidateCache()` / `clearItemsCache()` / `clearPaymentsCache()` for manual control.

#### Filter & Pagination
- `setFilters()` resets to page 1 and invalidates cache automatically.
- `setPagination()` invalidates cache for fresh server data.
- Server-side filtering via Supabase query builder (status, supplier, date range, search, payment status, tags).

---

## Utils (`purchase.utils.ts`)

### Display
| Function | Description |
|---|---|
| `getPurchaseOrderStatusLabel(status)` | Human-readable status name |
| `getPurchaseOrderStatusColor(status)` | Tailwind badge classes |
| `getPaymentStatusLabel(status)` | Payment status display |
| `getPaymentStatusColor(status)` | Payment status badge classes |
| `getPaymentMethodLabel(method)` | "Bank Transfer" etc. |
| `getPOItemStatusLabel(status)` | Item status display |
| `getReturnStatusLabel(status)` | Return status display |
| `getRefundStatusLabel(status)` | Refund status display |

### Formatting
| Function | Description |
|---|---|
| `formatCurrency(amount)` | INR formatting (₹1,234.56) |
| `formatPercentage(value)` | "12.50%" |
| `formatDate(dateString)` | Localized date |
| `formatRelativeTime(dateString)` | "2d ago" |
| `formatQuantity(qty, received)` | "8 / 10" with receive tracking |

### GST / Tax Calculation
| Function | Description |
|---|---|
| `calculateGstSplit(gstRate, isInterState)` | Returns `{ cgst, sgst, igst }` split |
| `calculateCess(baseAmount, cessRate)` | Compute cess amount |
| `calculateItemTotals(unitPrice, quantity, discount, gstRate, cessRate, isInterState)` | Full item total with tax breakdown |
| `calculatePOTotals(items)` | Aggregate all items into PO-level totals |
| `buildItemPayload(item, isInterState)` | Build DB-ready item payload with calculated taxes |
| `formatGstSummary(order)` | "CGST: ₹X + SGST: ₹Y" or "IGST: ₹Z" |
| `formatItemTax(item)` | Per-item tax breakdown string |

### Status Checks
| Function | Description |
|---|---|
| `canEditPO(order)` | Only draft orders |
| `canConfirmPO(order)` | Draft with items |
| `canReceiveItems(order)` | Confirmed or partially received |
| `canCancelPO(order)` | Draft or confirmed only |
| `canAddPayment(order)` | Not cancelled/closed |
| `canCreateReturn(order)` | At least partially received |
| `canDeletePO(order)` | Draft only |
| `getAllowedStatusTransitions(status)` | Valid next statuses |

### Search & Filter
| Function | Description |
|---|---|
| `filterPurchaseOrdersBySearch(orders, query)` | Client-side multi-field search |
| `sortPurchaseOrders(orders, sortBy, sortOrder)` | Client-side sorting |
| `getUniqueTags(orders)` | Extract all unique tags across orders |
| `getUniqueSuppliers(orders)` | Extract unique supplier IDs |

### Export
| Function | Description |
|---|---|
| `exportPurchaseOrdersToCSV(orders)` | Generate CSV string for PO list |
| `exportPurchaseOrderItemsToCSV(items)` | Generate CSV string for PO items |
| `downloadCSV(csv, filename)` | Trigger browser download |

### Dashboard
| Function | Description |
|---|---|
| `getEmptyDashboardStats()` | Default empty stats object |
| `computePurchaseStats(orders)` | Client-side stats from order array |

---

## Usage Examples

### Fetch purchase orders with filters
```tsx
const { orders, fetchOrders, setFilters, isLoading } = usePurchaseStore();

useEffect(() => {
  fetchOrders(storeId);
}, [storeId]);

// Apply filter
setFilters({ status: "confirmed", supplier_id: supplierId });
// Then re-fetch
fetchOrders(storeId, true);
```

### Create purchase order with validation
```tsx
import { createPurchaseOrderSchema } from "@/validations/purchase.validation";

const parsed = createPurchaseOrderSchema.safeParse(formData);
if (!parsed.success) {
  // Handle validation errors
  return;
}

const newOrder = await createOrder(storeId, parsed.data);
// UI updates instantly via optimistic update
```

### Receive items
```tsx
const success = await receiveItems(storeId, poId, [
  { item_id: "item-1", received_quantity: 50, batch_number: "B001", expiry_date: "2025-12-31" },
  { item_id: "item-2", received_quantity: 100 },
]);
// Triggers inventory_transactions automatically via DB trigger
```

### Record payment
```tsx
import { createPurchasePaymentSchema } from "@/validations/purchase.validation";

const parsed = createPurchasePaymentSchema.safeParse({
  amount: 15000,
  payment_method: "bank_transfer",
  transaction_reference: "TXN123456",
  payment_date: "2025-01-15",
});

if (parsed.success) {
  await addPayment(storeId, poId, parsed.data);
  // PO payment_status auto-updates via DB trigger
}
```

### Create purchase return
```tsx
const purchaseReturn = await createReturn(storeId, {
  purchase_order_id: poId,
  return_date: "2025-01-20",
  reason: "Quality issues with batch B001",
  items: [
    { purchase_order_item_id: itemId, return_quantity: 5, reason: "defective", item_condition: "damaged" },
  ],
});
// Complete return to trigger inventory adjustment
await completeReturn(storeId, purchaseReturn.id);
```

### Calculate GST for an item
```tsx
import { calculateItemTotals, calculateGstSplit } from "@/utils/purchase.utils";

// Intra-state: CGST 9% + SGST 9%
const totals = calculateItemTotals(100, 10, 5, 18, 0, false);
// { subtotal: 1000, discount: 50, taxable: 950, cgst: 85.5, sgst: 85.5, igst: 0, cess: 0, total: 1121 }

// Inter-state: IGST 18%
const totalsInter = calculateItemTotals(100, 10, 5, 18, 0, true);
// { subtotal: 1000, discount: 50, taxable: 950, cgst: 0, sgst: 0, igst: 171, cess: 0, total: 1121 }
```

### Export to CSV
```tsx
import { exportPurchaseOrdersToCSV, downloadCSV } from "@/utils/purchase.utils";

const csv = exportPurchaseOrdersToCSV(orders);
downloadCSV(csv, `purchase-orders-${new Date().toISOString().split("T")[0]}.csv`);
```

---

## File Reference

| File | Lines | Purpose |
|---|---|---|
| `src/types/purchase.types.ts` | Types | All interfaces, enums, request/response types |
| `src/validations/purchase.validation.ts` | Validation | Zod schemas for all purchase forms |
| `src/utils/purchase.utils.ts` | Utilities | Display, tax calc, status checks, export helpers |
| `src/services/purchase.service.ts` | Service | Supabase CRUD + items + payments + returns + stats |
| `src/stores/purchase.store.ts` | Store | Zustand state with cache + optimistic UI |
| `supabase/migrations/6_purchase_orders.sql` | DB | Tables + RLS + triggers + RPC functions |
