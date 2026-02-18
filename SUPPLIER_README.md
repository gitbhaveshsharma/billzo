# Supplier Module

## Overview

The Supplier module manages distributors, manufacturers, wholesalers, and retailers for the StorePOS multi-tenant system. It provides full CRUD operations for suppliers, their contacts, and product linkages, with role-based access control enforced via Supabase RLS.

---

## Architecture

```
src/
├── types/
│   └── supplier.types.ts        # TypeScript interfaces, enums, request/response types
├── validations/
│   └── supplier.validation.ts   # Zod schemas for form validation
├── utils/
│   └── supplier.utils.ts        # Formatting, display, search, export helpers
├── services/
│   └── supplier.service.ts      # Supabase CRUD operations (data layer)
├── stores/
│   └── supplier.store.ts        # Zustand state management with cache & optimistic UI
supabase/
└── migrations/
    └── 5_inventory_supplier.sql # Database tables, RLS, triggers (tables 18, 19, 27)
```

---

## Database Tables

| Table | Description |
|---|---|
| `suppliers` | Core supplier/distributor master data with GST, bank, payment terms |
| `supplier_contacts` | Multiple contacts per supplier (primary/authorized flags) |
| `supplier_products` | Supplier-specific product pricing, lead time, MOQ |

### Key Constraints
- `UNIQUE(store_id, supplier_code)` — supplier code unique per store
- GSTIN validated via regex: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$`
- PAN validated via regex: `^[A-Z]{5}[0-9]{4}[A-Z]$`

### RLS Policies
- **SELECT**: Users can view suppliers in their own store (`get_user_store()`) or if super admin
- **ALL (INSERT/UPDATE/DELETE)**: Requires `manage_suppliers` permission on the store

---

## Types (`supplier.types.ts`)

### Enums
| Type | Values |
|---|---|
| `SupplierType` | `manufacturer`, `distributor`, `wholesaler`, `retailer` |
| `PaymentTerm` | `immediate`, `7_days`, `15_days`, `30_days`, `45_days`, `60_days` |

### Core Interfaces
| Interface | Description |
|---|---|
| `Supplier` | Full supplier record (matches DB schema) |
| `SupplierContact` | Contact person linked to a supplier |
| `SupplierProduct` | Product-supplier linkage with pricing |
| `EnrichedSupplier` | Supplier + contacts + product count |

### Request Types
| Type | Use |
|---|---|
| `CreateSupplierRequest` | Create a new supplier |
| `UpdateSupplierRequest` | Partial update (extends Create + status fields) |
| `CreateSupplierContactRequest` | Add contact to supplier |
| `UpdateSupplierContactRequest` | Update existing contact |
| `BlacklistSupplierRequest` | Blacklist with reason |
| `SupplierFilters` | Filter parameters for list queries |
| `SupplierPagination` | Sort + pagination parameters |

---

## Validation (`supplier.validation.ts`)

All forms are validated with Zod. Schemas auto-transform and sanitize inputs.

| Schema | Description |
|---|---|
| `createSupplierSchema` | Full validation for new supplier (GSTIN, PAN, TAN, MSME, phone, email, bank, etc.) |
| `updateSupplierSchema` | Partial (all optional) + blacklist reason required when blacklisting |
| `blacklistSupplierSchema` | Reason required (5-500 chars) |
| `createSupplierContactSchema` | Contact name required, optional designation/department/email/phone |
| `updateSupplierContactSchema` | Partial contact update |
| `supplierFiltersSchema` | Validate filter inputs |
| `supplierPaginationSchema` | Validate page/limit/sort params |

### Validated Formats
- **GSTIN**: `22AAAAA0000A1Z5` (Indian GST)
- **PAN**: `ABCDE1234F`
- **TAN**: `ABCD12345E`
- **MSME**: `UDYAM-XX-00-0000000`
- **IFSC**: `ABCD0123456`
- **UPI**: `name@bank`
- **Phone**: E.164 international format
- **Pincode**: 6 digits (India)

---

## Service (`supplier.service.ts`)

All methods return `ServiceResponse<T>` (`{ data: T | null, error: string | null }`).

### Supplier CRUD
| Method | Description |
|---|---|
| `create(storeId, data)` | Create supplier |
| `getById(storeId, supplierId)` | Get enriched supplier with contacts & product count |
| `getList(storeId, filters?, pagination?)` | Paginated, filtered, sorted list |
| `update(storeId, supplierId, data)` | Update supplier fields |
| `delete(storeId, supplierId)` | Hard delete |
| `deactivate(storeId, supplierId)` | Soft delete (set inactive) |
| `activate(storeId, supplierId)` | Reactivate |
| `togglePreferred(storeId, supplierId, flag)` | Toggle preferred status |
| `blacklist(storeId, supplierId, request)` | Blacklist with reason |
| `unblacklist(storeId, supplierId)` | Remove from blacklist + reactivate |
| `isCodeUnique(storeId, code, excludeId?)` | Check supplier code uniqueness |
| `getStats(storeId)` | Aggregated supplier statistics |

### Contact CRUD
| Method | Description |
|---|---|
| `getContacts(supplierId)` | List all contacts |
| `getContactById(contactId)` | Single contact |
| `addContact(supplierId, data)` | Add contact (auto-unsets existing primary if new is primary) |
| `updateContact(supplierId, contactId, data)` | Update contact |
| `deleteContact(supplierId, contactId)` | Delete contact |
| `setPrimaryContact(supplierId, contactId)` | Set as primary (unsets others) |

### Supplier Products
| Method | Description |
|---|---|
| `getSupplierProducts(storeId, supplierId)` | Products linked to supplier |
| `getProductSuppliers(storeId, productId)` | Suppliers for a product |
| `linkProduct(storeId, supplierId, data)` | Link product with pricing |
| `unlinkProduct(storeId, spId)` | Remove product linkage |
| `updateSupplierProduct(storeId, spId, data)` | Update pricing/lead time |

---

## Store (`supplier.store.ts`)

Zustand store with `devtools` middleware for debugging.

### State Shape
```typescript
{
  suppliers: Supplier[];
  currentSupplier: EnrichedSupplier | null;
  stats: SupplierStats | null;
  supplierProducts: SupplierProduct[];
  filters: SupplierFilters;
  pagination: SupplierPagination;
  totalSuppliers: number;
  totalPages: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isSaving: boolean;
  error: string | null;
  selectedSupplierIds: string[];
  lastFetch: number | null;
  cacheTimeout: number; // 5 minutes
  contactsCache: Map<supplierId, { data, fetchedAt }>;
  productsCache: Map<supplierId, { data, fetchedAt }>;
}
```

### Key Features

#### Optimistic UI Updates
All mutations (create, update, delete, blacklist, contact changes) apply changes **immediately** to the local state before the server responds. If the server returns an error, the previous state is **restored automatically**.

```typescript
// Example: Update supplier
const success = await updateSupplier(storeId, supplierId, { name: "New Name" });
// UI updates instantly. If server fails, reverts to old name.
```

#### Cache Strategy
- **List cache**: 5-minute TTL on supplier list. Invalidated on create/filter/pagination changes.
- **Contacts cache**: Per-supplier Map cache with 5-minute TTL.
- **Products cache**: Per-supplier Map cache with 5-minute TTL.
- `forceRefresh` parameter bypasses cache on any fetch.
- `invalidateCache()` / `clearContactsCache()` / `clearProductsCache()` for manual control.

#### Filter & Pagination
- `setFilters()` resets to page 1 and invalidates cache automatically.
- `setPagination()` invalidates cache for fresh server data.
- Server-side filtering via Supabase query builder (search, type, status, city, state, tags, payment terms, GST status).

---

## Utils (`supplier.utils.ts`)

### Display
| Function | Description |
|---|---|
| `getSupplierTypeLabel(type)` | Human-readable type name |
| `getSupplierTypeBadgeColor(type)` | Tailwind badge classes |
| `getPaymentTermLabel(term)` | "Net 30 Days" etc. |
| `getPaymentTermDays(term)` | Numeric days value |
| `getSupplierStatusBadge(supplier)` | Status label + color |

### Formatting
| Function | Description |
|---|---|
| `formatCurrency(amount)` | INR formatting |
| `formatPercentage(value)` | "12.50%" |
| `formatPhoneDisplay(phone)` | "+91 98765 43210" |
| `formatDate(dateString)` | Localized date |
| `formatRelativeTime(dateString)` | "2d ago" |
| `formatSupplierAddress(supplier)` | Full address string |
| `formatContactDisplay(contact)` | "Name (Designation)" |
| `formatCreditInfo(supplier)` | "Limit: ₹50,000 | 30 days" |
| `maskAccountNumber(number)` | "••••••1234" |

### GST
| Function | Description |
|---|---|
| `extractStateFromGstin(gstin)` | First 2 digits |
| `extractPanFromGstin(gstin)` | Characters 3-12 |
| `isGstRegistered(supplier)` | Boolean check |
| `isGstinPanConsistent(gstin, pan)` | Cross-validate GSTIN ↔ PAN |

### Search & Filter
| Function | Description |
|---|---|
| `filterSuppliersBySearch(suppliers, query)` | Client-side multi-field search |
| `sortSuppliers(suppliers, sortBy, sortOrder)` | Client-side sorting |
| `getUniqueTags(suppliers)` | Extract all unique tags |
| `getUniqueCities(suppliers)` | Extract all unique cities |
| `getUniqueStates(suppliers)` | Extract all unique states |

### Export
| Function | Description |
|---|---|
| `exportSuppliersToCSV(suppliers)` | Generate CSV string |
| `downloadCSV(csv, filename)` | Trigger browser download |

---

## Usage Examples

### Fetch suppliers with filters
```tsx
const { suppliers, fetchSuppliers, setFilters, isLoading } = useSupplierStore();

