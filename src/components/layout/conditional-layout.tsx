"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useOcrSheet } from "@/hooks/use-ocr-sheet";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { SearchDialog } from "./search/search-dialog";
import { OcrSheet } from "@/components/shared/ocr-extractor";
import {
  getLayoutConfig,
  resolvePageType,
  filterSidebarItems,
  mergeLayoutConfig,
} from "./config";
import type { LayoutConfig, ConditionalLayoutProps } from "./types";

// ============================================================================
// ConditionalLayout — Config-driven layout wrapper
// All hooks must be called unconditionally before any early returns.
// ============================================================================

export function ConditionalLayout({ children, forceConfig }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const { appUser } = useAuth();
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Global OCR sheet (Alt+Q)
  const ocrSheet = useOcrSheet();

  // Resolve the page type from the current route
  const pageType = resolvePageType(pathname);

  // Derive role and stabilize permissions array to prevent unnecessary re-renders.
  // Memoize permissions so the array reference only changes when contents change.
  const userRole = appUser?.role ?? null;
  const userPermissions = useMemo(
    () => appUser?.permissions ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(appUser?.permissions)]
  );

  // Build config from page type then apply any forceConfig overrides
  const config = useMemo(() => {
    const effectivePage = pageType ?? forceConfig?.page;
    if (!effectivePage) return null;
    const base = getLayoutConfig(effectivePage);
    return forceConfig ? mergeLayoutConfig(base, forceConfig) : base;
  }, [pageType, forceConfig]);

  // Filter sidebar items by role & permissions
  const filteredSidebarItems = useMemo(() => {
    if (!config?.sidebar.enabled || !userRole) return [];
    return filterSidebarItems(config.sidebar.items, userRole, userPermissions);
  }, [config, userRole, userPermissions]);

  // Global keyboard shortcuts (Alt+key navigation with toast feedback)
  // Pass filtered sidebar items so shortcuts resolve to the correct role-specific route
  // Disable shortcuts when search or OCR sheet is open
  useKeyboardShortcuts({ 
    disabled: searchOpen || ocrSheet.isOpen, 
    sidebarItems: filteredSidebarItems 
  });

  // If no resolvable config, render children without layout chrome
  if (!config) {
    return (
      <>
        {children}
        {/* Global OCR Sheet - available even without layout */}
        <OcrSheet open={ocrSheet.isOpen} onOpenChange={ocrSheet.setOpen} />
      </>
    );
  }

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
        <main
          className={
            config.header.type === "pos"
              ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
              : "flex-1 p-4 md:p-6"
          }
        >
          {children}
        </main>

        {/* Footer */}
        {config.footer.enabled && <LayoutFooter />}
      </SidebarInset>

      {/* Global Search Dialog (Ctrl+K) */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      
      {/* Global OCR Sheet (Alt+Q) */}
      <OcrSheet open={ocrSheet.isOpen} onOpenChange={ocrSheet.setOpen} />
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
