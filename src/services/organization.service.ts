import { createClient } from "@/lib/supabase/client";
import { encryptField, decryptField } from "@/lib/encryption/crypto";
import type { Organization } from "@/types/organization.types";
import type { CreateOrganizationInput } from "@/types/organization.types";
import type { ServiceResponse } from "@/types/api.types";

const getClient = () => createClient();

export const organizationService = {
  /** Create a new organization with encrypted bank details */
  create: async (
    data: CreateOrganizationInput
  ): Promise<ServiceResponse<Organization>> => {
    try {
      // Clean data: remove undefined values, convert empty strings to null
      const cleanedData = Object.fromEntries(
        Object.entries(data)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => [
            key,
            typeof value === "string" && value.trim() === "" ? null : value,
          ])
      );

      const insertData = {
        ...cleanedData,
        bank_account_number: cleanedData.bank_account_number
          ? encryptField(cleanedData.bank_account_number as string)
          : null,
        created_by: (await getClient().auth.getUser()).data.user?.id,
      };

      const { data: org, error } = await getClient()
        .from("organizations")
        .insert(insertData as never)
        .select()
        .single();

      if (error) {
        // Handle check constraint violations with friendly messages
        if (error.code === "23514") {
          if (error.message.includes("valid_pan")) {
            return { data: null, error: "Invalid PAN format. Please check and try again" };
          }
          if (error.message.includes("valid_gstin")) {
            return { data: null, error: "Invalid GSTIN format. Please verify with GST portal" };
          }
          if (error.message.includes("valid_pincode")) {
            return { data: null, error: "Invalid pincode. Must be 6 digits" };
          }
          if (error.message.includes("valid_ifsc")) {
            return { data: null, error: "Bank IFSC code must be 11 characters" };
          }
          if (error.message.includes("valid_email")) {
            return { data: null, error: "Invalid email format" };
          }
          if (error.message.includes("valid_phone")) {
            return { data: null, error: "Invalid phone number format" };
          }
        }
        return { data: null, error: error.message };
      }
      return { data: org, error: null };
    } catch {
      return { data: null, error: "Failed to create organization" };
    }
  },

  /** Get organization by ID, decrypting sensitive fields */
  getById: async (id: string): Promise<ServiceResponse<Organization>> => {
    try {
      const { data: org, error } = await getClient()
        .from("organizations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) return { data: null, error: error.message };

      if (org?.bank_account_number) {
        org.bank_account_number = decryptField(org.bank_account_number);
      }
      return { data: org, error: null };
    } catch {
      return { data: null, error: "Failed to fetch organization" };
    }
  },

  /** Update organization, encrypting bank details if present */
  update: async (
    id: string,
    data: Partial<CreateOrganizationInput>
  ): Promise<ServiceResponse<Organization>> => {
    try {
      // Clean data: remove undefined values, convert empty strings to null
      const cleanedData = Object.fromEntries(
        Object.entries(data)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => [
            key,
            typeof value === "string" && value.trim() === "" ? null : value,
          ])
      );

      const updateData = {
        ...cleanedData,
        bank_account_number: cleanedData.bank_account_number
          ? encryptField(cleanedData.bank_account_number as string)
          : undefined,
      };

      const { data: org, error } = await getClient()
        .from("organizations")
        .update(updateData as never)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        // Handle check constraint violations with friendly messages
        if (error.code === "23514") {
          if (error.message.includes("valid_pan")) {
            return { data: null, error: "Invalid PAN format. Please check and try again" };
          }
          if (error.message.includes("valid_gstin")) {
            return { data: null, error: "Invalid GSTIN format. Please verify with GST portal" };
          }
          if (error.message.includes("valid_pincode")) {
            return { data: null, error: "Invalid pincode. Must be 6 digits" };
          }
          if (error.message.includes("valid_ifsc")) {
            return { data: null, error: "Bank IFSC code must be 11 characters" };
          }
          if (error.message.includes("valid_email")) {
            return { data: null, error: "Invalid email format" };
          }
          if (error.message.includes("valid_phone")) {
            return { data: null, error: "Invalid phone number format" };
          }
        }
        return { data: null, error: error.message };
      }
      return { data: org, error: null };
    } catch {
      return { data: null, error: "Failed to update organization" };
    }
  },

  /** Get organizations created by current user */
  getMyOrganizations: async (): Promise<ServiceResponse<Organization[]>> => {
    try {
      const userId = (await getClient().auth.getUser()).data.user?.id;
      if (!userId) return { data: null, error: "Not authenticated" };

      const { data: orgs, error } = await getClient()
        .from("organizations")
        .select("*")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (error) return { data: null, error: error.message };
      return { data: orgs ?? [], error: null };
    } catch {
      return { data: null, error: "Failed to fetch organizations" };
    }
  },
};
