/**
 * Receipt HTML generator & print utility.
 *
 * Generates a standalone HTML document whose printed output matches the
 * live preview shown in the receipt-layout-editor.
 *
 * IMPORTANT — Thermal printer compatibility:
 *   • Uses ONLY <table> with `table-layout: auto` (not fixed — fixed breaks
 *     when the first row has colspan and no explicit col widths)
 *   • Dashed-border separators (CSS, not text chars — thermal drivers render
 *     `border-bottom: 1px dashed #000` reliably)
 *   • Column widths set via <colgroup> for consistent sizing
 *   • Sans-serif font (Arial) — monospace Courier wraps too aggressively
 *     on narrow thermal paper
 *
 * Used by:
 *  - testPrinter()  in  use-hardware.ts  (mock data)
 *  - ReceiptView    for actual sale prints
 *  - ESC/POS encoder uses PrintReceiptData type only
 */

import type {
    ReceiptLayoutConfig,
    ReceiptPaperSize,
    ReceiptFontSize,
} from "@/hooks/use-hardware";

// ============================================================================
// TYPES
// ============================================================================

export interface PrintReceiptData {
    store: {
        name: string;
        address: string;
        gstin: string | null;
        phone: string | null;
    };
    invoice: {
        number: string;
        date: string;
        time: string;
    };
    cashier?: string | null;
    customer: {
        name: string | null;
        phone: string | null;
        gstin: string | null;
    };
    items: Array<{
        name: string;
        hsn?: string | null;
        qty: number;
        unit?: string | null;
        price: number;
        discount: number;
        total: number;
    }>;
    totals: {
        subtotal: number;
        discount: number;
        cgst: number;
        sgst: number;
        igst: number;
        cess: number;
        round_off: number;
        total: number;
        paid: number;
        due: number;
        change: number;
    };
    payments: Array<{
        method: string;
        amount: number;
        reference: string | null;
    }>;
    footer: {
        is_credit: boolean;
        credit_due_date: string | null;
        notes: string | null;
    };
}

// ============================================================================
// HELPERS
// ============================================================================

