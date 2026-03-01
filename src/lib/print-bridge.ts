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

const HEALTH_TIMEOUT_MS = 3000;
const PRINT_TIMEOUT_MS  = 15000;

/** Max retries for health checks — helps when bridge is still starting up. */
const HEALTH_MAX_RETRIES = 3;
const HEALTH_RETRY_DELAY_MS = 1000;

/**
 * Cached base URL of the first candidate that successfully responded.
 * Reset to null whenever the bridge appears to go offline so we re-probe.
 */
let _resolvedBase: string | null = null;

/**
 * Last connection error reason — helps the UI show targeted troubleshooting.
 */
let _lastErrorReason: BridgeErrorReason = "none";

/** Clear the cached URL (e.g. after the bridge restarts or goes offline). */
export function resetBridgeUrlCache(): void {
  _resolvedBase = null;
}

/** Get the reason the last bridge connection attempt failed. */
export function getLastBridgeErrorReason(): BridgeErrorReason {
  return _lastErrorReason;
}

// ============================================================================
// ERROR CATEGORISATION
// ============================================================================

/**
 * Possible error categories — each maps to a specific user-facing
 * troubleshooting action on the hardware settings page.
 */
export type BridgeErrorReason =
  | "none"                 // No error
  | "connection-refused"   // TCP connection refused — bridge not running / firewall
  | "private-network"      // Chrome Private Network Access (PNA) blocked request
  | "cors"                 // CORS headers missing on bridge response
  | "timeout"              // Request timed out — bridge may be overloaded
  | "mixed-content"        // HTTPS page blocked HTTP request (older browser)
  | "unknown";             // Catch-all

/**
 * Categorise a fetch error into a BridgeErrorReason.
 *
 * Browser fetch errors are intentionally opaque (security), so we use
 * heuristics on the error message + current page protocol to guess the
 * most likely cause.
 */
function categorizeFetchError(err: unknown): BridgeErrorReason {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();

  // Explicit connection refusal — nothing listening on port / firewall
  if (msg.includes("err_connection_refused") || msg.includes("connection refused")) {
    return "connection-refused";
  }

  // Network error + HTTPS page → likely Private Network Access (PNA) block
  // Chrome blocks http://localhost from HTTPS without PNA preflight headers.
  if (
    (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("network error")) &&
    typeof window !== "undefined" && window.location?.protocol === "https:"
  ) {
    return "private-network";
  }

  // Explicit CORS mention
  if (msg.includes("cors") || msg.includes("cross-origin") || msg.includes("access-control")) {
    return "cors";
  }

  // Timeout
  if (msg.includes("timeout") || msg.includes("aborterror") || msg.includes("abort")) {
    return "timeout";
  }

  // Mixed content (older browsers)
  if (msg.includes("mixed content") || msg.includes("insecure")) {
    return "mixed-content";
  }

  return "unknown";
}

/**
 * User-friendly description for each error reason.
 */
export function getBridgeErrorMessage(reason: BridgeErrorReason): string {
  switch (reason) {
    case "none":
      return "";
    case "connection-refused":
      return "Connection refused — the Print Bridge is not running, or Windows Firewall is blocking port 3001.";
    case "private-network":
      return "Blocked by Chrome Private Network Access — the browser is preventing this HTTPS page from reaching localhost. See troubleshooting steps below.";
    case "cors":
      return "CORS error — the Print Bridge is not sending the required Access-Control headers.";
    case "timeout":
      return "Connection timed out — the bridge may still be starting up. Try again in a few seconds.";
    case "mixed-content":
      return "Mixed content blocked — your browser is blocking HTTP requests from this HTTPS page.";
    case "unknown":
      return "Could not connect to the Print Bridge. Check that pos-print-bridge.exe is running on this computer.";
  }
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
 *
 * Chrome's **Private Network Access** (PNA) spec also requires the bridge
 * server to respond to CORS preflight (OPTIONS) with the header
 * `Access-Control-Allow-Private-Network: true`.  If your bridge does not
 * include this header, Chrome will refuse the connection from an HTTPS page.
 */
async function bridgeFetch(
  path: string,
  init?: Omit<RequestInit, "signal"> & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = HEALTH_TIMEOUT_MS, ...rest } = init ?? {};

  // Fast-path: use cached working URL.
  if (_resolvedBase) {
    try {
      const res = await fetch(`${_resolvedBase}${path}`, {
        ...rest,
        signal: AbortSignal.timeout(timeoutMs),
      });
      _lastErrorReason = "none";
      return res;
    } catch (err) {
      // Cached URL failed — clear cache and try all candidates below.
      _resolvedBase = null;
      console.log("[PrintBridge] ⚠️ Cached URL failed, re-probing candidates...");
    }
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
      _lastErrorReason = "none";
      console.log(`[PrintBridge] ✅ Resolved bridge at ${base}`);
      return res;
    } catch (err) {
      lastErr = err;
    }
  }

  // Categorise the error for UI troubleshooting
  _lastErrorReason = categorizeFetchError(lastErr);
  console.error(`[PrintBridge] ❌ All candidates failed. Reason: ${_lastErrorReason}`);

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

