/**
 * ESC/POS encoder for USB thermal printers (Epson TM series).
 *
 * FULL REWRITE — fixes identified from physical print comparison:
 *
 *  BUG 1 FIXED: Previous job bleeding into new one.
 *               Root cause: printer left in proportional mode, cut didn't
 *               fire reliably. Fix: hard reset sequence (INIT + FONT_A +
 *               FIXED_PITCH) at start of every job.
 *
 *  BUG 2 FIXED: ₹ printing as "?".
 *               Root cause: 0x80 in WPC1252 = € (Euro), NOT ₹. The Indian
 *               Rupee sign (U+20B9) was created in 2010, AFTER Windows-1252
 *               was frozen. No standard 8-bit code page contains it.
 *               Fix: Use "Rs." prefix — works on every Epson printer without
 *               any code page configuration.
 *
 *  BUG 3 FIXED: Columns squished / no spaces between them.
 *               Root cause: printer in proportional-spacing mode from a
 *               previous bad job; ESC @ alone doesn't always reset it on
 *               Epson TM-T82/T88 clones.
 *               Fix: Send ESC M 0 (Font A fixed-pitch) + ESC SP 0
 *               (char spacing = 0) explicitly after INIT.
 *
 *  BUG 4 FIXED: Two-column lines had 0-gap (invoice+date, time+cashier).
 *               Root cause: previous twoColumnLine assumed ₹ = 1 byte, but
 *               switching to "Rs." (3 chars) broke all right-side widths.
 *               Fix: All column math now accounts for "Rs." = 3 chars.
 *
 *  BUG 5 FIXED: Discount / HSN sub-lines never printed.
 *               Root cause: misplaced `continue` in for-loop ran before
 *               the sub-line blocks, skipping them on every item.
 *               Fix: Removed the erroneous `continue`.
 */

import type {
    ReceiptLayoutConfig,
    ReceiptPaperSize,
} from "@/hooks/use-hardware";
import type { PrintReceiptData } from "./receipt-print";

// ============================================================================
// ESC/POS COMMAND CONSTANTS
// ============================================================================

const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;

const CMD = {
    /** Full printer initialise — resets all registers */
    INIT:                   [ESC, 0x40],
    /** Select Font A (12×24 dots, fixed-pitch) */
    FONT_A:                 [ESC, 0x4d, 0x00],
    /** Fixed character spacing = 0 — kills proportional mode */
    FIXED_PITCH:            [ESC, 0x20, 0x00],
    /** Default line spacing (1/6 inch) */
    LINE_SPACING_DEFAULT:   [ESC, 0x32],

    ALIGN_LEFT:             [ESC, 0x61, 0x00],
    ALIGN_CENTER:           [ESC, 0x61, 0x01],

    BOLD_ON:                [ESC, 0x45, 0x01],
    BOLD_OFF:               [ESC, 0x45, 0x00],

    /** Double-height text (store name headline) */
    DOUBLE_HEIGHT_ON:       [ESC, 0x21, 0x10],
    /** Back to normal size */
    NORMAL_SIZE:            [ESC, 0x21, 0x00],

    /** Feed n lines */
    FEED:      (n: number) => [ESC, 0x64, n],
    /** Feed n lines then full cut */
    CUT_FEED:  (n: number) => [GS,  0x56, 0x42, n],
} as const;

// ============================================================================
// TEXT / LAYOUT HELPERS
// ============================================================================

/**
 * Characters per line for each paper size using Font A at 203 DPI.
 *   58mm ≈ 32 chars   |   80mm ≈ 48 chars
 */
function getCharWidth(paperSize: ReceiptPaperSize): number {
    switch (paperSize) {
        case 58:   return 32;
        case 80:   return 48;
        case "A5": return 48;   // ESC/POS — treat like 80mm
        case "A4": return 64;
    }
}

/** Pad right with spaces to exactly `width` chars (truncates if too long) */
function padRight(text: string, width: number): string {
    const t = text.length > width ? text.slice(0, width) : text;
    return t + " ".repeat(width - t.length);
}

