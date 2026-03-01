"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Wifi,
  WifiOff,
  ScanBarcode,
  Printer,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Monitor,
  Usb,
  Settings2,
  TestTube,
  Loader2,
  Keyboard,
  Cable,
  Globe,
  Download,
  FileJson,
  AppWindow,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import toast from "react-hot-toast";
import { useHardware, type ConnectionStatus, type HardwareDevice } from "@/hooks/use-hardware";
import { cn } from "@/lib/utils";
import { ReceiptLayoutEditor } from "@/components/shared/receipt-layout-editor";
import { useStoreStore } from "@/stores/store.store";
import { useStoreAdmin } from "../../../_context/store-admin-context";

// ============================================================================
// HARDWARE SETTINGS PAGE
// ============================================================================

export default function HardwareSettingsPage() {
  const { storeId, store } = useStoreAdmin();
  const {
    scanners,
    printers,
    isScannerConnected,
    isPrinterConnected,
    lastScannedBarcode,
    scanLog,
    scannerConfig,
    isDetecting,
    connectSerialScanner,
    connectUsbPrinter,
    detectAllDevices,
    testScanner,
    testPrinter,
    setScannerConfig,
    bridgeStatus,
    bridgeHealth,
    bridgePrinters,
    hasBridgePrinter,
    checkBridgeStatus,
  } = useHardware();

  const [isScannerTesting, setIsScannerTesting] = useState(false);
  const [isPrinterTesting, setIsPrinterTesting] = useState(false);
  const [scannerTestResult, setScannerTestResult] = useState<boolean | null>(null);
  const [printerTestResult, setPrinterTestResult] = useState<boolean | null>(null);

  // Receipt layout config — persisted in store_settings (DB-backed)
  const {
    receiptConfig,
    updateReceiptConfig,
    saveReceiptConfig,
    isSavingReceiptConfig,
    fetchSettings,
    storeSettings,
  } = useStoreStore();

  // Ensure settings are loaded (needed for the save action)
  useEffect(() => {
    if (storeId && !storeSettings) {
      fetchSettings(storeId);
    }
  }, [storeId, storeSettings, fetchSettings]);

  // Auto-detect on mount
  useEffect(() => {
    detectAllDevices();
  }, [detectAllDevices]);

  // ========================================================================
  // TEST HANDLERS
  // ========================================================================

  const handleTestScanner = useCallback(async () => {
    setIsScannerTesting(true);
    setScannerTestResult(null);
    toast("Scan any barcode within 10 seconds...", { icon: "📡" });
    const result = await testScanner();
    setIsScannerTesting(false);
    setScannerTestResult(result);
    if (result) {
      toast.success("Scanner test passed! Barcode received.");
    } else {
      toast.error("Scanner test failed. No barcode received within 10 seconds.");
    }
  }, [testScanner]);

  const handleTestPrinter = useCallback(async () => {
    setIsPrinterTesting(true);
    setPrinterTestResult(null);
    const result = await testPrinter();
    setIsPrinterTesting(false);
    setPrinterTestResult(result);
    if (result) {
      toast.success("Test page sent to printer!");
    } else {
      toast.error("Printer test failed. Check connection.");
    }
  }, [testPrinter]);

  const handleConnectSerialScanner = useCallback(async () => {
    const device = await connectSerialScanner();
    if (device) {
      toast.success(`Connected to ${device.name}`);
    } else {
      toast.error("Failed to connect. Ensure browser supports Web Serial API.");
    }
  }, [connectSerialScanner]);

  const handleConnectUsbPrinter = useCallback(async () => {
    const device = await connectUsbPrinter();
    if (device) {
      toast.success(`Connected to ${device.name}`);
    } else {
      toast.error("Failed to connect. Ensure browser supports Web USB API.");
    }
  }, [connectUsbPrinter]);

  const handleSaveReceiptConfig = useCallback(async () => {
    if (!storeId) {
      toast.error("No store loaded — cannot save settings.");
      return;
    }
    const result = await saveReceiptConfig(storeId);
    if (result.success) {
      toast.success("Receipt layout saved!");
    } else {
      toast.error(result.error ?? "Failed to save receipt layout.");
    }
  }, [storeId, saveReceiptConfig]);

  // ========================================================================
  // STATUS HELPERS
  // ========================================================================

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case "connected":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "disconnected":
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      case "testing":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: ConnectionStatus) => {
    const variants: Record<ConnectionStatus, string> = {
      connected: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      disconnected: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
      testing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", variants[status])}>
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="container max-w-5xl mx-auto py-6 px-4 space-y-6" data-hardware-settings>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Monitor className="h-6 w-6" />
            Hardware Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage barcode scanners, receipt printers, and other POS hardware devices.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            detectAllDevices();
            toast.success("Scanning for devices...");
          }}
          disabled={isDetecting}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isDetecting && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Hardware Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Scanner Status Card */}
        <Card className={cn(
          "transition-colors",
          isScannerConnected ? "border-green-200 dark:border-green-800" : "border-orange-200 dark:border-orange-800"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                isScannerConnected
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-orange-100 dark:bg-orange-900/30"
              )}>
                <ScanBarcode className={cn(
                  "h-5 w-5",
                  isScannerConnected ? "text-green-600" : "text-orange-600"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Barcode Scanner</p>
                <p className="text-xs text-muted-foreground">
                  {scanners.length} device(s) detected
                </p>
              </div>
              {isScannerConnected ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400">
                  <Wifi className="h-3 w-3 mr-1" />
                  Ready
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400">
                  <WifiOff className="h-3 w-3 mr-1" />
                  No Device
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Printer Status Card */}
        <Card className={cn(
          "transition-colors",
          isPrinterConnected ? "border-green-200 dark:border-green-800" : "border-orange-200 dark:border-orange-800"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                isPrinterConnected
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-orange-100 dark:bg-orange-900/30"
              )}>
                <Printer className={cn(
                  "h-5 w-5",
                  isPrinterConnected ? "text-green-600" : "text-orange-600"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Receipt Printer</p>
                <p className="text-xs text-muted-foreground">
                  {printers.length} device(s) detected
                </p>
              </div>
              {isPrinterConnected ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400">
                  <Wifi className="h-3 w-3 mr-1" />
                  Ready
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400">
                  <WifiOff className="h-3 w-3 mr-1" />
                  No Device
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Print Bridge Status Card */}
        <Card className={cn(
          "transition-colors",
          hasBridgePrinter
            ? "border-green-200 dark:border-green-800"
            : bridgeStatus === "running"
              ? "border-yellow-200 dark:border-yellow-800"
              : "border-gray-200 dark:border-gray-800"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                hasBridgePrinter
                  ? "bg-green-100 dark:bg-green-900/30"
                  : bridgeStatus === "running"
                    ? "bg-yellow-100 dark:bg-yellow-900/30"
                    : "bg-gray-100 dark:bg-gray-900/30"
              )}>
                <Globe className={cn(
                  "h-5 w-5",
                  hasBridgePrinter
                    ? "text-green-600"
                    : bridgeStatus === "running"
                      ? "text-yellow-600"
                      : "text-gray-400"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Print Bridge</p>
                <p className="text-xs text-muted-foreground">
                  {hasBridgePrinter
                    ? "Connected — prints via bridge"
                    : bridgeStatus === "running"
                      ? "Running — printer offline"
                      : "Not detected (localhost:3001)"}
                </p>
              </div>
              {hasBridgePrinter ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              ) : bridgeStatus === "running" ? (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  No Printer
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================ */}
      {/* LIVE SCAN LOG — Debug Panel */}
      {/* ================================================================ */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ScanBarcode className="h-5 w-5 text-blue-500" />
            Live Scan Log
            {scanLog.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {scanLog.length} scan(s)
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Real-time log of all barcode scans. Open browser DevTools (F12 → Console) for detailed debug output.
            Scan any barcode to see it appear here instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scanLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ScanBarcode className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No scans yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Point your barcode scanner at any barcode and scan it.
                The barcode number will appear here and in the browser console.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {scanLog.map((entry, idx) => (
                <div
                  key={`${entry.barcode}-${entry.timestamp.getTime()}`}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-md text-sm font-mono",
                    idx === 0
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      : "bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">#{scanLog.length - idx}</span>
                    <code className="font-bold text-sm">{entry.barcode}</code>
                    <Badge variant="outline" className="text-[10px]">
                      {entry.source}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* BARCODE SCANNER SECTION */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ScanBarcode className="h-5 w-5" />
            Barcode Scanner
          </CardTitle>
          <CardDescription>
            Configure and test your barcode scanner. Most USB scanners work as keyboard-wedge devices automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connected Scanners List */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Connected Devices</Label>
            {scanners.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 text-sm text-muted-foreground">
                <WifiOff className="h-4 w-4" />
                No scanners detected
              </div>
            ) : (
              <div className="space-y-2">
                {scanners.map((scanner) => (
                  <DeviceRow key={scanner.id} device={scanner} />
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Scanner Connection Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Connection Method</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="p-3 cursor-default">
                <div className="flex items-start gap-3">
                  <Keyboard className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Keyboard Wedge (Auto)</p>
                    <p className="text-xs text-muted-foreground">
                      Scanner types characters like a keyboard. Works automatically with most USB scanners.
                    </p>
                    <Badge variant="secondary" className="mt-1.5 text-[10px]">
                      Active by default
                    </Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-3 cursor-pointer hover:border-primary/50 transition-colors" onClick={handleConnectSerialScanner}>
                <div className="flex items-start gap-3">
                  <Cable className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">USB Serial (Advanced)</p>
                    <p className="text-xs text-muted-foreground">
                      Direct serial connection via Web Serial API. For scanners that don&apos;t support keyboard mode.
                    </p>
                    <Badge variant="outline" className="mt-1.5 text-[10px]">
                      Click to connect
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Scanner Config */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Settings2 className="h-4 w-4" />
              Scanner Configuration
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Min Barcode Length</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={scannerConfig.minLength}
                  onChange={(e) =>
                    setScannerConfig((prev) => ({
                      ...prev,
                      minLength: parseInt(e.target.value) || 3,
                    }))
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Max Keystroke Gap (ms)
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        type="number"
                        min={10}
                        max={200}
                        value={scannerConfig.maxKeystrokeGap}
                        onChange={(e) =>
                          setScannerConfig((prev) => ({
                            ...prev,
                            maxKeystrokeGap: parseInt(e.target.value) || 50,
                          }))
                        }
                        className="h-9"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Time between keystrokes to identify scanner input vs manual typing.<br />Lower = more strict (30-50ms recommended)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          <Separator />

          {/* Scanner Test */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Test Scanner</p>
                <p className="text-xs text-muted-foreground">
                  Scan any barcode to verify the scanner is working correctly.
                </p>
                {lastScannedBarcode && (
                  <p className="text-xs mt-1">
                    Last scanned: <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{lastScannedBarcode}</code>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {scannerTestResult !== null && (
                  scannerTestResult ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestScanner}
                  disabled={isScannerTesting}
                  className="gap-2"
                >
                  {isScannerTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4" />
                  )}
                  {isScannerTesting ? "Waiting for scan..." : "Test Scanner"}
                </Button>
              </div>
            </div>

            {/* Focus warning during test */}
            {isScannerTesting && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm">
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-700 dark:text-blue-400">Click here first, then scan your barcode</p>
                  <p className="text-xs text-blue-600 dark:text-blue-500">This page must be focused (not DevTools console). Click anywhere on this page, then scan.</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* RECEIPT PRINTER SECTION */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Printer className="h-5 w-5" />
            Receipt Printer
          </CardTitle>
          <CardDescription>
            Configure and test your receipt/thermal printer for printing bills and invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connected Printers List */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Connected Devices</Label>
            {printers.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 text-sm text-muted-foreground">
                <WifiOff className="h-4 w-4" />
                No printers detected
              </div>
            ) : (
              <div className="space-y-2">
                {printers.map((printer) => (
                  <DeviceRow key={printer.id} device={printer} />
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Printer Connection Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Connect Printer</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="p-3 cursor-default">
                <div className="flex items-start gap-3">
                  <Monitor className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">System Printer</p>
                    <p className="text-xs text-muted-foreground">
                      Uses the browser&apos;s built-in print dialog. Works with any printer installed on your system.
                    </p>
                    <Badge variant="secondary" className="mt-1.5 text-[10px]">
                      Always available
                    </Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-3 cursor-pointer hover:border-primary/50 transition-colors" onClick={handleConnectUsbPrinter}>
                <div className="flex items-start gap-3">
                  <Usb className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">USB Thermal Printer</p>
                    <p className="text-xs text-muted-foreground">
                      Direct USB connection for thermal receipt printers (ESC/POS compatible).
                    </p>
                    <Badge variant="outline" className="mt-1.5 text-[10px]">
                      Click to connect
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Printer Config */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Settings2 className="h-4 w-4" />
              Printer Configuration
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Paper Width</Label>
                <Select
                  value={String(receiptConfig.paperSize)}
                  onValueChange={(val) =>
                    updateReceiptConfig({
                      paperSize: (isNaN(Number(val)) ? val : Number(val)) as typeof receiptConfig.paperSize,
                    })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58">58mm (2 inch)</SelectItem>
                    <SelectItem value="80">80mm (3 inch)</SelectItem>
                    <SelectItem value="A5">A5 (148×210mm)</SelectItem>
                    <SelectItem value="A4">A4 (210×297mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border">
                <Label className="text-xs text-muted-foreground">Auto-print on sale</Label>
                <Switch
                  checked={receiptConfig.autoPrint}
                  onCheckedChange={(v) => updateReceiptConfig({ autoPrint: v })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Printer Test */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Test Printer</p>
              <p className="text-xs text-muted-foreground">
                Print a test page to verify your printer is working correctly.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {printerTestResult !== null && (
                printerTestResult ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestPrinter}
                disabled={isPrinterTesting}
                className="gap-2"
              >
                {isPrinterTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                {isPrinterTesting ? "Printing..." : "Print Test Page"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* PRINT BRIDGE DOWNLOAD */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-blue-500" />
            Print Bridge — Setup & Download
          </CardTitle>
          <CardDescription>
            The Print Bridge is a small background app that runs on your POS computer and enables
            direct ESC/POS printing to USB thermal printers without browser restrictions.
            Download and run it once — it starts silently and listens on{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">localhost:3001</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* How it works */}
          <div className="rounded-lg bg-muted/50 border px-4 py-3 text-sm space-y-1">
            <p className="font-medium">How it works</p>
            <ol className="list-decimal pl-4 space-y-0.5 text-muted-foreground text-xs">
              <li>Download both files below into the same folder on your POS computer.</li>
              <li>Run <code className="bg-muted px-1 rounded">pos-print-bridge.exe</code> — Windows may show a SmartScreen warning; click <strong>More info → Run anyway</strong>.</li>
              <li>The bridge starts silently in the background and is ready instantly.</li>
              <li>Come back to this page and click <strong>Refresh</strong> — the Print Bridge card should turn green.</li>
            </ol>
          </div>

          {/* Download buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="https://jffaufecqeompougmqtx.supabase.co/storage/v1/object/public/pos-print-bridge/pos-print-bridge.exe"
              download="pos-print-bridge.exe"
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-accent hover:border-primary/50 transition-colors group"
            >
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <AppWindow className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">pos-print-bridge.exe</p>
                <p className="text-xs text-muted-foreground">Windows bridge application</p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </a>

            <a
              href="https://jffaufecqeompougmqtx.supabase.co/storage/v1/object/public/pos-print-bridge/config.json"
              download="config.json"
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-accent hover:border-primary/50 transition-colors group"
            >
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <FileJson className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">config.json</p>
                <p className="text-xs text-muted-foreground">Bridge configuration file</p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </a>
          </div>

          {/* Current bridge status inline */}
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3">
              <Globe className={cn(
                "h-5 w-5",
                hasBridgePrinter ? "text-green-500" : bridgeStatus === "running" ? "text-yellow-500" : "text-muted-foreground"
              )} />
              <div>
                <p className="text-sm font-medium">Bridge Status</p>
                <p className="text-xs text-muted-foreground">
                  {hasBridgePrinter
                    ? "Connected and printer ready"
                    : bridgeStatus === "running"
                      ? "Bridge running — no printer detected"
                      : "Not running on localhost:3001"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasBridgePrinter ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              ) : bridgeStatus === "running" ? (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  No Printer
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  checkBridgeStatus();
                }}
                className="gap-1.5 h-8"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Check
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* RECEIPT LAYOUT SETTINGS */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Printer className="h-5 w-5 text-primary" />
            Receipt Layout & Print Settings
          </CardTitle>
          <CardDescription>
            Choose a receipt template, paper size, and control exactly what appears on printed receipts.
            Changes are saved instantly and applied to all new receipts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReceiptLayoutEditor
            config={receiptConfig}
            onChange={updateReceiptConfig}
            onSave={handleSaveReceiptConfig}
            isSaving={isSavingReceiptConfig}
            storeName={store?.name}
            storeAddress={
              store
                ? [store.address_line1, store.city, store.state]
                    .filter(Boolean)
                    .join(", ")
                : undefined
            }
            storePhone={store?.phone ?? undefined}
            storeGstin={store?.gstin ?? undefined}
          />
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* TIPS & TROUBLESHOOTING */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Troubleshooting Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-1.5">
                <ScanBarcode className="h-4 w-4" />
                Barcode Scanner
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Ensure the scanner is set to <strong>keyboard wedge / HID mode</strong></li>
                <li>The scanner should send <strong>Enter (Return)</strong> after each scan</li>
                <li>USB scanners should be plug-and-play — no driver needed</li>
                <li>If scanner is not detected, try unplugging and reconnecting</li>
                <li>For Bluetooth scanners, pair via system settings first</li>
                <li>Keep the POS page focused when scanning</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-1.5">
                <Printer className="h-4 w-4" />
                Receipt Printer
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Install the printer driver from the manufacturer&apos;s website</li>
                <li>Set the thermal printer as the <strong>default system printer</strong></li>
                <li>For USB thermal printers, use 80mm paper width (most common)</li>
                <li>Ensure paper roll is loaded correctly with the print side facing up</li>
                <li>If print is faded, the paper may be inserted backwards</li>
                <li>For network printers, ensure same WiFi/LAN network</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// DEVICE ROW COMPONENT
// ============================================================================

function DeviceRow({ device }: { device: HardwareDevice }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-md border bg-card">
      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
        {device.type === "scanner" ? (
          <ScanBarcode className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Printer className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{device.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {device.manufacturer && <span>{device.manufacturer}</span>}
          {device.vendorId && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span>VID: {device.vendorId}</span>
            </>
          )}
          {device.productId && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span>PID: {device.productId}</span>
            </>
          )}
          {device.lastSeen && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span>Last seen: {device.lastSeen.toLocaleTimeString()}</span>
            </>
          )}
        </div>
      </div>
      {getStatusBadgeInline(device.status)}
    </div>
  );
}

function getStatusBadgeInline(status: ConnectionStatus) {
  const config: Record<ConnectionStatus, { className: string; label: string }> = {
    connected: {
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      label: "Connected",
    },
    disconnected: {
      className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
      label: "Disconnected",
    },
    testing: {
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      label: "Testing...",
    },
    error: {
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      label: "Error",
    },
  };
  const c = config[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", c.className)}>
      {status === "connected" && <CheckCircle2 className="h-3 w-3" />}
      {status === "disconnected" && <XCircle className="h-3 w-3" />}
      {status === "testing" && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === "error" && <AlertTriangle className="h-3 w-3" />}
      {c.label}
    </span>
  );
}