/** Small helper — wait for `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Check if the local POS Print Bridge service is running and the
 * printer is connected.
 *
 * Returns `true` only if:
 *   1. The bridge service is reachable on localhost:3001
 *   2. The printer responds to a connection test
 *
 * Times out after 3 seconds — does not block the UI.
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
 * Get detailed health/status from the bridge **with automatic retries**.
 *
 * The bridge can take 1-3 seconds after starting before the HTTP server
 * is ready. This function retries up to `HEALTH_MAX_RETRIES` times with
 * a delay between attempts so it succeeds even if the user clicks "Check"
 * right after launching the bridge exe.
 *
 * Returns null if the bridge is not reachable after all attempts.
 */
export async function getPrintBridgeHealth(): Promise<PrintBridgeHealthResponse | null> {
  for (let attempt = 1; attempt <= HEALTH_MAX_RETRIES; attempt++) {
    try {
      const res = await bridgeFetch("/health");
      if (!res.ok) {
        resetBridgeUrlCache();
        if (attempt < HEALTH_MAX_RETRIES) {
          console.log(`[PrintBridge] ⏳ Attempt ${attempt}/${HEALTH_MAX_RETRIES} got HTTP ${res.status}, retrying...`);
          await sleep(HEALTH_RETRY_DELAY_MS);
          continue;
        }
        return null;
      }
      return await res.json();
    } catch (err) {
      resetBridgeUrlCache();
      if (attempt < HEALTH_MAX_RETRIES) {
        console.log(
          `[PrintBridge] ⏳ Attempt ${attempt}/${HEALTH_MAX_RETRIES} failed (${_lastErrorReason}), retrying in ${HEALTH_RETRY_DELAY_MS}ms...`,
        );
        await sleep(HEALTH_RETRY_DELAY_MS);
      } else {
        console.error(`[PrintBridge] ❌ All ${HEALTH_MAX_RETRIES} health attempts failed. Last reason: ${_lastErrorReason}`);
      }
    }
  }
  return null;
}

// ============================================================================
// DIAGNOSTICS
// ============================================================================

export interface BridgeDiagnosticResult {
  /** Is the page served over HTTPS? */
  isHttps: boolean;
  /** Results per candidate URL */
  candidates: Array<{
    url: string;
    reachable: boolean;
    errorReason: BridgeErrorReason;
    errorDetail: string;
    httpStatus?: number;
  }>;
  /** Aggregated likely cause */
  likelyCause: BridgeErrorReason;
  /** Human-readable summary */
  summary: string;
}

/**
 * Run a deep diagnostic against all bridge candidate URLs.
 *
 * Unlike the normal health check this does NOT cache results — it tests
 * every candidate URL independently and returns detailed per-URL results
 * so the UI can show the user exactly what went wrong.
 */
export async function diagnosePrintBridge(): Promise<BridgeDiagnosticResult> {
  const isHttps = typeof window !== "undefined" && window.location?.protocol === "https:";
  const candidates: BridgeDiagnosticResult["candidates"] = [];

  for (const base of BRIDGE_CANDIDATES) {
    const url = `${base}/health`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
      candidates.push({
        url: base,
        reachable: true,
        errorReason: "none",
        errorDetail: "",
        httpStatus: res.status,
      });
    } catch (err) {
      const reason = categorizeFetchError(err);
      candidates.push({
        url: base,
        reachable: false,
        errorReason: reason,
        errorDetail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // If any candidate succeeded, bridge is fine
  const anyReachable = candidates.some((c) => c.reachable);
  if (anyReachable) {
    return {
      isHttps,
      candidates,
      likelyCause: "none",
      summary: "Print Bridge is reachable.",
    };
  }

  // Determine most likely cause from the failures
  const reasons = candidates.map((c) => c.errorReason);
  let likelyCause: BridgeErrorReason = "unknown";

  if (reasons.includes("private-network")) {
    likelyCause = "private-network";
  } else if (reasons.includes("cors")) {
    likelyCause = "cors";
  } else if (reasons.includes("mixed-content")) {
    likelyCause = "mixed-content";
  } else if (reasons.includes("connection-refused")) {
    likelyCause = "connection-refused";
  } else if (reasons.includes("timeout")) {
    likelyCause = "timeout";
  }

  return {
    isHttps,
    candidates,
    likelyCause,
    summary: getBridgeErrorMessage(likelyCause),
  };
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
