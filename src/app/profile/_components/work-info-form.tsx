"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { storeUsersService } from "@/services/store-users.service";
import { workInfoSchema, type WorkInfoFormData } from "@/validations/profile.validation";
import type { EnrichedStoreUser } from "@/types/store-users.types";

// ============================================================================
// Types
// ============================================================================

interface WorkInfoFormProps {
  employeeId: string;
  storeUser: EnrichedStoreUser;
  onSaved: (updated: EnrichedStoreUser) => void;
}

// ============================================================================
// Component
// ============================================================================

export function WorkInfoForm({ employeeId, storeUser, onSaved }: WorkInfoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<WorkInfoFormData>({
    resolver: zodResolver(workInfoSchema) as any,
  });

  // Pre-populate from storeUser / employee record
  useEffect(() => {
    reset({
      first_name: storeUser.first_name ?? "",
      last_name: storeUser.last_name ?? "",
      phone: storeUser.phone ?? "",
      designation: storeUser.designation ?? "",
      department: storeUser.department ?? "",
      emergency_contact_name: storeUser.emergency_contact_name ?? "",
      emergency_contact_phone: storeUser.emergency_contact_phone ?? "",
      emergency_contact_relation: storeUser.emergency_contact_relation ?? "",
      bank_name: storeUser.bank_name ?? "",
      bank_account_number: storeUser.bank_account_number ?? "",
      ifsc_code: storeUser.ifsc_code ?? "",
      pincode: storeUser.pincode ?? "",
      notes: storeUser.notes ?? "",
    });
  }, [storeUser, reset]);

  const onSubmit = async (values: WorkInfoFormData) => {
    setIsSubmitting(true);
    try {
      const { data, error } = await storeUsersService.updateEmployee(
        employeeId,
        {
          first_name: values.first_name,
          last_name: values.last_name,
          phone: values.phone || undefined,
          designation: values.designation || undefined,
          department: values.department || undefined,
          emergency_contact_name: values.emergency_contact_name || undefined,
          emergency_contact_phone: values.emergency_contact_phone || undefined,
          emergency_contact_relation: values.emergency_contact_relation || undefined,
          bank_name: values.bank_name || undefined,
          bank_account_number: values.bank_account_number || undefined,
          ifsc_code: values.ifsc_code || undefined,
          current_pincode: values.pincode || undefined,
          notes: values.notes || undefined,
        }
      );

      if (error || !data) {
        toast.error(error ?? "Failed to update work information");
        return;
      }

      // Merge submitted form values back into the storeUser shape for optimistic update.
      // `data` only contains Employee table fields; fields like designation/department
      // live on store_users so we use the submitted form values directly.
      const updatedStoreUser: EnrichedStoreUser = {
        ...storeUser,
        first_name: data.first_name,
        last_name: data.last_name,
        designation: values.designation || storeUser.designation,
        department: values.department || storeUser.department,
        emergency_contact_name: values.emergency_contact_name || storeUser.emergency_contact_name,
        emergency_contact_phone: values.emergency_contact_phone || storeUser.emergency_contact_phone,
        emergency_contact_relation: values.emergency_contact_relation || storeUser.emergency_contact_relation,
        bank_name: data.bank_name ?? storeUser.bank_name,
        bank_account_number: data.bank_account_number ?? storeUser.bank_account_number,
        ifsc_code: data.ifsc_code ?? storeUser.ifsc_code,
        notes: data.notes ?? storeUser.notes,
      };

      onSaved(updatedStoreUser);
      toast.success("Work information updated successfully");
      reset(values); // Reset dirty state after save
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Name</CardTitle>
          <CardDescription>
            Your name as it appears on official documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="first_name">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="first_name"
              placeholder="First name"
              {...register("first_name")}
            />
            {errors.first_name && (
              <p className="text-xs text-destructive">{errors.first_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="last_name">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="last_name"
              placeholder="Last name"
              {...register("last_name")}
            />
            {errors.last_name && (
              <p className="text-xs text-destructive">{errors.last_name.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Work Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Work Details</CardTitle>
          <CardDescription>Your role and department within the store.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="work_phone">Work Phone</Label>
            <Input
              id="work_phone"
              type="tel"
              placeholder="+919876543210"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          {/* Designation */}
          <div className="space-y-1.5">
            <Label htmlFor="designation">Designation</Label>
            <Input
              id="designation"
              placeholder="e.g. Senior Cashier"
              {...register("designation")}
            />
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              placeholder="e.g. Operations"
              {...register("department")}
            />
          </div>

          {/* Pincode */}
          <div className="space-y-1.5">
            <Label htmlFor="pincode">Pincode</Label>
            <Input
              id="pincode"
              placeholder="560001"
              maxLength={6}
              {...register("pincode")}
            />
            {errors.pincode && (
              <p className="text-xs text-destructive">{errors.pincode.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emergency Contact</CardTitle>
          <CardDescription>
            Person to contact in case of an emergency.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="emergency_contact_name">Name</Label>
            <Input
              id="emergency_contact_name"
              placeholder="Contact name"
              {...register("emergency_contact_name")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emergency_contact_phone">Phone</Label>
            <Input
              id="emergency_contact_phone"
              type="tel"
              placeholder="+919876543210"
              {...register("emergency_contact_phone")}
            />
            {errors.emergency_contact_phone && (
              <p className="text-xs text-destructive">
                {errors.emergency_contact_phone.message}
              </p>
            )}
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="emergency_contact_relation">Relation</Label>
            <Input
              id="emergency_contact_relation"
              placeholder="e.g. Spouse, Parent"
              {...register("emergency_contact_relation")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Banking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bank Details</CardTitle>
          <CardDescription>Used for salary disbursement.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="bank_name">Bank Name</Label>
            <Input
              id="bank_name"
              placeholder="e.g. State Bank of India"
              {...register("bank_name")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ifsc_code">IFSC Code</Label>
            <Input
              id="ifsc_code"
              placeholder="SBIN0001234"
              className="uppercase"
              {...register("ifsc_code")}
            />
            {errors.ifsc_code && (
              <p className="text-xs text-destructive">{errors.ifsc_code.message}</p>
            )}
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="bank_account_number">Account Number</Label>
            <Input
              id="bank_account_number"
              placeholder="Account number"
              {...register("bank_account_number")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
          <CardDescription>Any additional information for your record.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any notes here…"
            rows={3}
            {...register("notes")}
          />
          {errors.notes && (
            <p className="mt-1 text-xs text-destructive">{errors.notes.message}</p>
          )}
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
