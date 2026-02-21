# Cash Shifts & Cash Movements Module

## Overview

The Shifts module manages the POS cash register lifecycle: **open → suspend/resume → close** with full cash reconciliation, mid-shift cash movements (cash-in, cash-out, safe drops, petty cash), and dashboard analytics. A shift **must** be open before any sale can be created — it is the gate for the entire POS billing flow.

Integrates with the `cash_shifts` and `cash_movements` tables in Phase 3 (`7_point-of-sale.sql`), using Supabase RLS for row-level security and the `close_shift()` RPC function for atomic shift closing.

---

## Architecture

```
src/
├── types/
│   └── shifts.types.ts           # TypeScript interfaces, enums, request/response types
├── validations/
│   └── shifts.validation.ts      # Zod schemas for form validation
├── utils/
│   └── shifts.utils.ts           # Formatting, status helpers, calculations, export
├── services/
│   └── shifts.service.ts         # Supabase CRUD operations (data layer)
├── stores/
│   └── shifts.store.ts           # Zustand state management with cache & optimistic UI
supabase/
└── migrations/
    └── 7_point-of-sale.sql       # Database tables, RLS, triggers, RPC functions
```

---

## Database Tables

| Table | Description |
|---|---|
| `cash_shifts` | Cash register shift master with opening/closing reconciliation |
| `cash_movements` | Mid-shift cash-in/out log (petty cash, safe drops, etc.) |

### `cash_shifts` Columns

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `store_id` | UUID (FK → stores) | Multi-tenant reference |
| `opened_by` | UUID (FK → auth.users) | Cashier who opened |
| `closed_by` | UUID (FK → auth.users) | Who closed the shift |
| `terminal_id` | TEXT | POS terminal identifier |
| `terminal_name` | TEXT | Human-friendly terminal label |
| `shift_date` | DATE | Date the shift was opened |
| `opened_at` | TIMESTAMPTZ | When shift was opened |
| `closed_at` | TIMESTAMPTZ | When shift was closed |
| `opening_cash` | DECIMAL(12,2) | Cash in drawer at shift open |
| `opening_notes` | TEXT | Notes for opening |
| `closing_cash_expected` | DECIMAL(12,2) | System-calculated expected cash |
| `closing_cash_actual` | DECIMAL(12,2) | Physically counted cash at close |
| `cash_difference` | DECIMAL(12,2) | GENERATED: actual − expected |
| `closing_notes` | TEXT | Notes for closing |
| `total_sales_count` | INTEGER | Number of completed sales |
| `total_sales_amount` | DECIMAL(12,2) | Total sales revenue |
| `total_returns_count` | INTEGER | Returns processed |
| `total_returns_amount` | DECIMAL(12,2) | Total return value |
| `total_discount_given` | DECIMAL(12,2) | Total discounts |
| `total_tax_collected` | DECIMAL(12,2) | Total tax |
| `cash_sales` | DECIMAL(12,2) | Cash payment total |
| `card_sales` | DECIMAL(12,2) | Card payment total |
| `upi_sales` | DECIMAL(12,2) | UPI payment total |
| `other_sales` | DECIMAL(12,2) | Other methods total |
| `cash_in` | DECIMAL(12,2) | Mid-shift cash added |
| `cash_out` | DECIMAL(12,2) | Mid-shift cash removed |
| `status` | shift_status ENUM | OPEN, CLOSED, SUSPENDED |

### `cash_movements` Columns

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `store_id` | UUID (FK → stores) | Multi-tenant reference |
| `shift_id` | UUID (FK → cash_shifts) | Parent shift |
| `movement_type` | TEXT | CASH_IN, CASH_OUT, SAFE_DROP, PETTY_CASH, OPENING, CLOSING |
| `amount` | DECIMAL(12,2) | Movement amount (always positive) |
| `reason` | TEXT | Reason for the movement |
| `authorized_by` | UUID (FK → auth.users) | Who authorized (for large amounts) |
| `performed_by` | UUID (FK → auth.users) | Who performed the movement |
| `created_at` | TIMESTAMPTZ | Timestamp |

### Key Constraints
- `UNIQUE(store_id, terminal_id, status) DEFERRABLE` — Only one OPEN shift per terminal per store
- `amount > 0` on cash_movements
- Shift date defaults to `CURRENT_DATE`
- `cash_difference` is a computed/stored column: `closing_cash_actual - closing_cash_expected`

### RLS Policies
- **cash_shifts SELECT**: Users in same store or super admin
- **cash_shifts ALL**: Own shifts or `manage_cash_drawer` permission
- **cash_movements SELECT**: Users in same store or super admin
- **cash_movements INSERT**: `manage_cash_drawer` permission

