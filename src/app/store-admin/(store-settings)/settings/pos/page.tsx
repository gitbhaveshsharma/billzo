"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Monitor,
    ScanBarcode,
    Volume2,
    Keyboard,
    Wifi,
    Image,
    Scale,
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";
import { useStoreAdmin } from "../../../_context/store-admin-context";
import { useStoreStore } from "@/stores/store.store";
import type { PosSettings } from "@/types/store.types";

// ============================================================================
// POS TERMINAL SETTINGS PAGE
// ============================================================================

export default function PosSettingsPage() {
    const { storeId } = useStoreAdmin();
    const { storeSettings, isSettingsLoading, fetchSettings, updateSettings } =
        useStoreStore();

    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState<PosSettings | null>(null);

    useEffect(() => {
        if (storeId && !storeSettings) {
            fetchSettings(storeId);
        }
    }, [storeId, storeSettings, fetchSettings]);

    useEffect(() => {
        if (storeSettings) {
            setForm(storeSettings.pos_settings);
        }
    }, [storeSettings]);

    const handleToggle = useCallback((key: keyof PosSettings) => {
        setForm((prev) =>
            prev ? { ...prev, [key]: !prev[key] } : prev
        );
    }, []);

    const handleSave = useCallback(async () => {
        if (!storeId || !form) return;
        setIsSaving(true);
        try {
            const result = await updateSettings(storeId, {
                pos_settings: form,
            });
            if (result.success) {
                toast.success("POS settings saved successfully");
            } else {
                toast.error(result.error ?? "Failed to save POS settings");
            }
        } catch {
            toast.error("Failed to save POS settings");
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

    const POS_TOGGLES = [
        {
            key: "offline_mode_enabled" as const,
            label: "Offline Mode",
            desc: "Continue billing even without internet connection",
            icon: Wifi,
        },
        {
            key: "quick_billing_mode" as const,
            label: "Quick Billing Mode",
            desc: "Simplified POS interface for faster checkout",
            icon: Monitor,
        },
        {
            key: "show_product_images" as const,
            label: "Show Product Images",
            desc: "Display product thumbnails in the POS grid",
            icon: Image,
        },
        {
            key: "barcode_scanner_enabled" as const,
            label: "Barcode Scanner",
            desc: "Enable barcode scanner input for adding products",
            icon: ScanBarcode,
        },
        {
            key: "weighing_scale_enabled" as const,
            label: "Weighing Scale",
            desc: "Connect a weighing scale for weight-based products",
            icon: Scale,
        },
        {
            key: "cash_drawer_enabled" as const,
            label: "Cash Drawer",
            desc: "Automatically open cash drawer after payment",
            icon: Monitor,
        },
        {
            key: "customer_display_enabled" as const,
            label: "Customer Display",
            desc: "Show transaction details on customer-facing display",
            icon: Monitor,
        },
        {
            key: "sound_on_scan" as const,
            label: "Sound on Scan",
            desc: "Play a beep sound when a barcode is scanned",
            icon: Volume2,
        },
        {
            key: "shortcut_keys_enabled" as const,
            label: "Shortcut Keys",
            desc: "Enable keyboard shortcuts for faster operations",
            icon: Keyboard,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        POS Terminal Settings
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Configure point-of-sale behavior, hardware, and shortcuts
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

            {/* POS Options */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Monitor className="h-5 w-5" />
                        POS Configuration
                    </CardTitle>
                    <CardDescription>
                        Toggle features for the point-of-sale terminal
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {POS_TOGGLES.map((item) => (
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
