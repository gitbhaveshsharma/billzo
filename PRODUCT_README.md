# Product Module

Complete product, inventory, and catalog management system for multi-store retail operations.

---

## Table of Contents

1. [Overview](#overview)
2. [Database Tables](#database-tables)
3. [Architecture](#architecture)
4. [Types](#types)
5. [Validations](#validations)
6. [Utilities](#utilities)
7. [Service Layer](#service-layer)
8. [Store (Zustand)](#store-zustand)
9. [Usage Examples](#usage-examples)

---

## Overview

The Product module manages the entire product lifecycle:

- **Catalog Management** – Products, categories, units of measure, variants, barcodes
- **Inventory Tracking** – Stock levels, transactions, batches, expiry management
- **Pricing** – GST/CGST/SGST/IGST/cess, MRP, selling price, purchase price, margins
- **Supplier Links** – Supplier-product mapping with lead times and MOQs
- **Stock Alerts** – Automatic low-stock detection via database triggers
- **POS Support** – Multi-format barcode lookup (product, variant, additional barcodes)

---

## Database Tables

Source: `supabase/migrations/5_inventory_supplier.sql`

| # | Table | Description |
|---|-------|-------------|
| 17 | `units_of_measure` | Weight, volume, length, quantity, time units with conversion factors |
| 20 | `categories` | Hierarchical categories (parent → child) with level/path tracking |
| 21 | `products` | Core product catalog (GST, pricing, barcode, dimensions, etc.) |
| 22 | `product_barcodes` | Additional barcodes per product (EAN-13, UPC-A, Code-128, etc.) |
| 23 | `product_variants` | Product variants with attribute maps and independent pricing |
| 24 | `inventory` | Per-product per-store stock levels (on_hand, committed, in_transit) |
| 25 | `inventory_transactions` | All stock movements with auto-inventory update trigger |
| 26 | `product_batches` | Batch/lot tracking with manufacturing and expiry dates |
| 27 | `supplier_products` | Supplier-product links (cost, MOQ, lead time, preferred flag) |
| 28 | `price_history` | Historical price change tracking |
| 29 | `stock_alerts` | Auto-generated low-stock alerts via `check_low_stock()` trigger |

### Key Database Features

- **Generated columns**: `inventory.quantity_available` = `on_hand - committed`, `inventory.total_value` = `on_hand * unit_cost`
- **Auto inventory updates**: `update_inventory_on_transaction()` trigger adjusts inventory on every transaction INSERT
- **Low stock alerts**: `check_low_stock()` trigger auto-creates alerts when `quantity_on_hand <= reorder_point`
- **Barcode validation**: `validate_barcode_format()` trigger warns on non-standard barcode formats
- **Auto-create from Purchase**: `auto_create_product_from_po_item()` trigger on `purchase_order_items` automatically creates a product when a purchase order item references a `product_id` that doesn't exist yet. Fields like name, SKU, HSN, barcode, GST, MRP, unit are copied from the PO item. See `9_auto_create_product_from_po.sql`
- **RLS**: `manage_products` permission for products/variants/barcodes; `manage_inventory` for inventory/batches/alerts

---

## Architecture

```
src/
├── types/product.types.ts          # All interfaces, enums, request/filter types
├── validations/product.validation.ts  # Zod schemas with cross-field validation
├── utils/product.utils.ts          # Formatting, calculations, exports, helpers
├── services/product.service.ts     # Supabase CRUD operations
└── stores/product.store.ts         # Zustand store with optimistic UI & caching
```

### Design Patterns

- **ServiceResponse&lt;T&gt;** – All service methods return `{ data: T | null; error: string | null }`
- **Optimistic UI** – Mutations update state immediately, rollback on failure
- **Map-based Caching** – 5-minute TTL for variants, barcodes, batches, transactions, price history, supplier products
- **Zod Validation** – All forms validated with cross-field rules and `emptyToUndefined` transforms
- **Enriched Types** – Detail views join related data (variants, barcodes, inventory, category, unit)

---

## Types

**File**: `src/types/product.types.ts`

### Enums & Constants

| Constant | Values |
|----------|--------|
| `UNIT_CATEGORIES` | weight, volume, length, quantity, time |
| `BARCODE_TYPES` | EAN-13, EAN-8, UPC-A, UPC-E, Code-128, Code-39, QR, custom |
| `PRICE_TYPES` | mrp, selling_price, purchase_price, wholesale_price, dealer_price |
| `TRANSACTION_TYPES` | purchase, sale, adjustment, return, transfer, damage, expired, opening_stock |
| `REFERENCE_TYPES` | purchase_order, purchase_receipt, sale_invoice, manual_adjustment, stock_transfer, return_note |
| `ALERT_TYPES` | low_stock, out_of_stock, overstock, expiring_soon |
| `ALERT_SEVERITIES` | low, medium, high, critical |
| `PRICE_HISTORY_TYPES` | mrp_change, selling_price_change, purchase_price_change, cost_update |
| `GST_RATES` | 0, 5, 12, 18, 28 |

### Core Interfaces

| Interface | Key Fields |
|-----------|-----------|
| `UnitOfMeasure` | name, symbol, category, base_unit, conversion_factor |
| `Category` | name, parent_category_id, level, path, is_leaf, image_url |
| `Product` | product_code, name, barcode, category_id, unit_id, hsn_code, gst_rate, mrp, selling_price, purchase_price |
| `ProductBarcode` | product_id, barcode, barcode_type, is_primary |
| `ProductVariant` | product_id, variant_name, sku, barcode, attributes, mrp, selling_price |
| `Inventory` | product_id, store_id, quantity_on_hand, quantity_committed, quantity_available, reorder_point |
| `InventoryTransaction` | product_id, transaction_type, quantity, unit_cost, reference_type, reference_id |
| `ProductBatch` | product_id, batch_number, manufacturing_date, expiry_date, initial_quantity, current_quantity |
| `SupplierProduct` | supplier_id, product_id, supplier_sku, cost_price, moq, lead_time_days, is_preferred |
| `PriceHistory` | product_id, price_type, old_price, new_price, changed_by |
| `StockAlert` | product_id, alert_type, severity, current_quantity, threshold_quantity, is_resolved |

### Enriched Types

| Type | Joins |
|------|-------|
| `EnrichedProduct` | + variants, barcodes, inventory, batches, supplier_products, category, unit |
| `EnrichedCategory` | + children[], product_count |
| `EnrichedInventory` | + product, variant |
| `EnrichedStockAlert` | + product |

### Request Types

Create/Update request types for: Unit, Category, Product, ProductBarcode, ProductVariant, StockAdjustment, UpdateInventory, ProductBatch, SupplierProduct, ResolveStockAlert

### Filters & Pagination

- `ProductFilters` – search, category_id, is_active, min/max_price, has_variants, low_stock
- `CategoryFilters` – search, parent_category_id, is_leaf
- `InventoryFilters` – product_id, variant_id, low_stock, out_of_stock
- `InventoryTransactionFilters` – product_id, transaction_type, date_from, date_to, reference_type
- `StockAlertFilters` – alert_type, severity, is_resolved, product_id
- `ProductPagination` – page, limit, sort_by (ProductSortField), sort_order

### Dashboard Types

- `ProductDashboardStats` – total_products, active_products, total_categories, low_stock_count, out_of_stock_count, expiring_soon_count, total_inventory_value, alerts_count
- `InventorySummary` – total_items, total_value, low_stock_items, out_of_stock_items, items_by_category[]

---

## Validations

**File**: `src/validations/product.validation.ts`

### Schemas

| Schema | Key Rules |
|--------|-----------|
| `createUnitSchema` | name 1-50 chars, symbol 1-10, category from enum, conversion_factor > 0 if not base |
| `createCategorySchema` | name 2-100 chars, optional parent_category_id, description max 500 |
| `createProductSchema` | product_code 2-50, name 2-200, selling_price ≤ mrp, gst_rate from [0,5,12,18,28] |
| `createProductBarcodeSchema` | barcode 3-50, barcode_type from enum |
| `createProductVariantSchema` | variant_name 2-100, attributes non-empty object, selling_price ≤ mrp |
| `stockAdjustmentSchema` | quantity ≠ 0, reason required for adjustments, location required for transfers |
| `createProductBatchSchema` | batch_number 1-100, expiry > manufacturing date, current ≤ initial quantity |
| `createSupplierProductSchema` | cost_price ≥ 0, moq ≥ 1, lead_time_days ≥ 0 |
| `resolveStockAlertSchema` | Optional resolution_notes max 500 |
| `productFiltersSchema` | Pagination page ≥ 1, limit 1-100, sort_order asc/desc |

### Cross-Field Validations

- Selling price must be ≤ MRP (products and variants)
- Reorder level must be ≥ minimum stock level
- Expiry date must be after manufacturing date
- Current quantity must be ≤ initial quantity
- Stock adjustment reason required for adjustment/damage/expired types
- Transfer location required when transaction_type is "transfer"

### Inferred Form Types

All schemas export inferred TypeScript types (e.g., `CreateProductFormData`, `StockAdjustmentFormData`) for use with `react-hook-form` and `zodResolver`.

---

## Utilities

**File**: `src/utils/product.utils.ts`

### Label & Color Maps

| Function | Purpose |
|----------|---------|
| `getTransactionTypeLabel/Color` | Labels/badge colors for 8 transaction types |
| `getAlertTypeLabel/Color` | Labels/badge colors for 4 alert types |
| `getAlertSeverityLabel/Color` | Labels/badge colors for 4 severity levels |
| `getBarcodeTypeLabel` | Display names for 8 barcode formats |
| `getPriceTypeLabel` | Display names for 5 price types |
| `getPriceHistoryTypeLabel` | Display names for 4 price change types |
| `getUnitCategoryLabel` | Display names for 5 unit categories |

### Formatting

| Function | Example |
|----------|---------|
| `formatCurrency(1500)` | `₹1,500.00` |
| `formatPercentage(18.5)` | `18.50%` |
| `formatDate(iso)` | `01 Jan 2025` |
| `formatRelativeTime(iso)` | `2 hours ago` / `in 3 days` |
| `formatQuantity(10.5, "kg")` | `10.5 kg` |

### Stock Status

| Function | Returns |
|----------|---------|
| `getStockStatusLabel(0, 10)` | `"Out of Stock"` |
| `getStockStatusColor(5, 10)` | `"yellow"` (Low Stock) |

### Pricing & Tax

| Function | Purpose |
|----------|---------|
| `getEffectivePrice(product)` | Returns variant selling_price or product selling_price |
| `calculateDiscountPercentage(mrp, selling)` | Discount % from MRP |
| `calculateProfitMargin(selling, purchase)` | Profit margin % |
| `calculateGstSplit(amount, rate, isIntraState)` | CGST/SGST (intra) or IGST (inter) |
| `calculateCess(amount, cessRate)` | Cess amount |
| `calculateProductTax(product, qty, isIntraState)` | Full tax breakdown |

### Category Tree

| Function | Purpose |
|----------|---------|
| `buildCategoryPath(category, allCategories)` | Build full path: "Parent > Child > Leaf" |
| `buildCategoryTree(categories)` | Flat list → nested tree with children[] |
| `flattenCategoryTree(tree, depth)` | Tree → flat list with depth level |

### Batch & Expiry

| Function | Purpose |
|----------|---------|
| `getDaysUntilExpiry(date)` | Days until expiry (negative if expired) |
| `getExpiryStatusLabel/Color(date)` | "Expired" / "Expiring Soon" / "Valid" |
| `isBatchExpiringSoon(batch, days)` | Check if batch expires within N days |
| `isBatchExpired(batch)` | Check if batch is past expiry |

### Inventory Calculations

| Function | Purpose |
|----------|---------|
| `isLowStock(inv)` | quantity_on_hand ≤ reorder_point |
| `isOutOfStock(inv)` | quantity_on_hand = 0 |
| `calculateInventoryValue(items)` | Sum of (on_hand × unit_cost) |

### Search & Sort

| Function | Purpose |
|----------|---------|
| `filterProductsBySearch(products, query)` | Fuzzy match on name, code, barcode, brand |
| `sortProducts(products, field, order)` | Sort by name/code/price/stock/created_at |

### CSV Export

| Function | Columns |
|----------|---------|
| `exportProductsToCSV` | Code, Name, Category, Brand, MRP, Selling Price, Purchase Price, GST, Stock, Status |
| `exportInventoryToCSV` | Product, Variant, On Hand, Committed, Available, Reorder Point, Total Value |
| `exportTransactionsToCSV` | Date, Product, Type, Quantity, Unit Cost, Total, Reference |

### Dashboard

| Function | Purpose |
|----------|---------|
| `getEmptyProductDashboardStats()` | Zero-initialized dashboard stats |
| `computeProductStats(products, inventory, alerts, batches)` | Compute all dashboard stats from raw data |

### Unit Conversion

| Function | Purpose |
|----------|---------|
| `convertUnit(value, fromUnit, toUnit)` | Convert between units using conversion factors |

### GST Display

| Function | Purpose |
|----------|---------|
| `formatProductGst(product)` | e.g., `"18% GST (HSN: 1234)"` |
| `formatProductTaxBreakdown(product, qty, intraState)` | Full tax breakdown string |

---

## Service Layer

**File**: `src/services/product.service.ts`

All methods return `Promise<ServiceResponse<T>>`.

### Product Operations

| Method | Description |
|--------|-------------|
| `createProduct(storeId, data)` | Create product with auto-generated code if not provided |
| `getProductById(storeId, productId)` | Get enriched product with all relations |
| `getProductList(storeId, filters, pagination)` | Paginated product list with filters |
| `updateProduct(storeId, productId, data)` | Update product fields |
| `deleteProduct(storeId, productId)` | Soft/hard delete product |
| `toggleProductActive(storeId, productId, isActive)` | Toggle active status |
| `lookupByBarcode(storeId, barcode)` | POS barcode lookup (product → barcodes → variants → alternate) |

### Variant Operations

| Method | Description |
|--------|-------------|
| `getVariants(productId)` | List all variants for a product |
| `createVariant(storeId, data)` | Add variant with attributes |
| `updateVariant(storeId, variantId, data)` | Update variant |
| `deleteVariant(storeId, variantId)` | Remove variant |

### Barcode Operations

| Method | Description |
|--------|-------------|
| `getBarcodes(productId)` | List all additional barcodes |
| `createBarcode(storeId, data)` | Add barcode entry |
| `updateBarcode(storeId, barcodeId, data)` | Update barcode |
| `deleteBarcode(storeId, barcodeId)` | Remove barcode |

### Category Operations

| Method | Description |
|--------|-------------|
| `getCategories(storeId, filters?)` | List categories with optional filters |
| `getCategoryById(storeId, categoryId)` | Get category with children and product count |
| `createCategory(storeId, data)` | Create category (auto-calculates level/path) |
| `updateCategory(storeId, categoryId, data)` | Update category (recalculates path on rename) |
| `deleteCategory(storeId, categoryId)` | Delete category |

### Unit Operations

| Method | Description |
|--------|-------------|
| `getUnits(storeId)` | List all units of measure |
| `createUnit(storeId, data)` | Create unit |
| `updateUnit(storeId, unitId, data)` | Update unit |
| `deleteUnit(storeId, unitId)` | Delete unit |

### Inventory Operations

| Method | Description |
|--------|-------------|
| `getInventory(storeId, filters?)` | Get inventory with product/variant joins |
| `getInventoryByProduct(storeId, productId)` | Get inventory for specific product |
| `updateInventory(storeId, inventoryId, data)` | Update reorder_point, location, etc. |
| `createStockAdjustment(storeId, data)` | Create inventory transaction (triggers auto-update) |

### Transaction Operations

| Method | Description |
|--------|-------------|
| `getTransactions(storeId, filters?)` | List transactions with date/type filters |

### Batch Operations

| Method | Description |
|--------|-------------|
| `getBatches(storeId, productId?)` | List batches, optionally per product |
| `createBatch(storeId, data)` | Create batch with manufacturing/expiry dates |
| `updateBatch(storeId, batchId, data)` | Update batch |
| `deleteBatch(storeId, batchId)` | Delete batch |
| `getExpiringBatches(storeId, days)` | Get batches expiring within N days |

### Supplier Product Operations

| Method | Description |
|--------|-------------|
| `getSupplierProducts(storeId, productId?, supplierId?)` | List supplier-product links |
| `createSupplierProduct(storeId, data)` | Link supplier to product |
| `updateSupplierProduct(storeId, spId, data)` | Update link |
| `deleteSupplierProduct(storeId, spId)` | Remove link |

### Price History Operations

| Method | Description |
|--------|-------------|
| `getPriceHistory(storeId, productId, variantId?)` | Get price change history |
| `recordPriceChange(storeId, data)` | Record a price change |

### Stock Alert Operations

| Method | Description |
|--------|-------------|
| `getStockAlerts(storeId, filters?)` | Get alerts with product joins |
| `resolveStockAlert(storeId, alertId, data?)` | Mark alert as resolved |

### Dashboard & Utility

| Method | Description |
|--------|-------------|
| `getDashboardStats(storeId)` | Parallel queries for all dashboard stats |
| `getInventorySummary(storeId)` | Inventory breakdown by category |
| `isProductCodeUnique(storeId, code, excludeId?)` | Check product code uniqueness |
| `isBarcodeUnique(storeId, barcode, excludeId?)` | Check barcode uniqueness |
| `getBrands(storeId)` | Get distinct brand names |
| `getLowStockProducts(storeId)` | Products where on_hand ≤ reorder_point |
| `getOutOfStockProducts(storeId)` | Products where on_hand = 0 |

---

## Store (Zustand)

**File**: `src/stores/product.store.ts`

### State

```typescript
interface ProductState {
    // Data
    products: Product[];
    currentProduct: EnrichedProduct | null;
    totalProducts: number;
    totalPages: number;
    categories: Category[];
    units: UnitOfMeasure[];
    inventoryItems: EnrichedInventory[];
    inventorySummary: InventorySummary | null;
    stockAlerts: EnrichedStockAlert[];
    dashboardStats: ProductDashboardStats | null;

    // Filters & Pagination
    filters: ProductFilters;
    pagination: ProductPagination;

    // UI State
    isLoading: boolean;
    isRefreshing: boolean;
    isSaving: boolean;
    error: string | null;
    selectedProductIds: string[];

    // Cache (Map-based, 5-min TTL)
    variantsCache: Map<productId, { data, fetchedAt }>;
    barcodesCache: Map<productId, { data, fetchedAt }>;
    batchesCache: Map<key, { data, fetchedAt }>;
    transactionsCache: Map<key, { data, fetchedAt }>;
    priceHistoryCache: Map<key, { data, fetchedAt }>;
    supplierProductsCache: Map<key, { data, fetchedAt }>;
}
```

### Actions

| Action | Behavior |
|--------|----------|
| `fetchProducts(storeId, forceRefresh?)` | Cache-aware product list fetch |
| `fetchProductById(storeId, productId)` | Load enriched product detail |
| `createProduct(storeId, data)` | Optimistically prepends to list |
| `updateProduct(storeId, productId, data)` | Optimistic update with rollback on error |
| `deleteProduct(storeId, productId)` | Optimistic removal with rollback on error |
| `toggleProductActive(storeId, productId, isActive)` | Optimistic toggle |
| `lookupByBarcode(storeId, barcode)` | POS barcode lookup |
| `fetchVariants/Barcodes(productId, force?)` | Cache-aware fetch, updates currentProduct |
| `createVariant/Barcode(storeId, data)` | Adds to cache and currentProduct |
| `updateVariant/Barcode(storeId, id, data, productId)` | Updates in cache |
| `deleteVariant/Barcode(storeId, id, productId)` | Optimistic removal with rollback |
| `fetchCategories(storeId, filters?)` | Load categories list |
| `createCategory/Unit(storeId, data)` | Appends to list |
| `updateCategory/Unit(storeId, id, data)` | Optimistic update |
| `deleteCategory/Unit(storeId, id)` | Optimistic removal |
| `fetchInventory(storeId, filters?)` | Load enriched inventory |
| `createStockAdjustment(storeId, data)` | Creates transaction, refreshes inventory |
| `fetchBatches(storeId, productId?, force?)` | Cache-aware batch loading |
| `fetchSupplierProducts(storeId, product?, supplier?, force?)` | Cache-aware supplier-product fetch |
| `fetchPriceHistory(storeId, productId, variantId?)` | Cache-aware price history |
| `fetchStockAlerts(storeId, filters?)` | Load alerts with enriched data |
| `resolveStockAlert(storeId, alertId, data?)` | Optimistic resolution |
| `setFilters(partial)` | Merges filters, resets to page 1, invalidates cache |
| `setPagination(partial)` | Merges pagination, invalidates cache |
| `invalidateCache()` | Clears product list cache |
| `clearVariantsCache/BarcodesCache/BatchesCache/TransactionsCache(key?)` | Selective or full cache clear |
| `reset()` | Resets all state to initial values |

---

## Usage Examples

### Fetch Products with Filters

```tsx
"use client";

import { useEffect } from "react";
import { useProductStore } from "@/stores/product.store";

export function ProductList({ storeId }: { storeId: string }) {
    const {
        products,
        isLoading,
        totalProducts,
        fetchProducts,
        setFilters,
        setPagination,
    } = useProductStore();

    useEffect(() => {
        fetchProducts(storeId);
    }, [storeId, fetchProducts]);

    const handleSearch = (search: string) => {
        setFilters({ search });
        fetchProducts(storeId, true);
    };

    return (
        <div>
            <p>Total: {totalProducts}</p>
            {isLoading ? <p>Loading...</p> : (
                products.map((p) => <div key={p.id}>{p.name}</div>)
            )}
        </div>
    );
}
```

### Create Product with Validation

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProductSchema, type CreateProductFormData } from "@/validations/product.validation";
import { useProductStore } from "@/stores/product.store";

export function CreateProductForm({ storeId }: { storeId: string }) {
    const { createProduct, isSaving } = useProductStore();
    const form = useForm<CreateProductFormData>({
        resolver: zodResolver(createProductSchema) as any,
        defaultValues: { gst_rate: 18, is_active: true },
    });

    const onSubmit = async (data: CreateProductFormData) => {
        const product = await createProduct(storeId, data);
        if (product) {
            // Navigate or show success toast
        }
    };

    return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
}
```

### Stock Adjustment

```tsx
import { useProductStore } from "@/stores/product.store";

const { createStockAdjustment } = useProductStore();

await createStockAdjustment(storeId, {
    product_id: "...",
    transaction_type: "adjustment",
    quantity: -5,
    reason: "Damaged goods removed",
});
```

### POS Barcode Scan

```tsx
const { lookupByBarcode } = useProductStore();

const product = await lookupByBarcode(storeId, scannedBarcode);
if (product) {
    // Add to POS cart
}
```

### Category Tree

```tsx
import { buildCategoryTree, flattenCategoryTree } from "@/utils/product.utils";
import { useProductStore } from "@/stores/product.store";

const { categories } = useProductStore();
const tree = buildCategoryTree(categories);
const flatList = flattenCategoryTree(tree);
```

### Tax Calculation

```tsx
import { calculateProductTax, formatProductTaxBreakdown } from "@/utils/product.utils";

const tax = calculateProductTax(product, quantity, true); // intra-state
// { baseAmount, cgst, sgst, igst, cess, totalTax, grandTotal }

const display = formatProductTaxBreakdown(product, quantity, true);
// "Base: ₹1,000.00 | CGST @9%: ₹90.00 | SGST @9%: ₹90.00 | Total: ₹1,180.00"
```

### CSV Export

```tsx
import { exportProductsToCSV, downloadCSV } from "@/utils/product.utils";
import { useProductStore } from "@/stores/product.store";

const { products, categories } = useProductStore();
const csv = exportProductsToCSV(products, categories);
downloadCSV(csv, "products-export.csv");
```

---

## File Summary

| File | Lines | Purpose |
|------|-------|---------|
| `src/types/product.types.ts` | ~700 | Interfaces, enums, request/filter/dashboard types |
| `src/validations/product.validation.ts` | ~500 | Zod schemas with cross-field validation |
| `src/utils/product.utils.ts` | ~700 | Formatting, calculations, exports, helpers |
| `src/services/product.service.ts` | ~900 | Supabase CRUD operations |
| `src/stores/product.store.ts` | ~1100 | Zustand store with optimistic UI & caching |

**Total**: ~3,900 lines of clean, type-safe, maintainable code covering all 11 product-related database tables.
