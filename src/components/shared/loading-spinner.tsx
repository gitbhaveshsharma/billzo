"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg";
    className?: string;
    text?: string;
}

const sizeMap = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-10 w-10",
};

export function LoadingSpinner({
    size = "md",
    className,
    text,
}: LoadingSpinnerProps) {
    return (
        <div className={cn("flex items-center justify-center gap-2", className)}>
            <Loader2 className={cn("animate-spin text-muted-foreground", sizeMap[size])} />
            {text && <span className="text-sm text-muted-foreground">{text}</span>}
        </div>
    );
}

/** Full-page loading state */
export function PageLoader({ text = "Loading..." }: { text?: string }) {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <LoadingSpinner size="lg" text={text} />
        </div>
    );
}
