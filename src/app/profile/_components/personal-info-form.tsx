"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Loader2, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { profileService } from "@/services/profile.service";
import { personalInfoSchema, type PersonalInfoFormData } from "@/validations/profile.validation";
import type { Profile } from "@/types/profile.types";

// ============================================================================
// Types
// ============================================================================

interface PersonalInfoFormProps {
  userId: string;
  profile: Profile | null;
  onSaved: (updated: Profile) => void;
}

// ============================================================================
// Component
// ============================================================================

export function PersonalInfoForm({ userId, profile, onSaved }: PersonalInfoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema) as any,
  });

  // Pre-populate from profile
  useEffect(() => {
    reset({
      full_name: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
      alternate_phone: profile?.alternate_phone ?? "",
      date_of_birth: profile?.date_of_birth ?? "",
      gender: (profile?.gender as PersonalInfoFormData["gender"]) ?? undefined,
      timezone: profile?.timezone ?? "",
      language: profile?.language ?? "",
    });
  }, [profile, reset]);

  const onSubmit = async (values: PersonalInfoFormData) => {
    setIsSubmitting(true);
    try {
      const { data, error } = await profileService.update(userId, {
        full_name: values.full_name,
        phone: values.phone || null,
        alternate_phone: values.alternate_phone || null,
        date_of_birth: values.date_of_birth || null,
        gender: values.gender ?? null,
        timezone: values.timezone || undefined,
        language: values.language || undefined,
      });

      if (error || !data) {
        toast.error(error ?? "Failed to update profile");
        return;
      }

      onSaved(data);
      toast.success("Profile updated successfully");
      reset(values); // Reset dirty state after save
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
          <CardDescription>Your name and contact details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Full Name */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="full_name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="full_name"
              placeholder="Your full name"
              {...register("full_name")}
            />
            {errors.full_name && (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+919876543210"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          {/* Alternate Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="alternate_phone">Alternate Phone</Label>
            <Input
              id="alternate_phone"
              type="tel"
              placeholder="+919876543210"
              {...register("alternate_phone")}
            />
            {errors.alternate_phone && (
              <p className="text-xs text-destructive">{errors.alternate_phone.message}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input
              id="date_of_birth"
              type="date"
              {...register("date_of_birth")}
            />
            {errors.date_of_birth && (
              <p className="text-xs text-destructive">{errors.date_of_birth.message}</p>
            )}
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <Label htmlFor="gender">Gender</Label>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) =>
                    field.onChange(v === "" ? undefined : v)
                  }
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">
                      Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
          <CardDescription>Timezone and language settings.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Timezone */}
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              placeholder="Asia/Kolkata"
              {...register("timezone")}
            />
          </div>

          {/* Language */}
          <div className="space-y-1.5">
            <Label htmlFor="language">Language</Label>
            <Input
              id="language"
              placeholder="en"
              {...register("language")}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
