/**
 * print-bridge.ts — Client library for the Local POS Print Bridge.
 *
 * The Print Bridge is a Node.js service (pos-print-bridge.exe) that runs
 * on the store PC and listens on localhost:3001. It accepts the same
 * PrintReceiptData JSON that the frontend already builds, and prints it
 * on the store's thermal printer via USB (primary) or TCP/LAN.
 *
 * The frontend sends paper size and receipt display config per-request via
 * `_receiptConfig`, so the bridge always respects the user's current
 * ReceiptLayoutConfig from the cloud POS settings.
 *
 * Usage:
 *   import { isPrintBridgeAvailable, printViaBridge } from "@/lib/print-bridge";
 *
 *   if (await isPrintBridgeAvailable()) {
 *     await printViaBridge(receiptData, receiptLayoutConfig);
 *   }
 */

import type { ReceiptLayoutConfig } from "@/hooks/use-hardware";
import type { PrintReceiptData } from "@/utils/receipt-print";

// ============================================================================
// CONFIG
// ============================================================================

/** Candidate base URLs — tried in order until one responds. */
const BRIDGE_CANDIDATES = [
  "http://localhost:3001",
  "http://127.0.0.1:3001",
];

const HEALTH_TIMEOUT_MS = 2000;
const PRINT_TIMEOUT_MS  = 15000;

/**
 * Cached base URL of the first candidate that successfully responded.
 * Reset to null whenever the bridge appears to go offline so we re-probe.
 */
let _resolvedBase: string | null = null;

/** Clear the cached URL (e.g. after the bridge restarts or goes offline). */
export function resetBridgeUrlCache(): void {
  _resolvedBase = null;
}

/**
 * Fetch wrapper that probes localhost then 127.0.0.1, caching the winner.
 *
 * On production HTTPS pages (e.g. Vercel) browsers still allow requests to
 * http://localhost because it is a "potentially trustworthy origin" per the
 * Secure Contexts spec (Chrome 94+, Firefox 95+). However, on some Windows
 * machines "localhost" resolves to ::1 (IPv6) while the bridge only binds to
 * 127.0.0.1 (IPv4), causing a silent connection refusal. The fallback to
 * 127.0.0.1 covers that case.
 */
