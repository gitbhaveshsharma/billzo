"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/utils/sales.utils";
import { cn } from "@/lib/utils";

// ============================================================================
// POS REFRESH BUTTON — Manual catalog refresh trigger
// ============================================================================

interface PosRefreshButtonProps {
    /** Whether a refresh is currently in progress */
    isRefreshing: boolean;
    /** Last successful load timestamp (ISO string) */
    lastLoadedAt: string | null;
    /** Total items in catalog */
    itemCount: number;
    /** Callback to trigger refresh */
    onRefresh: () => void;
    className?: string;
}

export function PosRefreshButton({
    isRefreshing,
    lastLoadedAt,
    itemCount,
    onRefresh,
    className,
}: PosRefreshButtonProps) {
    const lastLoadedText = lastLoadedAt
        ? formatRelativeTime(lastLoadedAt)
        : "never";

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn("gap-1 text-xs", className)}
                        onClick={onRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw
                            className={cn(
                                "h-3.5 w-3.5",
                                isRefreshing && "animate-spin"
                            )}
                        />
                        {isRefreshing ? "Refreshing..." : "Refresh"}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                    <p>
                        {itemCount} items loaded · Last synced {lastLoadedText}
                    </p>
                    <p className="text-muted-foreground">
                        Click to reload fresh product & stock data
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
