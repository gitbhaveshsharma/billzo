import type { RoleName } from "@/types/database.types";

// ============================================================================
// Keyboard Shortcut Configuration
// ============================================================================

/**
 * Modifier keys for shortcuts.
 * We use "Alt" as the primary modifier to avoid conflicts with
 * browser/OS defaults (Ctrl+S = save, Ctrl+P = print, etc.).
 */
export type ShortcutModifier = "Alt" | "Ctrl" | "Shift" | "Ctrl+Shift" | "Alt+Shift";

/** A parsed keyboard shortcut definition */
export interface ShortcutDef {
  /** Unique shortcut identifier (matches SearchItem.id) */
  id: string;
  /** Human-readable label, e.g. "Alt+P" */
  label: string;
  /** The key code to listen for (e.g. "p", "d", "k") — always lowercase */
  key: string;
  /** Modifier(s) required */
  modifiers: {
    alt: boolean;
    ctrl: boolean;
    shift: boolean;
    meta: boolean;
  };
  /** Target navigation path */
  href: string;
  /** Toast message shown while navigating */
  toastMessage: string;
  /** Roles allowed to use this shortcut */
  roles: RoleName[];
  /** Required permissions (optional, any match) */
  permissions?: string[];
}

// ============================================================================
// Parser — converts "Alt+P" string into ShortcutDef.modifiers + key
// ============================================================================

/**
 * Parse a shortcut label like "Alt+P", "Ctrl+Shift+K" into its parts.
 * Returns `null` for invalid/empty strings.
 */
export function parseShortcutLabel(label: string): {
  key: string;
  modifiers: ShortcutDef["modifiers"];
} | null {
  if (!label) return null;

  const parts = label.split("+").map((p) => p.trim());
  if (parts.length === 0) return null;

  const key = parts[parts.length - 1].toLowerCase();
  if (!key) return null;

  const mods = new Set(parts.slice(0, -1).map((m) => m.toLowerCase()));

  return {
    key,
    modifiers: {
      alt: mods.has("alt"),
      ctrl: mods.has("ctrl") || mods.has("cmd"),
      shift: mods.has("shift"),
      meta: mods.has("meta") || mods.has("cmd"),
    },
  };
}

/**
 * Check whether a `KeyboardEvent` matches a `ShortcutDef`.
 */
export function matchesShortcut(e: KeyboardEvent, def: ShortcutDef): boolean {
  if (e.key.toLowerCase() !== def.key) return false;
  if (e.altKey !== def.modifiers.alt) return false;
  // Ctrl or Meta (Mac)
  if ((e.ctrlKey || e.metaKey) !== def.modifiers.ctrl) return false;
  if (e.shiftKey !== def.modifiers.shift) return false;
  return true;
}

/**
 * Determine whether keyboard shortcuts should be suppressed.
 * Prevents firing shortcuts when the user is typing in an input/textarea,
 * or when a dialog/modal is open.
 */
export function shouldSuppressShortcut(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;

  const tag = target.tagName.toLowerCase();
  // Suppress when focused on text inputs, textareas, selects, or contenteditable
  if (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  ) {
    return true;
  }

  // Suppress when a dialog/modal is open (role="dialog" or [data-state="open"])
  const dialog = document.querySelector(
    '[role="dialog"], [data-state="open"][role="dialog"]'
  );
  if (dialog) return true;

  return false;
}

// ============================================================================
// Shortcut category labels — for grouping in the README / help UI
// ============================================================================

export const SHORTCUT_CATEGORIES = {
  navigation: "Navigation",
  sales: "Sales & POS",
  inventory: "Inventory",
  employees: "Employees",
  management: "Management",
  system: "System",
} as const;

export type ShortcutCategory = keyof typeof SHORTCUT_CATEGORIES;
