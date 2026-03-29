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
            // Check for Alt+Q (works even when focus is inside form fields/modals)
            if (e.altKey && e.key.toLowerCase() === "q") {
                // Ignore auto-repeat so one key hold doesn't rapidly toggle
                if (e.repeat) {
                    return;
                }

                e.preventDefault();
                e.stopPropagation();
                toggle();
            }
        };

        // Capture phase lets this run even if a modal stops bubbling events.
        document.addEventListener("keydown", handleKeyDown, true);
        return () => document.removeEventListener("keydown", handleKeyDown, true);
    }, [toggle]);

    return {
        isOpen,
        open,
        close,
        toggle,
        setOpen: setIsOpen,
    };
}
