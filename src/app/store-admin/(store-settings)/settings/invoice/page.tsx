"use client";

import { useCallback, useEffect, useState } from "react";
import {
    FileText,
    Hash,
    Type,
    Eye,
    Receipt,
    PenLine,
    Loader2,
    Save,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { useStoreAdmin } from "../../../_context/store-admin-context";
import { useStoreStore } from "@/stores/store.store";
import { previewInvoiceNumber } from "@/utils/store.utils";
import type { InvoiceSettings } from "@/types/store.types";

// ============================================================================
// INVOICE SETTINGS PAGE
// ============================================================================

export default function InvoiceSettingsPage() {
    const { storeId } = useStoreAdmin();
    const { storeSettings, isSettingsLoading, fetchSettings, updateSettings } =
        useStoreStore();

    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState<InvoiceSettings | null>(null);

    useEffect(() => {
        if (storeId && !storeSettings) {
            fetchSettings(storeId);
        }
    }, [storeId, storeSettings, fetchSettings]);

    useEffect(() => {
        if (storeSettings) {
            setForm(storeSettings.invoice_settings);
        }
    }, [storeSettings]);

    const handleChange = useCallback(
        <K extends keyof InvoiceSettings>(key: K, value: InvoiceSettings[K]) => {
            setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
        },
        []
    );

    const handleToggle = useCallback((key: keyof InvoiceSettings) => {
        setForm((prev) =>
            prev ? { ...prev, [key]: !prev[key] } : prev
        );
    }, []);

    const handleSave = useCallback(async () => {
        if (!storeId || !form) return;
        setIsSaving(true);
        try {
            const result = await updateSettings(storeId, {
                invoice_settings: form,
            });
            if (result.success) {
                toast.success("Invoice settings saved successfully");
            } else {
                toast.error(result.error ?? "Failed to save invoice settings");
            }
        } catch {
            toast.error("Failed to save invoice settings");
        } finally {
            setIsSaving(false);
        }
    }, [storeId, form, updateSettings]);

    if (isSettingsLoading || !form) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const previewNumber = previewInvoiceNumber(
        form.number_format,
        form.starting_number
    );

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Invoice Settings
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Configure invoice numbering, format, and display options
                    </p>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                </Button>
            </div>

            {/* Numbering */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Hash className="h-5 w-5" />
                        Invoice Numbering
                    </CardTitle>
                    <CardDescription>
                        Set prefix, starting number, and format
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="prefix">Prefix</Label>
                            <Input
                                id="prefix"
                                value={form.prefix}
                                onChange={(e) =>
                                    handleChange("prefix", e.target.value.toUpperCase())
                                }
                                maxLength={10}
                                placeholder="INV"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="starting_number">Starting Number</Label>
                            <Input
                                id="starting_number"
                                type="number"
                                min={1}
                                value={form.starting_number}
                                onChange={(e) =>
                                    handleChange("starting_number", parseInt(e.target.value) || 1)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="number_format">Number Format</Label>
                            <Input
                                id="number_format"
                                value={form.number_format}
                                onChange={(e) => handleChange("number_format", e.target.value)}
                                placeholder="INV-{YYYY}-{####}"
                            />
                            <p className="text-xs text-muted-foreground">
                                Use {"{YYYY}"} for year, {"{MM}"} for month, {"{####}"} for
                                number
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <Type className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Preview:</span>
                        <Badge variant="secondary" className="font-mono">
                            {previewNumber}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Display Options */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Display Options
                    </CardTitle>
                    <CardDescription>
                        Choose which fields to show on invoices
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {([
                        {
                            key: "show_gst" as const,
                            label: "Show GST",
                            desc: "Display GST breakdown on invoices",
                        },
                        {
                            key: "show_hsn" as const,
                            label: "Show HSN/SAC",
                            desc: "Display HSN/SAC codes for products",
                        },
                        {
                            key: "show_cgst_sgst" as const,
                            label: "Show CGST & SGST",
                            desc: "Split GST into CGST and SGST columns",
                        },
                        {
                            key: "show_igst" as const,
                            label: "Show IGST",
                            desc: "Show IGST column for inter-state transactions",
                        },
                        {
                            key: "show_cess" as const,
                            label: "Show Cess",
                            desc: "Display cess amount on invoices",
                        },
                        {
                            key: "show_discount" as const,
                            label: "Show Discount",
                            desc: "Display discount column on invoices",
                        },
                        {
                            key: "show_delivery_charges" as const,
                            label: "Show Delivery Charges",
                            desc: "Display delivery charges as a separate line",
                        },
                    ]).map((item) => (
                        <div
                            key={item.key}
                            className="flex items-center justify-between py-2"
                        >
                            <div>
                                <Label className="text-sm font-medium">{item.label}</Label>
                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                            </div>
                            <Switch
                                checked={form[item.key] as boolean}
                                onCheckedChange={() => handleToggle(item.key)}
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Formatting */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Formatting & Copies
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="copy_count">Number of Copies</Label>
                            <Input
                                id="copy_count"
                                type="number"
                                min={1}
                                max={5}
                                value={form.invoice_copy_count}
                                onChange={(e) =>
                                    handleChange(
                                        "invoice_copy_count",
                                        parseInt(e.target.value) || 1
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="decimal_places">Decimal Places</Label>
                            <Input
                                id="decimal_places"
                                type="number"
                                min={0}
                                max={4}
                                value={form.decimal_places}
                                onChange={(e) =>
                                    handleChange(
                                        "decimal_places",
                                        parseInt(e.target.value) || 2
                                    )
                                }
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-sm font-medium">Round Off Total</Label>
                            <p className="text-xs text-muted-foreground">
                                Round the invoice total to nearest rupee
                            </p>
                        </div>
                        <Switch
                            checked={form.round_off}
                            onCheckedChange={() => handleToggle("round_off")}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Terms & Footer */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Terms & Footer
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="terms">Terms & Conditions</Label>
                        <Textarea
                            id="terms"
                            value={form.terms}
                            onChange={(e) => handleChange("terms", e.target.value)}
                            rows={3}
                            maxLength={500}
                            placeholder="Goods once sold will not be taken back or exchanged."
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {form.terms.length}/500
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="footer">Footer Text</Label>
                        <Textarea
                            id="footer"
                            value={form.footer}
                            onChange={(e) => handleChange("footer", e.target.value)}
                            rows={2}
                            maxLength={200}
                            placeholder="Thank you for your business!"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {form.footer.length}/200
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Digital Signature */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PenLine className="h-5 w-5" />
                        Digital Signature
                    </CardTitle>
                    <CardDescription>
                        Add a digital signature to your invoices
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-sm font-medium">
                                Enable Digital Signature
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Add an authorized signature to printed invoices
                            </p>
                        </div>
                        <Switch
                            checked={form.enable_digital_signature}
                            onCheckedChange={() =>
                                handleToggle("enable_digital_signature")
                            }
                        />
                    </div>

                    {form.enable_digital_signature && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <Label htmlFor="signatory_name">
                                    Authorized Signatory Name
                                </Label>
                                <Input
                                    id="signatory_name"
                                    value={form.authorized_signatory_name ?? ""}
                                    onChange={(e) =>
                                        handleChange(
                                            "authorized_signatory_name",
                                            e.target.value || null
                                        )
                                    }
                                    placeholder="e.g. Rajesh Kumar"
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