### Roles with Access
| Role | Permissions |
|---|---|
| `super_admin` | Full access across all stores |
| `store_admin` | Full access within their store |
| `manager` | Full CRUD + view all shifts |
| `cashier` | Open/close own shifts, add movements |
| `accountant` | View-only (reports) |

---

## Types (`shifts.types.ts`)

### Enums
| Type | Values |
|---|---|
| `ShiftStatus` | `OPEN`, `CLOSED`, `SUSPENDED` |
| `CashMovementType` | `CASH_IN`, `CASH_OUT`, `SAFE_DROP`, `PETTY_CASH`, `OPENING`, `CLOSING` |

### Core Interfaces
| Interface | Description |
|---|---|
| `CashShift` | Full shift record (matches DB schema) |
| `CashMovement` | Cash movement record |
| `EnrichedCashShift` | Shift + movements + cashier profile names |
| `TodayShiftSummary` | View-backed today summary per shift |
| `CloseShiftResult` | RPC response from `close_shift()` |
| `ShiftDashboardStats` | Aggregated today stats |

### Request Types
| Type | Use |
|---|---|
| `OpenShiftRequest` | Open a new shift with opening cash |
| `CloseShiftRequest` | Close with actual closing cash |
| `SuspendShiftRequest` | Suspend with reason |
| `ResumeShiftRequest` | Resume with optional notes |
| `CreateCashMovementRequest` | Record a cash movement |
| `UpdateShiftNotesRequest` | Update opening/closing notes |
| `ShiftFilters` | Filter params (status, terminal, date range, discrepancy) |
| `ShiftPagination` | Sort + pagination parameters |

### Response Types
| Type | Use |
|---|---|
| `ShiftListResponse` | Paginated list with metadata |
| `CashMovementListResponse` | Movement list with total count |

---

## Validation (`shifts.validation.ts`)

All forms validated with Zod. Schemas auto-transform and sanitize inputs.

| Schema | Description |
|---|---|
| `openShiftSchema` | Opening cash (≥0, ≤9,999,999), optional terminal, notes |
| `closeShiftSchema` | Closing cash actual (≥0), optional notes |
| `suspendShiftSchema` | Reason required (min 3 chars) |
| `resumeShiftSchema` | Optional notes |
| `createCashMovementSchema` | Type, amount (>0), reason, optional authorization |
| `updateShiftNotesSchema` | Optional opening/closing notes |
| `shiftFiltersSchema` | Validate filter inputs |
| `shiftPaginationSchema` | Validate page/limit/sort params |

### Cross-Field Validations
- **Safe drops require authorization**: `authorized_by` is required when `movement_type` is `SAFE_DROP`

---

## Service (`shifts.service.ts`)

All methods return `ServiceResponse<T>` (`{ data: T | null, error: string | null }`).

### Shift Lifecycle
| Method | Description |
|---|---|
| `open(storeId, data)` | Open a new shift (handles unique constraint violation) |
| `close(storeId, shiftId, data)` | Close via `close_shift()` RPC (atomic totals calc) |
| `suspend(storeId, shiftId, data)` | Suspend an OPEN shift |
| `resume(storeId, shiftId)` | Resume a SUSPENDED shift back to OPEN |

### Shift Queries
| Method | Description |
|---|---|
| `getById(storeId, shiftId)` | Get enriched shift with movements + profiles |
| `getList(storeId, filters?, pagination?)` | Paginated, filtered, sorted list |
| `getOpenShift(storeId, terminalId?)` | Current user's open/suspended shift |
| `getAllOpenShifts(storeId)` | All open shifts in store (manager view) |
| `getTodaySummary(storeId)` | Uses `v_today_shift_summary` DB view |
| `getRecent(storeId, limit?)` | Recent closed shifts |
| `getDiscrepancies(storeId, limit?)` | Shifts with cash discrepancies |
| `getByDateRange(storeId, from, to)` | Shifts in a date range |
| `getTodayShiftCount(storeId)` | Quick count of today's shifts |
| `getDashboardStats(storeId)` | Computed from today's shifts |

### Shift Updates
| Method | Description |
|---|---|
| `updateNotes(storeId, shiftId, data)` | Update opening/closing notes |
| `hasOpenShift(storeId, terminalId?)` | Check if any open shift exists |

