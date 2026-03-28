"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// PROGRESS COMPONENT — Visual progress bar using Tailwind CSS
// ============================================================================

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Current progress value (0-100) */
    value?: number;
    /** Maximum value (default: 100) */
    max?: number;
    /** Show percentage label */
    showLabel?: boolean;
    /** Size variant */
    size?: "sm" | "md" | "lg";
    /** Color variant */
    variant?: "default" | "success" | "warning" | "destructive";
}

const sizeStyles = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
} as const;

const variantStyles = {
    default: "bg-primary",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    destructive: "bg-destructive",
} as const;

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
    (
        {
            className,
            value = 0,
            max = 100,
            showLabel = false,
            size = "md",
            variant = "default",
            ...props
        },
        ref
    ) => {
        const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

        return (
            <div className={cn("w-full", className)} ref={ref} {...props}>
                <div
                    className={cn(
                        "w-full overflow-hidden rounded-full bg-muted",
                        sizeStyles[size]
                    )}
                    role="progressbar"
                    aria-valuenow={value}
                    aria-valuemin={0}
                    aria-valuemax={max}
                >
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-300 ease-out",
                            variantStyles[variant]
                        )}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                {showLabel && (
                    <p className="mt-1 text-xs text-muted-foreground text-right">
                        {Math.round(percentage)}%
                    </p>
                )}
            </div>
        );
    }
);

Progress.displayName = "Progress";

export { Progress };
export type { ProgressProps };
