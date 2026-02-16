import { z } from "zod";

// ============================================================================
// Reusable Indian format patterns
// ============================================================================

/** PAN: ABCDE1234F */
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** GSTIN: 22AAAAA0000A1Z5 (15 characters) */
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$/;

/** CIN: L/U + 5 digits + 2 letters + 4 digits + 3 letters + 6 digits */
export const CIN_PATTERN = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

/** Aadhar: 12 digits */
export const AADHAR_PATTERN = /^\d{12}$/;

/** Indian phone: +91XXXXXXXXXX or 10 digits */
export const PHONE_PATTERN = /^\+?[1-9]\d{1,14}$/;

/** Indian pincode: 6 digits */
export const PINCODE_PATTERN = /^\d{6}$/;

/** IFSC code: 4 letters + 0 + 6 alphanumeric */
export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// ============================================================================
// Reusable field schemas
// ============================================================================

/** Transform empty strings to undefined for optional fields */
const emptyToUndefined = (val: string | undefined) => 
  val === "" || (typeof val === "string" && val.trim() === "") ? undefined : val;

/** Required phone with E.164 format */
export const phoneRequiredSchema = z
  .string({ message: "Phone number is required for business contact" })
  .min(1, "Phone number is required for business contact")
  .transform((val) => val.replace(/[^+\d]/g, "")) // Remove special chars except +
  .refine(
    (val) => PHONE_PATTERN.test(val),
    "Invalid phone number format. Use format: +919876543210"
  );

export const phoneSchema = z
  .string()
  .transform(emptyToUndefined)
  .optional()
  .refine(
    (val) => !val || PHONE_PATTERN.test(val.replace(/[^+\d]/g, "")),
    "Invalid phone number format. Use format: +919876543210"
  );

/** Required pincode */
export const pincodeRequiredSchema = z
  .string({ message: "Pincode is required" })
  .min(1, "Pincode is required")
  .transform((val) => val.trim())
  .refine(
    (val) => PINCODE_PATTERN.test(val),
    "Invalid pincode. Must be 6 digits"
  );

export const pincodeSchema = z
  .string()
  .transform(emptyToUndefined)
  .optional()
  .refine(
    (val) => !val || PINCODE_PATTERN.test(val),
    "Invalid pincode. Must be 6 digits"
  );

/** Required PAN */
export const panRequiredSchema = z
  .string({ message: "PAN number is required for tax compliance. Format: ABCDE1234F" })
  .min(1, "PAN number is required for tax compliance. Format: ABCDE1234F")
  .transform((val) => val.toUpperCase().trim())
  .refine(
    (val) => PAN_PATTERN.test(val),
    "Invalid PAN format. Please check and try again"
  );

export const panSchema = z
  .string()
  .transform((val) => {
    const cleaned = emptyToUndefined(val);
    return cleaned ? cleaned.toUpperCase().trim() : cleaned;
  })
  .optional()
  .refine(
    (val) => !val || PAN_PATTERN.test(val),
    "Invalid PAN format. Please check and try again"
  );

/** Required GSTIN */
export const gstinRequiredSchema = z
  .string({ message: "GSTIN is required for GST compliance. Format: 07AAAAA0000A1Z5" })
  .min(1, "GSTIN is required for GST compliance. Format: 07AAAAA0000A1Z5")
  .transform((val) => val.toUpperCase().trim())
  .refine(
    (val) => GSTIN_PATTERN.test(val),
    "Invalid GSTIN format. Please verify with GST portal"
  );

export const gstinSchema = z
  .string()
  .transform((val) => {
    const cleaned = emptyToUndefined(val);
    return cleaned ? cleaned.toUpperCase().trim() : cleaned;
  })
  .optional()
  .refine(
    (val) => !val || GSTIN_PATTERN.test(val),
    "Invalid GSTIN format. Please verify with GST portal"
  );

/** Required IFSC */
export const ifscRequiredSchema = z
  .string({ message: "Bank IFSC code is required" })
  .min(1, "Bank IFSC code is required")
  .transform((val) => val.toUpperCase().trim())
  .refine(
    (val) => IFSC_PATTERN.test(val),
    "Bank IFSC code must be 11 characters"
  );

export const ifscSchema = z
  .string()
  .transform((val) => {
    const cleaned = emptyToUndefined(val);
    return cleaned ? cleaned.toUpperCase().trim() : cleaned;
  })
  .optional()
  .refine(
    (val) => !val || IFSC_PATTERN.test(val),
    "Bank IFSC code must be 11 characters"
  );

/** Required email */
export const emailRequiredSchema = z
  .string({ message: "Business email is required for invoicing and communication" })
  .min(1, "Business email is required for invoicing and communication")
  .email("Invalid email format")
  .transform((val) => val.toLowerCase().trim());

export const emailOptionalSchema = z
  .string()
  .transform(emptyToUndefined)
  .optional()
  .refine(
    (val) => !val || z.string().email().safeParse(val).success,
    "Invalid email format"
  );