/** Pad left with spaces to exactly `width` chars (truncates if too long) */
function padLeft(text: string, width: number): string {
    const t = text.length > width ? text.slice(0, width) : text;
    return " ".repeat(width - t.length) + t;
}

/**
 * Build a two-column line: `left` is left-aligned, `right` is right-aligned,
 * total = exactly `width` characters.
 * Truncates the label if both sides don't fit.
 */
function twoCol(left: string, right: string, width: number): string {
    const gap = width - left.length - right.length;
    if (gap >= 1) {
        return left + " ".repeat(gap) + right;
    }
    const maxLabel = width - right.length - 1;
    return left.slice(0, Math.max(0, maxLabel)) + " " + right;
}

/** Repeated dashes — used as section separator */
function dashLine(width: number): string {
    return "-".repeat(width);
}

/**
 * Format a currency amount with "Rs." prefix.
 *
 * WHY "Rs." not "₹":
 *   The Indian Rupee Unicode character (U+20B9) was standardised in 2010,
 *   after all common 8-bit printer code pages were frozen. No Epson code
 *   page maps a single byte to ₹. Sending UTF-8 (E2 82 B9) produces garbage.
 *   "Rs." is what every ATM, older POS, and retail receipt in India uses —
 *   it's the universally accepted plain-ASCII rupee notation.
 *
 * Examples:
 *   fmtRs(1208)        → "Rs.1,208.00"
 *   fmtRs(20, true)    → "-Rs.20.00"
 */
function fmtRs(amount: number, negative = false): string {
    const n = new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    return (negative ? "-Rs." : "Rs.") + n;
}

// ============================================================================
// ESC/POS BUFFER BUILDER
// ============================================================================

class EscPosBuffer {
    private chunks: Uint8Array[] = [];
    private encoder = new TextEncoder();   // safe: only plain ASCII strings go through

    raw(bytes: number[] | readonly number[]): this {
        this.chunks.push(new Uint8Array(bytes));
        return this;
    }

    text(str: string): this {
        this.chunks.push(this.encoder.encode(str));
        return this;
    }

    line(str: string): this {
        return this.text(str).raw([LF]);
    }

    newline(): this {
        return this.raw([LF]);
    }

    build(): Uint8Array {
        const total = this.chunks.reduce((s, c) => s + c.length, 0);
        const out   = new Uint8Array(total);
        let offset  = 0;
        for (const chunk of this.chunks) {
            out.set(chunk, offset);
            offset += chunk.length;
        }
        return out;
    }
}

// ============================================================================
// RECEIPT → ESC/POS
// ============================================================================

