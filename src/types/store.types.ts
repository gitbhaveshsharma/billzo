import type { Database, StoreType } from "./database.types";

export type Store = Database["public"]["Tables"]["stores"]["Row"];
export type StoreInsert = Database["public"]["Tables"]["stores"]["Insert"];
export type StoreUpdate = Database["public"]["Tables"]["stores"]["Update"];

/** Simplified input for creating a store during onboarding (10 fields) */
export interface CreateStoreInput {
  organization_id: string;
  name: string;
  store_code: string;
  store_type: StoreType;
  address_line1: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  email?: string;
}

/** Store with user role info from v_user_store_role view */
export type UserStoreRole = Database["public"]["Views"]["v_user_store_role"]["Row"];
