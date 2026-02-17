# Role-Based Dashboard Routing System

## Overview

This document explains how the role-based dashboard routing system works in the Billzo application. Users are automatically redirected to their role-specific dashboard based on their role assignment in the store.

## Role-Based Dashboards

### 1. **Cashier Dashboard** (`/pos`)

- **Role**: `cashier`
- **Purpose**: Point of Sale system for processing customer transactions
- **Features**:
  - Daily sales tracking
  - Transaction management
  - Quick order processing
  - Refund handling
  - Daily reports

### 2. **Store Admin Dashboard** (`/store-admin/dashboard`)

- **Role**: `store_admin`
- **Purpose**: Comprehensive store management and analytics
- **Features**:
  - Store information management
  - Staff management
  - Sales reports
  - Revenue analytics
  - Store settings
  - Access to all other dashboards

### 3. **Manager Dashboard** (`/manager/dashboard`)

- **Role**: `manager`
- **Purpose**: Oversee daily store operations and team performance
- **Features**:
  - Daily sales tracking
  - Staff attendance
  - Team management
  - Shift assignment
  - Performance reviews
  - Inventory levels
  - Task approvals

### 4. **Accountant Dashboard** (`/accountant/dashboard`)

- **Role**: `accountant`
- **Purpose**: Financial management and reporting
- **Features**:
  - Revenue tracking
  - Expense management
  - Financial reports (Income Statement, Balance Sheet)
  - Invoice and billing management
  - Tax reports
  - Payment reconciliation

### 5. **Inventory Manager Dashboard** (`/inventory/dashboard`)

- **Role**: `inventory_manager`
- **Purpose**: Stock and inventory operations management
- **Features**:
  - Inventory tracking
  - Low stock alerts
  - Purchase order management
  - Physical counts
  - Stock adjustments
  - Damage reporting
  - Inventory reports

### 6. **Super Admin Dashboard** (`/super-admin/dashboard`)

- **Role**: `super_admin`
- **Purpose**: Platform administration and system management
- **Features**:
  - Store management across the platform
  - User management
  - Store approval workflow
  - Role management
  - System settings
  - Feature flags
  - Audit logs
  - Performance metrics

## Technical Architecture

### Database Functions

#### 1. `get_user_role_info(p_user_id)`

Retrieves the user's role information and determines the appropriate dashboard path.

```sql
SELECT
  r.name AS role_name,
  r.display_name,
  r.permissions,
  su.store_id,
  s.name AS store_name
FROM store_users su
JOIN roles r ON su.role_id = r.id
JOIN stores s ON su.store_id = s.id
WHERE su.user_id = p_user_id
AND su.is_active = true
AND su.is_banned = false
ORDER BY su.last_login_at DESC NULLS LAST
LIMIT 1;
```

**Returns**: JSONB object with role details and dashboard path

#### 2. `get_onboarding_status(p_user_id)`

Determines the user's onboarding status and redirect URL based on their role.

```sql
-- Role-based redirects (when user has a role)
WHEN v_role_info->>'has_role' = 'true' THEN v_role_info->>'dashboard_path'

-- Maps to:
CASE v_role_name
  WHEN 'cashier' THEN '/pos'
  WHEN 'store_admin' THEN '/store-admin/dashboard'
  WHEN 'manager' THEN '/manager/dashboard'
  WHEN 'accountant' THEN '/accountant/dashboard'
  WHEN 'inventory_manager' THEN '/inventory/dashboard'
  WHEN 'super_admin' THEN '/super-admin/dashboard'
  ELSE '/dashboard'
END
```

#### 3. `get_user_dashboard_redirect(p_user_id)`

Simple function for middleware to get the redirect URL after login.

```sql
SELECT redirect_url INTO v_redirect
FROM v_user_onboarding_status
WHERE user_id = p_user_id;

RETURN COALESCE(v_redirect, '/dashboard');
```

#### 4. `can_access_dashboard(p_user_id, p_dashboard_type)`

Checks if a user has permission to access a specific dashboard.

```sql
-- Super admin can access everything
WHEN v_user_role = 'super_admin' THEN true

-- Role-specific access
WHEN p_dashboard_type = 'admin' AND v_user_role = 'store_admin' THEN true
WHEN p_dashboard_type = 'manager' AND v_user_role IN ('manager', 'store_admin') THEN true
WHEN p_dashboard_type = 'pos' AND v_user_role IN ('cashier', 'manager', 'store_admin') THEN true
-- ... etc
```

### Middleware Flow

1. **Authentication Check**: Verify user is logged in
2. **Onboarding Check**: Get user's onboarding status
3. **Role Resolution**: Call `get_user_role_info()` to get user's role
4. **Redirect Decision**: If role found, redirect to role-specific dashboard
5. **Route Protection**: Check route access based on role and permissions

```typescript
// In middleware.ts
const { data: onboardingData } = await supabase.rpc("get_onboarding_status", {
  p_user_id: user.id,
});

// User gets redirected to onboardingData.redirect_to
// which is one of the role-based dashboard URLs
```

### Frontend Components

#### DashboardLayout Component

Provides a shared UI structure for all dashboards with:

- Role-based access gating
- Loading states
- Authentication checks
- Permission validation

