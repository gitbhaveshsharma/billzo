"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Search,
    UserPlus,
    Phone,
    AlertTriangle,
    X,
} from "lucide-react";
import type { Customer } from "@/types/customers.types";
import { useCustomerStore } from "@/stores/customers.store";
import {
    getCustomerInitials,
    getCustomerTypeLabel,
    getCustomerTypeColor,
    formatCurrency,
    formatPhone,
} from "@/utils/customers.utils";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface PosCustomerSearchProps {
    storeId: string | null;
    /** Called when a customer is selected */
    onSelect: (customer: Customer) => void;
    /** Called when "Add New Customer" is clicked */
    onAddNew?: () => void;
    /** Currently selected customer (for display) */
    selectedCustomer?: Customer | null;
    /** Called when selection is cleared */
    onClear?: () => void;
    /** Placeholder text */
    placeholder?: string;
    /** Additional className */
    className?: string;
    /** Auto focus input on mount */
    autoFocus?: boolean;
}

// ============================================================================
// DEBOUNCE HOOK
// ============================================================================

function useDebouncedValue(value: string, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

// ============================================================================
// SEARCH RESULT ITEM
// ============================================================================

function SearchResultItem({
    customer,
    onSelect,
    isHighlighted,
}: {
    customer: Customer;
    onSelect: (customer: Customer) => void;
    isHighlighted: boolean;
}) {
    const initials = getCustomerInitials(customer.name);

    return (
        <button
            type="button"
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent rounded-md transition-colors",
                isHighlighted && "bg-accent"
            )}
            onClick={() => onSelect(customer)}
        >
            <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {initials}
                </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{customer.name}</span>
                    <Badge
                        variant="secondary"
                        className={cn("text-[9px] flex-shrink-0", getCustomerTypeColor(customer.customer_type))}
                    >
                        {getCustomerTypeLabel(customer.customer_type)}
                    </Badge>
                    {customer.is_blacklisted && (
                        <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-2.5 w-2.5" />
                    <span>{formatPhone(customer.phone)}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span>{customer.customer_code}</span>
                </div>
            </div>
            {customer.outstanding_balance > 0 && (
                <div className="flex-shrink-0 text-right">
                    <p className="text-[10px] text-muted-foreground">Outstanding</p>
                    <p className="text-xs font-medium text-red-600">
                        {formatCurrency(customer.outstanding_balance)}
                    </p>
                </div>
            )}
        </button>
    );
}

// ============================================================================
// SELECTED CUSTOMER DISPLAY
// ============================================================================

function SelectedCustomerCard({
    customer,
    onClear,
}: {
    customer: Customer;
    onClear?: () => void;
}) {
    const initials = getCustomerInitials(customer.name);

    return (
        <div className="flex items-center gap-3 border rounded-md px-3 py-2 bg-accent/50">
            <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {initials}
                </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{customer.name}</p>
                <p className="text-xs text-muted-foreground">
                    {formatPhone(customer.phone)} · {customer.customer_code}
                </p>
            </div>
            {customer.outstanding_balance > 0 && (
                <Badge variant="destructive" className="text-[10px] flex-shrink-0">
                    Due: {formatCurrency(customer.outstanding_balance)}
                </Badge>
            )}
            {onClear && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={onClear}
                >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Clear selection</span>
                </Button>
            )}
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PosCustomerSearch({
    storeId,
    onSelect,
    onAddNew,
    selectedCustomer,
    onClear,
    placeholder = "Search by name, phone, or code...",
    className,
    autoFocus = false,
}: PosCustomerSearchProps) {
    const { searchResults, isSearching, quickSearch, clearSearchResults } = useCustomerStore();

    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const debouncedQuery = useDebouncedValue(query, 250);

    // Search when debounced query changes
    useEffect(() => {
        if (!storeId || debouncedQuery.length < 2) {
            clearSearchResults();
            return;
        }
        quickSearch(storeId, debouncedQuery);
    }, [storeId, debouncedQuery, quickSearch, clearSearchResults]);

    // Open dropdown when there's a query
    useEffect(() => {
        setIsOpen(debouncedQuery.length >= 2);
        setHighlightedIndex(-1);
    }, [debouncedQuery]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = useCallback(
        (customer: Customer) => {
            onSelect(customer);
            setQuery("");
            setIsOpen(false);
            clearSearchResults();
        },
        [onSelect, clearSearchResults]
    );

    const handleClear = useCallback(() => {
        onClear?.();
        setQuery("");
        clearSearchResults();
        inputRef.current?.focus();
    }, [onClear, clearSearchResults]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!isOpen) return;

            const totalItems = searchResults.length + (onAddNew ? 1 : 0);

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
                    break;
                case "Enter":
                    e.preventDefault();
                    if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
                        handleSelect(searchResults[highlightedIndex]);
                    } else if (highlightedIndex === searchResults.length && onAddNew) {
                        onAddNew();
                        setQuery("");
                        setIsOpen(false);
                    }
                    break;
                case "Escape":
                    setIsOpen(false);
                    setHighlightedIndex(-1);
                    break;
            }
        },
        [isOpen, searchResults, highlightedIndex, handleSelect, onAddNew]
    );

    // If a customer is selected, show the card
    if (selectedCustomer) {
        return (
            <div className={className}>
                <SelectedCustomerCard customer={selectedCustomer} onClear={handleClear} />
            </div>
        );
    }

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (debouncedQuery.length >= 2) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    className="pl-9"
                    autoFocus={autoFocus}
                />
                {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {/* Dropdown results */}
            {isOpen && (
                <Card className="absolute z-50 top-full left-0 right-0 mt-1 shadow-lg max-h-[300px] overflow-y-auto">
                    <div className="p-1">
                        {isSearching && searchResults.length === 0 && (
                            <div className="space-y-2 p-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                        <div className="space-y-1 flex-1">
                                            <Skeleton className="h-3 w-24" />
                                            <Skeleton className="h-2.5 w-32" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!isSearching && searchResults.length === 0 && debouncedQuery.length >= 2 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No customers found
                            </p>
                        )}

                        {searchResults.map((customer, index) => (
                            <SearchResultItem
                                key={customer.id}
                                customer={customer}
                                onSelect={handleSelect}
                                isHighlighted={index === highlightedIndex}
                            />
                        ))}

                        {/* Add New Customer option */}
                        {onAddNew && (
                            <>
                                {searchResults.length > 0 && (
                                    <div className="border-t my-1" />
                                )}
                                <button
                                    type="button"
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent rounded-md transition-colors text-sm",
                                        highlightedIndex === searchResults.length && "bg-accent"
                                    )}
                                    onClick={() => {
                                        onAddNew();
                                        setQuery("");
                                        setIsOpen(false);
                                    }}
                                >
                                    <UserPlus className="h-4 w-4 text-primary" />
                                    <span className="text-primary font-medium">Add New Customer</span>
                                </button>
                            </>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
}
