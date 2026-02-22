# Hardware Integration — Barcode Scanner & Receipt Printer

## Overview

This project supports **USB barcode scanners** (like DCode DC7121) and **receipt/thermal printers** via browser APIs. The hardware settings pages are at:

- **POS**: `/pos/settings/hardware`
- **Store Admin**: `/store-admin/settings/hardware`

---

## Architecture

```
src/hooks/use-hardware.ts          ← Core hardware hook (scanner + printer logic)
src/types/web-hardware.d.ts        ← TypeScript declarations for Web Serial / Web USB APIs
src/app/pos/settings/hardware/     ← POS hardware settings page
src/app/store-admin/.../hardware/  ← Store admin hardware settings page
src/components/shared/hardware-status-indicator.tsx ← Compact status badge
```

---

## How the Barcode Scanner Works

### Keyboard-Wedge Mode (Default — Your DCode DC7121)

Most USB barcode scanners (including the **DCode DC7121**) act as **HID keyboard devices**. When you scan a barcode, the scanner "types" the barcode characters very fast and then sends an **Enter** key.

**Detection logic** (in `use-hardware.ts` → `startKeystrokeListener`):

1. Listens to `keydown` events on the document (capture phase)
2. Builds a buffer of characters as keys arrive
3. If the gap between keystrokes is **> 50ms** (configurable), the buffer resets (human typing is slower)
4. When **Enter** is pressed, if the buffer is ≥ 3 characters (configurable), it's treated as a barcode
5. The barcode is stored in state and logged to the console

**Console output you'll see:**
```
[HW-Scanner] 🎧 Keyboard-wedge listener STARTED (minLength=3, maxGap=50ms)
[HW-Scanner] 📝 Buffer: "8" (gap=12ms)
[HW-Scanner] 📝 Buffer: "89012" (gap=8ms)
[HW-Scanner] ⏎ Enter pressed. Buffer: "890123456789" (length=12, required=3)
[HW-Scanner] ✅ BARCODE DETECTED: 890123456789
```

### Web Serial Mode (Advanced)

For scanners that don't support keyboard-wedge mode, the **Web Serial API** can be used to read directly from the USB serial port. Click "USB Serial (Advanced)" on the settings page to connect.

**Requirements:**
- Chrome/Edge 89+ (Web Serial API)
- User must click the connect button (browser requires user gesture)

---

## How the Printer Works

### System Printer (Default)

Uses `window.open()` + `window.print()` to send a test receipt to whatever printer is configured in the OS. This works with any printer (thermal, inkjet, laser).

### USB Thermal Printer (Advanced)

Uses the **Web USB API** to communicate directly with ESC/POS compatible thermal printers. Click "USB Thermal Printer" on the settings page to pair.

**Supported thermal printer vendor IDs:**
`0x0416, 0x0483, 0x04b8, 0x0519, 0x0dd4, 0x0fe6, 0x1504, 0x1fc9, 0x20d1, 0x0525`

---

## Testing Your USB Barcode Scanner

### Step-by-Step

1. **Plug in** your USB barcode scanner via USB (no driver needed for HID scanners)
2. Open `http://localhost:3000/pos/settings/hardware` in **Chrome or Edge**
3. **Click on the page** to make sure it has focus
4. Open **DevTools** (press `F12` → click **Console** tab), then **click back on the page**
5. You should see in console:
   ```
   [HW] 🔍 Detecting all devices...
   [HW-Scanner] 📋 Scanners: ["USB Scanner (Keyboard Wedge / HID) [connected]"]
   [HW-Printer] 📋 Detected printers: ["System Printer (Browser)"]
   [HW] ✅ Device detection complete.
   [HW-Scanner] 🎧 Keyboard-wedge listener STARTED (stable — reads config from ref)
   ```
6. **Scan any barcode** — the number appears in:
   - The **"Live Scan Log"** panel on the page (blue bordered card)
   - The **browser console** with `[HW-Scanner] ✅ BARCODE DETECTED: <number>`
   - The **"Last scanned"** field in the Scanner section

### Using the Test Button

1. Click **"Test Scanner"** button
2. A blue banner appears: **"Click here first, then scan your barcode"**
3. **Click on that banner** (or anywhere on the page) to ensure focus
4. Scan a barcode within 10 seconds
5. If detected → green checkmark + success toast
6. If no scan → red X + error toast

> **IMPORTANT:** If DevTools console is focused instead of the page, keystrokes go to DevTools and the scanner test will fail. Always click back on the web page before scanning.

### Troubleshooting Scanner

