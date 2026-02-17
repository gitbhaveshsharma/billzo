# Employee Management System

## Overview

This is a comprehensive employee management system for store admins and managers to handle all aspects of employee operations including hiring, role assignment, access control, and performance tracking. The system seamlessly integrates with both `store_users` and `employees` tables in the database.

## Features

### Core Capabilities

- ✅ **Add Employees**: Invite and onboard new employees with complete profile setup
- ✅ **Role Assignment**: Assign and update roles (Admin, Manager, Cashier, Accountant, Inventory Manager)
- ✅ **Access Control**: Activate, deactivate, ban, and unban users
- ✅ **Reset Access**: Reset login attempts, unlock accounts, reset 2FA
- ✅ **Employee Details**: Manage comprehensive employee information including personal, contact, and employment details
- ✅ **Bulk Operations**: Perform actions on multiple employees simultaneously
- ✅ **Real-time Updates**: Optimistic UI updates with automatic cache invalidation
- ✅ **Advanced Filtering**: Filter by role, department, status, employment type
- ✅ **Statistics**: View detailed analytics on employee distribution and engagement

### Permission System

The system implements a hierarchical permission model:

- **Super Admin**: Full access to all organizations and stores
- **Store Admin**: Complete control over their store
- **Manager**: Operational control and employee management
- **Accountant**: Financial operations and compliance
- **Inventory Manager**: Stock and inventory operations
- **Cashier**: Basic sales operations

## Architecture

### File Structure

```
src/
├── types/
│   └── store-users.types.ts         # TypeScript interfaces and types
├── validations/
│   └── store-users.validation.ts    # Zod validation schemas
├── services/
│   └── store-users.service.ts       # API service layer
├── stores/
│   └── store-users.store.ts         # Zustand state management
└── utils/
    └── store-users.utils.ts         # Helper functions and utilities
```

## Database Schema

### Tables

#### 1. `store_users` (Junction Table)

Links users to stores with roles and access control.

**Key Fields**:

- `user_id`: Reference to auth user
- `store_id`: Reference to store
- `role_id`: Assigned role
- `employee_id`: Link to detailed employee record
- `is_active`: User activation status
- `is_banned`: Ban status
- `last_login_at`: Last login timestamp
- `custom_permissions`: JSON object for custom permissions

#### 2. `employees` (Detailed Information)

Stores comprehensive employee data.

**Key Fields**:

- `store_user_id`: Link back to store_users
- `employee_code`: Unique employee identifier
- `personal_info`: Name, DOB, gender, marital status
- `contact_info`: Email, phone, emergency contacts
- `address_info`: Current and permanent addresses
- `government_ids`: Aadhar, PAN, UAN, etc.
- `employment_details`: Type, status, joining date, probation
- `compensation`: Salary, bank details, pay frequency

### Relationships

```
profiles (auth.users)
    ↓
store_users (junction table with role)
    ↓
employees (detailed employee information)
```

## Usage Guide

### 1. Types

Import types for type safety:

```typescript
import type {
  EnrichedStoreUser,
  AddStoreUserRequest,
  UpdateStoreUserRequest,
  StoreUserFilters,
} from "@/types/store-users.types";
```

### 2. Service Layer

Use services for API calls:

```typescript
import { storeUsersService } from "@/services/store-users.service";

// Fetch all store users
const result = await storeUsersService.getStoreUsers(
  storeId,
  { is_active: true, role_name: "cashier" },
  { page: 1, limit: 10 },
);

if (result.error) {
  console.error(result.error);
} else {
  console.log(result.data.users);
}

// Add new user
const addResult = await storeUsersService.addStoreUser(storeId, {
  email: "employee@example.com",
  role_id: roleId,
  designation: "Sales Associate",
  create_employee: true,
  employee_data: {
    employee_code: "EMP001",
    first_name: "John",
    last_name: "Doe",
    employee_type: "full_time",
    joining_date: "2024-01-01",
    pay_frequency: "monthly",
  },
});

// Update user role
const updateResult = await storeUsersService.updateStoreUser(storeId, userId, {
  role_id: newRoleId,
  designation: "Senior Cashier",
});

// Ban user
const banResult = await storeUsersService.banUser(storeId, userId, {
  reason: "Policy violation",
  banned_by: currentUserId,
});
```

