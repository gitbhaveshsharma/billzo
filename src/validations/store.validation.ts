import { z } from "zod";
import { phoneSchema, pincodeSchema, emailOptionalSchema } from "./common.validation";

/** Store creation schema — simplified to ~10 fields for smooth onboarding */
export const storeSchema = z.object({
  name: z
    .string()
    .min(2, "Store name must be at least 2 characters")
    .max(100, "Store name must not exceed 100 characters"),

  store_code: z
    .string()
    .min(3, "Store code must be at least 3 characters")
    .max(20, "Store code must not exceed 20 characters")
    .regex(/^[A-Z0-9-]+$/, "Store code must be uppercase alphanumeric with dashes"),

  store_type: z.enum(["retail", "warehouse", "franchise", "outlet", "kiosk"], {
    error: "Select a store type",
  }),

  address_line1: z.string().min(3, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),

  pincode: z
    .string()
    .regex(/^\d{6}$/, "Pincode must be 6 digits"),

  phone: phoneSchema,
  email: emailOptionalSchema,
  gstin: z.string().optional().or(z.literal("")),
});

export const updateStoreSchema = storeSchema.partial();

export type StoreFormData = z.infer<typeof storeSchema>;
