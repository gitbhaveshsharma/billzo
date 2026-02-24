"use client";

import { useCallback, useEffect, useState } from "react";
import {
    CreditCard,
    HandCoins,
    Pause,
    MessageSquare,
    Phone,
    Mail,
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
import type { SalesSettings } from "@/types/store.types";

// ============================================================================
// SALES SETTINGS PAGE
// ============================================================================

export default function SalesSettingsPage() {
    const { storeId } = useStoreAdmin();
    const { storeSettings, isSettingsLoading, fetchSettings, updateSettings } =
        useStoreStore();

    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState<SalesSettings | null>(null);

    useEffect(() => {
        if (storeId && !storeSettings) {
            fetchSettings(storeId);
        }
    }, [storeId, storeSettings, fetchSettings]);

    useEffect(() => {
        if (storeSettings) {
            setForm(storeSettings.sales_settings);
        }
    }, [storeSettings]);

    const handleToggle = useCallback((key: keyof SalesSettings) => {
        setForm((prev) =>
            prev ? { ...prev, [key]: !prev[key] } : prev
        );
    }, []);

    const handleNumberChange = useCallback(
        (key: keyof SalesSettings, value: string) => {
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
                sales_settings: form,
            });
            if (result.success) {
                toast.success("Sales settings saved successfully");
            } else {
                toast.error(result.error ?? "Failed to save sales settings");
            }
        } catch {
            toast.error("Failed to save sales settings");
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
                        Sales Settings
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Configure credit sales, hold bills, and receipt delivery options
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

            {/* Credit Sales */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Credit Sales
                    </CardTitle>
                    <CardDescription>
                        Configure credit sales limits and requirements
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-sm font-medium">Allow Credit Sales</Label>
                            <p className="text-xs text-muted-foreground">
                                Enable selling on credit to customers
                            </p>
                        </div>
                        <Switch
                            checked={form.allow_credit_sales}
                            onCheckedChange={() => handleToggle("allow_credit_sales")}
                        />
                    </div>

                    {form.allow_credit_sales && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="credit_days">Maximum Credit Days</Label>
                                    <Input
                                        id="credit_days"
                                        type="number"
                                        min={1}
                                        value={form.max_credit_days}
                                        onChange={(e) =>
                                            handleNumberChange("max_credit_days", e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="credit_amount">
                                        Maximum Credit Amount (₹)
                                    </Label>
                                    <Input
                                        id="credit_amount"
                                        type="number"
                                        min={0}
                                        value={form.max_credit_amount}
                                        onChange={(e) =>
                                            handleNumberChange("max_credit_amount", e.target.value)
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-sm font-medium">
                                        Require Customer for Credit
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Customer info must be captured for credit sales
                                    </p>
                                </div>
                                <Switch
                                    checked={form.require_customer_for_credit}
                                    onCheckedChange={() =>
                                        handleToggle("require_customer_for_credit")
                                    }
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Hold Bills & Layaway */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Pause className="h-5 w-5" />
                        Hold Bills & Layaway
                    </CardTitle>
                    <CardDescription>
                        Configure bill holding and layaway options
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <Label className="text-sm font-medium">Allow Hold Bills</Label>
                            <p className="text-xs text-muted-foreground">
                                Put bills on hold and resume later
                            </p>
                        </div>
                        <Switch
                            checked={form.allow_hold_bills}
                            onCheckedChange={() => handleToggle("allow_hold_bills")}
                        />
                    </div>

                    {form.allow_hold_bills && (
                        <div className="space-y-2 pl-4 border-l-2 border-muted">
                            <Label htmlFor="max_hold">Maximum Hold Bills</Label>
                            <Input
                                id="max_hold"
                                type="number"
                                min={1}
                                max={100}
                                value={form.max_hold_bills}
                                onChange={(e) =>
                                    handleNumberChange("max_hold_bills", e.target.value)
                                }
                                className="max-w-xs"
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                            <HandCoins className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <Label className="text-sm font-medium">Allow Layaway</Label>
                                <p className="text-xs text-muted-foreground">
                                    Allow customers to pay in installments
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={form.allow_layaway}
                            onCheckedChange={() => handleToggle("allow_layaway")}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Customer & Receipt Options */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Customer & Receipt Delivery
                    </CardTitle>
                    <CardDescription>
                        Customer requirements and receipt notification options
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <Label className="text-sm font-medium">
                                    Mandatory Customer Phone
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Require customer phone number for every sale
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={form.mandatory_customer_phone}
                            onCheckedChange={() =>
                                handleToggle("mandatory_customer_phone")
                            }
                        />
                    </div>

                    {[
                        {
                            key: "send_sms_receipt" as const,
                            label: "Send SMS Receipt",
                            desc: "Send receipt via SMS after sale",
                            icon: Phone,
                        },
                        {
                            key: "send_email_receipt" as const,
                            label: "Send Email Receipt",
                            desc: "Send receipt via email after sale",
                            icon: Mail,
                        },
                        {
                            key: "send_whatsapp_receipt" as const,
                            label: "Send WhatsApp Receipt",
                            desc: "Send receipt via WhatsApp after sale",
                            icon: MessageSquare,
                        },
                    ].map((item) => (
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
