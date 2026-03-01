"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { } from "@/types/web-hardware.d";
import { buildTestReceiptData, printReceiptHtml, type PrintReceiptData } from "@/utils/receipt-print";
import { encodeReceiptEscPos, sendToUsbPrinter } from "@/utils/escpos-encoder";
import {
  isPrintBridgeAvailable,
  isPrintBridgeRunning,
  getPrintBridgeHealth,
  printViaBridge,
  printTestViaBridge,
  listBridgePrinters,
  getLastBridgeErrorReason,
  diagnosePrintBridge,
  getBridgeErrorMessage,
  type PrintBridgeHealthResponse,
  type BridgePrinterInfo,
  type BridgeErrorReason,
  type BridgeDiagnosticResult,
} from "@/lib/print-bridge";

// ============================================================================
// TYPES
// ============================================================================

export type HardwareDeviceType = "scanner" | "printer";
export type ConnectionStatus = "connected" | "disconnected" | "testing" | "error";

export interface HardwareDevice {
  id: string;
  name: string;
  type: HardwareDeviceType;
  status: ConnectionStatus;
  manufacturer?: string;
  productId?: string;
  vendorId?: string;
  lastSeen?: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  port?: any;
}

export interface ScannerConfig {
  /** Minimum characters for a valid barcode */
  minLength: number;
  /** Maximum time between keystrokes to detect scanner (ms) */
  maxKeystrokeGap: number;
  /** Suffix character sent by scanner (usually Enter = \n) */
  suffix: string;
  /** Use Web Serial API for USB scanners */
  useSerialApi: boolean;
}

export interface PrinterConfig {
  /** Paper width in mm (58mm or 80mm thermal) */
  paperWidth: 58 | 80;
  /** Use Web USB for direct printing */
  useWebUsb: boolean;
}

// ============================================================================
// RECEIPT LAYOUT CONFIG
// ============================================================================

/** Visual style / layout template for the receipt */
export type ReceiptLayout =
  | "thermal-compact"   // 58mm/80mm — minimal, fast
  | "thermal-detailed"  // 80mm — full breakdown, GST
  | "invoice-a5"        // A5 — half-page invoice
  | "invoice-a4";       // A4 — full-page professional invoice

/** Paper size for printing */
export type ReceiptPaperSize = 58 | 80 | "A5" | "A4";

/** Font size scale for receipt text */
export type ReceiptFontSize = "small" | "medium" | "large";

export interface ReceiptLayoutConfig {
  // ── Template ──────────────────────────────────────────────────────────
  layout: ReceiptLayout;
  paperSize: ReceiptPaperSize;
  fontSize: ReceiptFontSize;
  printCopies: 1 | 2 | 3;
  autoPrint: boolean;

  // ── Header section ────────────────────────────────────────────────────
  showLogo: boolean;
  showStoreName: boolean;
  showStoreAddress: boolean;
  showStorePhone: boolean;
  showStoreGstin: boolean;
  headerNote: string;          // custom text below store info

  // ── Body / line-items ─────────────────────────────────────────────────
  showHsn: boolean;            // HSN/SAC code per item
  showItemDiscount: boolean;   // per-line discount amount
  showQty: boolean;            // quantity column
  showRate: boolean;           // unit rate column
  showGstBreakdown: boolean;   // CGST / SGST / IGST rows
  showCustomerInfo: boolean;   // customer name & phone

  // ── Footer section ────────────────────────────────────────────────────
  footerText: string;          // e.g. "Visit again!"
  showThankYou: boolean;
  showBarcode: boolean;        // invoice number barcode
  showQrCode: boolean;         // UPI / payment QR
}

export const DEFAULT_RECEIPT_LAYOUT_CONFIG: ReceiptLayoutConfig = {
  layout: "thermal-detailed",
  paperSize: 80,
  fontSize: "small",
  printCopies: 1,
  autoPrint: false,

  showLogo: false,
  showStoreName: true,
  showStoreAddress: true,
  showStorePhone: true,
  showStoreGstin: true,
  headerNote: "",

  showHsn: false,
  showItemDiscount: true,
  showQty: true,
  showRate: true,
  showGstBreakdown: true,
  showCustomerInfo: true,

  footerText: "Thank you for your purchase!",
  showThankYou: true,
  showBarcode: false,
  showQrCode: false,
};

