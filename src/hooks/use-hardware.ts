"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {} from "@/types/web-hardware.d";

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

export interface HardwareState {
  scanners: HardwareDevice[];
  printers: HardwareDevice[];
  isScannerConnected: boolean;
  isPrinterConnected: boolean;
  lastScannedBarcode: string | null;
  scannerConfig: ScannerConfig;
  printerConfig: PrinterConfig;
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
  const [scannerConfig, setScannerConfig] = useState<ScannerConfig>(DEFAULT_SCANNER_CONFIG);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(DEFAULT_PRINTER_CONFIG);
  const [isDetecting, setIsDetecting] = useState(false);

  // For keyboard-wedge barcode scanner detection
  const keystrokeBuffer = useRef<string>("");
  const lastKeystrokeTime = useRef<number>(0);
  const keystrokeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBarcodeCallbackRef = useRef<((barcode: string) => void) | null>(null);

  // Serial port ref for active scanner connection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serialPortRef = useRef<any>(null);
  const serialReaderRef = useRef<ReadableStreamDefaultReader<string> | null>(null);

  // ========================================================================
  // KEYBOARD-WEDGE SCANNER DETECTION
  // Most barcode scanners act as keyboard devices and type characters fast
  // ========================================================================

  const startKeystrokeListener = useCallback(() => {
    const handleKeypress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input (except our POS search bar)
      const target = e.target as HTMLElement;
      const isPosInput = target.closest("[data-pos-scanner]");

      // For POS page, we allow scanner input even in the search field
      if (target.tagName === "INPUT" && !isPosInput) return;
      if (target.tagName === "TEXTAREA") return;

      const now = Date.now();
      const gap = now - lastKeystrokeTime.current;

      // If gap is too large, start a new sequence
      if (gap > scannerConfig.maxKeystrokeGap) {
        keystrokeBuffer.current = "";
      }

      lastKeystrokeTime.current = now;

      // Enter key = end of barcode
      if (e.key === "Enter") {
        if (keystrokeBuffer.current.length >= scannerConfig.minLength) {
          const barcode = keystrokeBuffer.current.trim();
          setLastScannedBarcode(barcode);
          onBarcodeCallbackRef.current?.(barcode);

          // Prevent form submission when scanner sends Enter
          e.preventDefault();
          e.stopPropagation();
        }
        keystrokeBuffer.current = "";
        return;
      }

      // Only accept printable characters
      if (e.key.length === 1) {
        keystrokeBuffer.current += e.key;
      }

      // Auto-clear buffer after timeout
      if (keystrokeTimer.current) clearTimeout(keystrokeTimer.current);
      keystrokeTimer.current = setTimeout(() => {
        keystrokeBuffer.current = "";
      }, scannerConfig.maxKeystrokeGap * 3);
    };

    document.addEventListener("keydown", handleKeypress, true);
    return () => document.removeEventListener("keydown", handleKeypress, true);
  }, [scannerConfig.maxKeystrokeGap, scannerConfig.minLength]);

  // ========================================================================
  // WEB SERIAL API — For USB barcode scanners
  // ========================================================================

  const connectSerialScanner = useCallback(async (): Promise<HardwareDevice | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (!nav.serial) {
      console.warn("Web Serial API not supported");
      return null;
    }

    try {
      const port = await nav.serial.requestPort();
      await port.open({ baudRate: 9600 });

      const device: HardwareDevice = {
        id: `serial-${Date.now()}`,
        name: "USB Barcode Scanner",
        type: "scanner",
        status: "connected",
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
                    setLastScannedBarcode(barcode);
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
      console.error("Failed to connect serial scanner:", err);
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
  // PRINTER — Web USB / window.print
  // ========================================================================

  const detectPrinters = useCallback(async (): Promise<HardwareDevice[]> => {
    const detected: HardwareDevice[] = [];

    // Check Web USB for thermal printers
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

    // Always add browser print as fallback
    detected.push({
      id: "browser-print",
      name: "System Printer (Browser)",
      type: "printer",
      status: "connected",
      manufacturer: "System",
      lastSeen: new Date(),
    });

    setPrinters(detected);
    return detected;
  }, []);

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
        setScanners((prev) =>
          prev.map((s) => ({ ...s, status: "connected" as ConnectionStatus, lastSeen: new Date() }))
        );
        onBarcodeCallbackRef.current = originalCallback;
        originalCallback?.(barcode);
        resolve(true);
      };
    });
  }, []);

  const testPrinter = useCallback(async (): Promise<boolean> => {
    setPrinters((prev) =>
      prev.map((p) => ({ ...p, status: "testing" as ConnectionStatus }))
    );

    try {
      // Create a test receipt
      const testWindow = window.open("", "_blank", "width=300,height=400");
      if (!testWindow) {
        throw new Error("Popup blocked");
      }

      testWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Printer Test</title>
          <style>
            body { font-family: monospace; font-size: 12px; padding: 10px; width: 260px; margin: 0 auto; }
            .center { text-align: center; }
            .line { border-top: 1px dashed #000; margin: 8px 0; }
            h2 { margin: 0; font-size: 16px; }
            .barcode { font-family: 'Libre Barcode 39', monospace; font-size: 40px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2>🖨️ PRINTER TEST</h2>
            <p>Hardware Settings Test Page</p>
          </div>
          <div class="line"></div>
          <p><strong>Status:</strong> Connected ✅</p>
          <p><strong>Paper Width:</strong> 80mm</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <div class="line"></div>
          <table style="width:100%">
            <tr><td>Test Item 1</td><td style="text-align:right">₹100.00</td></tr>
            <tr><td>Test Item 2</td><td style="text-align:right">₹250.50</td></tr>
            <tr><td>Test Item 3</td><td style="text-align:right">₹75.00</td></tr>
          </table>
          <div class="line"></div>
          <p style="text-align:right"><strong>Total: ₹425.50</strong></p>
          <div class="line"></div>
          <div class="center">
            <p>✅ If you can read this, your printer is working correctly!</p>
            <p style="font-size:10px; color: #666;">This is a test page from Store Hardware Settings</p>
          </div>
        </body>
        </html>
      `);

      testWindow.document.close();

      // Trigger print
      setTimeout(() => {
        testWindow.print();
        testWindow.close();
      }, 500);

      setPrinters((prev) =>
        prev.map((p) => ({ ...p, status: "connected" as ConnectionStatus, lastSeen: new Date() }))
      );
      return true;
    } catch (err) {
      console.error("Printer test failed:", err);
      setPrinters((prev) =>
        prev.map((p) => ({ ...p, status: "error" as ConnectionStatus }))
      );
      return false;
    }
  }, []);

  // ========================================================================
  // AUTO-DETECT ON MOUNT
  // ========================================================================

  const detectAllDevices = useCallback(async () => {
    setIsDetecting(true);

    // Detect keyboard-wedge scanner (always available)
    const keyboardScanner: HardwareDevice = {
      id: "keyboard-wedge",
      name: "Keyboard Wedge Scanner",
      type: "scanner",
      status: "connected",
      manufacturer: "Generic",
      lastSeen: new Date(),
    };

    setScanners((prev) => {
      const hasSerial = prev.some((s) => s.id.startsWith("serial-"));
      return hasSerial ? prev : [keyboardScanner];
    });

    // Detect printers
    await detectPrinters();

    setIsDetecting(false);
  }, [detectPrinters]);

  // Set up keyboard-wedge listener on mount
  useEffect(() => {
    const cleanup = startKeystrokeListener();
    return cleanup;
  }, [startKeystrokeListener]);

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  const isScannerConnected = scanners.some((s) => s.status === "connected");
  const isPrinterConnected = printers.some((p) => p.status === "connected");

  const setOnBarcodeScanned = useCallback((callback: (barcode: string) => void) => {
    onBarcodeCallbackRef.current = callback;
  }, []);

  return {
    // State
    scanners,
    printers,
    isScannerConnected,
    isPrinterConnected,
    lastScannedBarcode,
    scannerConfig,
    printerConfig,
    isDetecting,

    // Scanner actions
    connectSerialScanner,
    disconnectSerialScanner,
    setOnBarcodeScanned,

    // Printer actions
    connectUsbPrinter,
    detectPrinters,

    // Detection
    detectAllDevices,

    // Test
    testScanner,
    testPrinter,

    // Config
    setScannerConfig,
    setPrinterConfig,
  };
}