### Cash Movements
| Method | Description |
|---|---|
| `addCashMovement(storeId, shiftId, data)` | Record movement + update shift totals |
| `getMovements(shiftId)` | List all movements for a shift |
| `getStoreMovements(storeId, dateFrom?, dateTo?)` | All store movements with date filter |
| `deleteCashMovement(storeId, movementId, shiftId)` | Delete + adjust shift totals (open shifts only) |

---

## Store (`shifts.store.ts`)

Zustand store with `devtools` middleware for debugging.

### State Shape
```typescript
{
  shifts: CashShift[];
  currentShift: EnrichedCashShift | null;
  activeShift: CashShift | null;         // Current user's open/suspended shift
  openShifts: CashShift[];               // All open shifts (manager view)
  todaySummary: TodayShiftSummary[];
  dashboardStats: ShiftDashboardStats | null;
  recentShifts: CashShift[];
  discrepancyShifts: CashShift[];
  filters: ShiftFilters;
  pagination: ShiftPagination;
  totalShifts: number;
  totalPages: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isSaving: boolean;
  error: string | null;
  selectedShiftIds: string[];
  lastFetch: number | null;
  cacheTimeout: number;                  // 5 minutes
  movementsCache: Map<shiftId, { data, fetchedAt }>;
}
```

### Key Features

#### Optimistic UI Updates
All mutations apply changes **immediately** to the local state before the server responds. If the server returns an error, the previous state is **restored automatically**.

```typescript
// Example: Close shift
const result = await closeShift(storeId, shiftId, { closing_cash_actual: 5000 });
// UI updates instantly: status → CLOSED, activeShift → null
// If server fails, reverts to previous state
```

Optimistic updates are implemented for:
- `closeShift` — removes from openShifts, clears activeShift, marks CLOSED
- `suspendShift` — marks SUSPENDED immediately
- `resumeShift` — marks OPEN immediately
- `updateShiftNotes` — updates notes immediately
- `addCashMovement` — updates shift cash_in/cash_out totals + movements cache
- `deleteCashMovement` — removes from cache + adjusts totals

#### Cache Strategy
- **List cache**: 5-minute TTL on shift list. Invalidated on filter/pagination changes.
- **Movements cache**: Per-shift Map cache with 5-minute TTL.
- `forceRefresh` parameter bypasses cache on any fetch.
- `invalidateCache()` / `clearMovementsCache()` for manual control.

#### Filter & Pagination
- `setFilters()` resets to page 1 and invalidates cache automatically.
- `setPagination()` invalidates cache for fresh server data.
- Server-side filtering via Supabase query builder (status, terminal, date range, search, discrepancy).

---

## Utils (`shifts.utils.ts`)

### Display
| Function | Description |
|---|---|
| `getShiftStatusLabel(status)` | Human-readable status name |
| `getShiftStatusColor(status)` | Tailwind badge classes |
| `getCashMovementTypeLabel(type)` | "Cash In", "Safe Drop", etc. |
| `getCashMovementTypeColor(type)` | Tailwind badge classes |

### Formatting
| Function | Description |
|---|---|
| `formatCurrency(amount)` | INR formatting (₹1,234.56) |
| `formatDate(dateString)` | "15 Jun 2025" |
| `formatDateTime(dateString)` | "15 Jun 2025, 09:30 AM" |
| `formatTime(dateString)` | "09:30 AM" |
| `formatRelativeTime(dateString)` | "5m ago", "2h ago" |
| `formatShiftDuration(shift)` | "4h 32m" |
| `getShiftDurationMinutes(shift)` | Numeric duration in minutes |

### Status Checks
| Function | Description |
|---|---|
| `canCloseShift(shift)` | Only OPEN shifts |
| `canSuspendShift(shift)` | Only OPEN shifts |
| `canResumeShift(shift)` | Only SUSPENDED shifts |
| `canAddCashMovement(shift)` | Only OPEN shifts |
| `canCreateSale(shift)` | Only OPEN shifts |
| `isShiftActive(shift)` | OPEN or SUSPENDED |
| `hasDiscrepancy(shift)` | Cash difference ≠ 0 |
| `getDiscrepancyAmount(shift)` | Absolute discrepancy value |
| `getDiscrepancyType(shift)` | "shortage" / "excess" / "none" |

### Calculations
| Function | Description |
|---|---|
| `calculateExpectedClosingCash(shift)` | opening + cash_sales + cash_in − cash_out |
| `calculateShiftRevenue(shift)` | Sum of all payment method sales |
| `calculateNetCashFlow(movements)` | Net flow from movements array |
| `summarizeCashMovements(movements)` | Breakdown by movement type |

