"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ScanBarcode,
  Printer,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHardware } from "@/hooks/use-hardware";
import { cn } from "@/lib/utils";

// ============================================================================
// HARDWARE STATUS INDICATOR — Compact badge for POS bottom bar
// ============================================================================

export function HardwareStatusIndicator() {
  const {
    isScannerConnected,
    isPrinterConnected,
    scanners,
    printers,
    isDetecting,
    detectAllDevices,
  } = useHardware();

  // Detect devices on mount
  useEffect(() => {
    detectAllDevices();
  }, [detectAllDevices]);

  const scannerName = scanners[0]?.name ?? "No scanner";
  const printerName = printers[0]?.name ?? "No printer";

  return (
    <TooltipProvider delayDuration={200}>
        {/* Scanner indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1">
              <ScanBarcode className="h-3.5 w-3.5 text-muted-foreground" />
              {isDetecting ? (
                <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
              ) : isScannerConnected ? (
                <span className="h-2 w-2 rounded-full bg-green-500" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-orange-400" />
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p className="font-medium">
              Scanner: {isScannerConnected ? "Connected" : "Not connected"}
            </p>
            <p className="text-muted-foreground">{scannerName}</p>
          </TooltipContent>
        </Tooltip>

        <span className="text-muted-foreground/30">|</span>

        {/* Printer indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1">
              <Printer className="h-3.5 w-3.5 text-muted-foreground" />
              {isDetecting ? (
                <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
              ) : isPrinterConnected ? (
                <span className="h-2 w-2 rounded-full bg-green-500" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-orange-400" />
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p className="font-medium">
              Printer: {isPrinterConnected ? "Connected" : "Not connected"}
            </p>
            <p className="text-muted-foreground">{printerName}</p>
          </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  );
}
