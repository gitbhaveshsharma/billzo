"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useSearch } from "./use-search";
import { SEARCH_CATEGORY_LABELS } from "./search-config";

// ============================================================================
// SearchDialog — Ctrl+K command palette
// ============================================================================

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const { query, setQuery, groupedResults, isSearching, totalResults } = useSearch();

  // Global keyboard shortcut: Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      // Slight delay to avoid flash
      const timer = setTimeout(() => setQuery(""), 200);
      return () => clearTimeout(timer);
    }
  }, [open, setQuery]);

  const handleSelect = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [router, onOpenChange]
  );

  const categoryOrder = Object.keys(groupedResults);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search pages, actions, and settings across the platform"
    >
      <CommandInput
        placeholder="Type to search pages, actions, settings..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? (
            <span className="text-muted-foreground">Searching...</span>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span>No results found.</span>
              <span className="text-xs text-muted-foreground">
                Try different keywords or check your spelling.
              </span>
            </div>
          )}
        </CommandEmpty>

        {categoryOrder.map((category, idx) => {
          const items = groupedResults[category];
          if (!items || items.length === 0) return null;

          return (
            <div key={category}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={SEARCH_CATEGORY_LABELS[category] ?? category}>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.name} ${item.keywords.join(" ")}`}
                    onSelect={() => handleSelect(item.href)}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-sm font-medium truncate">
                        {item.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </span>
                    </div>
                    {item.shortcut && (
                      <CommandShortcut>{item.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          );
        })}

        {/* Footer hint */}
        {totalResults > 0 && (
          <>
            <CommandSeparator />
            <div className="px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
              <span>{totalResults} result{totalResults !== 1 ? "s" : ""}</span>
              <span className="flex items-center gap-1.5">
                <kbd className="pointer-events-none h-5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                  &uarr;&darr;
                </kbd>
                <span>navigate</span>
                <kbd className="pointer-events-none h-5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                  &crarr;
                </kbd>
                <span>open</span>
                <kbd className="pointer-events-none h-5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                  esc
                </kbd>
                <span>close</span>
              </span>
            </div>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