export interface ScanLogEntry {
  barcode: string;
  timestamp: Date;
  source: "keyboard-wedge" | "serial";
}

export interface HardwareState {
  scanners: HardwareDevice[];
  printers: HardwareDevice[];
  isScannerConnected: boolean;
  isPrinterConnected: boolean;
  lastScannedBarcode: string | null;
  scanLog: ScanLogEntry[];
  scannerConfig: ScannerConfig;
  printerConfig: PrinterConfig;
  receiptLayoutConfig: ReceiptLayoutConfig;
}

const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  minLength: 3,
  maxKeystrokeGap: 50,
  suffix: "\n",
  useSerialApi: false,
};

const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  paperWidth: 80,
  useWebUsb: false,
};

// ============================================================================
// HARDWARE HOOK — Manage barcode scanners & receipt printers
// ============================================================================

export function useHardware() {
  const [scanners, setScanners] = useState<HardwareDevice[]>([]);
  const [printers, setPrinters] = useState<HardwareDevice[]>([]);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [scanLog, setScanLog] = useState<ScanLogEntry[]>([]);
  const [scannerConfig, setScannerConfig] = useState<ScannerConfig>(DEFAULT_SCANNER_CONFIG);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(DEFAULT_PRINTER_CONFIG);
  const [receiptLayoutConfig, setReceiptLayoutConfig] = useState<ReceiptLayoutConfig>(DEFAULT_RECEIPT_LAYOUT_CONFIG);
  const [isDetecting, setIsDetecting] = useState(false);

  // ── Print Bridge state ────────────────────────────────────────────────
  const [bridgeStatus, setBridgeStatus] = useState<"unknown" | "running" | "connected" | "offline">("unknown");
  const [bridgeHealth, setBridgeHealth] = useState<PrintBridgeHealthResponse | null>(null);
  const [bridgePrinters, setBridgePrinters] = useState<BridgePrinterInfo[]>([]);
  const [bridgeErrorReason, setBridgeErrorReason] = useState<BridgeErrorReason>("none");
  const [bridgeDiagnostic, setBridgeDiagnostic] = useState<BridgeDiagnosticResult | null>(null);

  // For keyboard-wedge barcode scanner detection
  const keystrokeBuffer = useRef<string>("");
  const lastKeystrokeTime = useRef<number>(0);
  const keystrokeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBarcodeCallbackRef = useRef<((barcode: string) => void) | null>(null);

  // Keep config in a ref so the keystroke listener is STABLE and never
  // recreates mid-scan (which would lose the buffer and break detection)
  const scannerConfigRef = useRef<ScannerConfig>(DEFAULT_SCANNER_CONFIG);
  useEffect(() => {
    scannerConfigRef.current = scannerConfig;
  }, [scannerConfig]);

  // Serial port ref for active scanner connection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serialPortRef = useRef<any>(null);
  const serialReaderRef = useRef<ReadableStreamDefaultReader<string> | null>(null);

  // USB printer device ref (for ESC/POS direct printing)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usbPrinterRef = useRef<any>(null);

  // ========================================================================
  // KEYBOARD-WEDGE SCANNER DETECTION
  // Most barcode scanners act as keyboard devices and type characters fast
  // ========================================================================

  const startKeystrokeListener = useCallback(() => {
    console.log("[HW-Scanner] 🎧 Keyboard-wedge listener STARTED (stable — reads config from ref)");

    const handleKeypress = (e: KeyboardEvent) => {
      // Read config from ref (NOT from closure) so listener is stable
      const config = scannerConfigRef.current;

      const target = e.target as HTMLElement;
      const isPosInput = target.closest("[data-pos-scanner]");
      const isHardwarePage = target.closest("[data-hardware-settings]");

      // Block typing in regular inputs/textareas (not POS or hardware page)
      if (target.tagName === "TEXTAREA") return;
      if (target.tagName === "INPUT" && !isPosInput && !isHardwarePage) return;

      const now = Date.now();
      const gap = now - lastKeystrokeTime.current;

      // If this looks like scanner-speed input on the hardware page,
      // prevent the characters from going into config input fields
      const isFastKeystroke = gap <= config.maxKeystrokeGap && gap > 0;
      if (isHardwarePage && target.tagName === "INPUT" && (isFastKeystroke || e.key === "Enter")) {
        e.preventDefault();
      }

      // If gap is too large, start a new sequence
      if (gap > config.maxKeystrokeGap) {
        if (keystrokeBuffer.current.length > 0) {
          console.log(
            "[HW-Scanner] ⏰ Buffer reset (gap too large:",
            gap + "ms, max=" + config.maxKeystrokeGap + "ms). Discarded:",
            JSON.stringify(keystrokeBuffer.current)
          );
        }
        keystrokeBuffer.current = "";
      }

      lastKeystrokeTime.current = now;

      // Enter key = end of barcode
      if (e.key === "Enter") {
        const bufferContent = keystrokeBuffer.current.trim();
        console.log(
          "[HW-Scanner] ⏎ Enter pressed. Buffer:",
          JSON.stringify(bufferContent),
          `(length=${bufferContent.length}, required=${config.minLength})`
        );

        if (bufferContent.length >= config.minLength) {
          console.log("[HW-Scanner] ✅ BARCODE DETECTED:", bufferContent);
          setLastScannedBarcode(bufferContent);
          setScanLog((prev) => [
            { barcode: bufferContent, timestamp: new Date(), source: "keyboard-wedge" },
            ...prev.slice(0, 49), // keep last 50
          ]);
          onBarcodeCallbackRef.current?.(bufferContent);

          // Prevent form submission when scanner sends Enter
          e.preventDefault();
          e.stopPropagation();
        } else if (bufferContent.length > 0) {
          console.log(
            "[HW-Scanner] ⚠️ Buffer too short, ignoring:",
            JSON.stringify(bufferContent)
          );
        }
        keystrokeBuffer.current = "";
        return;
      }

      // Only accept printable characters
      if (e.key.length === 1) {
        keystrokeBuffer.current += e.key;
        // Log buffer build-up (first char + every 5th to avoid spam)
        if (keystrokeBuffer.current.length === 1 || keystrokeBuffer.current.length % 5 === 0) {
          console.log(
            "[HW-Scanner] 📝 Buffer:",
            JSON.stringify(keystrokeBuffer.current),
            `(gap=${gap}ms)`
          );
        }
      }

      // Auto-clear buffer after timeout
      if (keystrokeTimer.current) clearTimeout(keystrokeTimer.current);
      keystrokeTimer.current = setTimeout(() => {
        if (keystrokeBuffer.current.length > 0) {
          console.log(
            "[HW-Scanner] ⏰ Buffer auto-cleared:",
            JSON.stringify(keystrokeBuffer.current)
          );
        }
        keystrokeBuffer.current = "";
      }, config.maxKeystrokeGap * 3);
    };

    document.addEventListener("keydown", handleKeypress, true);
    return () => {
      console.log("[HW-Scanner] 🔇 Keyboard-wedge listener STOPPED");
      document.removeEventListener("keydown", handleKeypress, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // No deps! Listener is stable — reads config from scannerConfigRef

  // ========================================================================
  // WEB SERIAL API — For USB barcode scanners
  // ========================================================================

  const connectSerialScanner = useCallback(async (): Promise<HardwareDevice | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (!nav.serial) {
      console.warn("[HW-Scanner] ❌ Web Serial API not supported in this browser");
      return null;
    }
    console.log("[HW-Scanner] 🔌 Requesting serial port...");

    try {
      const port = await nav.serial.requestPort();
      await port.open({ baudRate: 9600 });

      const portInfo = port.getInfo?.() ?? {};
      console.log("[HW-Scanner] ✅ Serial port opened. Port info:", portInfo);

      const device: HardwareDevice = {
        id: `serial-${Date.now()}`,
        name: portInfo.usbVendorId ? `USB Scanner (VID:${portInfo.usbVendorId})` : "USB Barcode Scanner",
        type: "scanner",
        status: "connected",
        vendorId: portInfo.usbVendorId ? `0x${portInfo.usbVendorId.toString(16)}` : undefined,
        productId: portInfo.usbProductId ? `0x${portInfo.usbProductId.toString(16)}` : undefined,
        lastSeen: new Date(),
        port,
      };

      serialPortRef.current = port;

      // Start reading from serial port
      const textDecoder = new TextDecoderStream();
      port.readable?.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      serialReaderRef.current = reader;

      // Read loop
      const readLoop = async () => {
        let buffer = "";
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              buffer += value;
              // Check for line ending (scanner sends \r\n or \n)
              const lines = buffer.split(/[\r\n]+/);
              if (lines.length > 1) {
                for (let i = 0; i < lines.length - 1; i++) {
                  const barcode = lines[i].trim();
                  if (barcode.length >= scannerConfig.minLength) {
                    console.log("[HW-Scanner] ✅ SERIAL BARCODE:", barcode);
                    setLastScannedBarcode(barcode);
                    setScanLog((prev) => [
                      { barcode, timestamp: new Date(), source: "serial" },
                      ...prev.slice(0, 49),
                    ]);
                    onBarcodeCallbackRef.current?.(barcode);
                  }
                }
                buffer = lines[lines.length - 1];
              }
            }
          }
        } catch (err) {
          console.error("Serial read error:", err);
        }
      };

      readLoop();

      setScanners((prev) => [...prev.filter((s) => s.id !== device.id), device]);
      return device;
    } catch (err) {
      console.error("[HW-Scanner] ❌ Failed to connect serial scanner:", err);
      return null;
    }
  }, [scannerConfig.minLength]);

  const disconnectSerialScanner = useCallback(async () => {
    try {
      serialReaderRef.current?.cancel();
      serialReaderRef.current = null;
      if (serialPortRef.current) {
        await serialPortRef.current.close();
        serialPortRef.current = null;
      }
      setScanners([]);
    } catch (err) {
      console.error("Failed to disconnect serial scanner:", err);
    }
  }, []);

  // ========================================================================
  // PRINTER — Print Bridge / Web USB / window.print
  // ========================================================================

  /**
   * Check Print Bridge status and populate bridgePrinters.
   * Called from detectPrinters/detectAllDevices.
   *
   * Now includes automatic retry (via getPrintBridgeHealth) and surfaces
   * the specific error reason so the UI can show targeted troubleshooting.
   */
  const checkBridgeStatus = useCallback(async () => {
    console.log("[HW-Bridge] 🔍 Checking Print Bridge at localhost:3001...");
    const health = await getPrintBridgeHealth();
    setBridgeHealth(health);

    if (!health) {
      setBridgeStatus("offline");
      setBridgePrinters([]);

      // Capture and surface the error reason for the UI
      const reason = getLastBridgeErrorReason();
      setBridgeErrorReason(reason);
      console.log("[HW-Bridge] ⚠️ Print Bridge not reachable —", getBridgeErrorMessage(reason));
      return false;
    }

    // Success — clear any previous error
    setBridgeErrorReason("none");

    if (health.printer?.connected) {
      setBridgeStatus("connected");
      console.log("[HW-Bridge] ✅ Print Bridge connected, printer ready");
    } else {
      setBridgeStatus("running");
      console.log("[HW-Bridge] ⚠️ Print Bridge running but printer not connected");
    }

    // Fetch available printers from bridge
    try {
      const printerList = await listBridgePrinters();
      setBridgePrinters(printerList.printers);
      console.log("[HW-Bridge] 📋 Bridge printers:", printerList.printers.map((p) => p.name));
    } catch {
      setBridgePrinters([]);
    }

    return health.printer?.connected ?? false;
  }, []);

  /**
   * Run a deep diagnostic on bridge connectivity — tests all candidate
   * URLs and returns per-URL results. Used from the "Diagnose" button on
   * the hardware settings page.
   */
  const runBridgeDiagnostic = useCallback(async () => {
    console.log("[HW-Bridge] 🩺 Running bridge diagnostic...");
    const result = await diagnosePrintBridge();
    setBridgeDiagnostic(result);
    console.log("[HW-Bridge] 🩺 Diagnostic result:", result);
    return result;
  }, []);

  const detectPrinters = useCallback(async (): Promise<HardwareDevice[]> => {
    console.log("[HW-Printer] 🔍 Detecting printers...");
    const detected: HardwareDevice[] = [];

    // 1. Check Print Bridge (localhost:3001) — highest priority
    const bridgeConnected = await checkBridgeStatus();
    if (bridgeConnected) {
      detected.push({
        id: "print-bridge",
        name: "Print Bridge (Thermal Printer)",
        type: "printer",
        status: "connected",
        manufacturer: "POS Print Bridge",
        lastSeen: new Date(),
      });
    } else {
      const running = await isPrintBridgeRunning();
      if (running) {
        detected.push({
          id: "print-bridge",
          name: "Print Bridge (Printer Offline)",
          type: "printer",
          status: "error",
          manufacturer: "POS Print Bridge",
          lastSeen: new Date(),
        });
      }
    }

    // 2. Check Web USB for thermal printers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (nav.usb) {
      try {
        const usbDevices = await nav.usb.getDevices();
        for (const usbDevice of usbDevices) {
          // Common thermal printer vendor IDs
          const thermalVendors = [0x0416, 0x0483, 0x04b8, 0x0519, 0x0dd4, 0x0fe6, 0x1504, 0x1fc9, 0x20d1, 0x0525];
          if (thermalVendors.includes(usbDevice.vendorId) || usbDevice.deviceClass === 7) {
            detected.push({
              id: `usb-${usbDevice.vendorId}-${usbDevice.productId}`,
              name: usbDevice.productName || "USB Thermal Printer",
              type: "printer",
              status: "connected",
              manufacturer: usbDevice.manufacturerName || undefined,
              vendorId: `0x${usbDevice.vendorId.toString(16)}`,
              productId: `0x${usbDevice.productId.toString(16)}`,
              lastSeen: new Date(),
            });
          }
        }
      } catch {
        // USB access denied or not available
      }
    }

    // 3. Always add browser print as fallback
    detected.push({
      id: "browser-print",
      name: "System Printer (Browser)",
      type: "printer",
      status: "connected",
      manufacturer: "System",
      lastSeen: new Date(),
    });

    console.log("[HW-Printer] 📋 Detected printers:", detected.map((d) => d.name));
    setPrinters(detected);
    return detected;
  }, [checkBridgeStatus]);

  const connectUsbPrinter = useCallback(async (): Promise<HardwareDevice | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (!nav.usb) {
      console.warn("Web USB API not supported");
      return null;
    }

    try {
      const device = await nav.usb.requestDevice({
        filters: [{ classCode: 7 }], // Printer class
      });

      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);

      const hw: HardwareDevice = {
        id: `usb-${device.vendorId}-${device.productId}`,
        name: device.productName || "USB Thermal Printer",
        type: "printer",
        status: "connected",
        manufacturer: device.manufacturerName || undefined,
        vendorId: `0x${device.vendorId.toString(16)}`,
        productId: `0x${device.productId.toString(16)}`,
        lastSeen: new Date(),
      };

      usbPrinterRef.current = device;
      setPrinters((prev) => [...prev.filter((p) => p.id !== hw.id), hw]);
      return hw;
    } catch (err) {
      console.error("Failed to connect USB printer:", err);
      return null;
    }
  }, []);

  // ========================================================================
  // TEST FUNCTIONS
  // ========================================================================

  const testScanner = useCallback(async (): Promise<boolean> => {
    console.log("[HW-Scanner] 🧪 Scanner test started — scan any barcode within 10s...");
    setScanners((prev) =>
      prev.map((s) => ({ ...s, status: "testing" as ConnectionStatus }))
    );

    return new Promise((resolve) => {
      // Wait for a scan within 10 seconds
      const timeout = setTimeout(() => {
        setScanners((prev) =>
          prev.map((s) => ({
            ...s,
            status: s.status === "testing" ? "connected" : s.status,
          }))
        );
        resolve(false);
      }, 10000);

      const originalCallback = onBarcodeCallbackRef.current;
      onBarcodeCallbackRef.current = (barcode) => {
        clearTimeout(timeout);
        console.log("[HW-Scanner] 🧪✅ Test PASSED — received barcode:", barcode);
        setScanners((prev) =>
          prev.map((s) => ({ ...s, status: "connected" as ConnectionStatus, lastSeen: new Date() }))
        );
        onBarcodeCallbackRef.current = originalCallback;
        originalCallback?.(barcode);
        resolve(true);
      };
    });
  }, []);

  // Compute USB printer availability (used by testPrinter & printReceipt)
  const hasUsbPrinter = printers.some((p) => p.id.startsWith("usb-") && p.status === "connected");
  const hasBridgePrinter = bridgeStatus === "connected";

  const testPrinter = useCallback(async (): Promise<boolean> => {
    console.log("[HW-Printer] 🧪 Printer test started...");
    setPrinters((prev) =>
      prev.map((p) => ({ ...p, status: "testing" as ConnectionStatus }))
    );

    try {
      const testData = buildTestReceiptData();

      // 1. Try Print Bridge first (localhost:3001)
      //    Also try when detection hasn't completed yet (unknown/running)
      if (hasBridgePrinter || bridgeStatus === "unknown" || bridgeStatus === "running") {
        try {
          console.log("[HW-Printer] 🧪 Testing via Print Bridge...");
          console.log("[HW-Printer] 📋 Test receipt data:", JSON.stringify(testData, null, 2));
          console.log("[HW-Printer] ⚙️ Receipt layout config:", JSON.stringify(receiptLayoutConfig, null, 2));
          await printViaBridge(testData, receiptLayoutConfig);
          console.log("[HW-Printer] 🧪✅ Bridge test receipt printed.");
          if (bridgeStatus !== "connected") setBridgeStatus("connected");
          setPrinters((prev) =>
            prev.map((p) => ({ ...p, status: "connected" as ConnectionStatus, lastSeen: new Date() }))
          );
          return true;
        } catch (err) {
          console.warn("[HW-Printer] ⚠️ Bridge test failed:", err);
          // If bridge was confirmed connected, don't fall to browser
          if (hasBridgePrinter && !hasUsbPrinter) {
            throw new Error("Print Bridge test failed");
          }
        }
      }

      // 2. Try ESC/POS direct printing if USB printer is connected
      if (usbPrinterRef.current && hasUsbPrinter) {
        try {
          console.log("[HW-Printer] 🧪 Testing via ESC/POS (USB)...");
          const escposData = encodeReceiptEscPos(testData, receiptLayoutConfig);
          await sendToUsbPrinter(usbPrinterRef.current, escposData);
          console.log("[HW-Printer] 🧪✅ ESC/POS test page sent.");
          setPrinters((prev) =>
            prev.map((p) => ({ ...p, status: "connected" as ConnectionStatus, lastSeen: new Date() }))
          );
          return true;
        } catch (err) {
          console.warn("[HW-Printer] ⚠️ ESC/POS test failed:", err);
          throw new Error("USB ESC/POS test failed");
        }
      }

      // 3. Browser HTML popup — ONLY when no native printer exists at all
      if (hasBridgePrinter) {
        throw new Error("Native printer configured but unreachable");
      }

      const success = printReceiptHtml(testData, receiptLayoutConfig);

      if (!success) {
        throw new Error("Popup blocked");
      }

      console.log("[HW-Printer] 🧪✅ Test page sent to printer.");
      setPrinters((prev) =>
        prev.map((p) => ({ ...p, status: "connected" as ConnectionStatus, lastSeen: new Date() }))
      );
      return true;
    } catch (err) {
      console.error("[HW-Printer] 🧪❌ Printer test failed:", err);
      setPrinters((prev) =>
        prev.map((p) => ({ ...p, status: "error" as ConnectionStatus }))
      );
      return false;
    }
  }, [receiptLayoutConfig, hasUsbPrinter, hasBridgePrinter, bridgeStatus]);

  // ========================================================================
  // AUTO-DETECT ON MOUNT
  // ========================================================================

  const detectAllDevices = useCallback(async () => {
    console.log("[HW] 🔍 Detecting all devices...");
    setIsDetecting(true);

    // Detect keyboard-wedge scanner (always available)
    // Most USB barcode scanners work as HID keyboard devices
    const keyboardScanner: HardwareDevice = {
      id: "keyboard-wedge",
      name: "USB Scanner (Keyboard Wedge / HID)",
      type: "scanner",
      status: "connected",
      manufacturer: "Auto-detected (HID)",
      lastSeen: new Date(),
    };

    setScanners((prev) => {
      const hasSerial = prev.some((s) => s.id.startsWith("serial-"));
      const result = hasSerial ? prev : [keyboardScanner];
      console.log("[HW-Scanner] 📋 Scanners:", result.map((s) => `${s.name} [${s.status}]`));
      return result;
    });

    // Detect printers
    await detectPrinters();

    setIsDetecting(false);
    console.log("[HW] ✅ Device detection complete.");
  }, [detectPrinters]);

  // Set up keyboard-wedge listener on mount
  useEffect(() => {
    const cleanup = startKeystrokeListener();
    return cleanup;
  }, [startKeystrokeListener]);

  // Auto-detect Print Bridge on mount — ensures hasBridgePrinter is
  // accurate for every consumer of useHardware() without needing to
  // call detectAllDevices() explicitly.
  useEffect(() => {
    checkBridgeStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  const isScannerConnected = scanners.some((s) => s.status === "connected");
  const isPrinterConnected = printers.some((p) => p.status === "connected");

  const setOnBarcodeScanned = useCallback((callback: (barcode: string) => void) => {
    onBarcodeCallbackRef.current = callback;
  }, []);

  // ========================================================================
  // PRINT RECEIPT — Bridge → ESC/POS (USB) → HTML popup (last resort)
  //
  // When a native printer (Bridge or USB) is available, we NEVER fall back
  // to the browser HTML popup. The popup opens an extra Chrome window and
  // breaks the POS flow. Browser print is only used when NO native printer
  // is configured at all (pure browser-only setup).
  //
  // If bridge detection hasn't run yet (status=unknown), we try the bridge
  // inline so printing works even if the mount-detection is still pending.
  // ========================================================================

  const printReceipt = useCallback(async (
    data: PrintReceiptData,
    config?: ReceiptLayoutConfig,
  ): Promise<boolean> => {
    const cfg = config ?? receiptLayoutConfig;

    // 1. Try Print Bridge first (localhost:3001 — USB/TCP thermal printer)
    //    Also try when bridgeStatus is "unknown" (detection may not have
    //    completed yet) — this is a lazy/inline check.
    if (hasBridgePrinter || bridgeStatus === "unknown" || bridgeStatus === "running") {
      try {
        console.log("[HW-Printer] 📤 Printing via Print Bridge...");
        await printViaBridge(data, cfg);
        console.log("[HW-Printer] ✅ Print Bridge print complete.");
        // Update bridge status on success if it was unknown
        if (bridgeStatus === "unknown" || bridgeStatus === "running") {
          setBridgeStatus("connected");
        }
        return true;
      } catch (err) {
        console.warn("[HW-Printer] ⚠️ Print Bridge failed:", err);
        // If bridge was supposed to handle it, don't fall through to browser
        if (hasBridgePrinter && !hasUsbPrinter) {
          console.error("[HW-Printer] ❌ Bridge print failed and no USB fallback available.");
          return false;
        }
        // If status was unknown and bridge failed, that's fine — try next method
      }
    }

    // 2. Try ESC/POS direct printing if USB printer is connected (Web USB)
    if (usbPrinterRef.current && hasUsbPrinter) {
      try {
        console.log("[HW-Printer] 📤 Printing via ESC/POS (USB)...");
        const escposData = encodeReceiptEscPos(data, cfg);
        await sendToUsbPrinter(usbPrinterRef.current, escposData);
        console.log("[HW-Printer] ✅ ESC/POS print complete.");
        return true;
      } catch (err) {
        console.warn("[HW-Printer] ⚠️ ESC/POS failed:", err);
        // Native printer present — don't fall through to browser popup
        console.error("[HW-Printer] ❌ USB ESC/POS print failed.");
        return false;
      }
    }

    // 3. Browser HTML popup — ONLY when no native printer exists at all
    if (hasBridgePrinter) {
      // Bridge was detected but we already failed above
      console.error("[HW-Printer] ❌ Native printer configured but unreachable.");
      return false;
    }

    console.log("[HW-Printer] 📄 No native printer — using HTML popup (system printer)...");
    return printReceiptHtml(data, cfg);
  }, [receiptLayoutConfig, hasUsbPrinter, hasBridgePrinter, bridgeStatus]);

  return {
    // State
    scanners,
    printers,
    isScannerConnected,
    isPrinterConnected,
    lastScannedBarcode,
    scanLog,
    scannerConfig,
    printerConfig,
    receiptLayoutConfig,
    isDetecting,

    // Print Bridge state
    bridgeStatus,
    bridgeHealth,
    bridgePrinters,
    hasBridgePrinter,
    bridgeErrorReason,
    bridgeDiagnostic,

    // Scanner actions
    connectSerialScanner,
    disconnectSerialScanner,
    setOnBarcodeScanned,

    // Printer actions
    connectUsbPrinter,
    detectPrinters,
    printReceipt,
    hasUsbPrinter,
    checkBridgeStatus,
    runBridgeDiagnostic,

    // Detection
    detectAllDevices,

    // Test
    testScanner,
    testPrinter,

    // Config
    setScannerConfig,
    setPrinterConfig,
    setReceiptLayoutConfig,
  };
}
