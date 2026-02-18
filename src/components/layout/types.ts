import type { LucideIcon } from "lucide-react";
import type { RoleName } from "@/types/database.types";

// ============================================================================
// Layout System Types
// ============================================================================

/** Page sections that map to route groups */
export type PageType =
  | "super-admin"
  | "store-admin"
  | "manager"
  | "pos"
  | "accountant"
  | "inventory";

/** Header display modes */
export type HeaderType = "dashboard" | "pos" | "minimal";

/** Sidebar display modes on mobile */
export type MobileSidebarMode = "sheet" | "hidden";

// ============================================================================
// Sidebar Types
// ============================================================================

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Keyboard shortcut hint (e.g., "Alt+D") */
  shortcut?: string;
  /** Badge text (e.g., "3" for notifications) */
  badge?: string | number;
  /** Roles that can see this item */
  roles: RoleName[];
  /** Required permissions (any match) */
  permissions?: string[];
  /** Child items for collapsible groups */
  children?: SidebarChildItem[];
  /** Whether this item is a separator label */
  isSectionLabel?: boolean;
}

export interface SidebarChildItem {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  roles: RoleName[];
  permissions?: string[];
  shortcut?: string;
}

// ============================================================================
// Header Types
// ============================================================================

export interface HeaderConfig {
  type: HeaderType;
  /** Page title shown in header */
  title: string;
  /** Subtitle / description */
  subtitle?: string;
  /** Show the global search trigger (Ctrl+K) */
  showSearch: boolean;
  /** Show notification bell */
  showNotifications: boolean;
  /** Show user avatar/menu */
  showUserMenu: boolean;
  /** Show breadcrumbs */
  showBreadcrumbs: boolean;
  /** Show sidebar toggle button */
  showSidebarToggle: boolean;
}

// ============================================================================
// Sidebar Config
// ============================================================================

export interface SidebarConfig {
  enabled: boolean;
  /** Open by default on desktop */
  defaultOpen: boolean;
  /** Allow collapsing to icon-only mode */
  collapsible: boolean;
  /** Sidebar items for this page/role */
  items: SidebarItem[];
}

// ============================================================================
// Responsive Config
// ============================================================================

export interface ResponsiveConfig {
  mobile: {
    /** How sidebar behaves on mobile */
    sidebarMode: MobileSidebarMode;
    /** Use compact header on mobile */
    headerCompact: boolean;
  };
}

// ============================================================================
// Full Layout Config (per page type)
// ============================================================================

export interface LayoutConfig {
  page: PageType;
  header: HeaderConfig;
  sidebar: SidebarConfig;
  footer: {
    enabled: boolean;
  };
  responsive: ResponsiveConfig;
}

// ============================================================================
// ConditionalLayout Props
// ============================================================================

export interface ConditionalLayoutProps {
  children: React.ReactNode;
  /** Override config from the page-level config */
  forceConfig?: Partial<LayoutConfig>;
}

// ============================================================================
// Search Types
// ============================================================================

export type SearchCategory =
  | "navigation"
  | "sales"
  | "inventory"
  | "employees"
  | "reports"
  | "settings"
  | "customers"
  | "finance";

export type SearchPriority = "high" | "medium" | "low";

export interface SearchItem {
  id: string;
  name: string;
  description: string;
  category: SearchCategory;
  icon: LucideIcon;
  href: string;
  keywords: string[];
  priority: SearchPriority;
  /** Roles that can see this search result */
  roles: RoleName[];
  /** Required permissions (optional) */
  permissions?: string[];
  /** Keyboard shortcut to navigate directly */
  shortcut?: string;
}
