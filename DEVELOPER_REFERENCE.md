# Developer Quick Reference - Role-Based Dashboards

## 🚀 Quick Start

### Check Current User Role

```typescript
import { useRole } from "@/hooks/use-role";

export function MyComponent() {
  const { userRole, isLoading } = useRole();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      Current Role: {userRole}
      {userRole === "cashier" && <CashierUI />}
    </div>
  );
}
```

### Create a Protected Dashboard Page

```typescript
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function MyDashboardPage() {
  return (
    <DashboardLayout
      requiredRole="manager"
      title="Manager Dashboard"
      description="Manage store operations"
    >
      <div>Dashboard content here</div>
    </DashboardLayout>
  );
}
```

### Check Multiple Roles

```typescript
const { hasAnyRole } = useRole();

if (hasAnyRole(["manager", "store_admin"])) {
  // Show management UI
}
```

## 📍 Dashboard Routes

| Role                | URL                      | Component        |
| ------------------- | ------------------------ | ---------------- |
| `cashier`           | `/pos`                   | Point of Sale    |
| `store_admin`       | `/store-admin/dashboard` | Store Management |
| `manager`           | `/manager/dashboard`     | Operations       |
| `accountant`        | `/accountant/dashboard`  | Financial        |
| `inventory_manager` | `/inventory/dashboard`   | Stock Management |
| `super_admin`       | `/super-admin/dashboard` | Platform Admin   |

## 🔐 Role Checking

### In Components

```typescript
import { useRole } from "@/hooks/use-role";

const { userRole, hasRole, hasAnyRole, isAdmin, isSuperAdmin } = useRole();

// Check exact role
if (userRole === "cashier") {
}

// Check if meets role level
if (hasRole("manager")) {
}

// Check if has any of listed roles
if (hasAnyRole(["manager", "store_admin"])) {
}

// Quick checks
if (isAdmin()) {
} // super_admin or store_admin
if (isSuperAdmin()) {
} // super_admin only
```

### In Layouts

```typescript
<DashboardLayout
  requiredRole="manager"
  title="Sample"
>
  {/* Only accessible to managers and above */}
</DashboardLayout>
```

Multiple roles:

```typescript
<DashboardLayout
  requiredRole={["manager", "store_admin"]}
  title="Sample"
>
  {/* Accessible to multiple roles */}
</DashboardLayout>
```

## 📊 Database Functions

### Get User Dashboard Redirect (Middleware)

```typescript
// Server-side only
const redirect = await supabase.rpc("get_user_dashboard_redirect", {
  p_user_id: userId,
});
// Returns: "/pos", "/store-admin/dashboard", etc.
```

### Check Dashboard Access

```typescript
const canAccess = await supabase.rpc("can_access_dashboard", {
  p_user_id: userId,
  p_dashboard_type: "pos", // 'admin', 'manager', 'pos', etc.
});
```

### Get Role Info

```typescript
const roleInfo = await supabase.rpc("get_user_role_info", {
  p_user_id: userId,
});
// Returns: { role_name, dashboard_path, permissions, ... }
```

## 🎨 UI Components

### DashboardLayout

```typescript
<DashboardLayout
  requiredRole="manager"        // Single role
  // requiredRole={["manager", "store_admin"]}  // Multiple roles
  title="Manager Dashboard"      // Page title
  description="Team management"  // Subtitle
>
  {/* Your dashboard content */}
</DashboardLayout>
```

**Features**:

- Auto role checking
- Loading state handling
- Auth check
- Responsive header
- Error messaging

## 🔄 Automatic Redirects

### After Login

1. Middleware calls `get_onboarding_status()`
2. If user has role → redirect to role dashboard
3. If not completed onboarding → redirect to onboarding step

### After Role Assignment

1. User completes onboarding
2. Role is assigned via `store_users` table
3. Next login → redirect to role dashboard

## ⚙️ Configuration

### Add New Dashboard Route

**File**: `src/config/routes.config.ts`

```typescript
{
  path: "/my-dashboard",
  type: "role-based",
  allowedRoles: ["my_role"],
  redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
  description: "My dashboard",
}
```

### Add New Dashboard Page

1. Create directory: `src/app/my-dashboard/`
2. Create `page.tsx`:

```typescript
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function MyDashboardPage() {
  return (
    <DashboardLayout requiredRole="my_role">
      {/* Content */}
    </DashboardLayout>
  );
}
```

3. Create `layout.tsx`:

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Dashboard",
  description: "Content here",
};

export default function MyDashboardLayout({ children }: any) {
  return children;
}
```

## 🧪 Testing

### Test Role Access

```typescript
// Component will show "Insufficient Permissions" if role doesn't match
<DashboardLayout requiredRole="super_admin">
  {/* Only super admins see this */}
</DashboardLayout>
```

### Test Redirect

```bash
# Login with different role user
# Should be redirected to their role dashboard automatically
```

## 🐛 Debugging

### Check Current Role

```typescript
const { userRole } = useRole();
console.log("Current role:", userRole);
```

### Check Loading State

```typescript
const { isLoading, userRole } = useRole();
if (isLoading) return <div>Loading...</div>;
// Now role is available
```

### Middleware Logs

Check browser network tab for:

- `X-User-Id` header (set by middleware)
- `X-Middleware-Result` header
- `X-Onboarding-Complete` header
- `X-Onboarding-Step` header

## 📚 Related Files

| File                                                    | Purpose                       |
| ------------------------------------------------------- | ----------------------------- |
| `supabase/migrations/2_profile_completion_tracking.sql` | Database functions & triggers |
| `src/config/routes.config.ts`                           | Route access rules            |
| `src/hooks/use-role.ts`                                 | Role checking hook            |
| `src/middleware.ts`                                     | Request routing & protection  |
| `src/components/dashboard/dashboard-layout.tsx`         | Shared dashboard layout       |
| `ROLE_BASED_ROUTING.md`                                 | Full documentation            |

## 🆘 Troubleshooting

### User not redirected to dashboard

1. Check middleware is executing: Look for `X-Middleware-Executed` header
2. Check `get_onboarding_status()` is returning correct role
3. Verify role exists in `store_users` table
4. Check user is not banned/inactive

### "Insufficient Permissions" message

1. User's role not in `allowedRoles`
2. Check `v_user_onboarding_status` for user's role
3. Verify `store_users` entry is `is_active = true`

### Dashboard not rendering

1. Check `requiredRole` matches user's actual role
2. Verify imports are correct
3. Check browser console for errors

---

**Last Updated**: February 17, 2026  
**Version**: 1.0.0
