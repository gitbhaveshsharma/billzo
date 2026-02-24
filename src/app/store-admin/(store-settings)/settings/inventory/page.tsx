"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Package,
    BarChart3,
    ScanBarcode,
    AlertTriangle,
    Calendar,
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
import type { InventorySettings } from "@/types/store.types";

// ============================================================================
// INVENTORY SETTINGS PAGE
// ============================================================================

export default function InventorySettingsPage() {
    const { storeId } = useStoreAdmin();
    const { storeSettings, isSettingsLoading, fetchSettings, updateSettings } =
        useStoreStore();

    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState<InventorySettings | null>(null);

    useEffect(() => {
        if (storeId && !storeSettings) {
            fetchSettings(storeId);
        }
    }, [storeId, storeSettings, fetchSettings]);

    useEffect(() => {
        if (storeSettings) {
            setForm(storeSettings.inventory_settings);
        }
    }, [storeSettings]);

    const handleToggle = useCallback((key: keyof InventorySettings) => {
        setForm((prev) =>
            prev ? { ...prev, [key]: !prev[key] } : prev
        );
    }, []);

    const handleNumberChange = useCallback(
        (key: keyof InventorySettings, value: string) => {
            const num = parseInt(value);
            if (isNaN(num)) return;
            setForm((prev) => (prev ? { ...prev, [key]: num } : prev));
        },
        []
    );

    const handleStringChange = useCallback(
        (key: keyof InventorySettings, value: string) => {
            setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
        },
        []
    );

    const handleSave = useCallback(async () => {
        if (!storeId || !form) return;
        setIsSaving(true);
        try {
            const result = await updateSettings(storeId, {
                inventory_settings: form,
            });
            if (result.success) {
                toast.success("Inventory settings saved successfully");
            } else {
                toast.error(result.error ?? "Failed to save inventory settings");
            }
        } catch {
            toast.error("Failed to save inventory settings");
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
                        Inventory Settings
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Configure stock alerts, barcode generation, and tracking options
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

            {/* Stock Alerts */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Stock Alerts
                    </CardTitle>
                    <CardDescription>
                        Configure low stock notifications and thresholds
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-sm font-medium">Low Stock Alert</Label>
                            <p className="text-xs text-muted-foreground">
                                Get notified when products fall below threshold
                            </p>
                        </div>
                        <Switch
                            checked={form.low_stock_alert}
                            onCheckedChange={() => handleToggle("low_stock_alert")}
                        />
                    </div>

                    {form.low_stock_alert && (
                        <div className="space-y-2">
                            <Label htmlFor="threshold">Low Stock Threshold</Label>
                            <Input
                                id="threshold"
                                type="number"
                                min={0}
                                value={form.low_stock_threshold}
                                onChange={(e) =>
                                    handleNumberChange("low_stock_threshold", e.target.value)
                                }
                                className="max-w-xs"
                            />
                            <p className="text-xs text-muted-foreground">
                                Default minimum quantity before an alert is triggered
                            </p>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-sm font-medium">
                                Allow Negative Stock
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Allow selling items even when stock reaches zero
                            </p>
                        </div>
                        <Switch
                            checked={form.negative_stock_allowed}
                            onCheckedChange={() => handleToggle("negative_stock_allowed")}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Barcode */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ScanBarcode className="h-5 w-5" />
                        Barcode Settings
                    </CardTitle>
                    <CardDescription>
                        Auto-generate barcodes for new products
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-sm font-medium">
                                Auto Generate Barcode
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Automatically create barcodes for new products
                            </p>
                        </div>
                        <Switch
                            checked={form.auto_generate_barcode}
                            onCheckedChange={() => handleToggle("auto_generate_barcode")}
                        />
                    </div>

                    {form.auto_generate_barcode && (
                        <div className="space-y-2">
                            <Label htmlFor="barcode_prefix">Barcode Prefix</Label>
                            <Input
                                id="barcode_prefix"
                                value={form.barcode_prefix}
                                onChange={(e) =>
                                    handleStringChange(
                                        "barcode_prefix",
                                        e.target.value.toUpperCase()
                                    )
                                }
                                maxLength={20}
                                className="max-w-xs"
                                placeholder="STORE"
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tracking */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Tracking Options
                    </CardTitle>
                    <CardDescription>
                        Enable batch and expiry tracking for your inventory
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <Label className="text-sm font-medium">Batch Tracking</Label>
                                <p className="text-xs text-muted-foreground">
                                    Track inventory by batch/lot numbers
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={form.enable_batch_tracking}
                            onCheckedChange={() => handleToggle("enable_batch_tracking")}
                        />
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <Label className="text-sm font-medium">Expiry Tracking</Label>
                                <p className="text-xs text-muted-foreground">
                                    Track expiry dates and get alerts before items expire
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={form.enable_expiry_tracking}
                            onCheckedChange={() => handleToggle("enable_expiry_tracking")}
                        />
                    </div>

                    {form.enable_expiry_tracking && (
                        <div className="space-y-2 pl-7">
                            <Label htmlFor="expiry_days">Expiry Alert Days</Label>
                            <Input
                                id="expiry_days"
                                type="number"
                                min={1}
                                max={365}
                                value={form.expiry_alert_days}
                                onChange={(e) =>
                                    handleNumberChange("expiry_alert_days", e.target.value)
                                }
                                className="max-w-xs"
                            />
                            <p className="text-xs text-muted-foreground">
                                Days before expiry to trigger an alert
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