| Problem | Solution |
|---------|----------|
| **Red X on test but barcode shows in console** | DevTools console was focused. **Click on the web page** first, then scan. |
| No barcode appears when scanning | Make sure the page is **focused** (click on the page first) |
| Buffer resets too quickly | Increase **Max Keystroke Gap** (try 80-100ms) |
| Short barcodes not detected | Lower **Min Barcode Length** (default is 3) |
| Barcode numbers appear in config input fields | Fixed in latest version — scanner input is now intercepted on hardware page |
| Console shows buffer building but no barcode | Your scanner may not be sending Enter after the barcode. Check scanner manual for "suffix" settings. |
| `[HW-Scanner] ⚠️ Buffer too short` | The scanned text is shorter than min length. Lower the min length. |

---

## Testing the Printer

1. Click **"Print Test Page"** button
2. A small popup window opens with a test receipt
3. The browser print dialog appears
4. Select your printer and click Print
5. If the popup is blocked, allow popups for this site

**Note:** If using a thermal printer, set it as the **default system printer** in Windows settings for best results.

---

## Configuration Options

### Scanner Config

| Setting | Default | Description |
|---------|---------|-------------|
| Min Barcode Length | `3` | Minimum characters for a valid barcode |
| Max Keystroke Gap | `50ms` | Maximum time between keystrokes. Scanner types fast (~5-15ms gap), humans type slow (~100-300ms). Increase if your scanner is slow. |
| Suffix | `\n` (Enter) | Character sent by scanner after barcode. Most scanners send Enter. |

### Printer Config

| Setting | Default | Description |
|---------|---------|-------------|
| Paper Width | `80mm` | 58mm (2 inch) or 80mm (3 inch) thermal paper |
| Auto-print on sale | `off` | Automatically print receipt after completing a sale |

---

## Debug Console Log Reference

All hardware logs are prefixed for easy filtering:

| Prefix | Meaning |
|--------|---------|
| `[HW]` | General hardware detection |
| `[HW-Scanner]` | Scanner-specific events |
| `[HW-Printer]` | Printer-specific events |

**Filter in DevTools Console:** Type `HW` in the Console filter box to see only hardware logs.

### Key Log Messages

```
[HW-Scanner] 🎧 Keyboard-wedge listener STARTED     → Listener is active
[HW-Scanner] 📝 Buffer: "..."                        → Characters being received (scanner typing)
[HW-Scanner] ⏎ Enter pressed. Buffer: "..."          → Scanner sent Enter, checking if valid
[HW-Scanner] ✅ BARCODE DETECTED: ...                → Barcode accepted!
[HW-Scanner] ⚠️ Buffer too short, ignoring: "..."    → Too few characters
[HW-Scanner] ⏰ Buffer reset (gap too large)          → Gap between keys exceeded threshold
[HW-Scanner] ⏰ Buffer auto-cleared                   → No Enter received, buffer timed out
[HW-Scanner] 🧪 Scanner test started                  → Test button clicked
[HW-Scanner] 🧪✅ Test PASSED                         → Barcode received during test
[HW-Printer] 🔍 Detecting printers...                → Checking for printers
[HW-Printer] 🧪 Printer test started...              → Print test initiated
[HW-Printer] 🧪✅ Test page sent to printer.          → Print dialog opened
```

---

## Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Keyboard Wedge Scanner | ✅ | ✅ | ✅ | ✅ |
| Web Serial API | ✅ 89+ | ✅ 89+ | ❌ | ❌ |
| Web USB API | ✅ 61+ | ✅ 79+ | ❌ | ❌ |
| System Print (window.print) | ✅ | ✅ | ✅ | ✅ |

**Recommendation:** Use **Chrome** or **Edge** for full hardware support.

---

## File Reference

| File | Purpose |
|------|---------|
| [src/hooks/use-hardware.ts](src/hooks/use-hardware.ts) | Core hook — scanner detection (keyboard-wedge + serial), printer detection (USB + system), test functions, config state |
| [src/types/web-hardware.d.ts](src/types/web-hardware.d.ts) | TypeScript type declarations for Web Serial API and Web USB API |
| [src/app/pos/settings/hardware/page.tsx](src/app/pos/settings/hardware/page.tsx) | POS hardware settings page with live scan log |
| [src/app/store-admin/.../hardware/page.tsx](src/app/store-admin/(store-settings)/settings/hardware/page.tsx) | Store admin hardware settings page (same UI) |
| [src/components/shared/hardware-status-indicator.tsx](src/components/shared/hardware-status-indicator.tsx) | Compact scanner/printer status badge for POS bottom bar |
