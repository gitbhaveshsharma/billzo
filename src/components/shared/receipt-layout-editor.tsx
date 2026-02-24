"use client";

import { useState } from "react";
import {
  FileText,
  Receipt,
  LayoutTemplate,
  Settings2,
  Eye,
  AlignLeft,
  Type,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ReceiptPreview } from "@/components/shared/receipt-preview";
import type {
  ReceiptLayoutConfig,
  ReceiptLayout,
  ReceiptPaperSize,
} from "@/hooks/use-hardware";

// ============================================================================
// LAYOUT TEMPLATE CARDS
// ============================================================================

interface LayoutOption {
  id: ReceiptLayout;
  label: string;
  description: string;
  badge: string;
  badgeVariant: "default" | "secondary" | "outline";
  icon: React.ReactNode;
  paperSizes: ReceiptPaperSize[];
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: "thermal-compact",
    label: "Thermal Compact",
    description: "Minimal receipt — fastest to print, low paper waste",
    badge: "Popular",
    badgeVariant: "default",
    icon: <Receipt className="h-5 w-5" />,
    paperSizes: [58, 80],
  },
  {
    id: "thermal-detailed",
    label: "Thermal Detailed",
    description: "Full breakdown: GST, discounts, payment info",
    badge: "Recommended",
    badgeVariant: "secondary",
    icon: <FileText className="h-5 w-5" />,
    paperSizes: [80],
  },
  {
    id: "invoice-a5",
    label: "Invoice A5",
    description: "Half-page professional invoice — great for customers",
    badge: "Invoice",
    badgeVariant: "outline",
    icon: <LayoutTemplate className="h-5 w-5" />,
    paperSizes: ["A5"],
  },
  {
    id: "invoice-a4",
    label: "Invoice A4",
    description: "Full-page formal invoice with letterhead style",
    badge: "Invoice",
    badgeVariant: "outline",
    icon: <LayoutTemplate className="h-5 w-5" />,
    paperSizes: ["A4"],
  },
];

// ============================================================================
// PAPER SIZE OPTIONS
// ============================================================================

const PAPER_SIZE_LABELS: Record<string, string> = {
  "58": "58mm — 2 inch thermal",
  "80": "80mm — 3 inch thermal",
  "A5": "A5 — 148×210mm",
  "A4": "A4 — 210×297mm",
};

// ============================================================================
// TOGGLE ROW
// ============================================================================

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-none">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

// ============================================================================
// RECEIPT LAYOUT EDITOR
// ============================================================================

interface ReceiptLayoutEditorProps {
  config: ReceiptLayoutConfig;
  onChange: (patch: Partial<ReceiptLayoutConfig>) => void;
  onSave?: () => void;
  isSaving?: boolean;
  /** Store info forwarded to the live preview */
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeGstin?: string;
}

