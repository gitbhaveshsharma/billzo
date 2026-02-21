# Sales Module — StorePOS

The complete POS billing, payments, returns, and invoice sequencing module. This covers 6 database tables (`sales`, `sale_items`, `sale_payments`, `sale_returns`, `sale_return_items`, `invoice_sequences`), 2 views, 2 RPC functions, and 12 triggers.

---

## Architecture Overview

```
sales.types.ts      → 843 lines — Enums, interfaces, enriched types, cart types, request/response types
sales.validation.ts → Zod schemas with cross-field validation and inferred form data types
sales.utils.ts      → GST calc, item/sale totals, status labels/colors, cart helpers, receipt, CSV export
sales.service.ts    → CRUD for all 6 tables, RPC calls, views, filtered/paginated queries
sales.store.ts      → Zustand store with cart state, hold bills, optimistic UI, cache, filters
database.types.ts   → Row/Insert/Update types for all 6 tables, views, RPC signatures, enum types
```

---

## Database Schema (from `7_point-of-sale.sql`)

### Tables

| # | Table | Description |
|---|-------|-------------|
| 32 | `sales` | Sale header — totals, status, customer, GST, receipt tracking |
| 33 | `sale_items` | Line items — product snapshot, quantity, discount, tax, profit |
| 34 | `sale_payments` | Payment records — per-method details (cash/card/UPI/cheque/etc.) |
| 35 | `sale_returns` | Return header — reason, totals, refund, credit note, approval |
| 36 | `sale_return_items` | Individual return items — restock condition, calculated amounts |
| 38 | `invoice_sequences` | Auto-incrementing invoice number generation per store |

### Enums

- `sale_status`: DRAFT → HOLD → COMPLETED / CANCELLED / CREDIT / PARTIAL_PAID → PARTIAL_RETURN → FULLY_RETURNED
- `payment_method`: CASH, CARD_CREDIT, CARD_DEBIT, UPI, NET_BANKING, WALLET, CHEQUE, NEFT_RTGS, CREDIT_NOTE, LOYALTY_POINTS, EMI, GIFT_CARD
- `return_status`: INITIATED → APPROVED / REJECTED → COMPLETED / REFUND_PENDING → REFUND_COMPLETED
- `discount_type`: PERCENTAGE, FLAT_AMOUNT, BUY_X_GET_Y, COMBO, LOYALTY, MANUAL

### Views

- **`v_sales_summary`**: Lightweight sale list with cashier name, customer info, item count, total quantity
- **`v_product_sales_report`**: Product-level sales aggregation with revenue, cost, profit, margins

### RPC Functions

- **`complete_sale(p_sale_id)`**: Locks row, validates DRAFT/HOLD, sums SUCCESS payments, calls `generate_invoice_number()`, returns `{success, invoice_number, total_paid, status}`
- **`generate_invoice_number(p_store_id, p_sequence_type)`**: SECURITY DEFINER, SELECT FOR UPDATE on `invoice_sequences`, format: `INV/STORECODE/2025-26/0001`

### Key Triggers (12 total)

| Trigger | Purpose |
|---------|---------|
| `validate_shift_before_sale` | Shift must be OPEN before creating a sale |
| `handle_sale_completion` | Deduct inventory on COMPLETED/CREDIT status |
| `prevent_completed_sale_modification` | Block edits to completed/cancelled sales |
| `validate_credit_limit` | Check credit limit before CREDIT status |
| `update_sale_paid_amount` | Auto-recalc paid/due amounts from payments |
| `validate_return_quantity` | Prevent returning more than original quantity |
| `restore_inventory_on_return` | Restock on return item insert |

### Constraints

- `round_off` BETWEEN -0.50 AND 0.50
- `bill_discount_percentage` BETWEEN 0 AND 100
- `net_quantity` is GENERATED STORED (quantity - returned_quantity)

---

## File Details

### `sales.types.ts`

All TypeScript types aligned with the SQL schema:

