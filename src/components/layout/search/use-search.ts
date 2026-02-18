"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SEARCH_INDEX, PRIORITY_WEIGHTS } from "./search-config";
import type { SearchItem } from "../types";
import type { RoleName } from "@/types/database.types";

// ============================================================================
// useSearch — Role-filtered, ranked search with debouncing
// ============================================================================

interface UseSearchOptions {
  debounceMs?: number;
}

interface UseSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: SearchItem[];
  groupedResults: Record<string, SearchItem[]>;
  isSearching: boolean;
  totalResults: number;
}

/** Filter search items by user role and permissions */
function filterByAccess(
  items: SearchItem[],
  role: RoleName | null,
  permissions: string[]
): SearchItem[] {
  if (!role) return [];
  return items.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (item.permissions && item.permissions.length > 0) {
      return item.permissions.some((p) => permissions.includes(p));
    }
    return true;
  });
}

/** Score a search item against a query string */
function scoreItem(item: SearchItem, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const terms = q.split(/\s+/);
  let score = 0;

  for (const term of terms) {
    // Exact name match — highest score
    if (item.name.toLowerCase().includes(term)) {
      score += 10;
      if (item.name.toLowerCase().startsWith(term)) score += 5;
    }

    // Description match
    if (item.description.toLowerCase().includes(term)) {
      score += 4;
    }

    // Keyword match
    if (item.keywords.some((kw) => kw.toLowerCase().includes(term))) {
      score += 6;
    }

    // Category match
    if (item.category.toLowerCase().includes(term)) {
      score += 3;
    }
  }

  // Apply priority weight
  score *= PRIORITY_WEIGHTS[item.priority] ?? 1;

  return score;
}

/** Group results by category */
function groupByCategory(items: SearchItem[]): Record<string, SearchItem[]> {
  const groups: Record<string, SearchItem[]> = {};
  for (const item of items) {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }
    groups[item.category].push(item);
  }
  return groups;
}

export function useSearch({ debounceMs = 150 }: UseSearchOptions = {}): UseSearchReturn {
  const { appUser } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the query
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs]);

  // Get accessible items for this user
  const accessibleItems = useMemo(
    () => filterByAccess(SEARCH_INDEX, appUser?.role ?? null, appUser?.permissions ?? []),
    [appUser?.role, appUser?.permissions]
  );

  // Compute scored + sorted results
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) {
      // When no query, show high-priority items grouped nicely
      return accessibleItems
        .filter((item) => item.priority === "high")
        .sort((a, b) => (a.category > b.category ? 1 : -1));
    }

    return accessibleItems
      .map((item) => ({ item, score: scoreItem(item, debouncedQuery) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  }, [debouncedQuery, accessibleItems]);

  // Group results
  const groupedResults = useMemo(() => groupByCategory(results), [results]);

  return {
    query,
    setQuery,
    results,
    groupedResults,
    isSearching: query !== debouncedQuery,
    totalResults: results.length,
  };
}
