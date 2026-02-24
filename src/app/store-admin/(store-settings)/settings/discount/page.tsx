"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Percent,
    ShieldAlert,
    Tag,
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
import toast from "react-hot-toast";
import { useStoreAdmin } from "../../../_context/store-admin-context";
import { useStoreStore } from "@/stores/store.store";
import type { DiscountSettings } from "@/types/store.types";

// ============================================================================
// DISCOUNT SETTINGS PAGE
// ============================================================================

export default function DiscountSettingsPage() {
    const { storeId } = useStoreAdmin();
    const { storeSettings, isSettingsLoading, fetchSettings, updateSettings } =
        useStoreStore();

    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState<DiscountSettings | null>(null);

    useEffect(() => {
        if (storeId && !storeSettings) {
            fetchSettings(storeId);
        }
    }, [storeId, storeSettings, fetchSettings]);

    useEffect(() => {
        if (storeSettings) {
            setForm(storeSettings.discount_settings);
        }
    }, [storeSettings]);

    const handleToggle = useCallback((key: keyof DiscountSettings) => {
        setForm((prev) =>
            prev ? { ...prev, [key]: !prev[key] } : prev
        );
    }, []);

    const handleNumberChange = useCallback(
        (key: keyof DiscountSettings, value: string) => {
            const num = parseFloat(value);
            if (isNaN(num)) return;
            setForm((prev) => (prev ? { ...prev, [key]: num } : prev));
        },
        []
    );

    const handleSave = useCallback(async () => {
        if (!storeId || !form) return;
        setIsSaving(true);
        try {
            const result = await updateSettings(storeId, {
                discount_settings: form,
            });
            if (result.success) {
                toast.success("Discount settings saved successfully");
            } else {
                toast.error(result.error ?? "Failed to save discount settings");
            }
        } catch {
            toast.error("Failed to save discount settings");
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

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Discount Settings
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Configure discount limits, types, and approval rules
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

            {/* Discount Limits */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Percent className="h-5 w-5" />
                        Discount Limits
                    </CardTitle>
                    <CardDescription>
                        Set maximum discount percentages and approval thresholds
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="max_discount">
                                Maximum Discount Percentage (%)
                            </Label>
                            <Input
                                id="max_discount"
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={form.max_discount_percentage}
                                onChange={(e) =>
                                    handleNumberChange(
                                        "max_discount_percentage",
                                        e.target.value
                                    )
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                The highest discount any user can apply
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="approval_above">
                                Require Approval Above (%)
                            </Label>
                            <Input
                                id="approval_above"
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={form.require_approval_above}
                                onChange={(e) =>
                                    handleNumberChange(
                                        "require_approval_above",
                                        e.target.value
                                    )
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Discounts above this % need manager approval
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Discount Types */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Discount Types
                    </CardTitle>
                    <CardDescription>
                        Choose which types of discounts are allowed
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[
                        {
                            key: "allow_item_discount" as const,
                            label: "Item-Level Discount",
                            desc: "Allow applying discounts on individual items",
                        },
                        {
                            key: "allow_invoice_discount" as const,
                            label: "Invoice-Level Discount",
                            desc: "Allow applying discount on the entire invoice total",
                        },
                        {
                            key: "discount_on_mrp" as const,
                            label: "Discount on MRP",
                            desc: "Calculate discounts based on MRP instead of selling price",
                        },
                    ].map((item) => (
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

            {/* Approval Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5" />
                        Approval Rules
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            Discounts above{" "}
                            <strong>{form.require_approval_above}%</strong> will
                            require manager/admin approval before being applied. The maximum
                            possible discount is capped at{" "}
                            <strong>{form.max_discount_percentage}%</strong>.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
