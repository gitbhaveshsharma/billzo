"use client";

import { useCallback, useEffect, useState } from "react";
import {
    CreditCard,
    Eye,
    EyeOff,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";
import { useStoreAdmin } from "../../../_context/store-admin-context";
import { useStoreStore } from "@/stores/store.store";
import type { PaymentGateway } from "@/types/store.types";

// ============================================================================
// GATEWAY CONFIG DATA
// ============================================================================

const GATEWAYS = [
    {
        key: "razorpay" as const,
        name: "Razorpay",
        description: "India's leading payment gateway",
        fields: [
            { key: "key_id", label: "Key ID", secret: false },
            { key: "key_secret", label: "Key Secret", secret: true },
            { key: "webhook_secret", label: "Webhook Secret", secret: true },
        ],
        toggles: [
            {
                key: "auto_capture",
                label: "Auto Capture",
                desc: "Automatically capture payments",
            },
        ],
    },
    {
        key: "paytm" as const,
        name: "Paytm",
        description: "Paytm payment gateway integration",
        fields: [
            { key: "merchant_id", label: "Merchant ID", secret: false },
            { key: "merchant_key", label: "Merchant Key", secret: true },
        ],
        toggles: [],
    },
    {
        key: "phonepe" as const,
        name: "PhonePe",
        description: "PhonePe payment gateway integration",
        fields: [
            { key: "merchant_id", label: "Merchant ID", secret: false },
            { key: "salt_key", label: "Salt Key", secret: true },
            { key: "salt_index", label: "Salt Index", secret: false },
        ],
        toggles: [],
    },
    {
        key: "stripe" as const,
        name: "Stripe",
        description: "Global payment processing platform",
        fields: [
            { key: "publishable_key", label: "Publishable Key", secret: false },
            { key: "secret_key", label: "Secret Key", secret: true },
        ],
        toggles: [],
    },
] as const;

// ============================================================================
// PAYMENT GATEWAY SETTINGS PAGE
// ============================================================================

export default function PaymentGatewaySettingsPage() {
    const { storeId } = useStoreAdmin();
    const { storeSettings, isSettingsLoading, fetchSettings, updateSettings } =
        useStoreStore();

    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState<PaymentGateway | null>(null);
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (storeId && !storeSettings) {
            fetchSettings(storeId);
        }
    }, [storeId, storeSettings, fetchSettings]);

    useEffect(() => {
        if (storeSettings) {
            setForm(storeSettings.payment_gateway);
        }
    }, [storeSettings]);

    const toggleSecret = useCallback((fieldKey: string) => {
        setShowSecrets((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
    }, []);

    const handleGatewayToggle = useCallback(
        (gateway: keyof PaymentGateway) => {
            setForm((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    [gateway]: {
                        ...prev[gateway],
                        enabled: !prev[gateway].enabled,
                    },
                };
            });
        },
        []
    );

    const handleFieldChange = useCallback(
        (gateway: keyof PaymentGateway, field: string, value: string) => {
            setForm((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    [gateway]: {
                        ...prev[gateway],
                        [field]: value || null,
                    },
                };
            });
        },
        []
    );

    const handleToggleField = useCallback(
        (gateway: keyof PaymentGateway, field: string) => {
            setForm((prev) => {
                if (!prev) return prev;
                const current = prev[gateway] as Record<string, unknown>;
                return {
                    ...prev,
                    [gateway]: {
                        ...current,
                        [field]: !current[field],
                    },
                };
            });
        },
        []
    );

    const handleSave = useCallback(async () => {
        if (!storeId || !form) return;
        setIsSaving(true);
        try {
            const result = await updateSettings(storeId, {
                payment_gateway: form,
            });
            if (result.success) {
                toast.success("Payment gateway settings saved");
            } else {
                toast.error(result.error ?? "Failed to save payment settings");
            }
        } catch {
            toast.error("Failed to save payment settings");
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
                        Payment Gateway
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Configure payment gateway integrations for online payments
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

            {/* Gateway Cards */}
            {GATEWAYS.map((gw) => {
                const gatewayData = form[gw.key];
                const isEnabled = gatewayData.enabled;

                return (
                    <Card key={gw.key}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CreditCard className="h-5 w-5" />
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            {gw.name}
                                            <Badge
                                                variant={isEnabled ? "default" : "secondary"}
                                                className="text-xs"
                                            >
                                                {isEnabled ? "Enabled" : "Disabled"}
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription>{gw.description}</CardDescription>
                                    </div>
                                </div>
                                <Switch
                                    checked={isEnabled}
                                    onCheckedChange={() => handleGatewayToggle(gw.key)}
                                />
                            </div>
                        </CardHeader>

                        {isEnabled && (
                            <CardContent className="space-y-4">
                                <Separator />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {gw.fields.map((field) => {
                                        const secretKey = `${gw.key}-${field.key}`;
                                        const isSecret = field.secret;
                                        const isVisible = showSecrets[secretKey];
                                        const value =
                                            (gatewayData as Record<string, unknown>)[
                                            field.key
                                            ] as string | null;

                                        return (
                                            <div key={field.key} className="space-y-2">
                                                <Label htmlFor={secretKey}>{field.label}</Label>
                                                <div className="relative">
                                                    <Input
                                                        id={secretKey}
                                                        type={
                                                            isSecret && !isVisible ? "password" : "text"
                                                        }
                                                        value={value ?? ""}
                                                        onChange={(e) =>
                                                            handleFieldChange(
                                                                gw.key,
                                                                field.key,
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder={`Enter ${field.label}`}
                                                    />
                                                    {isSecret && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                                            onClick={() => toggleSecret(secretKey)}
                                                        >
                                                            {isVisible ? (
                                                                <EyeOff className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <Eye className="h-3.5 w-3.5" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {gw.toggles.length > 0 && (
                                    <>
                                        <Separator />
                                        {gw.toggles.map((toggle) => (
                                            <div
                                                key={toggle.key}
                                                className="flex items-center justify-between py-2"
                                            >
                                                <div>
                                                    <Label className="text-sm font-medium">
                                                        {toggle.label}
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground">
                                                        {toggle.desc}
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={
                                                        (gatewayData as Record<string, unknown>)[
                                                        toggle.key
                                                        ] as boolean
                                                    }
                                                    onCheckedChange={() =>
                                                        handleToggleField(gw.key, toggle.key)
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </>
                                )}
                            </CardContent>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}
