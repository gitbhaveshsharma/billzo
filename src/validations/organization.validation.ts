import { z } from "zod";
import {
  panRequiredSchema,
  gstinRequiredSchema,
  phoneRequiredSchema,
  pincodeRequiredSchema,
  emailRequiredSchema,
  ifscSchema,
} from "./common.validation";

/** Transform empty strings to undefined */
const emptyToUndefined = (val: string | undefined) => 
  val === "" || (typeof val === "string" && val.trim() === "") ? undefined : val;

/** Organization creation schema with strict validation */
export const organizationSchema = z.object({
  // Required fields
  name: z
    .string({ message: "Organization name is required" })
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name must not exceed 100 characters")
    .transform((val) => val.trim()),

  email: emailRequiredSchema,
  phone: phoneRequiredSchema,
  pan_number: panRequiredSchema,
  gstin: gstinRequiredSchema,

  // Address is required
  address_line1: z
    .string({ message: "Address is required" })
    .min(3, "Complete address is required (Address, City, State, Pincode)")
    .transform((val) => val.trim()),
    
  city: z
    .string({ message: "City is required" })
    .min(2, "Complete address is required (Address, City, State, Pincode)")
    .transform((val) => val.trim()),
    
  state: z
    .string({ message: "State is required" })
    .min(2, "Complete address is required (Address, City, State, Pincode)")
    .transform((val) => val.trim()),
    
  pincode: pincodeRequiredSchema,

  // Optional fields - transform empty strings to undefined
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

  bank_name: z
    .string()
    .transform(emptyToUndefined)
    .optional(),
    
  bank_account_number: z
    .string()
    .transform(emptyToUndefined)
    .optional(),
    
  ifsc_code: ifscSchema,
});

export const updateOrganizationSchema = organizationSchema.partial();

export type OrganizationFormData = z.infer<typeof organizationSchema>;
