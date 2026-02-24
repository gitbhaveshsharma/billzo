"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Receipt,
    IndianRupee,
    Calculator,
    Shield,
    FileText,
    Percent,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";
import { useStoreAdmin } from "../../../_context/store-admin-context";
import { useStoreStore } from "@/stores/store.store";
import { getGstMethodLabel } from "@/utils/store.utils";
import type { TaxSettings } from "@/types/store.types";
import type { GstCalculationMethod } from "@/types/database.types";

// ============================================================================
// TAX & GST SETTINGS PAGE
// ============================================================================

export default function TaxSettingsPage() {
    const { storeId } = useStoreAdmin();
    const { storeSettings, isSettingsLoading, fetchSettings, updateSettings } =
        useStoreStore();

    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState<TaxSettings | null>(null);
    const [gstMethod, setGstMethod] = useState<GstCalculationMethod>("inclusive");

    // Fetch settings on mount
    useEffect(() => {
        if (storeId && !storeSettings) {
            fetchSettings(storeId);
        }
    }, [storeId, storeSettings, fetchSettings]);

    // Populate form when settings load
    useEffect(() => {
        if (storeSettings) {
            setForm(storeSettings.tax_settings);
            setGstMethod(storeSettings.gst_calculation_method);
        }
    }, [storeSettings]);

    const handleToggle = useCallback(
        (key: keyof TaxSettings) => {
            if (!form) return;
            setForm((prev) =>
                prev ? { ...prev, [key]: !prev[key] } : prev
            );
        },
        [form]
    );

    const handleRateChange = useCallback(
        (key: keyof TaxSettings, value: string) => {
            if (!form) return;
            const num = parseFloat(value);
            if (isNaN(num)) return;
            setForm((prev) => (prev ? { ...prev, [key]: num } : prev));
        },
        [form]
    );

    const handleSave = useCallback(async () => {
        if (!storeId || !form) return;
        setIsSaving(true);
        try {
            const result = await updateSettings(storeId, {
                tax_settings: form,
                gst_calculation_method: gstMethod,
            });
            if (result.success) {
                toast.success("Tax settings saved successfully");
            } else {
                toast.error(result.error ?? "Failed to save tax settings");
            }
        } catch {
            toast.error("Failed to save tax settings");
        } finally {
            setIsSaving(false);
        }
    }, [storeId, form, gstMethod, updateSettings]);

    if (isSettingsLoading || !form) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Tax & GST Settings
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Configure GST rates, calculation method, and compliance options
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

            {/* GST Rates */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IndianRupee className="h-5 w-5" />
                        GST Rates
                    </CardTitle>
                    <CardDescription>
                        Configure default GST rates for your store
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-sm font-medium">Enable GST</Label>
                            <p className="text-xs text-muted-foreground">
                                Enable GST calculations for all transactions
                            </p>
                        </div>
                        <Switch
                            checked={form.gst_enabled}
                            onCheckedChange={() => handleToggle("gst_enabled")}
                        />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="cgst">CGST Rate (%)</Label>
                            <Input
                                id="cgst"
                                type="number"
                                step="0.5"
                                min={0}
                                max={100}
                                value={form.cgst_rate}
                                onChange={(e) => handleRateChange("cgst_rate", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sgst">SGST Rate (%)</Label>
                            <Input
                                id="sgst"
                                type="number"
                                step="0.5"
                                min={0}
                                max={100}
                                value={form.sgst_rate}
                                onChange={(e) => handleRateChange("sgst_rate", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="igst">IGST Rate (%)</Label>
                            <Input
                                id="igst"
                                type="number"
                                step="0.5"
                                min={0}
                                max={100}
                                value={form.igst_rate}
                                onChange={(e) => handleRateChange("igst_rate", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cess">Cess Rate (%)</Label>
                            <Input
                                id="cess"
                                type="number"
                                step="0.5"
                                min={0}
                                max={100}
                                value={form.cess_rate}
                                onChange={(e) => handleRateChange("cess_rate", e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* GST Calculation Method */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Calculation Method
                    </CardTitle>
                    <CardDescription>
                        How GST is calculated on your product prices
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label>GST Calculation Method</Label>
                        <Select
                            value={gstMethod}
                            onValueChange={(v) =>
                                setGstMethod(v as GstCalculationMethod)
                            }
                        >
                            <SelectTrigger className="w-full max-w-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(["inclusive", "exclusive"] as const).map((m) => (
                                    <SelectItem key={m} value={m}>
                                        {getGstMethodLabel(m)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {gstMethod === "inclusive"
                                ? "Product prices already include GST. Tax amount will be back-calculated."
                                : "GST will be added on top of product prices at billing."}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Compliance Options */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Compliance & Advanced
                    </CardTitle>
                    <CardDescription>
                        HSN codes, composition scheme, and other compliance settings
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {([
                        {
                            key: "hsn_required" as const,
                            label: "Require HSN Code",
                            desc: "Mandate HSN/SAC codes on all products",
                            icon: FileText,
                        },
                        {
                            key: "gst_composition_scheme" as const,
                            label: "Composition Scheme",
                            desc: "Enable if registered under GST Composition Scheme",
                            icon: Receipt,
                        },
                        {
                            key: "reverse_charge_applicable" as const,
                            label: "Reverse Charge",
                            desc: "Enable reverse charge mechanism for applicable transactions",
                            icon: Percent,
                        },
                        {
                            key: "tcs_applicable" as const,
                            label: "TCS Applicable",
                            desc: "Tax Collected at Source for e-commerce operators",
                            icon: IndianRupee,
                        },
                        {
                            key: "tds_applicable" as const,
                            label: "TDS Applicable",
                            desc: "Tax Deducted at Source for specified transactions",
                            icon: IndianRupee,
                        },
                    ]).map((item) => (
                        <div
                            key={item.key}
                            className="flex items-center justify-between py-2"
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <Label className="text-sm font-medium">{item.label}</Label>
                                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                                </div>
                            </div>
                            <Switch
                                checked={form[item.key] as boolean}
                                onCheckedChange={() => handleToggle(item.key)}
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