```typescript
// Enums (const arrays + derived types)
SALE_STATUSES / SaleStatus
PAYMENT_METHODS / PaymentMethod
RETURN_STATUSES / ReturnStatus
DISCOUNT_TYPES / DiscountType
PAYMENT_RECORD_STATUSES / PaymentRecordStatus
CHEQUE_STATUSES / ChequeStatus
GST_TYPES / GstType
SUPPLY_TYPES / SupplyType
SEQUENCE_TYPES / SequenceType
RESTOCK_CONDITIONS / RestockCondition
REFERENCE_TYPES / SaleReferenceType
SALE_SORT_FIELDS / SaleSortField
RETURN_SORT_FIELDS / ReturnSortField

// Core interfaces
Sale, SaleItem, SalePayment, SaleReturn, SaleReturnItem, InvoiceSequence

// Views
SaleSummaryView, ProductSalesReport

// Enriched
EnrichedSale (Sale + items + payments + returns + names)
EnrichedSaleReturn (SaleReturn + items)

// RPC
CompleteSaleResult

// Dashboard
SalesDashboardStats

// Cart
CartItem, HoldBill

// Request types
CreateSaleRequest, CreateSaleItemRequest, CreateSalePaymentRequest,
CancelSaleRequest, CreateSaleReturnRequest, CreateSaleReturnItemRequest,
ApproveReturnRequest, UpdateSaleRequest, MarkReceiptPrintedRequest

// Filter & pagination
SaleFilters, SalePagination, ReturnFilters, ReturnPagination

// Response types
SaleListResponse, ReturnListResponse, SalePaymentListResponse
```

### `sales.validation.ts`

Zod schemas with cross-field refinements:

| Schema | Key Rules |
|--------|-----------|
| `createSaleSchema` | items min 1, B2B needs GSTIN, credit needs due date |
| `createSaleItemSchema` | quantity > 0, unit_price ≥ 0, discount 0-100, gst 0-100 |
| `createSalePaymentSchema` | amount > 0, cash_tendered ≥ amount, cheque needs number, UPI needs ref |
| `cancelSaleSchema` | reason required, min 3 chars |
| `createSaleReturnSchema` | items min 1, reason min 3 chars |
| `createSaleReturnItemSchema` | return_quantity > 0, restock_condition enum |
| `approveReturnSchema` | rejection_reason required when !approved |
| `updateSaleSchema` | all fields optional for partial update |
| `saleFiltersSchema` | search, status, dates, credit filter |
| `salePaginationSchema` | defaults: page 1, limit 20, sort by sale_time desc |
| `returnFiltersSchema` | status, sale_id, dates |
| `returnPaginationSchema` | defaults: page 1, limit 20, sort by created_at desc |

All schemas export inferred `FormData` types for React Hook Form:
```typescript
export type CreateSaleFormData = z.infer<typeof createSaleSchema>;
```

### `sales.utils.ts`

**Status Labels & Colors** for: SaleStatus, PaymentMethod, ReturnStatus, DiscountType, PaymentRecordStatus, ChequeStatus

**Formatting**: `formatCurrency`, `formatDate`, `formatDateTime`, `formatTime`, `formatRelativeTime`, `formatInvoiceNumber`, `formatPercentage`, `formatQuantity`

**GST Calculations**:
- `calculateGstSplit()` — CGST/SGST (intra) or IGST (inter)
- `calculateGstAmounts()` — tax amounts from taxable amount
- `calculateItemTotals()` — full item calculation (subtotal → discount → tax → profit)
- `calculateSaleTotals()` — sale-level totals from cart items
- `calculateRoundOff()` — constrained to -0.50 to 0.50
- `buildSaleItemPayload()` — compute all DB columns for a sale item insert

**Status Checks**: `canEditSale`, `canCompleteSale`, `canCancelSale`, `canAddPayment`, `canCreateReturn`, `canVoidItem`, `isFullyPaid`, `isDraftOrHold`, `isFinalized`, `hasReturns`, `canApproveReturn`, `canCompleteReturn`

**Cart Helpers**: `generateCartKey`, `addToCart`, `removeFromCart`, `updateCartQuantity`, `applyCartItemDiscount`, `calculateCartTotals`, `getCartItemCount`, `getCartTotalQuantity`, `createHoldBill`

**Payment Helpers**: `calculateRemainingDue`, `calculateTotalPaid`, `getPaymentBreakdown`, `calculateCashChange`

**Return Helpers**: `getMaxReturnQuantity`, `canReturnItem`, `calculateReturnItemTotals`

**Export**: `exportSalesToCSV`, `exportReturnsToCSV`, `downloadCSV`

**Receipt**: `buildReceiptData` — structured receipt object for printing

### `sales.service.ts`

All CRUD operations for the 6 sales tables:

**Sale CRUD**: `create`, `getById`, `getList`, `getSummaryList`, `update`, `delete`

**Status Transitions**: `completeSale` (RPC), `holdSale`, `recallSale`, `cancelSale`, `markReceiptPrinted`

**Items**: `addItem`, `updateItem`, `voidItem`, `removeItem`, `getItems`

**Payments**: `addPayment`, `getPayments`, `reversePayment`

**Returns**: `createReturn`, `approveReturn`, `completeReturn`, `getReturnById`, `getReturnsList`

