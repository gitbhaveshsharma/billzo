"use client";

import { ConditionalLayout } from "@/components/layout";
import type { ConditionalLayoutProps } from "@/components/layout";

/**
 * Client-side layout shell — use this in server-component layouts
 * that need to export metadata.
 *
 * Usage:
 * ```tsx
 * // In a server-component layout.tsx
 * import { LayoutShell } from "@/components/layout/layout-shell";
 *
 * export const metadata = { title: "..." };
 *
 * export default function SomeLayout({ children }) {
 *   return <LayoutShell>{children}</LayoutShell>;
 * }
 * ```
 */
export function LayoutShell({ children, forceConfig }: ConditionalLayoutProps) {
  return <ConditionalLayout forceConfig={forceConfig}>{children}</ConditionalLayout>;
}