```typescript
<DashboardLayout
  requiredRole={["store_admin", "super_admin"]}
  title="Store Admin Dashboard"
  description="Manage your store and view analytics"
>
  {/* Dashboard content */}
</DashboardLayout>
```

#### useRole Hook

Custom hook for role checking in components:

```typescript
const { userRole, isLoading } = useRole();

if (userRole === "cashier") {
  // Show cashier-specific UI
}
```

### Route Configuration

All dashboard routes are configured in [routes.config.ts](../config/routes.config.ts):

```typescript
{
  path: "/pos",
  type: "role-based",
  allowedRoles: ["cashier", "manager", "store_admin", "super_admin"],
  redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
  description: "Point of Sale System",
}
```

## User Journey

### 1. New User (Creator)

```
Login → Onboarding Flow:
  1. Create Organization
  2. Create Store
  3. Wait for Store Approval
     → Once approved, role is assigned
     → Redirected to role-specific dashboard
```

### 2. Invited User

```
Login → Accept Invitation
  → Role assigned immediately
  → Redirected to role-specific dashboard
```

### 3. Returning User

```
Login → Get Onboarding Status
  → Onboarding complete?
     → Check role
     → Redirect to role-specific dashboard
  → Otherwise, continue onboarding
```

## Database Views

### v_user_onboarding_status

Comprehensive view with all user information including:

- Onboarding status
- Role information
- Redirect URL
- Next action text
- Dashboard type

```sql
CREATE OR REPLACE VIEW v_user_onboarding_status AS
SELECT
  p.id AS user_id,
  p.email,
  ...
  r.name AS role_name,
  CASE r.name
    WHEN 'cashier' THEN '/pos'
    WHEN 'store_admin' THEN '/store-admin/dashboard'
    -- ... etc
  END AS redirect_url,
  ...
FROM profiles p
LEFT JOIN organizations o ON o.created_by = p.id
LEFT JOIN stores s ON s.created_by = p.id
LEFT JOIN store_users su ON su.user_id = p.id AND su.is_active = true
LEFT JOIN roles r ON su.role_id = r.id;
```

## Role Hierarchy & Access Control

### Role Hierarchy (Top to Bottom)

1. **super_admin** - Full system access
2. **store_admin** - Full store access
3. **manager** - Store operations
4. **accountant** / **inventory_manager** / **cashier** - Specific department

### Access Rules

| Dashboard              | super_admin | store_admin | manager | accountant | inventory_manager | cashier |
| ---------------------- | ----------- | ----------- | ------- | ---------- | ----------------- | ------- |
| /super-admin/dashboard | ✓           | -           | -       | -          | -                 | -       |
| /store-admin/dashboard | ✓           | ✓           | -       | -          | -                 | -       |
| /manager/dashboard     | ✓           | ✓           | ✓       | -          | -                 | -       |
| /accountant/dashboard  | ✓           | ✓           | ✓       | ✓          | -                 | -       |
| /inventory/dashboard   | ✓           | ✓           | ✓       | -          | ✓                 | -       |
| /pos                   | ✓           | ✓           | ✓       | -          | -                 | ✓       |

## Triggers

### Auto-Update Onboarding

Triggers automatically update user's onboarding status when:

1. **Organization Created** → Step: `create_store`
2. **Store Created** → Step: `pending_approval`
3. **Store Approved** → Step: `completed` (if user has role)
4. **Invitation Accepted** → Step: `completed` (for invited user)

## Implementation Checklist

- ✅ Database functions for role detection
- ✅ Middleware route protection
- ✅ Role-based dashboard pages created
- ✅ DashboardLayout component with role gating
- ✅ Route configuration updated
- ✅ useRole hook enhanced
- ✅ Automatic redirects after login/role assignment
- ⏳ Per-dashboard feature implementation (customize as needed)
- ⏳ Permission-based UI rendering (show/hide features by permission)

## Usage Examples

### Check User Role and Redirect (Server-Side)

```typescript
// In middleware
const redirect = await supabase.rpc("get_user_dashboard_redirect");
response.redirect(redirect);
```

### Check User Role in Component (Client-Side)

```typescript
"use client";
import { useRole } from "@/hooks/use-role";

export function MyComponent() {
  const { userRole, isLoading } = useRole();

  if (isLoading) return <LoadingSpinner />;

  if (userRole === "cashier") {
    return <CashierUI />;
  }

  if (["manager", "store_admin"].includes(userRole)) {
    return <ManagerUI />;
  }

  return <DefaultUI />;
}
```

### Protect Dashboard Route

```typescript
<DashboardLayout
  requiredRole={["accountant", "manager", "store_admin"]}
  title="Financial Dashboard"
>
  <FinancialReports />
</DashboardLayout>
```

## Future Enhancements

1. **Dashboard Customization**: Allow users to customize their dashboard
2. **Quick Access Shortcuts**: Add frequently used actions to dashboard
3. **Performance Metrics**: Add KPI cards specific to each role
4. **Notifications**: Alert users about important events
5. **Activity Feed**: Show recent activity in user's area
6. **Mobile Dashboard**: Responsive design for mobile users

---

**Last Updated**: 2026-02-17  
**Version**: 1.0.0
