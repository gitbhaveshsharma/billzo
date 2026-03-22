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

export interface InventoryContextValue {
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

const InventoryContext = createContext<InventoryContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface InventoryProviderProps {
  children: ReactNode;
}

export function InventoryProvider({ children }: InventoryProviderProps) {
  const { appUser, isLoading } = useAuth();

  const role = appUser?.role ?? null;
  const storeId = appUser?.storeId ?? null;
  const storeName = appUser?.storeName ?? null;

  const value = useMemo<InventoryContextValue>(
    () => ({ appUser, role, storeId, storeName, isLoading }),
    [appUser, role, storeId, storeName, isLoading],
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useInventory(): InventoryContextValue {
  const ctx = useContext(InventoryContext);
  if (!ctx) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return ctx;
}