export function encodeReceiptEscPos(
    data: PrintReceiptData,
    config: ReceiptLayoutConfig,
): Uint8Array {
    const w   = getCharWidth(config.paperSize);
    const buf = new EscPosBuffer();

    // ── HARD RESET ───────────────────────────────────────────────────────
    // Three-command reset ensures no bad state from a previous job carries over:
    //   ESC @    — full printer initialise
    //   ESC M 0  — Font A (fixed-pitch, 12 dots wide)
    //   ESC SP 0 — fixed char spacing = 0 (disables proportional mode)
    buf.raw(CMD.INIT);
    buf.raw(CMD.FONT_A);
    buf.raw(CMD.FIXED_PITCH);
    buf.raw(CMD.LINE_SPACING_DEFAULT);

    // ── HEADER ───────────────────────────────────────────────────────────
    buf.raw(CMD.ALIGN_CENTER);

    if (config.showStoreName) {
        buf.raw(CMD.BOLD_ON);
        buf.raw(CMD.DOUBLE_HEIGHT_ON);
        buf.line(data.store.name);
        buf.raw(CMD.NORMAL_SIZE);
        buf.raw(CMD.BOLD_OFF);
    }
    if (config.showStoreAddress && data.store.address) {
        buf.line(data.store.address);
    }
    if (config.showStorePhone && data.store.phone) {
        buf.line("Ph: " + data.store.phone);
    }
    if (config.showStoreGstin && data.store.gstin) {
        buf.line("GSTIN: " + data.store.gstin);
    }
    if (config.headerNote) {
        buf.line(config.headerNote);
    }

    // ── SEPARATOR ────────────────────────────────────────────────────────
    buf.raw(CMD.ALIGN_LEFT);
    buf.line(dashLine(w));

    // ── INVOICE INFO ─────────────────────────────────────────────────────
    buf.line(twoCol("Invoice: " + data.invoice.number, data.invoice.date, w));
    buf.line(twoCol(
        "Time: " + data.invoice.time,
        data.cashier ? "Cashier: " + data.cashier : "",
        w,
    ));

    // ── CUSTOMER ─────────────────────────────────────────────────────────
    if (config.showCustomerInfo && data.customer.name) {
        buf.line(dashLine(w));
        let custLine = "Customer: " + data.customer.name;
        if (data.customer.phone) custLine += " (" + data.customer.phone + ")";
        // Soft-wrap if too long (e.g., long name + phone on 58mm)
        if (custLine.length > w) {
            buf.line(custLine.slice(0, w));
            buf.line("  " + custLine.slice(w));
        } else {
            buf.line(custLine);
        }
        if (data.customer.gstin) {
            buf.line("GSTIN: " + data.customer.gstin);
        }
    }

    // ── ITEMS TABLE ───────────────────────────────────────────────────────
    buf.line(dashLine(w));

    //
    // Column width allocation (characters):
    //
    //   Amt  col: widest expected value = "Rs.1,208.00" = 11 chars → allocate 12
    //   Rate col: widest expected value = "Rs.999.00"   =  9 chars → allocate 10
    //   Qty  col: widest expected value = "10 Pcs"      =  6 chars → allocate  7
    //   Name col: all remaining chars
    //
    const amtW  = 12;
    const rateW = config.showRate ? 10 : 0;
    const qtyW  = config.showQty  ?  7 : 0;
    const nameW = Math.max(4, w - amtW - rateW - qtyW);

    // Header row
    buf.raw(CMD.BOLD_ON);
    let hdr = padRight("Item", nameW);
    if (config.showQty)  hdr += padLeft("Qty",  qtyW);
    if (config.showRate) hdr += padLeft("Rate", rateW);
    hdr += padLeft("Amt", amtW);
    buf.line(hdr);
    buf.raw(CMD.BOLD_OFF);
    buf.line(dashLine(w));

    // Item rows
    for (const item of data.items) {
        const displayName = item.name.length > nameW
            ? item.name.slice(0, nameW - 2) + ".."
            : item.name;

        let row = padRight(displayName, nameW);
        if (config.showQty) {
            const qtyStr = item.unit ? `${item.qty} ${item.unit}` : String(item.qty);
            row += padLeft(qtyStr, qtyW);
        }
        if (config.showRate) {
            row += padLeft(fmtRs(item.price), rateW);
        }
        row += padLeft(fmtRs(item.total), amtW);
        buf.line(row);

        // HSN sub-line
        if (config.showHsn && item.hsn) {
            buf.line("  HSN: " + item.hsn);
        }

        // Discount sub-line — value right-aligned under Amt column
        if (config.showItemDiscount && item.discount > 0) {
            const discAmt = padLeft(fmtRs(item.discount, true), amtW);
            buf.line(padRight("  Disc:", w - amtW) + discAmt);
        }
        // No `continue` here — sub-lines above must run before next iteration
    }

    // ── TOTALS ────────────────────────────────────────────────────────────
    buf.line(dashLine(w));

    /** Print label + right-aligned currency amount on one line */
    const kvMoney = (label: string, amount: number, negative = false): void => {
        buf.line(twoCol(label, fmtRs(amount, negative), w));
    };

    kvMoney("Subtotal", data.totals.subtotal);

    if (data.totals.discount > 0) {
        kvMoney("Discount", data.totals.discount, true);
    }

    // Show GST breakdown only if:
    // 1. config.showGstBreakdown is true (user preference)
    // 2. AND gstType is NOT B2C (B2C = tax inclusive, no breakdown needed)
    const isB2B = data.gstType !== "B2C";
    const showGst = config.showGstBreakdown && isB2B;

    if (showGst) {
        if (data.totals.cgst > 0) kvMoney("CGST", data.totals.cgst);
        if (data.totals.sgst > 0) kvMoney("SGST", data.totals.sgst);
        if (data.totals.igst > 0) kvMoney("IGST", data.totals.igst);
        if (data.totals.cess > 0) kvMoney("Cess", data.totals.cess);
    } else if (data.gstType === "B2C") {
        // B2C: Optionally show "(Incl. GST)" note
        const totalTax = (data.totals.cgst || 0) + (data.totals.sgst || 0) + (data.totals.igst || 0) + (data.totals.cess || 0);
        if (totalTax > 0) {
            kvMoney("(Incl. GST)", totalTax);
        }
    }

    if (data.totals.round_off !== 0) {
        kvMoney("Round Off", Math.abs(data.totals.round_off), data.totals.round_off < 0);
    }

    buf.line(dashLine(w));

    // Grand total — bold
    buf.raw(CMD.BOLD_ON);
    kvMoney("TOTAL", data.totals.total);
    buf.raw(CMD.BOLD_OFF);

    // ── PAYMENTS ──────────────────────────────────────────────────────────
    buf.line(dashLine(w));
    buf.line("Payments");
    for (const p of data.payments) {
        const label = p.reference ? `${p.method} (${p.reference})` : p.method;
        kvMoney(label, p.amount);
    }
    if (data.totals.change > 0) {
        kvMoney("Change", data.totals.change);
    }
    if (data.totals.due > 0) {
        buf.raw(CMD.BOLD_ON);
        kvMoney("Balance Due", data.totals.due);
        buf.raw(CMD.BOLD_OFF);
    }

    // ── CREDIT / NOTES ────────────────────────────────────────────────────
    if (data.footer.is_credit) {
        buf.line(dashLine(w));
        buf.raw(CMD.ALIGN_CENTER);
        buf.raw(CMD.BOLD_ON);
        buf.line("CREDIT SALE");
        buf.raw(CMD.BOLD_OFF);
        if (data.footer.credit_due_date) {
            buf.line("Payment Due: " + data.footer.credit_due_date);
        }
        buf.raw(CMD.ALIGN_LEFT);
    }

    if (data.footer.notes) {
        buf.line(dashLine(w));
        buf.raw(CMD.ALIGN_CENTER);
        buf.line(data.footer.notes);
        buf.raw(CMD.ALIGN_LEFT);
    }

    // ── FOOTER ────────────────────────────────────────────────────────────
    if (config.showThankYou && config.footerText) {
        buf.line(dashLine(w));
        buf.raw(CMD.ALIGN_CENTER);
        buf.line(config.footerText);
        buf.raw(CMD.ALIGN_LEFT);
    }

    // ── FEED & CUT ────────────────────────────────────────────────────────
    // Feed 5 lines before cutting so the blade doesn't clip the last text line.
    buf.raw(CMD.FEED(5));
    buf.raw(CMD.CUT_FEED(0));

    return buf.build();
}

// ============================================================================
// SEND TO USB PRINTER VIA WEB USB
// ============================================================================

/**
 * Send ESC/POS bytes to a USB thermal printer via the Web USB API.
 *
 * Sends in 64-byte chunks (USB Full Speed bulk transfer limit).
 * Auto-detects the correct bulk-OUT endpoint from the device descriptor.
 */
export async function sendToUsbPrinter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    device: any,
    data: Uint8Array,
    endpointNumber = 1,
): Promise<void> {
    let epNum = endpointNumber;
    try {
        const iface = device.configuration?.interfaces?.[0];
        if (iface) {
            const alt = iface.alternate ?? iface.alternates?.[0];
            if (alt) {
                const outEp = alt.endpoints?.find(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (ep: any) => ep.direction === "out" && ep.type === "bulk",
                );
                if (outEp) epNum = outEp.endpointNumber;
            }
        }
    } catch {
        // Keep default endpoint
    }

    const CHUNK = 64;
    for (let i = 0; i < data.length; i += CHUNK) {
        await device.transferOut(epNum, data.slice(i, i + CHUNK));
    }
}