// ============================================================================
// Database Types - Generated from Supabase Schema
// ============================================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          alternate_phone: string | null;
          date_of_birth: string | null;
          gender: GenderType | null;
          profile_picture: string | null;
          notification_preferences: Json | null;
          timezone: string;
          language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          alternate_phone?: string | null;
          date_of_birth?: string | null;
          gender?: GenderType | null;
          profile_picture?: string | null;
          notification_preferences?: Json | null;
          timezone?: string;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          alternate_phone?: string | null;
          date_of_birth?: string | null;
          gender?: GenderType | null;
          profile_picture?: string | null;
          notification_preferences?: Json | null;
          timezone?: string;
          language?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          legal_name: string | null;
          registration_type: RegistrationType | null;
          pan_number: string | null;
          tan_number: string | null;
          gstin: string | null;
          cin_number: string | null;
          msme_number: string | null;
          iec_code: string | null;
          address_line1: string | null;
          address_line2: string | null;
          landmark: string | null;
          city: string | null;
          state: string | null;
          pincode: string | null;
          country: string;
          phone: string | null;
          alternate_phone: string | null;
          email: string | null;
          website: string | null;
          logo_url: string | null;
          brand_color: string;
          bank_name: string | null;
          bank_account_number: string | null;
          ifsc_code: string | null;
          bank_branch: string | null;
          subscription_plan: string;
          subscription_status: string;
          subscription_start_date: string;
          subscription_end_date: string | null;
          billing_email: string | null;
          settings: Json;
          metadata: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          legal_name?: string | null;
          registration_type?: RegistrationType | null;
          pan_number?: string | null;
          tan_number?: string | null;
          gstin?: string | null;
          cin_number?: string | null;
          msme_number?: string | null;
          iec_code?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          landmark?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          country?: string;
          phone?: string | null;
          alternate_phone?: string | null;
          email?: string | null;
          website?: string | null;
          logo_url?: string | null;
          brand_color?: string;
          bank_name?: string | null;
          bank_account_number?: string | null;
          ifsc_code?: string | null;
          bank_branch?: string | null;
          subscription_plan?: string;
          subscription_status?: string;
          subscription_start_date?: string;
          subscription_end_date?: string | null;
          billing_email?: string | null;
          settings?: Json;
          metadata?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          name?: string;
          legal_name?: string | null;
          registration_type?: RegistrationType | null;
          pan_number?: string | null;
          tan_number?: string | null;
          gstin?: string | null;
          cin_number?: string | null;
          msme_number?: string | null;
          iec_code?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          landmark?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          bank_name?: string | null;
          bank_account_number?: string | null;
          ifsc_code?: string | null;
          bank_branch?: string | null;
          settings?: Json;
          metadata?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      stores: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          store_code: string;
          store_type: StoreType;
          display_name: string | null;
          gstin: string | null;
          state_code: string | null;
          jurisdiction: string | null;
          jurisdiction_code: string | null;
          license_number: string | null;
          fssai_license: string | null;
          drug_license: string | null;
          pollution_certificate: string | null;
          fire_safety_certificate: string | null;
          address_line1: string;
          address_line2: string | null;
          landmark: string | null;
          city: string;
          state: string;
          pincode: string;
          country: string;
          latitude: number | null;
          longitude: number | null;
          phone: string | null;
          alternate_phone: string | null;
          email: string | null;
          contact_person: string | null;
          whatsapp_number: string | null;
          opening_date: string | null;
          closing_date: string | null;
          status: StoreStatus;
          rejection_reason: string | null;
          floor_area: number | null;
          seating_capacity: number | null;
          parking_spaces: number | null;
          has_pos_system: boolean;
          has_online_ordering: boolean;
          has_delivery: boolean;
          has_dine_in: boolean;
          has_takeaway: boolean;
          encryption_salt: string;
          ip_restriction_enabled: boolean;
          two_factor_required: boolean;
          settings: Json;
          metadata: Json;
          created_at: string;
          updated_at: string;
          approved_at: string | null;
          approved_by: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          store_code: string;
          store_type?: StoreType;
          display_name?: string | null;
          gstin?: string | null;
          state_code?: string | null;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          state: string;
          pincode: string;
          country?: string;
          phone?: string | null;
          email?: string | null;
          contact_person?: string | null;
          status?: StoreStatus;
          settings?: Json;
          metadata?: Json;
          created_by?: string | null;
        };
        Update: {
          name?: string;
          store_type?: StoreType;
          display_name?: string | null;
          gstin?: string | null;
          state_code?: string | null;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          state?: string;
          pincode?: string;
          phone?: string | null;
          email?: string | null;
          status?: StoreStatus;
          settings?: Json;
          metadata?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          name: RoleName;
          display_name: string;
          description: string | null;
          permissions: Json;
          priority: number;
          is_system_role: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: RoleName;
          display_name: string;
          description?: string | null;
          permissions?: Json;
          priority?: number;
          is_system_role?: boolean;
        };
        Update: {
          display_name?: string;
          description?: string | null;
          permissions?: Json;
          priority?: number;
        };
        Relationships: [];
      };
      store_users: {
        Row: {
          id: string;
          store_id: string;
          user_id: string;
          role_id: string;
          employee_id: string | null;
          designation: string | null;
          department: string | null;
          reporting_manager_id: string | null;
          is_active: boolean;
          is_banned: boolean;
          banned_at: string | null;
          banned_reason: string | null;
          banned_by: string | null;
          last_login_at: string | null;
          last_login_ip: string | null;
          login_attempts: number;
          locked_until: string | null;
          two_factor_enabled: boolean;
          two_factor_secret: string | null;
          backup_codes: string[] | null;
          custom_permissions: Json | null;
          work_schedule: Json;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          store_id: string;
          user_id: string;
          role_id: string;
          employee_id?: string | null;
          designation?: string | null;
          department?: string | null;
          is_active?: boolean;
          is_banned?: boolean;
          custom_permissions?: Json | null;
          created_by?: string | null;
        };
        Update: {
          role_id?: string;
          designation?: string | null;
          department?: string | null;
          is_active?: boolean;
          is_banned?: boolean;
          last_login_at?: string | null;
          last_login_ip?: string | null;
          login_attempts?: number;
          locked_until?: string | null;
          custom_permissions?: Json | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          store_id: string | null;
          organization_id: string | null;
          user_id: string | null;
          action: string;
          action_type: string | null;
          entity_type: string | null;
          entity_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          changes: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          location: string | null;
          device_info: Json | null;
          status: string;
          error_message: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id?: string | null;
          organization_id?: string | null;
          user_id?: string | null;
          action: string;
          action_type?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          changes?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          status?: string;
          error_message?: string | null;
          metadata?: Json;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          store_id: string | null;
          session_token: string;
          refresh_token: string | null;
          ip_address: string | null;
          user_agent: string | null;
          device_info: Json;
          location_info: Json;
          is_active: boolean;
          expires_at: string;
          last_activity: string;
          login_method: string;
          two_factor_verified: boolean;
          created_at: string;
          terminated_at: string | null;
          termination_reason: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id?: string | null;
          session_token: string;
          refresh_token?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          device_info?: Json;
          location_info?: Json;
          is_active?: boolean;
          expires_at: string;
          last_activity?: string;
          login_method?: string;
        };
        Update: {
          is_active?: boolean;
          last_activity?: string;
          terminated_at?: string | null;
          termination_reason?: string | null;
        };
        Relationships: [];
      };
      store_settings: {
        Row: {
          id: string;
          store_id: string;
          tax_settings: Json;
          payment_gateway: Json;
          invoice_settings: Json;
          printer_settings: Json;
          business_hours: Json;
          holidays: Json;
          currency_code: string;
          currency_symbol: string;
          currency_position: string;
          thousand_separator: string;
          decimal_separator: string;
          decimal_places: number;
          gst_calculation_method: GstCalculationMethod;
          discount_settings: Json;
          inventory_settings: Json;
          sales_settings: Json;
          pos_settings: Json;
          notification_settings: Json;
          backup_settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_id: string;
        };
        Update: {
          tax_settings?: Json;
          payment_gateway?: Json;
          invoice_settings?: Json;
          business_hours?: Json;
          currency_code?: string;
          currency_symbol?: string;
          gst_calculation_method?: GstCalculationMethod;
          discount_settings?: Json;
          inventory_settings?: Json;
          sales_settings?: Json;
          pos_settings?: Json;
        };
        Relationships: [];
      };
    };
    Views: {
      v_user_store_role: {
        Row: {
          store_user_id: string;
          user_id: string;
          email: string;
          full_name: string | null;
          store_id: string;
          store_name: string;
          store_code: string;
          store_status: StoreStatus;
          organization_id: string;
          organization_name: string;
          role_id: string;
          role_name: RoleName;
          role_display_name: string;
          permissions: Json;
          is_active: boolean;
          is_banned: boolean;
          last_login_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_super_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_user_store: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      get_user_role: {
        Args: { p_store_id?: string };
        Returns: string | null;
      };
      has_permission: {
        Args: { p_permission: string; p_store_id?: string };
        Returns: boolean;
      };
      is_ip_whitelisted: {
        Args: { p_store_id: string; p_ip: string };
        Returns: boolean;
      };
      can_access_store: {
        Args: { p_store_id: string };
        Returns: boolean;
      };
      get_user_organization: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      is_store_owner: {
        Args: { p_store_id: string };
        Returns: boolean;
      };
      login_user: {
        Args: {
          p_email: string;
          p_ip: string;
          p_user_agent?: string;
          p_device_info?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      registration_type: RegistrationType;
      store_type: StoreType;
      store_status: StoreStatus;
      role_name: RoleName;
      employee_type: EmployeeType;
      employment_status: EmploymentStatus;
      pay_frequency: PayFrequency;
      whitelist_purpose: WhitelistPurpose;
      gst_status: GstStatus;
      tax_payer_type: TaxPayerType;
      hsn_type: HsnType;
      invitation_status: InvitationStatus;
      gender_type: GenderType;
      blood_group_type: BloodGroupType;
      marital_status_type: MaritalStatusType;
      gst_calculation_method: GstCalculationMethod;
    };
    CompositeTypes: Record<string, never>;
  };
}

// ============================================================================
// Enum Types
// ============================================================================

export type RegistrationType = "private_limited" | "partnership" | "proprietorship" | "llp" | "public_limited" | "other";
export type StoreType = "retail" | "warehouse" | "franchise" | "outlet" | "kiosk";
export type StoreStatus = "pending" | "active" | "suspended" | "rejected" | "closed";
export type RoleName = "super_admin" | "store_admin" | "manager" | "cashier" | "accountant" | "inventory_manager";
export type EmployeeType = "full_time" | "part_time" | "contractor" | "intern" | "trainee";
export type EmploymentStatus = "active" | "probation" | "notice_period" | "terminated" | "resigned" | "absconded";
export type PayFrequency = "monthly" | "weekly" | "daily" | "hourly";
export type WhitelistPurpose = "pos_terminal" | "admin_access" | "api_access" | "backup_system" | "mobile_app";
export type GstStatus = "active" | "suspended" | "cancelled" | "migrated";
export type TaxPayerType = "regular" | "composition" | "casual" | "non_resident" | "sez";
export type HsnType = "hsn" | "sac";
export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled" | "bounced";
export type GenderType = "male" | "female" | "other" | "prefer_not_to_say";
export type BloodGroupType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type MaritalStatusType = "single" | "married" | "divorced" | "widowed" | "separated";
export type GstCalculationMethod = "inclusive" | "exclusive";