export function ReceiptLayoutEditor({
  config,
  onChange,
  onSave,
  isSaving = false,
  storeName,
  storeAddress,
  storePhone,
  storeGstin,
}: ReceiptLayoutEditorProps) {
  const [activeTab, setActiveTab] = useState<"layout" | "header" | "body" | "footer">("layout");

  const selectedLayout = LAYOUT_OPTIONS.find((o) => o.id === config.layout);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-6">
      {/* ── LEFT: EDITOR ───────────────────────────────────────────── */}
      <div className="space-y-5">

        {/* ── LAYOUT TEMPLATE PICKER ──────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4 text-primary" />
              Receipt Template
            </CardTitle>
            <CardDescription>
              Choose how your receipt is structured and what size paper it prints on.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LAYOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange({
                      layout: opt.id,
                      // auto-set a sensible paper size
                      paperSize: opt.paperSizes[0],
                    });
                  }}
                  className={cn(
                    "text-left p-3 rounded-lg border-2 transition-all",
                    config.layout === opt.id
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/50 hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "p-1.5 rounded-md",
                          config.layout === opt.id
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {opt.icon}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{opt.label}</p>
                      </div>
                    </div>
                    <Badge variant={opt.badgeVariant} className="text-[10px] shrink-0">
                      {opt.badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
                    {opt.description}
                  </p>
                </button>
              ))}
            </div>

            <Separator />

            {/* Paper size + font size + copies */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Paper size */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Paper Size</Label>
                <Select
                  value={String(config.paperSize)}
                  onValueChange={(v) =>
                    onChange({ paperSize: (isNaN(Number(v)) ? v : Number(v)) as ReceiptPaperSize })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedLayout?.paperSizes ?? [58, 80, "A5", "A4"]).map((s) => (
                      <SelectItem key={String(s)} value={String(s)}>
                        {PAPER_SIZE_LABELS[String(s)]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Font size */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Font Size</Label>
                <Select
                  value={config.fontSize}
                  onValueChange={(v) =>
                    onChange({ fontSize: v as ReceiptLayoutConfig["fontSize"] })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (default)</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Print copies */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Print Copies</Label>
                <Select
                  value={String(config.printCopies)}
                  onValueChange={(v) =>
                    onChange({ printCopies: Number(v) as 1 | 2 | 3 })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 copy</SelectItem>
                    <SelectItem value="2">2 copies</SelectItem>
                    <SelectItem value="3">3 copies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Auto-print */}
            <ToggleRow
              label="Auto-print after sale"
              description="Automatically send receipt to printer when a sale is completed."
              checked={config.autoPrint}
              onCheckedChange={(v) => onChange({ autoPrint: v })}
            />
          </CardContent>
        </Card>

        {/* ── TAB NAVIGATION ──────────────────────────────────────── */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg border">
          {(
            [
              { id: "header", icon: <AlignLeft className="h-3.5 w-3.5" />, label: "Header" },
              { id: "body",   icon: <Settings2 className="h-3.5 w-3.5" />, label: "Body" },
              { id: "footer", icon: <Type className="h-3.5 w-3.5" />,     label: "Footer" },
            ] as { id: typeof activeTab; icon: React.ReactNode; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── HEADER TAB ────────────────────────────────────────── */}
        {activeTab === "header" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Header Section</CardTitle>
              <CardDescription>Displayed at the top of every receipt.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              <ToggleRow
                label="Store Logo"
                description="Show your store logo at the top (if uploaded)."
                checked={config.showLogo}
                onCheckedChange={(v) => onChange({ showLogo: v })}
              />
              <ToggleRow
                label="Store Name"
                checked={config.showStoreName}
                onCheckedChange={(v) => onChange({ showStoreName: v })}
              />
              <ToggleRow
                label="Store Address"
                checked={config.showStoreAddress}
                onCheckedChange={(v) => onChange({ showStoreAddress: v })}
              />
              <ToggleRow
                label="Store Phone"
                checked={config.showStorePhone}
                onCheckedChange={(v) => onChange({ showStorePhone: v })}
              />
              <ToggleRow
                label="GSTIN"
                description="GST Identification Number."
                checked={config.showStoreGstin}
                onCheckedChange={(v) => onChange({ showStoreGstin: v })}
              />
              <div className="py-3 space-y-1.5">
                <Label className="text-sm font-medium">Header Note</Label>
                <Input
                  placeholder="e.g. 'No exchange without receipt'"
                  value={config.headerNote}
                  onChange={(e) => onChange({ headerNote: e.target.value })}
                  maxLength={80}
                />
                <p className="text-xs text-muted-foreground">
                  Optional tagline or note shown just below store info.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── BODY TAB ──────────────────────────────────────────── */}
        {activeTab === "body" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Body / Line Items</CardTitle>
              <CardDescription>Controls which columns and details appear for each item.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              <ToggleRow
                label="Customer Info"
                description="Customer name and phone number."
                checked={config.showCustomerInfo}
                onCheckedChange={(v) => onChange({ showCustomerInfo: v })}
              />
              <ToggleRow
                label="Quantity Column"
                checked={config.showQty}
                onCheckedChange={(v) => onChange({ showQty: v })}
              />
              <ToggleRow
                label="Unit Rate Column"
                checked={config.showRate}
                onCheckedChange={(v) => onChange({ showRate: v })}
              />
              <ToggleRow
                label="Item-level Discount"
                description="Show per-line discount amount."
                checked={config.showItemDiscount}
                onCheckedChange={(v) => onChange({ showItemDiscount: v })}
              />
              <ToggleRow
                label="HSN / SAC Code"
                description="Goods & Services Tax classification code."
                checked={config.showHsn}
                onCheckedChange={(v) => onChange({ showHsn: v })}
              />
              <ToggleRow
                label="GST Breakdown"
                description="Show CGST / SGST / IGST rows in totals."
                checked={config.showGstBreakdown}
                onCheckedChange={(v) => onChange({ showGstBreakdown: v })}
              />
            </CardContent>
          </Card>
        )}

        {/* ── FOOTER TAB ────────────────────────────────────────── */}
        {activeTab === "footer" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Footer Section</CardTitle>
              <CardDescription>Shown at the bottom of the receipt.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              <ToggleRow
                label="Thank-you Message"
                checked={config.showThankYou}
                onCheckedChange={(v) => onChange({ showThankYou: v })}
              />
              <div className="py-3 space-y-1.5">
                <Label className="text-sm font-medium">Footer Text</Label>
                <Input
                  placeholder="e.g. 'Thank you for shopping with us!'"
                  value={config.footerText}
                  onChange={(e) => onChange({ footerText: e.target.value })}
                  maxLength={120}
                />
              </div>
              <ToggleRow
                label="Invoice Barcode"
                description="Prints a scannable barcode of the invoice number."
                checked={config.showBarcode}
                onCheckedChange={(v) => onChange({ showBarcode: v })}
              />
              <ToggleRow
                label="UPI / QR Code"
                description="Print a payment QR code for quick digital payment."
                checked={config.showQrCode}
                onCheckedChange={(v) => onChange({ showQrCode: v })}
              />
            </CardContent>
          </Card>
        )}

        {/* ── SAVE BUTTON ──────────────────────────────────────── */}
        {onSave && (
          <Button onClick={onSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? "Saving..." : "Save Receipt Settings"}
          </Button>
        )}
      </div>

      {/* ── RIGHT: LIVE PREVIEW ──────────────────────────────────────── */}
      <div className="hidden xl:block">
        <div className="sticky top-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Eye className="h-4 w-4" />
            Live Preview
          </div>
          <ReceiptPreview
            config={config}
            storeName={storeName}
            storeAddress={storeAddress}
            storePhone={storePhone}
            storeGstin={storeGstin}
          />
          <p className="text-[10px] text-center text-muted-foreground">
            Sample data — actual receipt will use real sale info
          </p>
        </div>
      </div>
    </div>
  );
}
