import * as React from "react"

import { cn } from "@/lib/utils"

// Input types that should NOT have auto-capitalization
const NON_TEXT_TYPES = new Set([
  "email", "password", "number", "tel", "url", 
  "date", "time", "datetime-local", "month", "week",
  "color", "file", "hidden", "range", "search"
])

// Transforms text to sentence case (first letter uppercase, rest lowercase)
const toSentenceCase = (value: string): string => {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

interface InputProps extends React.ComponentProps<"input"> {
  autoCapitalize?: "sentence" | "none"
}

function Input({ 
  className, 
  type = "text", 
  onChange,
  autoCapitalize = "sentence",
  ...props 
}: InputProps) {
  
  // Determine if capitalization should be applied
  const shouldCapitalize = autoCapitalize === "sentence" && !NON_TEXT_TYPES.has(type)

  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (shouldCapitalize) {
      const transformed = toSentenceCase(e.target.value)
      e.target.value = transformed
    }
    onChange?.(e)
  }, [onChange, shouldCapitalize])

  return (
    <input
      type={type}
      data-slot="input"
      onChange={handleChange}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-white px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }