"use client";

import { useCallback, useEffect, useState } from "react";
import {
    HardDrive,
    Cloud,
    Clock,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";
import { useStoreAdmin } from "../../../_context/store-admin-context";
import { useStoreStore } from "@/stores/store.store";
import { getBackupFrequencyLabel, formatTime12h } from "@/utils/store.utils";
import type { BackupSettings, BackupFrequency } from "@/types/store.types";
import { BACKUP_FREQUENCIES } from "@/types/store.types";

// ============================================================================
// BACKUP SETTINGS PAGE
// ============================================================================

export default function BackupSettingsPage() {
    const { storeId } = useStoreAdmin();
    const { storeSettings, isSettingsLoading, fetchSettings, updateSettings } =
        useStoreStore();

    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState<BackupSettings | null>(null);

    useEffect(() => {
        if (storeId && !storeSettings) {
            fetchSettings(storeId);
        }
    }, [storeId, storeSettings, fetchSettings]);

    useEffect(() => {
        if (storeSettings) {
            setForm(storeSettings.backup_settings);
        }
    }, [storeSettings]);

    const handleToggle = useCallback((key: keyof BackupSettings) => {
        setForm((prev) =>
            prev ? { ...prev, [key]: !prev[key] } : prev
        );
    }, []);

    const handleSave = useCallback(async () => {
        if (!storeId || !form) return;
        setIsSaving(true);
        try {
            const result = await updateSettings(storeId, {
                backup_settings: form,
            });
            if (result.success) {
                toast.success("Backup settings saved successfully");
            } else {
                toast.error(result.error ?? "Failed to save backup settings");
            }
        } catch {
            toast.error("Failed to save backup settings");
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
                        Backup Settings
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Configure automatic backups and data retention
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

            {/* Auto Backup */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HardDrive className="h-5 w-5" />
                        Automatic Backup
                    </CardTitle>
                    <CardDescription>
                        Schedule automatic backups for your store data
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-sm font-medium">
                                Enable Auto Backup
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Automatically back up your store data on a schedule
                            </p>
                        </div>
                        <Switch
                            checked={form.auto_backup_enabled}
                            onCheckedChange={() => handleToggle("auto_backup_enabled")}
                        />
                    </div>

                    {form.auto_backup_enabled && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Frequency
                                    </Label>
                                    <Select
                                        value={form.backup_frequency}
                                        onValueChange={(v) =>
                                            setForm((prev) =>
                                                prev
                                                    ? {
                                                        ...prev,
                                                        backup_frequency: v as BackupFrequency,
                                                    }
                                                    : prev
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {BACKUP_FREQUENCIES.map((freq) => (
                                                <SelectItem key={freq} value={freq}>
                                                    {getBackupFrequencyLabel(freq)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="backup_time"
                                        className="flex items-center gap-1"
                                    >
                                        <Clock className="h-3.5 w-3.5" />
                                        Backup Time
                                    </Label>
                                    <Input
                                        id="backup_time"
                                        type="time"
                                        value={form.backup_time}
                                        onChange={(e) =>
                                            setForm((prev) =>
                                                prev
                                                    ? { ...prev, backup_time: e.target.value }
                                                    : prev
                                            )
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {formatTime12h(form.backup_time)}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="retention">Retention (days)</Label>
                                    <Input
                                        id="retention"
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={form.retention_days}
                                        onChange={(e) =>
                                            setForm((prev) =>
                                                prev
                                                    ? {
                                                        ...prev,
                                                        retention_days:
                                                            parseInt(e.target.value) || 30,
                                                    }
                                                    : prev
                                            )
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Older backups will be automatically deleted
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Cloud Backup */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cloud className="h-5 w-5" />
                        Cloud Backup
                    </CardTitle>
                    <CardDescription>
                        Store backups in the cloud for extra safety
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-sm font-medium">
                                Enable Cloud Backup
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Upload backups to secure cloud storage in addition to local
                                storage
                            </p>
                        </div>
                        <Switch
                            checked={form.cloud_backup}
                            onCheckedChange={() => handleToggle("cloud_backup")}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
