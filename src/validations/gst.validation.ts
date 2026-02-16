import { z } from "zod";
import { GSTIN_PATTERN, PAN_PATTERN, AADHAR_PATTERN } from "./common.validation";

/** Validate GSTIN format */
export const gstinValidation = z
  .string()
  .regex(GSTIN_PATTERN, "Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)")
  .optional()
  .or(z.literal(""));

/** Validate PAN format */
export const panValidation = z
  .string()
  .regex(PAN_PATTERN, "Invalid PAN format (e.g., ABCDE1234F)")
  .optional()
  .or(z.literal(""));

/** Validate Aadhar format */
export const aadharValidation = z
  .string()
  .regex(AADHAR_PATTERN, "Aadhar must be 12 digits")
  .optional()
  .or(z.literal(""));

/** Extract state code from GSTIN (first 2 digits) */
export function extractStateCodeFromGSTIN(gstin: string): string | null {
  if (!GSTIN_PATTERN.test(gstin)) return null;
  return gstin.substring(0, 2);
}

/** Extract PAN from GSTIN (characters 3-12) */
export function extractPANFromGSTIN(gstin: string): string | null {
  if (!GSTIN_PATTERN.test(gstin)) return null;
  return gstin.substring(2, 12);
}
