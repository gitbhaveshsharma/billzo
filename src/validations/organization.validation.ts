import { z } from "zod";
import {
  panRequiredSchema,
  gstinRequiredSchema,
  phoneRequiredSchema,
  pincodeRequiredSchema,
  emailRequiredSchema,
} from "./common.validation";

// ============================================================================
// Helpers
// ============================================================================

/** Transform empty strings to undefined for optional fields */
const emptyToUndefined = (val: string | undefined) =>
  val === "" || (typeof val === "string" && val.trim() === "")
    ? undefined
    : val;

// ============================================================================
// Indian Bank IFSC
// Format: 4 uppercase letters (bank code) + "0" + 6 alphanumeric (branch code)
// Total: 11 characters
// Examples: SBIN0001234 | HDFC0000001 | ICIC0006691
// ============================================================================
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export const ifscSchema = z
  .string()
  .transform((val) => {
    const cleaned = emptyToUndefined(val);
    return cleaned ? cleaned.toUpperCase().trim() : cleaned;
  })
  .optional()
  .refine(
    (val) => !val || (val.length === 11 && IFSC_PATTERN.test(val)),
    "Invalid IFSC code. Format: 4 letters + 0 + 6 alphanumeric (e.g. SBIN0001234)"
  );

// ============================================================================
// Organization Schema
// ============================================================================
export const organizationSchema = z.object({

  // ── Required ──────────────────────────────────────────────────────────────
  name: z
    .string({ message: "Organization name is required" })
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name must not exceed 100 characters")
    .transform((val) => val.trim()),

  email: emailRequiredSchema,
  phone: phoneRequiredSchema,
  pan_number: panRequiredSchema,
  gstin: gstinRequiredSchema,

  // ── Address (all required) ─────────────────────────────────────────────────
  address_line1: z
    .string({ message: "Address is required" })
    .min(3, "Please enter a complete address")
    .transform((val) => val.trim()),

  city: z
    .string({ message: "City is required" })
    .min(2, "City is required")
    .transform((val) => val.trim()),

  state: z
    .string({ message: "State is required" })
    .min(2, "State is required")
    .transform((val) => val.trim()),

  pincode: pincodeRequiredSchema,

  // ── Optional fields ───────────────────────────────────────────────────────
  legal_name: z
    .string()
    .transform(emptyToUndefined)
    .optional(),

  registration_type: z
    .enum([
      "private_limited",
      "partnership",
      "proprietorship",
      "llp",
      "public_limited",
      "other",
    ])
    .optional(),

  // ── Bank details ──────────────────────────────────────────────────────────
  bank_name: z
    .string()
    .transform(emptyToUndefined)
    .optional(),

  /**
   * Bank account number — stored encrypted.
   * Indian account numbers are digits only, 9–18 characters.
   *   SBI     → 11 digits
   *   HDFC    → 14 digits
   *   ICICI   → 12 digits
   *   Axis    → 15 digits
   *   PNB     →  9 digits
   *   Canara  → 13 digits
   */
  bank_account_number: z
    .string()
    .transform(emptyToUndefined)
    .optional()
    .refine(
      (val) => !val || /^\d{9,18}$/.test(val),
      "Account number must be 9–18 digits (numbers only)"
    ),

  /**
   * IFSC code — 11 characters:
   *   [A-Z]{4}    → 4-letter bank code  (e.g. SBIN, HDFC, ICIC)
   *   0           → always zero (reserved by RBI)
   *   [A-Z0-9]{6} → 6-char branch code
   */
  ifsc_code: ifscSchema,
});

export const updateOrganizationSchema = organizationSchema.partial();

export type OrganizationFormData = z.infer<typeof organizationSchema>;
export type UpdateOrganizationData = z.infer<typeof updateOrganizationSchema>;