**Query Helpers**: `getHoldBills`, `getSalesByShift`, `getCreditSales`, `getCustomerSales`, `getTodaySales`, `getProductSalesReport`

**Invoice Sequences**: `generateInvoiceNumber` (RPC), `getInvoiceSequences`, `updateInvoiceSequence`

### `sales.store.ts`

Zustand store with devtools middleware:

**State**: sales list, current sale, today summaries, product report, dashboard stats, credit sales, hold bills, returns, cart, filters, pagination, loading states, cache

**Cache**: Map-based 5-minute TTL for items and payments per sale ID

**Cart State**: Full client-side POS cart management — add/remove/update quantity, apply discounts, customer info, bill discount, interstate flag, cart totals (auto-recalculated), hold/recall local bills

**Optimistic UI**: All mutations update state immediately, rollback on error (create, update, delete, add payment, status transitions)

**Filter/Pagination**: Auto-resets page to 1 on filter change, auto-invalidates cache

---

## Sale Lifecycle Flow

```
┌─────────┐    ┌──────┐    ┌───────────┐    ┌──────────┐
│  DRAFT  │───▶│ HOLD │───▶│ COMPLETED │───▶│ PARTIAL  │
│         │◀───│      │    │  /CREDIT  │    │  RETURN  │
└─────────┘    └──────┘    └───────────┘    └──────────┘
     │                          │                 │
     ▼                          │                 ▼
┌───────────┐                   │          ┌──────────┐
│ CANCELLED │                   │          │  FULLY   │
└───────────┘                   │          │ RETURNED │
                                ▼          └──────────┘
                         ┌──────────────┐
                         │ PARTIAL_PAID │
                         └──────────────┘
```

## POS Billing Flow

1. **Open Shift** → Shift must be OPEN (validated by trigger)
2. **Scan/Add Items** → `addToCart()` in store (client-side)
3. **Apply Discounts** → Per-item or bill-level
4. **Set Customer** (optional) → Walk-in or registered
5. **Create Sale** → `createSale()` → DRAFT status
6. **Add Payments** → `addPayment()` → Cash/Card/UPI/etc.
7. **Complete Sale** → `completeSale()` RPC → Generates invoice number, deducts inventory
8. **Print Receipt** → `buildReceiptData()` + `markReceiptPrinted()`

### Hold Bill Flow

1. Current cart → `holdCurrentBill()` → Saved to localHoldBills
2. Serve next customer
3. `recallLocalHoldBill(id)` → Restores cart
4. Or `holdSale()` → Persisted to DB as HOLD status

---

## Usage Examples

### Create a sale from cart

```typescript
const { createSale, completeSale, addPayment, clearCart, cart, cartTotals } = useSalesStore();

// Build request from cart
const request: CreateSaleRequest = {
    shift_id: currentShiftId,
    customer_id: cartCustomerId,
    items: cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code,
        mrp: item.mrp,
        unit_price: item.unit_price,
        quantity: item.quantity,
        discount_type: item.discount_type,
        discount_percentage: item.discount_percentage,
        gst_percentage: item.gst_percentage,
    })),
    bill_discount_percentage: cartBillDiscountPercentage,
};

const sale = await createSale(storeId, request);
if (sale) {
    await addPayment(storeId, sale.id, { payment_method: "CASH", amount: cartTotals.total_amount, cash_tendered: 500 });
    const result = await completeSale(sale.id);
    if (result?.success) {
        clearCart();
        toast.success(`Invoice ${result.invoice_number} created!`);
    }
}
```

### Process a return

```typescript
const { createReturn, approveReturn, completeReturn } = useSalesStore();

const ret = await createReturn(storeId, {
    sale_id: saleId,
    return_reason: "Defective product",
    items: [{ sale_item_id, product_id, product_name, product_code, unit_price, return_quantity: 1 }],
});

if (ret) {
    await approveReturn(storeId, ret.id, { approved: true });
    await completeReturn(storeId, ret.id, "REFUND-REF-001");
}
```

---

## Dependencies

- **Supabase Client**: `@/lib/supabase/client`
- **Zustand**: State management with devtools middleware
- **Zod**: Schema validation
- **React Hook Form**: Form handling with zodResolver

## Related Modules

- **Shifts**: `shifts.service.ts` / `shifts.store.ts` — Shift must be OPEN for sales
- **Products**: `product.service.ts` — Product data for cart items
- **Customers**: `customers.service.ts` — Customer search and credit management
- **Inventory**: `inventory.service.ts` — Stock deducted on sale completion, restored on returns