### Search & Filter
| Function | Description |
|---|---|
| `filterShiftsBySearch(shifts, query)` | Client-side multi-field search |
| `sortShifts(shifts, sortBy, sortOrder)` | Client-side sorting |

### Dashboard
| Function | Description |
|---|---|
| `getEmptyShiftDashboardStats()` | Default empty stats object |
| `computeShiftDashboardStats(shifts)` | Client-side stats from shift array |

### Export
| Function | Description |
|---|---|
| `exportShiftsToCSV(shifts)` | Generate CSV string for shift list |
| `exportCashMovementsToCSV(movements)` | Generate CSV for cash movements |
| `downloadCSV(csv, filename)` | Trigger browser download |

---

## Usage Examples

### Check for active shift before POS
```tsx
const { activeShift, fetchActiveShift } = useShiftsStore();

useEffect(() => {
  fetchActiveShift(storeId);
}, [storeId]);

if (!activeShift) {
  return <OpenShiftDialog />;
}
// POS is now available
```

### Open a new shift
```tsx
import { openShiftSchema } from "@/validations/shifts.validation";

const parsed = openShiftSchema.safeParse({
  opening_cash: 5000,
  terminal_name: "Counter 1",
});

if (parsed.success) {
  const shift = await openShift(storeId, parsed.data);
  // UI instantly shows the new active shift
}
```

### Close a shift
```tsx
import { closeShiftSchema } from "@/validations/shifts.validation";

const parsed = closeShiftSchema.safeParse({
  closing_cash_actual: 12500,
  closing_notes: "All clear",
});

if (parsed.success) {
  const result = await closeShift(storeId, shiftId, parsed.data);
  // UI instantly: shift → CLOSED, activeShift → null
  // result contains cash_difference, expected vs actual
}
```

### Record a cash movement
```tsx
import { createCashMovementSchema } from "@/validations/shifts.validation";

const parsed = createCashMovementSchema.safeParse({
  movement_type: "SAFE_DROP",
  amount: 10000,
  reason: "Safe drop — excess cash in drawer",
  authorized_by: managerId,
});

if (parsed.success) {
  await addCashMovement(storeId, shiftId, parsed.data);
  // Shift cash_out total updates immediately
}
```

### Suspend and resume a shift
```tsx
// Suspend
await suspendShift(storeId, shiftId, { reason: "Lunch break" });
// UI: status → SUSPENDED, canCreateSale → false

// Resume
await resumeShift(storeId, shiftId);
// UI: status → OPEN, canCreateSale → true
```

### Fetch shift with filters
```tsx
const { shifts, fetchShifts, setFilters } = useShiftsStore();

// Apply filter for discrepancy shifts
setFilters({ has_discrepancy: true, date_from: "2025-01-01" });
await fetchShifts(storeId, true);
```

### Export shifts to CSV
```tsx
import { exportShiftsToCSV, downloadCSV } from "@/utils/shifts.utils";

const csv = exportShiftsToCSV(shifts);
downloadCSV(csv, `shifts-${new Date().toISOString().split("T")[0]}.csv`);
```

### Dashboard stats
```tsx
const { dashboardStats, fetchDashboardStats } = useShiftsStore();

useEffect(() => {
  fetchDashboardStats(storeId);
}, [storeId]);

// dashboardStats.today_total_revenue, .open_shifts_count, etc.
```

---

## Shift Lifecycle Flow

```
[No Shift] → Open → [OPEN] → Suspend → [SUSPENDED] → Resume → [OPEN]
                       ↓                                         ↓
                     Close                                     Close
                       ↓                                         ↓
                   [CLOSED]                                  [CLOSED]
```

### Rules
1. **Only one OPEN shift per terminal per store** (DB constraint)
2. **Sales require an OPEN shift** (`validate_shift_open` trigger)
3. **Cash movements only on OPEN shifts** (service validates)
4. **Close calculates all totals atomically** (`close_shift()` RPC)
5. **Cash difference is auto-computed** (GENERATED ALWAYS column)

---

## File Reference

| File | Purpose |
|---|---|
| `src/types/shifts.types.ts` | All interfaces, enums, request/response types |
| `src/validations/shifts.validation.ts` | Zod schemas for all shift forms |
| `src/utils/shifts.utils.ts` | Display, status checks, calculations, export helpers |
| `src/services/shifts.service.ts` | Supabase CRUD + RPC + cash movements |
| `src/stores/shifts.store.ts` | Zustand state with cache + optimistic UI |
| `supabase/migrations/7_point-of-sale.sql` | DB tables + RLS + triggers + RPC functions |
