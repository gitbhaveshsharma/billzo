import * as React from "react"

import { cn } from "@/lib/utils"

// Input types that should NOT have auto-capitalization
const NON_TEXT_TYPES = new Set([
  "email", "password", "number", "tel", "url",
  "date", "time", "datetime-local", "month", "week",
  "color", "file", "hidden", "range", "search"
])

// Transforms text to sentence case without altering user-entered casing beyond first char
const toSentenceCase = (value: string): string => {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

// Transforms text to uppercase
const toUpperCase = (value: string): string => {
  if (!value) return value
  return value.toUpperCase()
}

interface InputProps extends React.ComponentProps<"input"> {
  autoCapitalize?: "sentence" | "none"
  uppercase?: boolean
}

const FOCUSABLE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

const isElementVisible = (element: HTMLElement): boolean => {
  if (element.hidden) return false
  if (element.getAttribute("aria-hidden") === "true") return false
  return element.offsetParent !== null
}

const isElementDisabled = (element: HTMLElement): boolean => {
  if ("disabled" in element) {
    return Boolean((element as HTMLInputElement).disabled)
  }
  return element.getAttribute("aria-disabled") === "true"
}

const getFocusableElements = (): HTMLElement[] => {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => isElementVisible(element) && !isElementDisabled(element)
  )
}

const focusRelativeElement = (current: HTMLInputElement, direction: -1 | 1): boolean => {
  const focusable = getFocusableElements()
  const currentIndex = focusable.indexOf(current)
  if (currentIndex === -1) return false

  const target = focusable[currentIndex + direction]
  if (!target) return false

  target.focus()
  return true
}

function Input({
  className,
  type = "text",
  onChange,
  onKeyDown,
  autoCapitalize = "none",
  uppercase = false,
  ...props
}: InputProps) {

  // Determine if capitalization should be applied
  const shouldCapitalize = autoCapitalize === "sentence" && !NON_TEXT_TYPES.has(type) && !uppercase
  const shouldUppercase = uppercase && !NON_TEXT_TYPES.has(type)

  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (shouldUppercase) {
      const transformed = toUpperCase(e.target.value)
      if (transformed !== e.target.value) {
        e.target.value = transformed
      }
    } else if (shouldCapitalize) {
      const transformed = toSentenceCase(e.target.value)
      if (transformed !== e.target.value) {
        e.target.value = transformed
      }
    }
    onChange?.(e)
  }, [onChange, shouldCapitalize, shouldUppercase])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return

    const input = e.currentTarget
    const hasSelection = (input.selectionStart ?? 0) !== (input.selectionEnd ?? 0)

    // Keep native caret movement while editing text. Move focus only at boundaries.
    if (e.key === "ArrowLeft") {
      const atStart = (input.selectionStart ?? 0) === 0
      if (atStart && !hasSelection && focusRelativeElement(input, -1)) {
        e.preventDefault()
      }
      return
    }

    if (e.key === "ArrowRight") {
      const valueLength = input.value.length
      const atEnd = (input.selectionEnd ?? 0) === valueLength
      if (atEnd && !hasSelection && focusRelativeElement(input, 1)) {
        e.preventDefault()
      }
      return
    }

    if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !e.altKey && !e.ctrlKey && !e.metaKey) {
      const moved = focusRelativeElement(input, e.key === "ArrowUp" ? -1 : 1)
      if (moved) {
        e.preventDefault()
      }
    }
  }, [onKeyDown])

  return (
    <input
      type={type}
      data-slot="input"
      autoCapitalize={autoCapitalize === "sentence" ? "sentences" : "off"}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
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