### 3. State Management

Use Zustand store for reactive state:

```typescript
import { useStoreUsersStore } from "@/stores/store-users.store";

function EmployeeList() {
  const {
    users,
    isLoading,
    filters,
    pagination,
    fetchUsers,
    addUser,
    updateUser,
    setFilters,
  } = useStoreUsersStore();

  useEffect(() => {
    fetchUsers(storeId);
  }, [storeId, filters, pagination]);

  // Optimistic updates - UI reflects immediately
  const handleActivate = async (userId: string) => {
    const success = await activateUser(storeId, userId);
    if (success) {
      // UI already updated optimistically!
      toast.success("User activated");
    }
  };

  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

### 4. Validation

Validate data before submission:

```typescript
import {
  addStoreUserSchema,
  updateEmployeeSchema,
  type AddStoreUserFormData,
} from "@/validations/store-users.validation";

// In your form
const form = useForm<AddStoreUserFormData>({
  resolver: zodResolver(addStoreUserSchema),
});

const onSubmit = async (data: AddStoreUserFormData) => {
  const success = await addUser(storeId, data);
  if (success) {
    toast.success("Employee added successfully");
    form.reset();
  }
};
```

### 5. Utilities

Use utility functions for common operations:

```typescript
import {
  canManageUser,
  hasPermission,
  formatSalary,
  getUserStatusBadge,
  calculateTenure,
  exportUsersToCSV,
} from "@/utils/store-users.utils";

// Check permissions
if (canManageUser(currentUser, targetUser)) {
  // Show manage options
}

if (hasPermission(currentUser, "manage_employees")) {
  // Show employee management UI
}

// Format display
const salary = formatSalary(employee.salary); // "₹50,000"
const badge = getUserStatusBadge(user); // { text: "Active", color: "..." }
const tenure = calculateTenure(employee.joining_date); // 15 (months)

// Export data
const csv = exportUsersToCSV(users);
downloadCSV(csv, "employees.csv");
```

## State Management Deep Dive

### Optimistic Updates

The store implements optimistic updates for immediate UI feedback:

```typescript
// Example: Activating a user
activateUser: async (storeId: string, userId: string) => {
  // 1. Optimistic update - UI changes immediately
  set((state) => ({
    users: state.users.map((user) =>
      user.user_id === userId ? { ...user, is_active: true } : user
    ),
  }));

  // 2. API call
  const result = await storeUsersService.setUserActive(storeId, userId, true);

  // 3. Revert on error
  if (result.error) {
    await get().fetchUsers(storeId, true);
    return false;
  }

  // 4. Sync with server data
  set((state) => ({
    users: state.users.map((user) =>
      user.user_id === userId ? result.data! : user
    ),
  }));

  return true;
},
```

### Cache Management

The store implements intelligent caching:

```typescript
// Cache is valid for 5 minutes by default
fetchUsers: async (storeId: string, forceRefresh = false) => {
  const state = get();

  // Check cache validity
  if (!forceRefresh && state.lastFetch) {
    const timeSinceLastFetch = Date.now() - state.lastFetch;
    if (timeSinceLastFetch < state.cacheTimeout) {
      return; // Use cached data
    }
  }

  // Fetch from server
  // ...
};

// Invalidate cache when needed
invalidateCache: () => {
  set({ lastFetch: null });
},
```

### Filter & Pagination State

Filters and pagination are managed in the store:

```typescript
// Set filters (resets to page 1)
setFilters({ role_name: "cashier", is_active: true });

// Change page
setPagination({ page: 2 });

