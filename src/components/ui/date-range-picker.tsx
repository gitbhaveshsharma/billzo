"use client";

import * as React from "react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ============================================================================
// Preset definitions
// ============================================================================

export type DatePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "this_month"
  | "last_month"
  | "this_fy"
  | "last_fy"
  | "custom";

interface PresetConfig {
  label: string;
  getRange: () => DateRange;
}

/**
 * Indian Financial Year helper:
 * FY 2025-26 runs Apr 1 2025 → Mar 31 2026
 */
function getCurrentFYStart(): Date {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 3, 1); // Apr 1
}

function getCurrentFYEnd(): Date {
  const start = getCurrentFYStart();
  return new Date(start.getFullYear() + 1, 2, 31); // Mar 31 next year
}

function getLastFYStart(): Date {
  const currentStart = getCurrentFYStart();
  return new Date(currentStart.getFullYear() - 1, 3, 1);
}

function getLastFYEnd(): Date {
  const currentStart = getCurrentFYStart();
  return new Date(currentStart.getFullYear(), 2, 31);
}

const PRESETS: Record<Exclude<DatePreset, "custom">, PresetConfig> = {
  today: {
    label: "Today",
    getRange: () => {
      const today = new Date();
      return { from: today, to: today };
    },
  },
  yesterday: {
    label: "Yesterday",
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: yesterday, to: yesterday };
    },
  },
  last7: {
    label: "Last 7 Days",
    getRange: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  last30: {
    label: "Last 30 Days",
    getRange: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  this_month: {
    label: "This Month",
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  last_month: {
    label: "Last Month",
    getRange: () => {
      const lastMonth = subDays(startOfMonth(new Date()), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
  this_fy: {
    label: "This FY",
    getRange: () => ({
      from: getCurrentFYStart(),
      to: getCurrentFYEnd(),
    }),
  },
  last_fy: {
    label: "Last FY",
    getRange: () => ({
      from: getLastFYStart(),
      to: getLastFYEnd(),
    }),
  },
};

// ============================================================================
// Component
// ============================================================================

interface DateRangePickerProps {
  /** Controlled date range */
  value: DateRange | undefined;
  /** Called when the user picks a range */
  onChange: (range: DateRange | undefined) => void;
  /** Optional className for the trigger button */
  className?: string;
  /** Whether to show preset shortcuts */
  showPresets?: boolean;
  /** Placeholder when no range selected */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  className,
  showPresets = true,
  placeholder = "Select date range",
  disabled = false,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [activePreset, setActivePreset] = React.useState<DatePreset>("this_month");

  // Apply preset on mount if no value
  React.useEffect(() => {
    if (!value && activePreset !== "custom") {
      const preset = PRESETS[activePreset];
      if (preset) {
        onChange(preset.getRange());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePresetChange = React.useCallback(
    (preset: DatePreset) => {
      if (preset === "custom") {
        setActivePreset("custom");
        return;
      }
      setActivePreset(preset);
      const config = PRESETS[preset];
      if (config) {
        onChange(config.getRange());
      }
    },
    [onChange]
  );

  const handleCalendarSelect = React.useCallback(
    (range: DateRange | undefined) => {
      setActivePreset("custom");
      onChange(range);
    },
    [onChange]
  );

  const displayText = React.useMemo(() => {
    if (!value?.from) return placeholder;
    if (!value.to) return format(value.from, "MMM dd, yyyy");
    if (
      format(value.from, "yyyy-MM-dd") === format(value.to, "yyyy-MM-dd")
    ) {
      return format(value.from, "MMM dd, yyyy");
    }
    return `${format(value.from, "MMM dd, yyyy")} – ${format(value.to, "MMM dd, yyyy")}`;
  }, [value, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal min-w-[260px]",
            !value?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          {/* Preset selector */}
          {showPresets && (
            <div className="border-b sm:border-b-0 sm:border-r p-3 space-y-1 min-w-[140px]">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Quick Select
              </p>
              {Object.entries(PRESETS).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handlePresetChange(key as DatePreset)}
                  className={cn(
                    "w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                    activePreset === key
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  {config.label}
                </button>
              ))}
            </div>
          )}

          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={value}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
