"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface OTPInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    onComplete?: (value: string) => void;
    disabled?: boolean;
}

export function OTPInput({
    length = 6,
    value,
    onChange,
    onComplete,
    disabled = false,
}: OTPInputProps) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);

    /** Split the value string into individual digit array */
    const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

    /** Focus the input at given index */
    const focusInput = useCallback(
        (index: number) => {
            const clampedIndex = Math.max(0, Math.min(index, length - 1));
            inputRefs.current[clampedIndex]?.focus();
            setActiveIndex(clampedIndex);
        },
        [length]
    );

    /** Handle single digit change */
    const handleChange = useCallback(
        (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
            const digit = e.target.value.replace(/\D/g, "").slice(-1);
            if (!digit) return;

            const newValue = value.split("");
            newValue[index] = digit;
            const joined = newValue.join("").slice(0, length);
            onChange(joined);

            if (joined.length === length) {
                onComplete?.(joined);
            } else if (index < length - 1) {
                focusInput(index + 1);
            }
        },
        [value, length, onChange, onComplete, focusInput]
    );

    /** Handle keyboard navigation */
    const handleKeyDown = useCallback(
        (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Backspace") {
                e.preventDefault();
                const newValue = value.split("");
                if (newValue[index]) {
                    newValue[index] = "";
                    onChange(newValue.join(""));
                } else if (index > 0) {
                    newValue[index - 1] = "";
                    onChange(newValue.join(""));
                    focusInput(index - 1);
                }
            } else if (e.key === "ArrowLeft" && index > 0) {
                focusInput(index - 1);
            } else if (e.key === "ArrowRight" && index < length - 1) {
                focusInput(index + 1);
            }
        },
        [value, length, onChange, focusInput]
    );

    /** Handle paste — spread 6-digit code across inputs */
    const handlePaste = useCallback(
        (e: React.ClipboardEvent<HTMLInputElement>) => {
            e.preventDefault();
            const pastedData = e.clipboardData
                .getData("text/plain")
                .replace(/\D/g, "")
                .slice(0, length);
            if (pastedData.length > 0) {
                onChange(pastedData);
                if (pastedData.length === length) {
                    onComplete?.(pastedData);
                } else {
                    focusInput(Math.min(pastedData.length, length - 1));
                }
            }
        },
        [length, onChange, onComplete, focusInput]
    );

    /** Auto-focus first empty input on mount */
    useEffect(() => {
        const firstEmpty = digits.findIndex((d) => !d);
        focusInput(firstEmpty === -1 ? length - 1 : firstEmpty);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex items-center gap-2 justify-center">
            {digits.map((digit, index) => (
                <Input
                    key={index}
                    ref={(el) => {
                        inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    disabled={disabled}
                    onChange={(e) => handleChange(index, e)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    onFocus={() => setActiveIndex(index)}
                    className={cn(
                        "h-12 w-12 text-center text-lg font-semibold",
                        activeIndex === index && "ring-2 ring-primary"
                    )}
                    aria-label={`Digit ${index + 1}`}
                />
            ))}
        </div>
    );
}
