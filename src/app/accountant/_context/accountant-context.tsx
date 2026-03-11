"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import type { AppUser } from "@/types/auth.types";
import type { RoleName } from "@/types/database.types";

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface AccountantContextValue {
  /** Current authenticated app user */
  appUser: AppUser | null;
  /** Current user's role */
  role: RoleName | null;
  /** Store ID shortcut */
  storeId: string | null;
  /** Store name */
  storeName: string | null;
  /** Whether the auth data is still loading */
  isLoading: boolean;
}

const AccountantContext = createContext<AccountantContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface AccountantProviderProps {
  children: ReactNode;
}

export function AccountantProvider({ children }: AccountantProviderProps) {
  const { appUser, isLoading } = useAuth();

  const role = appUser?.role ?? null;
  const storeId = appUser?.storeId ?? null;
  const storeName = appUser?.storeName ?? null;

  const value = useMemo<AccountantContextValue>(
    () => ({ appUser, role, storeId, storeName, isLoading }),
    [appUser, role, storeId, storeName, isLoading],
  );

  return (
    <AccountantContext.Provider value={value}>
      {children}
    </AccountantContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useAccountant(): AccountantContextValue {
  const ctx = useContext(AccountantContext);
  if (!ctx) {
    throw new Error("useAccountant must be used within an AccountantProvider");
  }
  return ctx;
}
