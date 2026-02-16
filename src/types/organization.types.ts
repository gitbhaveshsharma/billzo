import type { Database, RegistrationType } from "./database.types";

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationInsert = Database["public"]["Tables"]["organizations"]["Insert"];
export type OrganizationUpdate = Database["public"]["Tables"]["organizations"]["Update"];

/** Input for creating an organization during onboarding */
export interface CreateOrganizationInput {
  name: string;
  legal_name?: string;
  registration_type?: RegistrationType;
  pan_number?: string;
  gstin?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  bank_account_number?: string;
  ifsc_code?: string;
}
