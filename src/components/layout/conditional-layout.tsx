"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { SearchDialog } from "./search/search-dialog";
import {
  getLayoutConfig,
  resolvePageType,
  filterSidebarItems,
  mergeLayoutConfig,
} from "./config";
import type { LayoutConfig, ConditionalLayoutProps } from "./types";

// ============================================================================
// ConditionalLayout — Config-driven layout wrapper
// ============================================================================

export function ConditionalLayout({ children, forceConfig }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const { appUser } = useAuth();
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);

  // Resolve the page type from the current route
  const pageType = resolvePageType(pathname);

  // If we can't determine the page type and no forceConfig, render children directly
  if (!pageType && !forceConfig?.page) {
    return <>{children}</>;
  }

  // Build final config: base from page type, then merge overrides
  const baseConfig = getLayoutConfig(pageType ?? forceConfig!.page!);
  const config = forceConfig ? mergeLayoutConfig(baseConfig, forceConfig) : baseConfig;

  // Filter sidebar items by role & permissions
  const userRole = appUser?.role ?? null;
  const userPermissions = appUser?.permissions ?? [];

  const filteredSidebarItems = useMemo(() => {
    if (!config.sidebar.enabled || !userRole) return [];
    return filterSidebarItems(config.sidebar.items, userRole, userPermissions);
  }, [config.sidebar.enabled, config.sidebar.items, userRole, userPermissions]);

  // Handle mobile sidebar visibility
  const shouldShowSidebar =
    config.sidebar.enabled &&
    filteredSidebarItems.length > 0 &&
    !(isMobile && config.responsive.mobile.sidebarMode === "hidden");

  return (
    <SidebarProvider defaultOpen={config.sidebar.defaultOpen}>
      {/* Sidebar */}
      {shouldShowSidebar && (
        <AppSidebar
          items={filteredSidebarItems}
          pageTitle={config.header.title}
          pageSubtitle={config.header.subtitle}
        />
      )}

      {/* Main Content Area */}
      <SidebarInset>
        {/* Header */}
        <LayoutHeader config={config} onOpenSearch={() => setSearchOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6">{children}</main>

        {/* Footer */}
        {config.footer.enabled && <LayoutFooter />}
      </SidebarInset>

      {/* Global Search Dialog (Ctrl+K) */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  );
}

// ============================================================================
// Internal: Layout Header Wrapper (needs sidebar context)
// ============================================================================

function LayoutHeader({
  config,
  onOpenSearch,
}: {
  config: LayoutConfig;
  onOpenSearch: () => void;
}) {
  return <AppHeader config={config.header} onOpenSearch={onOpenSearch} />;
}

// ============================================================================
// Internal: Layout Footer
// ============================================================================

function LayoutFooter() {
  return (
    <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
      <p>&copy; {new Date().getFullYear()} StorePOS. All rights reserved.</p>
    </footer>
  );
}
