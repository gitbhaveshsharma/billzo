"use client";

import { useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/hooks/use-permission";
import { SEARCH_INDEX } from "@/components/layout/search/search-config";
import {
  parseShortcutLabel,
  matchesShortcut,
  shouldSuppressShortcut,
} from "@/config/shortcuts.config";
import type { ShortcutDef } from "@/config/shortcuts.config";
import type { SidebarItem } from "@/components/layout/types";
import type { RoleName } from "@/types/database.types";

// ============================================================================
// useKeyboardShortcuts – global keyboard navigation with toast feedback
//
// Priority order for shortcut resolution:
// 1. Sidebar items (page-context-aware, role-specific routes)
// 2. Search index (global fallback for items not in the current sidebar)
//
// This ensures a store_admin pressing Alt+I goes to /store-admin/inventory
// (from their sidebar) rather than /inventory/dashboard (from search index).
// ============================================================================

/** Build ShortcutDef[] from sidebar items — these take priority */
function buildSidebarShortcutDefs(items: SidebarItem[]): ShortcutDef[] {
  const defs: ShortcutDef[] = [];

  for (const item of items) {
    if (item.shortcut) {
      const parsed = parseShortcutLabel(item.shortcut);
      if (parsed) {
        defs.push({
          id: item.id,
          label: item.shortcut,
          key: parsed.key,
          modifiers: parsed.modifiers,
          href: item.href,
          toastMessage: `Opening ${item.label}…`,
          roles: item.roles as RoleName[],
          permissions: item.permissions,
        });
      }
    }

    // Also check children for shortcuts
    if (item.children) {
      for (const child of item.children) {
        if (child.shortcut) {
          const parsed = parseShortcutLabel(child.shortcut);
          if (parsed) {
            defs.push({
              id: child.id,
              label: child.shortcut,
              key: parsed.key,
              modifiers: parsed.modifiers,
              href: child.href,
              toastMessage: `Opening ${child.label}…`,
              roles: child.roles as RoleName[],
              permissions: child.permissions,
            });
          }
        }
      }
    }
  }

  return defs;
}

/** Build ShortcutDef[] from the search index — global fallback */
function buildSearchIndexShortcutDefs(): ShortcutDef[] {
  const defs: ShortcutDef[] = [];

  for (const item of SEARCH_INDEX) {
    if (!item.shortcut) continue;

    const parsed = parseShortcutLabel(item.shortcut);
    if (!parsed) continue;

    defs.push({
      id: item.id,
      label: item.shortcut,
      key: parsed.key,
      modifiers: parsed.modifiers,
      href: item.href,
      toastMessage: `Opening ${item.name}…`,
      roles: item.roles as RoleName[],
      permissions: item.permissions,
    });
  }

  return defs;
}

// Module-level cache for search index shortcuts (static data)
const SEARCH_SHORTCUT_DEFS = buildSearchIndexShortcutDefs();

interface UseKeyboardShortcutsOptions {
  /** Disable all shortcuts (e.g. when a modal editor is open) */
  disabled?: boolean;
  /** Current sidebar items — used as primary shortcut source (page-context-aware) */
  sidebarItems?: SidebarItem[];
}

export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions = {}
) {
  const { disabled = false, sidebarItems = [] } = options;
  const router = useRouter();
  const { appUser } = useAuth();
  const { hasAnyPermission } = usePermission();

  const userRole = appUser?.role as RoleName | null;

  // Build the active shortcut list:
  // 1. Sidebar shortcuts (already filtered by role/permissions in ConditionalLayout)
  // 2. Search index shortcuts (filtered here, excluding keys already claimed by sidebar)
  const activeShortcuts = useMemo<ShortcutDef[]>(() => {
    if (!userRole) return [];

    // Sidebar shortcuts are already role/permission-filtered
    const sidebarDefs = buildSidebarShortcutDefs(sidebarItems);

    // Track which shortcut keys the sidebar has claimed
    const claimedKeys = new Set(
      sidebarDefs.map((d) => `${d.modifiers.alt ? "a" : ""}${d.modifiers.ctrl ? "c" : ""}${d.modifiers.shift ? "s" : ""}:${d.key}`)
    );

    // Add search index shortcuts that don't conflict with sidebar shortcuts
    const fallbackDefs = SEARCH_SHORTCUT_DEFS.filter((def) => {
      const keyId = `${def.modifiers.alt ? "a" : ""}${def.modifiers.ctrl ? "c" : ""}${def.modifiers.shift ? "s" : ""}:${def.key}`;
      if (claimedKeys.has(keyId)) return false;

      // Role check
      if (!def.roles.includes(userRole)) return false;

      // Permission check
      if (def.permissions && def.permissions.length > 0) {
        if (!hasAnyPermission(def.permissions)) return false;
      }

      // Claim this key so further duplicates don't get through
      claimedKeys.add(keyId);
      return true;
    });

    return [...sidebarDefs, ...fallbackDefs];
  }, [userRole, hasAnyPermission, sidebarItems]);

  // Stable ref to avoid re-registering listener on every render
  const shortcutsRef = useRef(activeShortcuts);
  shortcutsRef.current = activeShortcuts;

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabledRef.current) return;
      if (shouldSuppressShortcut(e)) return;

      for (const def of shortcutsRef.current) {
        if (matchesShortcut(e, def)) {
          e.preventDefault();
          e.stopPropagation();

          // Show navigating toast
          toast(def.toastMessage, {
            icon: "⌨️",
            duration: 2000,
            position: "top-center",
            style: {
              borderRadius: "8px",
              background: "#1f2937",
              color: "#f9fafb",
              fontSize: "13px",
              fontWeight: 500,
              padding: "10px 16px",
            },
          });

          router.push(def.href);
          return;
        }
      }
    },
    [router]
  );

  useEffect(() => {
    if (disabled) return;

    document.addEventListener("keydown", handleKeyDown, { capture: false });
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [disabled, handleKeyDown]);

  return {
    /** All shortcuts available to the current user */
    shortcuts: activeShortcuts,
    /** All shortcut definitions from the search index */
    allShortcuts: SEARCH_SHORTCUT_DEFS,
  };
}
