"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Bell,
    Package,
    Calendar,
    BarChart3,
    CreditCard,
    ShoppingCart,
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
import type { NotificationSettings } from "@/types/store.types";

// ============================================================================
// NOTIFICATION SETTINGS PAGE
// ============================================================================

export default function NotificationSettingsPage() {
    const { storeId } = useStoreAdmin();
    const { storeSettings, isSettingsLoading, fetchSettings, updateSettings } =
        useStoreStore();

    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState<NotificationSettings | null>(null);

    useEffect(() => {
        if (storeId && !storeSettings) {
            fetchSettings(storeId);
        }
    }, [storeId, storeSettings, fetchSettings]);

    useEffect(() => {
        if (storeSettings) {
            setForm(storeSettings.notification_settings);
        }
    }, [storeSettings]);

    const handleToggle = useCallback((key: keyof NotificationSettings) => {
        setForm((prev) =>
            prev ? { ...prev, [key]: !prev[key] } : prev
        );
    }, []);

    const handleSave = useCallback(async () => {
        if (!storeId || !form) return;
        setIsSaving(true);
        try {
            const result = await updateSettings(storeId, {
                notification_settings: form,
            });
            if (result.success) {
                toast.success("Notification settings saved");
            } else {
                toast.error(result.error ?? "Failed to save notification settings");
            }
        } catch {
            toast.error("Failed to save notification settings");
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

    const NOTIFICATION_TOGGLES = [
        {
            key: "low_stock_alert" as const,
            label: "Low Stock Alert",
            desc: "Get notified when product stock falls below threshold",
            icon: Package,
        },
        {
            key: "expiry_alert" as const,
            label: "Expiry Alert",
            desc: "Get notified when products are nearing expiry",
            icon: Calendar,
        },
        {
            key: "daily_sales_report" as const,
            label: "Daily Sales Report",
            desc: "Receive a daily summary of sales activity",
            icon: BarChart3,
        },
        {
            key: "weekly_sales_report" as const,
            label: "Weekly Sales Report",
            desc: "Receive a weekly summary of sales activity",
            icon: BarChart3,
        },
        {
            key: "payment_received" as const,
            label: "Payment Received",
            desc: "Get notified when a payment is received",
            icon: CreditCard,
        },
        {
            key: "new_order" as const,
            label: "New Order",
            desc: "Get notified for new orders (online/delivery)",
            icon: ShoppingCart,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Notification Settings
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Choose which notifications you want to receive
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

            {/* Notification Toggles */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Notifications
                    </CardTitle>
                    <CardDescription>
                        Enable or disable notifications for different events
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {NOTIFICATION_TOGGLES.map((item) => (
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