// Sort
setPagination({ sort_by: "full_name", sort_order: "asc" });
```

## API Reference

### Service Methods

#### Fetching

- `getStoreUsers(storeId, filters?, pagination?)` - Get all store users
- `getStoreUserById(storeId, userId)` - Get single user
- `getStoreUserStats(storeId)` - Get statistics
- `getAvailableRoles(currentUserRole)` - Get assignable roles

#### CRUD Operations

- `addStoreUser(storeId, request)` - Add new user
- `updateStoreUser(storeId, userId, updates)` - Update user
- `updateEmployee(employeeId, updates)` - Update employee details
- `removeStoreUser(storeId, userId)` - Remove user (soft delete)

#### Access Control

- `banUser(storeId, userId, request)` - Ban user
- `unbanUser(storeId, userId)` - Unban user
- `setUserActive(storeId, userId, isActive)` - Activate/deactivate
- `resetUserAccess(storeId, userId, request)` - Reset access controls

#### Bulk Operations

- `bulkActivate(storeId, request)` - Bulk activate/deactivate
- `bulkBan(storeId, request, bannedBy)` - Bulk ban
- `bulkChangeRole(storeId, request)` - Bulk role change

### Store Actions

#### Data Actions

- `fetchUsers(storeId, forceRefresh?)` - Fetch users with caching
- `fetchUserById(storeId, userId)` - Fetch single user
- `fetchStats(storeId)` - Fetch statistics
- `fetchAvailableRoles(currentRole)` - Fetch available roles

#### CRUD Actions

- `addUser(storeId, request)` - Add user with optimistic update
- `updateUser(storeId, userId, updates)` - Update with optimistic update
- `updateEmployee(employeeId, updates)` - Update employee
- `removeUser(storeId, userId)` - Remove with optimistic update

#### Management Actions

- `banUser(storeId, userId, request)` - Ban with optimistic update
- `unbanUser(storeId, userId)` - Unban with optimistic update
- `activateUser(storeId, userId)` - Activate with optimistic update
- `deactivateUser(storeId, userId)` - Deactivate with optimistic update
- `resetUserAccess(storeId, userId, request)` - Reset access

#### UI State Actions

- `setFilters(filters)` - Update filters
- `setPagination(pagination)` - Update pagination
- `setSelectedUserIds(ids)` - Set selection
- `toggleUserSelection(userId)` - Toggle user selection
- `clearSelection()` - Clear selection
- `setError(error)` - Set error message

#### Cache Actions

- `invalidateCache()` - Invalidate cache
- `clearCache()` - Clear all cached data
- `reset()` - Reset to initial state

## Best Practices

### 1. Always Use Type Safety

```typescript
// ✅ Good
const user: EnrichedStoreUser = await fetchUser();

// ❌ Bad
const user: any = await fetchUser();
```

### 2. Handle Errors Gracefully

```typescript
// ✅ Good
const success = await addUser(storeId, data);
if (!success) {
  toast.error(error || "Failed to add user");
  return;
}

// ❌ Bad
await addUser(storeId, data);
// No error handling
```

### 3. Use Optimistic Updates

```typescript
// ✅ Good - Use store actions for optimistic updates
await activateUser(storeId, userId);

// ❌ Bad - Direct service call misses optimistic update
await storeUsersService.setUserActive(storeId, userId, true);
```

### 4. Leverage Caching

```typescript
// ✅ Good - Let cache work
useEffect(() => {
  fetchUsers(storeId); // Uses cache if valid
}, [storeId]);

// ❌ Bad - Always force refresh
useEffect(() => {
  fetchUsers(storeId, true); // Bypasses cache every time
}, [storeId]);
```

### 5. Validate Input

```typescript
// ✅ Good
const result = addStoreUserSchema.safeParse(formData);
if (!result.success) {
  // Handle validation errors
  return;
}

// ❌ Bad
// No validation before API call
```

### 6. Check Permissions

```typescript
// ✅ Good
if (canManageUser(currentUser, targetUser)) {
  // Show actions
}

