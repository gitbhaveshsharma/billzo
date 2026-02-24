// ============================================================================
// usePosData — React hook to hydrate POS catalog on mount
// Provides ready-state, loading indicator, and refresh trigger
// ============================================================================

import { useEffect, useCallback } from "react";
import { usePosCatalogStore } from "@/stores/pos-catalog.store";

/**
 * Hook for POS pages. Call at the top of your POS component.
 *
 * - First mount: loads from IndexedDB if cached, else fetches from network.
 * - Subsequent mounts (tab switch, navigation): instant — no re-fetch.
 * - Page refresh (F5): loads from IndexedDB — no network call.
 * - Hard refresh (Ctrl+Shift+R): IndexedDB survives → still instant.
 * - Explicit refresh: `onRefresh()` → re-fetches from network.
 *
 * @param storeId - The store ID to load catalog for
 */
export function usePosData(storeId: string | null) {
    const status = usePosCatalogStore((s) => s.status);
    const error = usePosCatalogStore((s) => s.error);
    const cacheMeta = usePosCatalogStore((s) => s.cacheMeta);
    const itemCount = usePosCatalogStore((s) => s.items.length);
    const hydrate = usePosCatalogStore((s) => s.hydrate);
    const refresh = usePosCatalogStore((s) => s.refresh);

    // Hydrate on mount (cache-first — no wasted network calls)
    useEffect(() => {
        if (storeId) {
            hydrate(storeId);
        }
    }, [storeId, hydrate]);

    // Stable refresh callback for the refresh button
    const onRefresh = useCallback(() => {
        if (storeId) {
            refresh(storeId);
        }
    }, [storeId, refresh]);

    return {
        /** Whether the catalog is loaded and ready for scanning */
        isReady: status === "ready",
        /** Whether the initial load is in progress */
        isLoading: status === "loading",
        /** Whether a refresh is in progress */
        isRefreshing: status === "refreshing",
        /** Error message, if any */
        error,
        /** Last load timestamp (ISO string) */
        lastLoadedAt: cacheMeta?.loaded_at ?? null,
        /** Total items in catalog */
        itemCount,
        /** Trigger a full network refresh */
        onRefresh,
    };
}
