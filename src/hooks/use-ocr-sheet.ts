"use client";

// ============================================================================
// USE OCR SHEET — Hook to manage global OCR sheet state with Alt+Q shortcut
// ============================================================================

import { useState, useEffect, useCallback } from "react";

interface UseOcrSheetReturn {
    /** Whether the OCR sheet is open */
    isOpen: boolean;
    /** Open the OCR sheet */
    open: () => void;
    /** Close the OCR sheet */
    close: () => void;
    /** Toggle the OCR sheet */
    toggle: () => void;
    /** Set open state (for controlled component) */
    setOpen: (open: boolean) => void;
}

/**
 * Hook to manage the global OCR sheet state and keyboard shortcut (Alt+Q)
 */
export function useOcrSheet(): UseOcrSheetReturn {
    const [isOpen, setIsOpen] = useState(false);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

    // Register Alt+Q keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Alt+Q
            if (e.altKey && e.key.toLowerCase() === "q") {
                // Don't trigger when typing in inputs/textareas
                const target = e.target as HTMLElement | null;
                if (target) {
                    const tag = target.tagName.toLowerCase();
                    if (
                        tag === "input" ||
                        tag === "textarea" ||
                        tag === "select" ||
                        target.isContentEditable
                    ) {
                        return;
                    }
                }

                e.preventDefault();
                e.stopPropagation();
                toggle();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [toggle]);

    return {
        isOpen,
        open,
        close,
        toggle,
        setOpen: setIsOpen,
    };
}