function formatINR(amount: number | null | undefined): string {
    if (amount == null) return "₹0.00";
    return "₹" + new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/** Content area width (px) for on-screen rendering */
function getContentWidth(size: ReceiptPaperSize): number {
    switch (size) {
        case 58: return 260;
        case 80: return 350;
        case "A5": return 480;
        case "A4": return 650;
    }
}

/** Body font size (px) */
function getFontSizePx(size: ReceiptFontSize): number {
    switch (size) {
        case "small": return 11;
        case "medium": return 13;
        case "large": return 15;
    }
}

/** Store-name font size (px) */
function getStoreNameSize(size: ReceiptFontSize, isThermal: boolean): number {
    const base = getFontSizePx(size);
    return isThermal ? base + 3 : base + 5;
}

/** @page CSS — thermal gets auto-height (roll), A5/A4 get fixed dimensions */
function getPageCss(size: ReceiptPaperSize): string {
    switch (size) {
        case 58: return "size: 58mm auto; margin: 1mm 2mm;";
        case 80: return "size: 80mm auto; margin: 1mm 2mm;";
        case "A5": return "size: 148mm 210mm; margin: 8mm;";
        case "A4": return "size: 210mm 297mm; margin: 10mm;";
    }
}

function esc(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ============================================================================
// MOCK / TEST DATA
// ============================================================================

export function buildTestReceiptData(
    storeName = "My Store",
    storeAddress = "123 Main St, Mumbai",
    storePhone: string | null = "+91 98765 43210",
    storeGstin: string | null = "27AAAAA0000A1Z5",
): PrintReceiptData {
    const now = new Date();
    return {
        store: { name: storeName, address: storeAddress, gstin: storeGstin, phone: storePhone },
        invoice: {
            number: "INV-0042",
            date: now.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit" }),
            time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
        },
        cashier: "Admin",
        customer: { name: "Rahul Sharma", phone: "+91 99887 76655", gstin: null },
        items: [
            { name: "Basmati Rice 5kg", hsn: "1006", qty: 2, unit: "Pcs", price: 299, discount: 20, total: 578 },
            { name: "Sunflower Oil 1L", hsn: "1512", qty: 1, unit: "Pcs", price: 180, discount: 0, total: 180 },
            { name: "Atta Chakki Fresh 10kg", hsn: "1101", qty: 1, unit: "Pcs", price: 450, discount: 0, total: 450 },
        ],
        totals: {
            subtotal: 1208, discount: 20, cgst: 30, sgst: 30, igst: 0, cess: 0,
            round_off: 0, total: 1248, paid: 1248, due: 0, change: 0,
        },
        payments: [{ method: "Cash", amount: 1248, reference: null }],
        footer: { is_credit: false, credit_due_date: null, notes: null },
    };
}

// ============================================================================
// HTML GENERATOR
// ============================================================================

/**
 * Generates a standalone HTML receipt document.
 *
 * Layout strategy:
 *  - Full-width rows (header, separator, info) use a simple <div> or <p>
 *  - The items table is its OWN <table> with <colgroup> for fixed widths
 *  - Totals / payments use 2-column div rows (label + amount)
 *
 * This avoids the `colspan` + `table-layout: fixed` bug that broke
 * everything into single-character-wide columns.
 */
export function generateReceiptHtml(
    data: PrintReceiptData,
    config: ReceiptLayoutConfig,
): string {
    const fontSize = getFontSizePx(config.fontSize);
    const isThermal = config.paperSize === 58 || config.paperSize === 80;
    const isInvoice = config.layout === "invoice-a4" || config.layout === "invoice-a5";
    const storeNameSize = getStoreNameSize(config.fontSize, isThermal);
    const contentWidth = getContentWidth(config.paperSize);

    // ── Build sections as HTML blocks ───────────────────────────────────
    const sections: string[] = [];

    // ── HEADER ──────────────────────────────────────────────────────────
    const headerLines: string[] = [];
    if (config.showStoreName) {
        headerLines.push(`<div style="font-weight:bold;font-size:${storeNameSize}px;">${esc(data.store.name)}</div>`);
    }
    if (config.showStoreAddress && data.store.address) {
        headerLines.push(`<div>${esc(data.store.address)}</div>`);
    }
    if (config.showStorePhone && data.store.phone) {
        headerLines.push(`<div>Ph: ${esc(data.store.phone)}</div>`);
    }
    if (config.showStoreGstin && data.store.gstin) {
        headerLines.push(`<div>GSTIN: ${esc(data.store.gstin)}</div>`);
    }
    if (config.headerNote) {
        headerLines.push(`<div style="color:#666;font-style:italic;">${esc(config.headerNote)}</div>`);
    }
    if (headerLines.length > 0) {
        const border = isInvoice ? "border-bottom:1px solid #aaa;padding-bottom:4px;" : "";
        sections.push(`<div style="text-align:center;${border}">${headerLines.join("")}</div>`);
    }

    // ── SEPARATOR helper ────────────────────────────────────────────────
    const SEP = '<div style="border-bottom:1px dashed #999;margin:4px 0;"></div>';
    sections.push(SEP);

    // ── INVOICE INFO ────────────────────────────────────────────────────
    sections.push(`
        <div style="display:table;width:100%;">
            <div style="display:table-row;">
                <div style="display:table-cell;text-align:left;">Invoice: ${esc(data.invoice.number)}</div>
                <div style="display:table-cell;text-align:right;">${esc(data.invoice.date)}</div>
            </div>
            <div style="display:table-row;color:#666;">
                <div style="display:table-cell;text-align:left;">Time: ${esc(data.invoice.time)}</div>
                <div style="display:table-cell;text-align:right;">${data.cashier ? "Cashier: " + esc(data.cashier) : ""}</div>
            </div>
        </div>
    `);

    // ── CUSTOMER ────────────────────────────────────────────────────────
    if (config.showCustomerInfo && data.customer.name) {
        sections.push(SEP);
        let custHtml = `<div style="color:#666;">Customer: ${esc(data.customer.name)}`;
        if (data.customer.phone) custHtml += ` (${esc(data.customer.phone)})`;
        custHtml += `</div>`;
        if (data.customer.gstin) {
            custHtml += `<div style="color:#666;">GSTIN: ${esc(data.customer.gstin)}</div>`;
        }
        sections.push(custHtml);
    }

    // ── ITEMS TABLE (separate <table> with <colgroup>) ──────────────────
    sections.push(SEP);

    // Compute column widths (px, not %) for predictable rendering
    const amtW = isThermal ? 65 : 80;
    const qtyW = config.showQty ? (isThermal ? 35 : 45) : 0;
    const rateW = config.showRate ? (isThermal ? 55 : 70) : 0;
    // Name column gets the rest

    // Build <colgroup>
    let colgroup = '<colgroup><col style="width:auto;">';
    if (config.showQty) colgroup += `<col style="width:${qtyW}px;">`;
    if (config.showRate) colgroup += `<col style="width:${rateW}px;">`;
    colgroup += `<col style="width:${amtW}px;">`;
    colgroup += '</colgroup>';

    // Header row
    let thead = '<tr style="border-bottom:1px dashed #999;">';
    thead += '<th style="text-align:left;padding:2px 4px 2px 0;font-weight:600;">Item</th>';
    if (config.showQty) thead += '<th style="text-align:right;padding:2px 4px;font-weight:600;">Qty</th>';
    if (config.showRate) thead += '<th style="text-align:right;padding:2px 4px;font-weight:600;">Rate</th>';
    thead += '<th style="text-align:right;padding:2px 0 2px 4px;font-weight:600;">Amt</th>';
    thead += '</tr>';

    // Item rows
    let tbody = '';
    for (const item of data.items) {
        tbody += '<tr>';
        // Name cell
        tbody += `<td style="text-align:left;padding:3px 4px 3px 0;vertical-align:top;">`;
        tbody += esc(item.name);
        if (config.showHsn && item.hsn) {
            tbody += `<br><span style="font-size:0.85em;color:#888;">HSN: ${esc(item.hsn)}</span>`;
        }
        tbody += '</td>';
        // Qty cell
        if (config.showQty) {
            const qtyStr = item.unit ? `${item.qty} ${item.unit}` : String(item.qty);
            tbody += `<td style="text-align:right;padding:3px 4px;vertical-align:top;white-space:nowrap;">${esc(qtyStr)}</td>`;
        }
        // Rate cell
        if (config.showRate) {
            tbody += `<td style="text-align:right;padding:3px 4px;vertical-align:top;white-space:nowrap;">${formatINR(item.price)}</td>`;
        }
        // Amount cell
        tbody += `<td style="text-align:right;padding:3px 0 3px 4px;vertical-align:top;white-space:nowrap;">`;
        tbody += formatINR(item.total);
        if (config.showItemDiscount && item.discount > 0) {
            tbody += `<br><span style="font-size:0.85em;color:#888;">-${formatINR(item.discount)}</span>`;
        }
        tbody += '</td>';
        tbody += '</tr>';
    }

    sections.push(`
        <table style="width:100%;border-collapse:collapse;table-layout:auto;">
            ${colgroup}
            <thead>${thead}</thead>
            <tbody>${tbody}</tbody>
        </table>
    `);

    // ── TOTALS ──────────────────────────────────────────────────────────
    sections.push(SEP);

    /** Two-column row: label on left, value on right */
    const kvRow = (label: string, value: string, style = ""): string =>
        `<div style="display:table;width:100%;${style}">
            <div style="display:table-cell;text-align:left;padding:1px 0;">${label}</div>
            <div style="display:table-cell;text-align:right;padding:1px 0;white-space:nowrap;">${value}</div>
        </div>`;

    sections.push(kvRow("Subtotal", formatINR(data.totals.subtotal)));
    if (data.totals.discount > 0) {
        sections.push(kvRow("Discount", "-" + formatINR(data.totals.discount), "color:#666;"));
    }
    if (config.showGstBreakdown) {
        if (data.totals.cgst > 0) sections.push(kvRow("CGST", formatINR(data.totals.cgst), "color:#666;"));
        if (data.totals.sgst > 0) sections.push(kvRow("SGST", formatINR(data.totals.sgst), "color:#666;"));
        if (data.totals.igst > 0) sections.push(kvRow("IGST", formatINR(data.totals.igst), "color:#666;"));
        if (data.totals.cess > 0) sections.push(kvRow("Cess", formatINR(data.totals.cess), "color:#666;"));
    }
    if (data.totals.round_off !== 0) {
        sections.push(kvRow("Round Off", formatINR(data.totals.round_off), "color:#666;"));
    }

    // Grand total
    sections.push(SEP);
    sections.push(kvRow(
        "TOTAL",
        formatINR(data.totals.total),
        `font-weight:bold;font-size:${fontSize + 2}px;`,
    ));

    // ── PAYMENTS ────────────────────────────────────────────────────────
    sections.push(SEP);
    sections.push('<div style="font-weight:500;padding:2px 0;">Payments</div>');
    for (const p of data.payments) {
        const label = p.reference
            ? `${esc(p.method)} <span style="color:#888;">(${esc(p.reference)})</span>`
            : esc(p.method);
        sections.push(kvRow(label, formatINR(p.amount)));
    }
    if (data.totals.change > 0) {
        sections.push(kvRow("Change", formatINR(data.totals.change), "font-weight:500;"));
    }
    if (data.totals.due > 0) {
        sections.push(kvRow("Balance Due", formatINR(data.totals.due), "font-weight:bold;color:#c00;"));
    }

    // ── CREDIT / NOTES ──────────────────────────────────────────────────
    if (data.footer.is_credit) {
        sections.push(SEP);
        sections.push('<div style="text-align:center;font-weight:bold;">CREDIT SALE</div>');
        if (data.footer.credit_due_date) {
            sections.push(`<div style="text-align:center;">Payment Due: ${esc(data.footer.credit_due_date)}</div>`);
        }
    }
    if (data.footer.notes) {
        sections.push(SEP);
        sections.push(`<div style="text-align:center;color:#666;">${esc(data.footer.notes)}</div>`);
    }

    // ── FOOTER ──────────────────────────────────────────────────────────
    if (config.showThankYou && config.footerText) {
        sections.push(SEP);
        sections.push(`<div style="text-align:center;color:#666;padding:4px 0;">${esc(config.footerText)}</div>`);
    }

    // ── ASSEMBLE FULL HTML ──────────────────────────────────────────────
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Receipt - ${esc(data.invoice.number)}</title>
<style>
    @page {
        ${getPageCss(config.paperSize)}
    }
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    body {
        font-family: Arial, Helvetica, sans-serif;
        font-size: ${fontSize}px;
        line-height: 1.4;
        color: #000;
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .receipt {
        max-width: ${contentWidth}px;
        margin: 0 auto;
        padding: ${isThermal ? "6px" : "16px"};
    }
    @media print {
        body {
            margin: 0;
            padding: 0;
        }
        .receipt {
            max-width: none;
            width: 100%;
            padding: ${isThermal ? "2px" : "8px"};
        }
    }
</style>
</head>
<body>
<div class="receipt">
${sections.join("\n")}
</div>
</body>
</html>`;
}

// ============================================================================
// PRINT FUNCTION — hidden iframe approach (more reliable than popups)
// ============================================================================

/**
 * Prints receipt HTML using a hidden iframe with window.print().
 *
 * Why iframe instead of popup?
 *  - Popups are frequently blocked by browsers
 *  - Popups flash on screen before printing
 *  - iframe is invisible and more reliable
 *
 * Falls back to popup if iframe approach fails.
 */
export function printReceiptHtml(
    data: PrintReceiptData,
    config: ReceiptLayoutConfig,
): boolean {
    const html = generateReceiptHtml(data, config);

    try {
        // Create a hidden iframe
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.top = "-10000px";
        iframe.style.left = "-10000px";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
        if (!iframeDoc) {
            throw new Error("Cannot access iframe document");
        }

        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();

        // Wait for content to render, then print
        setTimeout(() => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch {
                // If iframe print fails, try popup fallback
                printViaPopup(html, config);
            }

            // Clean up iframe after print dialog closes
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 3000);
        }, 300);

        return true;
    } catch {
        // Fallback to popup
        return printViaPopup(html, config);
    }
}

/**
 * Fallback: open a popup window and trigger print.
 */
function printViaPopup(
    html: string,
    config: ReceiptLayoutConfig,
): boolean {
    const contentWidth = getContentWidth(config.paperSize);
    const popupWidth = contentWidth + 80;

    const printWindow = window.open(
        "",
        "_blank",
        `width=${popupWidth},height=700,scrollbars=yes`,
    );
    if (!printWindow) {
        console.error("[Receipt] Popup blocked — allow popups for this site.");
        return false;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        // Close after user finishes with print dialog
        setTimeout(() => {
            printWindow.close();
        }, 5000);
    }, 500);

    return true;
}
