"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Clock,
    CalendarDays,
    Plus,
    Trash2,
    Loader2,
    Save,
    Coffee,
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
import { getWeekdayLabel, formatTime12h } from "@/utils/store.utils";
import type {
    BusinessHours,
    Holiday,
    Weekday,
    DaySchedule,
    TimeBreak,
} from "@/types/store.types";
import { WEEKDAYS } from "@/types/store.types";

// ============================================================================
// BUSINESS HOURS & HOLIDAYS SETTINGS PAGE
// ============================================================================

export default function BusinessHoursSettingsPage() {
    const { storeId } = useStoreAdmin();
    const { storeSettings, isSettingsLoading, fetchSettings, updateSettings } =
        useStoreStore();

    const [isSaving, setIsSaving] = useState(false);
    const [hours, setHours] = useState<BusinessHours | null>(null);
    const [holidays, setHolidays] = useState<Holiday[]>([]);

    // New holiday form
    const [newHoliday, setNewHoliday] = useState<Holiday>({
        date: "",
        name: "",
        closed: true,
    });

    useEffect(() => {
        if (storeId && !storeSettings) {
            fetchSettings(storeId);
        }
    }, [storeId, storeSettings, fetchSettings]);

    useEffect(() => {
        if (storeSettings) {
            setHours(storeSettings.business_hours);
            setHolidays(storeSettings.holidays);
        }
    }, [storeSettings]);

    // -- Business Hours Handlers --

    const handleDayToggle = useCallback((day: Weekday) => {
        setHours((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                [day]: { ...prev[day], closed: !prev[day].closed },
            };
        });
    }, []);

    const handleTimeChange = useCallback(
        (day: Weekday, field: "open" | "close", value: string) => {
            setHours((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    [day]: { ...prev[day], [field]: value },
                };
            });
        },
        []
    );

    const handleAddBreak = useCallback((day: Weekday) => {
        setHours((prev) => {
            if (!prev) return prev;
            const breaks = [
                ...prev[day].breaks,
                { start: "13:00", end: "14:00", label: "Lunch" },
            ];
            return { ...prev, [day]: { ...prev[day], breaks } };
        });
    }, []);

    const handleRemoveBreak = useCallback(
        (day: Weekday, index: number) => {
            setHours((prev) => {
                if (!prev) return prev;
                const breaks = prev[day].breaks.filter((_, i) => i !== index);
                return { ...prev, [day]: { ...prev[day], breaks } };
            });
        },
        []
    );

    const handleBreakChange = useCallback(
        (
            day: Weekday,
            index: number,
            field: keyof TimeBreak,
            value: string
        ) => {
            setHours((prev) => {
                if (!prev) return prev;
                const breaks = prev[day].breaks.map((b, i) =>
                    i === index ? { ...b, [field]: value } : b
                );
                return { ...prev, [day]: { ...prev[day], breaks } };
            });
        },
        []
    );

    // -- Holiday Handlers --

    const handleAddHoliday = useCallback(() => {
        if (!newHoliday.date || !newHoliday.name) {
            toast.error("Please fill in date and name");
            return;
        }
        setHolidays((prev) => [...prev, { ...newHoliday }]);
        setNewHoliday({ date: "", name: "", closed: true });
    }, [newHoliday]);

    const handleRemoveHoliday = useCallback((index: number) => {
        setHolidays((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // -- Save --

    const handleSave = useCallback(async () => {
        if (!storeId || !hours) return;
        setIsSaving(true);
        try {
            const result = await updateSettings(storeId, {
                business_hours: hours,
                holidays,
            });
            if (result.success) {
                toast.success("Business hours saved successfully");
            } else {
                toast.error(result.error ?? "Failed to save business hours");
            }
        } catch {
            toast.error("Failed to save business hours");
        } finally {
            setIsSaving(false);
        }
    }, [storeId, hours, holidays, updateSettings]);

    if (isSettingsLoading || !hours) {
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
                        Business Hours & Holidays
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Set your store&apos;s operating hours and holiday calendar
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

            {/* Business Hours */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Weekly Schedule
                    </CardTitle>
                    <CardDescription>
                        Set opening and closing times for each day of the week
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {WEEKDAYS.map((day) => {
                        const schedule: DaySchedule = hours[day];
                        return (
                            <div key={day}>
                                <div className="flex items-center gap-4 py-3">
                                    <div className="w-28 flex items-center gap-2">
                                        <Switch
                                            checked={!schedule.closed}
                                            onCheckedChange={() => handleDayToggle(day)}
                                        />
                                        <Label className="text-sm font-medium">
                                            {getWeekdayLabel(day)}
                                        </Label>
                                    </div>

                                    {schedule.closed ? (
                                        <Badge variant="secondary">Closed</Badge>
                                    ) : (
                                        <div className="flex items-center gap-2 flex-1">
                                            <Input
                                                type="time"
                                                value={schedule.open}
                                                onChange={(e) =>
                                                    handleTimeChange(day, "open", e.target.value)
                                                }
                                                className="w-32"
                                            />
                                            <span className="text-muted-foreground text-sm">to</span>
                                            <Input
                                                type="time"
                                                value={schedule.close}
                                                onChange={(e) =>
                                                    handleTimeChange(day, "close", e.target.value)
                                                }
                                                className="w-32"
                                            />
                                            <span className="text-xs text-muted-foreground ml-2">
                                                {formatTime12h(schedule.open)} –{" "}
                                                {formatTime12h(schedule.close)}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleAddBreak(day)}
                                                className="ml-auto"
                                            >
                                                <Coffee className="h-3 w-3 mr-1" />
                                                Add Break
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Breaks */}
                                {!schedule.closed && schedule.breaks.length > 0 && (
                                    <div className="ml-28 space-y-2 mb-3">
                                        {schedule.breaks.map((brk, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-2 pl-4 border-l-2 border-muted"
                                            >
                                                <Input
                                                    value={brk.label ?? ""}
                                                    onChange={(e) =>
                                                        handleBreakChange(
                                                            day,
                                                            idx,
                                                            "label",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Break label"
                                                    className="w-28 h-8 text-xs"
                                                />
                                                <Input
                                                    type="time"
                                                    value={brk.start}
                                                    onChange={(e) =>
                                                        handleBreakChange(
                                                            day,
                                                            idx,
                                                            "start",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-28 h-8 text-xs"
                                                />
                                                <span className="text-xs text-muted-foreground">
                                                    to
                                                </span>
                                                <Input
                                                    type="time"
                                                    value={brk.end}
                                                    onChange={(e) =>
                                                        handleBreakChange(
                                                            day,
                                                            idx,
                                                            "end",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-28 h-8 text-xs"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => handleRemoveBreak(day, idx)}
                                                >
                                                    <Trash2 className="h-3 w-3 text-destructive" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {day !== "sunday" && <Separator />}
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Holiday Calendar */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5" />
                        Holiday Calendar
                    </CardTitle>
                    <CardDescription>
                        Add holidays when your store will be closed or have special hours
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add Holiday Form */}
                    <div className="flex items-end gap-3 p-4 border rounded-lg bg-muted/30">
                        <div className="space-y-1">
                            <Label className="text-xs">Date</Label>
                            <Input
                                type="date"
                                value={newHoliday.date}
                                onChange={(e) =>
                                    setNewHoliday((prev) => ({
                                        ...prev,
                                        date: e.target.value,
                                    }))
                                }
                                className="w-40"
                            />
                        </div>
                        <div className="space-y-1 flex-1">
                            <Label className="text-xs">Holiday Name</Label>
                            <Input
                                value={newHoliday.name}
                                onChange={(e) =>
                                    setNewHoliday((prev) => ({
                                        ...prev,
                                        name: e.target.value,
                                    }))
                                }
                                placeholder="e.g. Republic Day"
                            />
                        </div>
                        <div className="flex items-center gap-2 pb-1">
                            <Switch
                                checked={newHoliday.closed}
                                onCheckedChange={(val) =>
                                    setNewHoliday((prev) => ({ ...prev, closed: val }))
                                }
                            />
                            <Label className="text-xs whitespace-nowrap">Full Day Off</Label>
                        </div>
                        <Button type="button" size="sm" onClick={handleAddHoliday}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                        </Button>
                    </div>

                    {/* Holiday List */}
                    {holidays.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No holidays added yet
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {holidays
                                .sort(
                                    (a, b) =>
                                        new Date(a.date).getTime() - new Date(b.date).getTime()
                                )
                                .map((h, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between py-2 px-3 border rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Badge
                                                variant={h.closed ? "destructive" : "secondary"}
                                                className="text-xs"
                                            >
                                                {h.closed ? "Closed" : "Special Hours"}
                                            </Badge>
                                            <span className="text-sm font-medium">{h.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">
                                                {new Date(h.date).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => handleRemoveHoliday(idx)}
                                            >
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