async function bridgeFetch(
  path: string,
  init?: Omit<RequestInit, "signal"> & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = HEALTH_TIMEOUT_MS, ...rest } = init ?? {};

  // Fast-path: use cached working URL.
  if (_resolvedBase) {
    return fetch(`${_resolvedBase}${path}`, {
      ...rest,
      signal: AbortSignal.timeout(timeoutMs),
    });
  }

  // Probe candidates in order and remember the first that responds.
  let lastErr: unknown;
  for (const base of BRIDGE_CANDIDATES) {
    try {
      const res = await fetch(`${base}${path}`, {
        ...rest,
        signal: AbortSignal.timeout(timeoutMs),
      });
      _resolvedBase = base;
      console.log(`[PrintBridge] ✅ Resolved bridge at ${base}`);
      return res;
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr ?? new Error("Print Bridge not reachable on localhost:3001 or 127.0.0.1:3001");
}

// ============================================================================
// TYPES
// ============================================================================

export interface PrintBridgeHealthResponse {
  status: "ok";
  service: string;
  version: string;
  uptime: number;
  printer: {
    connected: boolean;
    interface: string;
    type: string;
    error?: string;
  };
  stats: {
    printJobs: number;
    lastPrintTime: string | null;
    lastError: { message: string; time: string } | null;
  };
}

export interface PrintBridgeResult {
  success: boolean;
  message: string;
  requestId?: string;
  timestamp?: string;
  error?: string;
}

export interface BridgePrinterInfo {
  name: string;
  driver: string;
  port: string;
  status: "ready" | "offline";
  shared: boolean;
}

export interface BridgePrinterListResponse {
  printers: BridgePrinterInfo[];
  message: string;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if the local POS Print Bridge service is running and the
 * printer is connected.
 *
 * Returns `true` only if:
 *   1. The bridge service is reachable on localhost:3001
 *   2. The printer responds to a connection test
 *
 * Times out after 2 seconds — does not block the UI.
 */
export async function isPrintBridgeAvailable(): Promise<boolean> {
  try {
    const res = await bridgeFetch("/health");
    if (!res.ok) return false;

    const data: PrintBridgeHealthResponse = await res.json();
    return data.status === "ok" && data.printer?.connected === true;
  } catch {
    return false;
  }
}

/**
 * Check if the bridge service is running (even if printer is disconnected).
 * Useful for showing a "bridge detected but printer offline" status.
 */
export async function isPrintBridgeRunning(): Promise<boolean> {
  try {
    const res = await bridgeFetch("/health");
    if (!res.ok) return false;

    const data = await res.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

/**
 * Get detailed health/status from the bridge.
 * Returns null if the bridge is not reachable.
 */
export async function getPrintBridgeHealth(): Promise<PrintBridgeHealthResponse | null> {
  try {
    const res = await bridgeFetch("/health");
    if (!res.ok) {
      resetBridgeUrlCache(); // force re-probe next time
      return null;
    }
    return await res.json();
  } catch {
    resetBridgeUrlCache(); // bridge went offline — re-probe on next call
    return null;
  }
}

// ============================================================================
// PRINT
// ============================================================================

/**
 * Send receipt data to the local Print Bridge for printing.
 *
 * Accepts the same PrintReceiptData object that `printReceiptHtml()` and
 * `encodeReceiptEscPos()` use. No data transformation needed.
 *
 * Optionally accepts a ReceiptLayoutConfig to send paper size and receipt
 * display options to the bridge per-request — this way the bridge always
 * uses the same settings the user has configured in the cloud POS.
 *
 * @throws Error if the bridge is not reachable or print fails.
 */
export async function printViaBridge(
  data: PrintReceiptData,
  receiptConfig?: Partial<ReceiptLayoutConfig>,
): Promise<PrintBridgeResult> {
  // Build request body — merge receipt data with _receiptConfig
  const body: Record<string, unknown> = { ...data };

  console.log("[PrintBridge] 📤 Sending receipt to bridge...");
  console.log("[PrintBridge] 📋 Store:", data.store?.name, "|", data.store?.address);
  console.log("[PrintBridge] 📋 Invoice:", data.invoice?.number, "|", data.invoice?.date, data.invoice?.time);
  console.log("[PrintBridge] 📋 Items:", data.items?.length, "items");
  data.items?.forEach((item, i) => console.log(`[PrintBridge]    ${i + 1}. ${item.name} x${item.qty} = ₹${item.total}`));
  console.log("[PrintBridge] 📋 Total: ₹" + data.totals?.total, "| Paid: ₹" + data.totals?.paid);
  if (receiptConfig) {
    console.log("[PrintBridge] ⚙️ Config: paper=" + receiptConfig.paperSize + "mm",
      "showQty=" + receiptConfig.showQty, "showRate=" + receiptConfig.showRate,
      "showGST=" + receiptConfig.showGstBreakdown);
  }

  if (receiptConfig) {
    body._receiptConfig = {
      paperSize: receiptConfig.paperSize,
      showStoreName: receiptConfig.showStoreName,
      showStoreAddress: receiptConfig.showStoreAddress,
      showStorePhone: receiptConfig.showStorePhone,
      showStoreGstin: receiptConfig.showStoreGstin,
      showCustomerInfo: receiptConfig.showCustomerInfo,
      showHsn: receiptConfig.showHsn,
      showItemDiscount: receiptConfig.showItemDiscount,
      showQty: receiptConfig.showQty,
      showRate: receiptConfig.showRate,
      showGstBreakdown: receiptConfig.showGstBreakdown,
      showThankYou: receiptConfig.showThankYou,
      footerText: receiptConfig.footerText,
      headerNote: receiptConfig.headerNote,
    };
  }

  const res = await bridgeFetch("/print", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeoutMs: PRINT_TIMEOUT_MS,
  });

  const result: PrintBridgeResult = await res.json();

  if (!result.success) {
    console.error("[PrintBridge] ❌ Print failed:", result.message || result.error);
    throw new Error(result.message || result.error || "Print failed");
  }

  console.log("[PrintBridge] ✅ Print success:", result.message, "| Request:", result.requestId);
  return result;
}

/**
 * Print a test page via the bridge.
 * Used from the hardware settings page to verify printer connectivity.
 * Sends the current paper size so the test page uses the correct width.
 */
export async function printTestViaBridge(
  paperSize?: number | string,
): Promise<PrintBridgeResult> {
  const res = await bridgeFetch("/test-print", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paperSize }),
    timeoutMs: PRINT_TIMEOUT_MS,
  });

  const result: PrintBridgeResult = await res.json();

  if (!result.success) {
    throw new Error(result.message || result.error || "Test print failed");
  }

  return result;
}

// ============================================================================
// PRINTERS LIST
// ============================================================================

/**
 * List printers available on the store PC (via bridge).
 * Uses the bridge's GET /printers endpoint which calls PowerShell Get-Printer.
 */
export async function listBridgePrinters(): Promise<BridgePrinterListResponse> {
  try {
    const res = await bridgeFetch("/printers", { timeoutMs: 5000 });
    if (!res.ok) return { printers: [], message: "Bridge returned an error" };
    return await res.json();
  } catch {
    return { printers: [], message: "Print Bridge not reachable" };
  }
}

// ============================================================================
// CONFIG (REMOTE)
// ============================================================================

/**
 * Get the bridge's current printer configuration.
 */
export async function getBridgeConfig(): Promise<Record<string, unknown> | null> {
  try {
    const res = await bridgeFetch("/config");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Update the bridge's printer configuration at runtime.
 * Changes are saved to config.json on the store PC.
 */
export async function updateBridgeConfig(
  updates: {
    printer?: Partial<{
      type: string;
      interface: string;
      width: number;
      paperSize: number | string;
      timeout: number;
      characterSet: string;
    }>;
    receipt?: Partial<{
      showStoreName: boolean;
      showStoreAddress: boolean;
      showStorePhone: boolean;
      showStoreGstin: boolean;
      showCustomerInfo: boolean;
      showHsn: boolean;
      showItemDiscount: boolean;
      showQty: boolean;
      showRate: boolean;
      showGstBreakdown: boolean;
      showThankYou: boolean;
      footerText: string;
      headerNote: string;
    }>;
  },
): Promise<PrintBridgeResult> {
  const res = await bridgeFetch("/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  return await res.json();
}
