# Onboarding & Profile Completion Tracking

## Overview

This system provides **automatic onboarding flow management** based on user's profile completion status. It integrates with the Supabase database functions from `2_profile_completion_tracking.sql` to track and redirect users through the proper onboarding steps.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Database Functions](#database-functions)
3. [Client-Side Components](#client-side-components)
4. [Middleware Integration](#middleware-integration)
5. [Usage Examples](#usage-examples)
6. [Onboarding Flow](#onboarding-flow)
7. [Testing](#testing)

---

## Architecture

### Key Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  - get_onboarding_status()   (returns current status)       │
│  - update_onboarding_progress()  (manual updates)           │
│  - Auto-triggers on org/store/approval events                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  - onboarding.service.ts                                    │
│  - auth.service.ts (includes getOnboardingStatus)           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Hook Layer                                │
│  - use-onboarding-redirect.ts (auto redirects)              │
│  - use-auth.ts (authentication state)                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Middleware Layer                          │
│  - middleware.ts (server-side route protection)             │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Functions

### `get_onboarding_status(user_id UUID)`

Returns the current onboarding status for a user.

**Returns:**
```typescript
{
  has_organization: boolean;
  has_store: boolean;
  store_status: string | null;
  is_store_user: boolean;
  next_step: OnboardingStep;
  redirect_to: string;
  is_onboarding_complete: boolean;
}
```

**Onboarding Steps:**
- `create_organization` - User needs to create an organization
- `create_store` - User needs to create a store
- `pending_approval` - Store is pending approval
- `completed` - Onboarding is complete
- `store_rejected` - Store was rejected
- `store_suspended` - Store is suspended

### `update_onboarding_progress(user_id, step, metadata)`

Manually update a user's onboarding progress (typically not needed as triggers handle this automatically).

### Auto-Triggers

The system automatically updates onboarding status when:
1. User creates an organization → moves to `create_store` step
2. User creates a store → moves to `pending_approval` step
3. Store gets approved → moves to `completed` step
4. User accepts invitation → moves to `completed` step (skips org/store creation)

---

## Client-Side Components

### 1. Types (`types/onboarding.types.ts`)

```typescript
export interface OnboardingStatus {
  has_organization: boolean;
  has_store: boolean;
  store_status: string | null;
  is_store_user: boolean;
  next_step: OnboardingStep;
  redirect_to: string;
  is_onboarding_complete: boolean;
}

export type OnboardingStep =
  | "create_organization"
  | "create_store"
  | "pending_approval"
  | "completed"
  | "store_rejected"
  | "store_suspended"
  | "unknown";
```

### 2. Service (`services/onboarding.service.ts`)

```typescript
import { onboardingService } from "@/services/onboarding.service";

// Get status
const { data, error } = await onboardingService.getOnboardingStatus(userId);

// Update progress (rarely needed)
await onboardingService.updateOnboardingProgress(userId, "create_store", metadata);
```

### 3. Hook (`hooks/use-onboarding-redirect.ts`)

**Automatic redirect hook** - use in protected pages/layouts:

```typescript
import { useOnboardingRedirect } from "@/hooks/use-onboarding-redirect";

export default function DashboardLayout({ children }) {
  const { isChecking, onboardingStatus, isOnboardingComplete } = useOnboardingRedirect();

  if (isChecking) {
    return <LoadingSpinner />;
  }

  // Hook automatically redirects if onboarding incomplete
  // This code only runs if onboarding is complete
  return <>{children}</>;
}
```

**Returns:**
- `isChecking` - Whether onboarding status is being fetched
- `onboardingStatus` - Full onboarding status object
- `isOnboardingComplete` - Boolean for quick check

---

## Middleware Integration

The middleware (`middleware.ts`) now includes **automatic onboarding checking**:

### Flow

1. **Public routes** (`/`) - If authenticated, redirects based on onboarding status
2. **Auth routes** (`/login`, `/signup`) - If authenticated, redirects based on onboarding status
3. **Onboarding routes** (`/create-organization`, `/create-store`, `/pending-approval`):
   - Requires authentication
   - If onboarding complete → redirects to `/dashboard`
   - If on wrong step → redirects to correct step
4. **Protected/Role-based routes** - Requires completed onboarding

### Example Middleware Logic

```typescript
// After user authentication
const { data: onboardingData } = await supabase.rpc("get_onboarding_status", {
  p_user_id: user.id
});

// Redirect if onboarding incomplete
if (!onboardingData.is_onboarding_complete) {
  return redirect(request, onboardingData.redirect_to);
}

// Continue to protected content
```

---

## Usage Examples

### 1. Protected Page (Auto-redirect)

```typescript
// app/(dashboard)/dashboard/page.tsx
"use client";

import { useOnboardingRedirect } from "@/hooks/use-onboarding-redirect";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function DashboardPage() {
  const { isChecking, isOnboardingComplete } = useOnboardingRedirect();

  if (isChecking) {
    return <LoadingSpinner />;
  }

  // User with incomplete onboarding never reaches here
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome! Your onboarding is complete.</p>
    </div>
  );
}
```

### 2. Manual Status Check

```typescript
"use client";

import { useEffect, useState } from "react";
import { onboardingService } from "@/services/onboarding.service";
import { useAuth } from "@/hooks/use-auth";

export default function ProfilePage() {
  const { authUser } = useAuth();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    async function loadStatus() {
      if (!authUser) return;
      
      const { data } = await onboardingService.getOnboardingStatus(authUser.id);
      setStatus(data);
    }
    
    loadStatus();
  }, [authUser]);

  if (!status) return <div>Loading...</div>;

  return (
    <div>
      <h2>Onboarding Status</h2>
      <p>Organization: {status.has_organization ? "✓" : "✗"}</p>
      <p>Store: {status.has_store ? "✓" : "✗"}</p>
      <p>Next Step: {status.next_step}</p>
      
      {!status.is_onboarding_complete && (
        <a href={status.redirect_to}>Continue Onboarding →</a>
      )}
    </div>
  );
}
```

### 3. Server-Side Check (Server Component)

```typescript
// app/(dashboard)/settings/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  const { data: status } = await supabase.rpc("get_onboarding_status", {
    p_user_id: user.id,
  });

  if (!status?.is_onboarding_complete) {
    redirect(status.redirect_to);
  }

  return <div>Settings Page</div>;
}
```

---

## Onboarding Flow

### New User (Creates Organization & Store)

```
1. Signup → Email verification
2. Login successful
   ↓
3. get_onboarding_status() → has_organization: false
   ↓
4. Redirect to /create-organization
   ↓
5. User creates org → Trigger updates status
   ↓
6. get_onboarding_status() → next_step: create_store
   ↓
7. Redirect to /create-store
   ↓
8. User creates store → Trigger updates status
   ↓
9. get_onboarding_status() → next_step: pending_approval
   ↓
10. Redirect to /pending-approval
    ↓
11. Admin approves store → Trigger updates status
    ↓
12. get_onboarding_status() → is_onboarding_complete: true
    ↓
13. Access granted to /dashboard
```

### Invited User (Joins Existing Store)

```
1. Receives invitation email
2. Clicks invitation link → Signup/Login
   ↓
3. Accepts invitation → Trigger updates status
   ↓
4. get_onboarding_status() → is_onboarding_complete: true
   (skips org/store creation)
   ↓
5. Access granted to /dashboard immediately
```

---

## Testing

### 1. Test Onboarding Flow

```typescript
// test/onboarding.test.ts
import { onboardingService } from "@/services/onboarding.service";

describe("Onboarding Flow", () => {
  it("should redirect new user to create organization", async () => {
    const { data } = await onboardingService.getOnboardingStatus(newUserId);
    
    expect(data?.has_organization).toBe(false);
    expect(data?.next_step).toBe("create_organization");
    expect(data?.redirect_to).toBe("/create-organization");
  });

  it("should redirect after org creation to create store", async () => {
    // Create organization...
    
    const { data } = await onboardingService.getOnboardingStatus(userId);
    
    expect(data?.has_organization).toBe(true);
    expect(data?.next_step).toBe("create_store");
    expect(data?.redirect_to).toBe("/create-store");
  });
});
```

### 2. Manual Testing Checklist

- [ ] Fresh signup → redirects to `/create-organization`
- [ ] After creating org → redirects to `/create-store`
- [ ] After creating store → redirects to `/pending-approval`
- [ ] After approval → redirects to `/dashboard`
- [ ] Invited user → redirects directly to `/dashboard`
- [ ] Refresh on any step → stays on correct step (no logout)
- [ ] Try accessing `/dashboard` before completion → redirects to current step
- [ ] Try accessing wrong onboarding step → redirects to correct step

---

## Configuration

### Route Configuration (`config/routes.config.ts`)

Onboarding routes are configured as type `"onboarding"`:

```typescript
{
  path: "/create-organization",
  type: "onboarding",
  redirect: { unauthenticated: "/login" },
},
{
  path: "/create-store",
  type: "onboarding",
  redirect: { unauthenticated: "/login" },
},
{
  path: "/pending-approval",
  type: "onboarding",
  redirect: { unauthenticated: "/login" },
}
```

### Protected Routes

All routes with type `"protected"` or `"role-based"` require **completed onboarding**.

---

## Troubleshooting

### Issue: Infinite redirect loop

**Cause:** Middleware and client-side hook both trying to redirect

**Solution:** The hook checks if already on an onboarding route before redirecting:

```typescript
const isOnOnboardingRoute = [
  "/create-organization",
  "/create-store",
  "/pending-approval",
].some((route) => pathname.startsWith(route));

if (!isOnOnboardingRoute) {
  router.push(data.redirect_to);
}
```

### Issue: User stuck on onboarding step after completion

**Cause:** Database triggers didn't fire or status not updated

**Solution:** Manually update status:

```sql
-- Check current status
SELECT * FROM v_user_onboarding_status WHERE user_id = '<user-id>';

-- Manually complete onboarding
SELECT update_onboarding_progress('<user-id>', 'completed', NULL);
```

### Issue: Middleware not checking onboarding

**Cause:** RPC function not found or migration not applied

**Solution:**
1. Check if migration is applied:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'get_onboarding_status';
   ```
2. Apply migration:
   ```bash
   supabase db push
   ```

---

## Best Practices

1. **Always use `useOnboardingRedirect()` in dashboard layouts** - Ensures users complete onboarding before accessing protected features

2. **Let triggers handle status updates** - Don't manually call `updateOnboardingProgress` unless absolutely necessary

3. **Check `isOnboardingComplete` before showing features** - Some features should only be available after full onboarding

4. **Handle loading states** - Always show loading indicator while `isChecking` is true

5. **Server-side validation** - Middleware handles server-side protection, hooks handle client-side UX

---

## Summary

This onboarding system provides:
- ✅ **Automatic progress tracking** via database triggers
- ✅ **Server-side protection** via middleware
- ✅ **Client-side redirects** via hooks
- ✅ **Type-safe** integration with TypeScript
- ✅ **Clean logic** - no over-engineering, uses Supabase's built-in features
- ✅ **Flexible** - handles both org creators and invited users

The system ensures users complete required steps before accessing the application, while providing a smooth UX with proper loading states and redirects.