// ❌ Bad
// No permission check
```

## Performance Optimization

### 1. Pagination

Always use pagination for large datasets:

```typescript
const { data } = await getStoreUsers(storeId, filters, {
  page: 1,
  limit: 10, // Fetch only 10 records
});
```

### 2. Selective Fetching

Only fetch what you need:

```typescript
// Fetch single user for details
const user = await getStoreUserById(storeId, userId);

// Don't fetch all users just to find one
```

### 3. Cache Invalidation

Invalidate cache strategically:

```typescript
// After mutations
await addUser(storeId, data);
invalidateCache(); // Force refresh on next fetch

// Don't invalidate on reads
await fetchUsers(storeId); // Uses cache
```

### 4. Debounce Search

Debounce search input:

```typescript
const debouncedSearch = useMemo(
  () =>
    debounce((term: string) => {
      setFilters({ search: term });
    }, 300),
  [],
);
```

## Security Considerations

### 1. Role-Based Access Control

```typescript
// Check if user can manage target user
if (!canManageUser(currentUser, targetUser)) {
  throw new Error("Insufficient permissions");
}

// Check if user can assign role
if (!canAssignRole(currentUser.role_name, targetRole)) {
  throw new Error("Cannot assign this role");
}
```

### 2. Input Validation

```typescript
// Always validate on both client and server
const validated = addStoreUserSchema.parse(input);
```

### 3. Sensitive Data

```typescript
// Don't expose sensitive data in logs
console.log(user.email); // ❌
console.log(`User ${user.id} updated`); // ✅
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from "vitest";
import { canManageUser, hasPermission } from "@/utils/store-users.utils";

describe("Permission Utils", () => {
  it("should allow admin to manage cashier", () => {
    const admin = { role_name: "store_admin" };
    const cashier = { role_name: "cashier" };
    expect(canManageUser(admin, cashier)).toBe(true);
  });

  it("should not allow cashier to manage admin", () => {
    const cashier = { role_name: "cashier" };
    const admin = { role_name: "store_admin" };
    expect(canManageUser(cashier, admin)).toBe(false);
  });
});
```

### Integration Tests

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { useStoreUsersStore } from "@/stores/store-users.store";

describe("Store Users Store", () => {
  it("should fetch users successfully", async () => {
    const { result } = renderHook(() => useStoreUsersStore());

    await waitFor(() => {
      result.current.fetchUsers("store-id");
    });

    expect(result.current.users.length).toBeGreaterThan(0);
    expect(result.current.isLoading).toBe(false);
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Users Not Updating in UI

**Problem**: Changes don't reflect immediately

**Solution**: Use store actions instead of direct service calls

```typescript
// ✅ Use this
await activateUser(storeId, userId);

// ❌ Not this
await storeUsersService.setUserActive(storeId, userId, true);
```

#### 2. Permission Denied

**Problem**: User cannot perform action

**Solution**: Check role hierarchy and permissions

```typescript
console.log(canManageUser(currentUser, targetUser));
console.log(hasPermission(currentUser, "manage_employees"));
```

#### 3. Cache Not Updating

**Problem**: Old data shown after update

**Solution**: Invalidate cache after mutations

```typescript
await updateUser(storeId, userId, updates);
invalidateCache();
```

## Future Enhancements

- [ ] Advanced analytics dashboard
- [ ] Employee performance tracking
- [ ] Attendance management integration
- [ ] Leave management system
- [ ] Payroll integration
- [ ] Document management
- [ ] Training and certification tracking
- [ ] Performance review system

## Contributing

When adding new features:

1. Update types in `store-users.types.ts`
2. Add validation in `store-users.validation.ts`
3. Implement service in `store-users.service.ts`
4. Add store actions in `store-users.store.ts`
5. Create utilities in `store-users.utils.ts`
6. Update this README

## License

Proprietary - All rights reserved

---

**Last Updated**: February 17, 2026  
**Version**: 1.0.0  
**Maintainer**: Development Team