useEffect(() => {
  fetchSuppliers(storeId);
}, [storeId]);

// Apply filter
setFilters({ type: "distributor", is_active: true });
// Then re-fetch (or call fetchSuppliers with forceRefresh)
fetchSuppliers(storeId, true);
```

### Create supplier with validation
```tsx
import { createSupplierSchema } from "@/validations/supplier.validation";

const parsed = createSupplierSchema.safeParse(formData);
if (!parsed.success) {
  // Handle validation errors
  return;
}

const newSupplier = await createSupplier(storeId, parsed.data);
// UI updates instantly via optimistic update
```

### Manage contacts
```tsx
const contacts = await fetchContacts(supplierId);
await addContact(supplierId, { name: "John", is_primary: true });
await setPrimaryContact(supplierId, contactId);
await deleteContact(supplierId, contactId);
```

### Blacklist / Unblacklist
```tsx
await blacklistSupplier(storeId, supplierId, { reason: "Quality issues" });
// Supplier immediately shows as blacklisted in UI

await unblacklistSupplier(storeId, supplierId);
// Reverts to active state instantly
```

### Export to CSV
```tsx
import { exportSuppliersToCSV, downloadCSV } from "@/utils/supplier.utils";

const csv = exportSuppliersToCSV(suppliers);
downloadCSV(csv, `suppliers-${new Date().toISOString().split("T")[0]}.csv`);
```

---

## File Reference

| File | Lines | Purpose |
|---|---|---|
| `src/types/supplier.types.ts` | Types | All interfaces, enums, request/response types |
| `src/validations/supplier.validation.ts` | Validation | Zod schemas for all supplier forms |
| `src/utils/supplier.utils.ts` | Utilities | Display, formatting, search, export helpers |
| `src/services/supplier.service.ts` | Service | Supabase CRUD + stats + contacts + products |
| `src/stores/supplier.store.ts` | Store | Zustand state with cache + optimistic UI |
| `supabase/migrations/5_inventory_supplier.sql` | DB | Tables 18, 19, 27 + RLS + triggers |
