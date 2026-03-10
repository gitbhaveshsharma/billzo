import { z } from "zod";
import { phoneSchema, pincodeSchema } from "./common.validation";

// ============================================================================
// Personal Info — maps to the `profiles` table
// ============================================================================

export const personalInfoSchema = z.object({
  full_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  phone: phoneSchema,
  alternate_phone: phoneSchema,
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z
    .enum(["male", "female", "other", "prefer_not_to_say"])
    .optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

// ============================================================================
// Work Info — maps to the `employees` table via UpdateEmployeeRequest
// ============================================================================

export const workInfoSchema = z.object({
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name is too long"),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name is too long"),
  phone: phoneSchema,
  designation: z.string().max(100).optional().or(z.literal("")),
  department: z.string().max(100).optional().or(z.literal("")),
  emergency_contact_name: z.string().max(100).optional().or(z.literal("")),
  emergency_contact_phone: phoneSchema,
  emergency_contact_relation: z.string().max(50).optional().or(z.literal("")),
  bank_name: z.string().optional().or(z.literal("")),
  bank_account_number: z.string().optional().or(z.literal("")),
  ifsc_code: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code")
    .optional()
    .or(z.literal("")),
  pincode: pincodeSchema,
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;
export type WorkInfoFormData = z.infer<typeof workInfoSchema>;
