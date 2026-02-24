"use client";

import { useCallback, useEffect, useState } from "react";
import {
    IndianRupee,
    Globe,
    Hash,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { useStoreAdmin } from "../../../_context/store-admin-context";
import { useStoreStore } from "@/stores/store.store";
import {
    getCurrencyPositionLabel,
    formatCurrency,
} from "@/utils/store.utils";
import type { CurrencySettings, CurrencyPosition } from "@/types/store.types";
import { CURRENCY_POSITIONS } from "@/types/store.types";

// ============================================================================
// COMMON CURRENCIES
// ============================================================================
const CURRENCIES = [
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
] as const;

// ============================================================================
// CURRENCY SETTINGS PAGE
// ============================================================================

export default function CurrencySettingsPage() {
    const { storeId } = useStoreAdmin();
    const { storeSettings, isSettingsLoading, fetchSettings, updateSettings } =
        useStoreStore();

    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState<CurrencySettings | null>(null);

    useEffect(() => {
        if (storeId && !storeSettings) {
            fetchSettings(storeId);
        }
    }, [storeId, storeSettings, fetchSettings]);

    useEffect(() => {
        if (storeSettings) {
            setForm({
                currency_code: storeSettings.currency_code,
                currency_symbol: storeSettings.currency_symbol,
                currency_position: storeSettings.currency_position as CurrencyPosition,
                thousand_separator: storeSettings.thousand_separator,
                decimal_separator: storeSettings.decimal_separator,
                decimal_places: storeSettings.decimal_places,
            });
        }
    }, [storeSettings]);

    const handleChange = useCallback(
        <K extends keyof CurrencySettings>(key: K, value: CurrencySettings[K]) => {
            setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
        },
        []
    );

    const handleCurrencySelect = useCallback(
        (code: string) => {
            const currency = CURRENCIES.find((c) => c.code === code);
            if (!currency) return;
            setForm((prev) =>
                prev
                    ? {
                        ...prev,
                        currency_code: currency.code,
                        currency_symbol: currency.symbol,
                    }
                    : prev
            );
        },
        []
    );

    const handleSave = useCallback(async () => {
        if (!storeId || !form) return;
        setIsSaving(true);
        try {
            const result = await updateSettings(storeId, {
                currency_code: form.currency_code,
                currency_symbol: form.currency_symbol,
                currency_position: form.currency_position,
                thousand_separator: form.thousand_separator,
                decimal_separator: form.decimal_separator,
                decimal_places: form.decimal_places,
            });
            if (result.success) {
                toast.success("Currency settings saved successfully");
            } else {
                toast.error(result.error ?? "Failed to save currency settings");
            }
        } catch {
            toast.error("Failed to save currency settings");
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

    const previewAmount = formatCurrency(123456.78, form);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Currency & Formatting
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Configure currency display, separators, and decimal settings
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

            {/* Currency Selection */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Currency
                    </CardTitle>
                    <CardDescription>
                        Select your store&apos;s primary currency
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <Select
                                value={form.currency_code}
                                onValueChange={handleCurrencySelect}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CURRENCIES.map((c) => (
                                        <SelectItem key={c.code} value={c.code}>
                                            {c.symbol} {c.name} ({c.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="symbol">Symbol</Label>
                            <Input
                                id="symbol"
                                value={form.currency_symbol}
                                onChange={(e) =>
                                    handleChange("currency_symbol", e.target.value)
                                }
                                maxLength={5}
                                className="w-20"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Symbol Position</Label>
                        <Select
                            value={form.currency_position}
                            onValueChange={(v) =>
                                handleChange("currency_position", v as CurrencyPosition)
                            }
                        >
                            <SelectTrigger className="max-w-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CURRENCY_POSITIONS.map((pos) => (
                                    <SelectItem key={pos} value={pos}>
                                        {getCurrencyPositionLabel(pos)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Number Formatting */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Hash className="h-5 w-5" />
                        Number Formatting
                    </CardTitle>
                    <CardDescription>
                        Configure how numbers and amounts are displayed
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="thousand_sep">Thousand Separator</Label>
                            <Input
                                id="thousand_sep"
                                value={form.thousand_separator}
                                onChange={(e) =>
                                    handleChange("thousand_separator", e.target.value)
                                }
                                maxLength={1}
                                className="w-16"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="decimal_sep">Decimal Separator</Label>
                            <Input
                                id="decimal_sep"
                                value={form.decimal_separator}
                                onChange={(e) =>
                                    handleChange("decimal_separator", e.target.value)
                                }
                                maxLength={1}
                                className="w-16"
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
                                        parseInt(e.target.value) || 0
                                    )
                                }
                                className="w-20"
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                        <IndianRupee className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Preview:</p>
                            <Badge variant="secondary" className="text-lg font-mono">
                                {previewAmount}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
