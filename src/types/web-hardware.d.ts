// ============================================================================
// Web Serial API & Web USB API Type Declarations
// These are experimental browser APIs not yet in standard TypeScript lib
// ============================================================================

interface SerialPort {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
}

interface SerialPortRequestOptions {
  filters?: Array<{ usbVendorId?: number; usbProductId?: number }>;
}

interface Serial {
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
}

interface USBDevice {
  vendorId: number;
  productId: number;
  deviceClass: number;
  productName?: string;
  manufacturerName?: string;
  configuration: USBConfiguration | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
}

interface USBConfiguration {
  configurationValue: number;
}

interface USBOutTransferResult {
  bytesWritten: number;
  status: "ok" | "stall" | "babble";
}

interface USBDeviceRequestOptions {
  filters: Array<{
    vendorId?: number;
    productId?: number;
    classCode?: number;
  }>;
}

interface USB {
  getDevices(): Promise<USBDevice[]>;
  requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
}

declare global {
  interface Navigator {
    serial?: Serial;
    usb?: USB;
  }
}

export {};
