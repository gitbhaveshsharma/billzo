// ============================================================================
// Dashboard shared types
// ============================================================================

import type { LucideIcon } from "lucide-react";

/** Stat card configuration */
export interface DashboardStatConfig {
  label: string;
  value: number | string;
  icon: LucideIcon;
  /** Tailwind color class for the icon container */
  color: string;
  /** Optional trend info */
  trend?: {
    value: number;
    label: string;
    direction: "up" | "down" | "neutral";
  };
  /** Optional subtitle / secondary text */
  subtitle?: string;
  /** Whether the value represents currency */
  isCurrency?: boolean;
  /** Optional click handler */
  onClick?: () => void;
  /** Short human-readable tooltip explaining what this metric means */
  tooltip?: string;
}

/** Alert / warning card item */
export interface DashboardAlertItem {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  icon: LucideIcon;
  /** Optional action */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/** Chart data point (generic) */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

/** Top product item */
export interface TopProductItem {
  name: string;
  code: string;
  quantity: number;
  revenue: number;
}

/** Top customer item */
export interface TopCustomerItem {
  id: string;
  name: string;
  phone: string;
  totalPurchases: number;
  totalVisits: number;
}

/** Quick action configuration */
export interface QuickActionConfig {
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
}

/** Dashboard tab */
export type DashboardTab =
  | "overview"
  | "sales"
  | "inventory"
  | "purchases"
  | "shifts"
  | "customers";
