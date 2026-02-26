import { createClient } from "@/lib/supabase/client";
import type { ServiceResponse } from "@/types/api.types";
import type {
    EnrichedStoreUser,
    VEmployeeDetails,
    Employee,
    AddStoreUserRequest,
    UpdateStoreUserRequest,
    UpdateEmployeeRequest,
    BanUserRequest,
    ResetUserAccessRequest,
    StoreUserFilters,
    StoreUserPagination,
    StoreUserListResponse,
    StoreUserStats,
    AvailableRolesResponse,
    BulkActivateRequest,
    BulkBanRequest,
    BulkRoleChangeRequest,
    BulkOperationResponse,
} from "@/types/store-users.types";
import type { RoleName, EmploymentStatus, EmployeeType, PayFrequency, Json } from "@/types/database.types";

const getClient = () => createClient();

// ============================================================================
// PRIVATE HELPER — map v_employee_details row + store_users row → EnrichedStoreUser
// ============================================================================

type StoreUserSecurityRow = {
    id: string;
    user_id: string;
    banned_at: string | null;
    banned_reason: string | null;
    banned_by: string | null;
    last_login_at: string | null;
    login_attempts: number;
    locked_until: string | null;
    two_factor_enabled: boolean;
    custom_permissions: Json | null;
    work_schedule: Json;
    created_by: string | null;
};

type RoleExtrasRow = { id: string; permissions: Json; priority: number };
type StoreExtrasRow = { id: string; status: string; organization_id: string };

function mapViewToEnriched(
    emp: VEmployeeDetails,
    su: StoreUserSecurityRow | null,
    role: RoleExtrasRow | null,
    store: StoreExtrasRow | null
): EnrichedStoreUser {
    const firstName = (emp.first_name ?? "").trim();
    const lastName = (emp.last_name ?? "").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

    return {
        // ── store_users ────────────────────────────────────────────────────
        id: emp.store_user_id,
        store_id: emp.store_id,
        user_id: su?.user_id ?? "",
        role_id: emp.role_id,
        is_active: emp.account_is_active,
        is_banned: emp.account_is_banned,
        banned_at: su?.banned_at ?? null,
        banned_reason: su?.banned_reason ?? null,
        banned_by: su?.banned_by ?? null,
        last_login_at: su?.last_login_at ?? null,
        login_attempts: su?.login_attempts ?? 0,
        locked_until: su?.locked_until ?? null,
        two_factor_enabled: su?.two_factor_enabled ?? false,
        custom_permissions: su?.custom_permissions ?? null,
        work_schedule: su?.work_schedule ?? {},
        created_at: emp.created_at,
        updated_at: emp.updated_at,
        created_by: su?.created_by ?? emp.created_by,

        // ── employee fields ────────────────────────────────────────────────
        employee_id: emp.id,
        employee_code: emp.employee_code,
        first_name: emp.first_name,
        middle_name: emp.middle_name,
        last_name: emp.last_name,
        full_name: fullName,
        email: emp.email,
        phone: emp.phone,
        alternate_phone: emp.alternate_phone,
        date_of_birth: emp.date_of_birth,
        gender: emp.gender,
        blood_group: emp.blood_group,
        marital_status: emp.marital_status,
        spouse_name: emp.spouse_name,
        anniversary_date: emp.anniversary_date,
        father_name: emp.father_name,
        mother_name: emp.mother_name,
        nationality: emp.nationality,
        present_address: emp.present_address,
        permanent_address: emp.permanent_address,
        city: emp.city,
        state: emp.state,
        pincode: emp.pincode,
        same_as_permanent: emp.same_as_permanent,
        department: emp.department,
        designation: emp.designation,
        employee_type: emp.employee_type,
        employment_status: emp.employment_status,
        joining_date: emp.joining_date,
        confirmation_date: emp.confirmation_date,
        probation_end_date: emp.probation_end_date,
        exit_date: emp.exit_date,
        exit_reason: emp.exit_reason,
        notice_period_days: emp.notice_period_days,
        salary: emp.salary,
        pay_frequency: emp.pay_frequency,
        basic_salary: emp.basic_salary,
        hra: emp.hra,
        da: emp.da,
        special_allowance: emp.special_allowance,
        pf_applicable: emp.pf_applicable,
        esi_applicable: emp.esi_applicable,
        professional_tax: emp.professional_tax,
        bank_name: emp.bank_name,
        bank_account_number: emp.bank_account_number,
        ifsc_code: emp.ifsc_code,
        bank_branch: emp.bank_branch,
        account_holder_name: emp.account_holder_name,
        pan_number: emp.pan_number,
        uan_number: emp.uan_number,
        esic_number: emp.esic_number,
        aadhar_number: emp.aadhar_number,
        passport_number: emp.passport_number,
        driving_license: emp.driving_license,
        voter_id: emp.voter_id,
        documents: emp.documents,
        emergency_contact_name: emp.emergency_contact_name,
        emergency_contact_phone: emp.emergency_contact_phone,
        emergency_contact_relation: emp.emergency_contact_relation,
        emergency_contact_address: emp.emergency_contact_address,
        highest_qualification: emp.highest_qualification,
        institution_name: emp.institution_name,
        year_of_passing: emp.year_of_passing,
        skills: emp.skills,
        certifications: emp.certifications,
        previous_employer: emp.previous_employer,
        previous_designation: emp.previous_designation,
        previous_experience_years: emp.previous_experience_years,
        total_experience_years: emp.total_experience_years,
        performance_rating: emp.performance_rating,
        attendance_percentage: emp.attendance_percentage,
        leaves_available: emp.leaves_available,
        leaves_taken: emp.leaves_taken,
        photo_url: emp.photo_url,
        profile_picture: emp.photo_url,
        notes: emp.notes,
        metadata: emp.metadata,

        // ── role ──────────────────────────────────────────────────────────
        role_name: emp.role_name,
        role_display_name: emp.role_display_name,
        permissions: role?.permissions ?? {},
        role_priority: role?.priority ?? 0,

        // ── store + org ───────────────────────────────────────────────────
        store_name: emp.store_name,
        store_code: emp.store_code,
        store_status: store?.status ?? "",
        organization_id: store?.organization_id ?? "",
        organization_name: emp.organization_name,

        // ── backward-compat nested employee object ─────────────────────────
        employee: {
            id: emp.id,
            store_id: emp.store_id,
            store_user_id: emp.store_user_id,
            employee_code: emp.employee_code,
            first_name: emp.first_name,
            middle_name: emp.middle_name,
            last_name: emp.last_name,
            full_name: fullName,
            email: emp.email,
            alternate_email: null,
            phone: emp.phone,
            alternate_phone: emp.alternate_phone,
            whatsapp_number: null,
            emergency_contact_name: emp.emergency_contact_name,
            emergency_contact_phone: emp.emergency_contact_phone,
            emergency_contact_relation: emp.emergency_contact_relation,
            current_address_line1: emp.present_address,
            current_address_line2: null,
            current_city: emp.city,
            current_state: emp.state,
            current_pincode: emp.pincode,
            current_country: null,
            permanent_address_line1: emp.permanent_address,
            permanent_address_line2: null,
            permanent_city: emp.city,
            permanent_state: emp.state,
            permanent_pincode: emp.pincode,
            permanent_country: null,
            same_as_current: emp.same_as_permanent,
            date_of_birth: emp.date_of_birth,
            gender: emp.gender,
            blood_group: emp.blood_group,
            marital_status: emp.marital_status,
            nationality: emp.nationality,
            aadhar_number: emp.aadhar_number,
            pan_number: emp.pan_number,
            uan_number: emp.uan_number,
            esic_number: emp.esic_number,
            driving_license: emp.driving_license,
            passport_number: emp.passport_number,
            voter_id: emp.voter_id,
            employee_type: emp.employee_type,
            employment_status: emp.employment_status,
            joining_date: emp.joining_date,
            confirmation_date: emp.confirmation_date,
            probation_period_months: 0,
            notice_period_days: emp.notice_period_days,
            resignation_date: emp.exit_date,
            last_working_date: emp.exit_date,
            termination_date: emp.exit_date,
            termination_reason: emp.exit_reason,
            salary: emp.salary,
            pay_frequency: emp.pay_frequency,
            bank_name: emp.bank_name,
            bank_account_number: emp.bank_account_number,
            ifsc_code: emp.ifsc_code,
            bank_branch: emp.bank_branch,
            pf_account_number: emp.uan_number,
            profile_picture: emp.photo_url,
            qualification: emp.highest_qualification,
            specialization: emp.institution_name,
            experience_years: emp.total_experience_years,
            previous_employer: emp.previous_employer,
            skills: emp.skills,
            certifications: emp.certifications,
            documents: emp.documents,
            performance_rating: emp.performance_rating,
            notes: emp.notes,
            metadata: emp.metadata,
            created_at: emp.created_at,
            updated_at: emp.updated_at,
            created_by: emp.created_by,
        } as Employee,
    };
}

// ============================================================================
// STORE USERS SERVICE
// ============================================================================

export const storeUsersService = {
    /**
     * Get all store users for the current store with enriched data
     * Includes profile, role, and employee information
     */
    getStoreUsers: async (
        storeId: string,
        filters?: StoreUserFilters,
        pagination?: StoreUserPagination
    ): Promise<ServiceResponse<StoreUserListResponse>> => {
        try {
            const client = getClient();

            // ── 1. Primary query against v_employee_details ──────────────────
            let query = client
                .from("v_employee_details")
                .select("*", { count: "exact" })
                .eq("store_id", storeId);

            // Apply filters (view columns differ slightly from the old join columns)
            if (filters) {
                if (filters.role_id) query = query.eq("role_id", filters.role_id);
                if (filters.role_name) query = query.eq("role_name", filters.role_name);
                if (filters.department) query = query.eq("department", filters.department);
                if (filters.is_active !== undefined)
                    query = query.eq("account_is_active", filters.is_active);
                if (filters.is_banned !== undefined)
                    query = query.eq("account_is_banned", filters.is_banned);
                if (filters.employment_status)
                    query = query.eq("employment_status", filters.employment_status);
                if (filters.employee_type)
                    query = query.eq("employee_type", filters.employee_type);
                if (filters.search) {
                    query = query.or(
                        `first_name.ilike.%${filters.search}%,` +
                        `last_name.ilike.%${filters.search}%,` +
                        `email.ilike.%${filters.search}%,` +
                        `employee_code.ilike.%${filters.search}%`
                    );
                }
            }

            const page = pagination?.page ?? 1;
            const limit = pagination?.limit ?? 10;
            // "full_name" is computed — sort by first_name in the view
            const rawSortBy = pagination?.sort_by ?? "created_at";
            const sortCol = rawSortBy === "full_name" ? "first_name" : rawSortBy;
            const sortOrder = pagination?.sort_order ?? "desc";

            query = query
                .order(sortCol, { ascending: sortOrder === "asc" })
                .range((page - 1) * limit, page * limit - 1);

            const { data: viewRows, error, count } = await query;

            if (error) {
                return { data: null, error: error.message };
            }

            // ── 2. Batch-fetch store_users rows for auth/security fields ──────
            const storeUserIds = (viewRows ?? [])
                .map((r) => (r as VEmployeeDetails).store_user_id)
                .filter(Boolean) as string[];

            const { data: suRows } = storeUserIds.length
                ? await client
                    .from("store_users")
                    .select(
                        "id, user_id, banned_at, banned_reason, banned_by, last_login_at, login_attempts, locked_until, two_factor_enabled, custom_permissions, work_schedule, created_by"
                    )
                    .in("id", storeUserIds)
                : { data: [] as StoreUserSecurityRow[] };

            // ── 3. Batch-fetch role permissions + priority ────────────────────
            const roleIds = [
                ...new Set(
                    (viewRows ?? [])
                        .map((r) => (r as VEmployeeDetails).role_id)
                        .filter(Boolean) as string[]
                ),
            ];
            const { data: roleRows } = roleIds.length
                ? await client
                    .from("roles")
                    .select("id, permissions, priority")
                    .in("id", roleIds)
                : { data: [] as RoleExtrasRow[] };

            // ── 4. Fetch store status + organization_id ───────────────────────
            const { data: storeRow } = await client
                .from("stores")
                .select("id, status, organization_id")
                .eq("id", storeId)
                .maybeSingle();

            // ── 5. Assemble enriched users ────────────────────────────────────
            const users: EnrichedStoreUser[] = (viewRows ?? []).map((emp) => {
                const viewEmp = emp as VEmployeeDetails;
                const su = (suRows as StoreUserSecurityRow[] ?? []).find((s) => s.id === viewEmp.store_user_id) ?? null;
                const role = (roleRows as RoleExtrasRow[] ?? []).find((r) => r.id === viewEmp.role_id) ?? null;
                return mapViewToEnriched(viewEmp, su, role, storeRow as StoreExtrasRow | null);
            });

            return {
                data: {
                    users,
                    total: count ?? 0,
                    page,
                    limit,
                    total_pages: count ? Math.ceil(count / limit) : 0,
                },
                error: null,
            };
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : "Failed to fetch store users",
            };
        }
    },

    getStoreUserById: async (
        storeId: string,
        userId: string
    ): Promise<ServiceResponse<EnrichedStoreUser>> => {
        try {
            const client = getClient();

            // ── 1. Get store_users row (gives us store_user.id + security fields) ──
            const { data: su, error: suError } = await client
                .from("store_users")
                .select(
                    "id, user_id, role_id, banned_at, banned_reason, banned_by, last_login_at, login_attempts, locked_until, two_factor_enabled, custom_permissions, work_schedule, created_by"
                )
                .eq("store_id", storeId)
                .eq("user_id", userId)
                .single();

            if (suError) {
                return { data: null, error: suError.message };
            }
            if (!su) {
                return { data: null, error: "User not found" };
            }

            // ── 2. Get enriched view row by store_user_id ─────────────────────
            const { data: emp } = await client
                .from("v_employee_details")
                .select("*")
                .eq("store_user_id", su.id)
                .maybeSingle();

            // ── 3. Get role permissions + priority ────────────────────────────
            const { data: roleRow } = await client
                .from("roles")
                .select("id, permissions, priority")
                .eq("id", su.role_id)
                .maybeSingle();

            // ── 4. Get store status + organization_id ─────────────────────────
            const { data: storeRow } = await client
                .from("stores")
                .select("id, name, store_code, status, organization_id, organizations:organization_id(id, name)")
                .eq("id", storeId)
                .maybeSingle();

            const storeExtra = storeRow
                ? {
                    id: storeRow.id,
                    status: storeRow.status,
                    organization_id: storeRow.organization_id,
                }
                : null;

            // ── 5a. Employee record exists → use view data ────────────────────
            if (emp) {
                const user = mapViewToEnriched(
                    emp as VEmployeeDetails,
                    su,
                    roleRow ?? null,
                    storeExtra
                );
                return { data: user, error: null };
            }

            // ── 5b. No employee record → build partial from profiles ──────────
            const { data: profile } = await client
                .from("profiles")
                .select("email, full_name, phone, profile_picture")
                .eq("id", userId)
                .maybeSingle();

            const partial: EnrichedStoreUser = {
                id: su.id,
                store_id: storeId,
                user_id: su.user_id,
                role_id: su.role_id,
                is_active: false,
                is_banned: false,
                banned_at: su.banned_at,
                banned_reason: su.banned_reason,
                banned_by: su.banned_by,
                last_login_at: su.last_login_at,
                login_attempts: su.login_attempts,
                locked_until: su.locked_until,
                two_factor_enabled: su.two_factor_enabled,
                custom_permissions: su.custom_permissions,
                work_schedule: su.work_schedule ?? {},
                created_at: "",
                updated_at: "",
                created_by: su.created_by,
                employee_id: null,
                employee_code: null,
                first_name: null,
                middle_name: null,
                last_name: null,
                full_name: profile?.full_name ?? null,
                email: profile?.email ?? "",
                phone: profile?.phone ?? null,
                alternate_phone: null,
                date_of_birth: null,
                gender: null,
                blood_group: null,
                marital_status: null,
                spouse_name: null,
                anniversary_date: null,
                father_name: null,
                mother_name: null,
                nationality: null,
                present_address: null,
                permanent_address: null,
                city: null,
                state: null,
                pincode: null,
                same_as_permanent: false,
                department: null,
                designation: null,
                employee_type: null,
                employment_status: null,
                joining_date: null,
                confirmation_date: null,
                probation_end_date: null,
                exit_date: null,
                exit_reason: null,
                notice_period_days: null,
                salary: null,
                pay_frequency: null,
                basic_salary: null,
                hra: null,
                da: null,
                special_allowance: null,
                pf_applicable: false,
                esi_applicable: false,
                professional_tax: null,
                bank_name: null,
                bank_account_number: null,
                ifsc_code: null,
                bank_branch: null,
                account_holder_name: null,
                pan_number: null,
                uan_number: null,
                esic_number: null,
                aadhar_number: null,
                passport_number: null,
                driving_license: null,
                voter_id: null,
                documents: {},
                emergency_contact_name: null,
                emergency_contact_phone: null,
                emergency_contact_relation: null,
                emergency_contact_address: null,
                highest_qualification: null,
                institution_name: null,
                year_of_passing: null,
                skills: [],
                certifications: {},
                previous_employer: null,
                previous_designation: null,
                previous_experience_years: null,
                total_experience_years: null,
                performance_rating: null,
                attendance_percentage: null,
                leaves_available: 0,
                leaves_taken: 0,
                photo_url: profile?.profile_picture ?? null,
                profile_picture: profile?.profile_picture ?? null,
                notes: null,
                metadata: {},
                role_name: "cashier" as RoleName,
                role_display_name: "",
                permissions: roleRow?.permissions ?? {},
                role_priority: roleRow?.priority ?? 0,
                store_name: storeRow?.name ?? "",
                store_code: storeRow?.store_code ?? "",
                store_status: storeRow?.status ?? "",
                organization_id: storeRow?.organization_id ?? "",
                organization_name: (storeRow as typeof storeRow & { organizations?: { name?: string } })?.organizations?.name ?? "",
                employee: null,
            };

            return { data: partial, error: null };
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : "Failed to fetch store user",
            };
        }
    },

    /**
     * Add a new user to the store
     * Creates profile if doesn't exist, creates store_user record, optionally creates employee record
     */
    addStoreUser: async (
        storeId: string,
        request: AddStoreUserRequest
    ): Promise<ServiceResponse<EnrichedStoreUser>> => {
        try {
            const client = getClient();

            // 0. Get current user (needed for invited_by)
            const { data: { user: currentUser } } = await client.auth.getUser();

            // 1. Check if user exists in profiles table by email
            // Use maybeSingle() — returns null (no error) when 0 rows found;
            // .single() would throw PGRST116 when the user does not exist yet.
            const { data: existingProfile } = await client
                .from("profiles")
                .select("id, email, phone")
                .eq("email", request.email)
                .maybeSingle();

            // 2. If user doesn't exist, create a pending invitation
            if (!existingProfile) {
                // invited_by is NOT NULL in the schema — must be supplied.
                const { data: inviteRow, error: inviteError } = await client
                    .from("invitations")
                    .insert({
                        store_id: storeId,
                        role_id: request.role_id,
                        email: request.email,
                        invited_by: currentUser?.id,
                        status: "pending",
                        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
                        // Pre-fill employee details so the accept flow can read them
                        employee_data: request.create_employee && request.employee_data
                            ? {
                                first_name: request.employee_data.first_name,
                                last_name: request.employee_data.last_name,
                                designation: request.designation,
                                department: request.department,
                            }
                            : {},
                    })
                    .select("id, token")
                    .maybeSingle();

                if (inviteError) {
                    return { data: null, error: "Failed to create invitation: " + inviteError.message };
                }

                // Fetch store & inviter names for the email
                const [storeResult, inviterResult] = await Promise.all([
                    client.from("stores").select("name").eq("id", storeId).maybeSingle(),
                    currentUser?.id
                        ? client.from("profiles").select("full_name").eq("id", currentUser.id).maybeSingle()
                        : Promise.resolve({ data: null }),
                ]);

                // Get display name for the role
                const { data: roleRow } = await client
                    .from("roles")
                    .select("display_name")
                    .eq("id", request.role_id)
                    .maybeSingle();

                // Send the invitation email (fire-and-forget — don't block on this)
                if (inviteRow?.token) {
                    const appUrl =
                        typeof window !== "undefined"
                            ? window.location.origin
                            : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

                    fetch(`${appUrl}/api/invite/send`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: request.email,
                            token: inviteRow.token,
                            storeName: storeResult.data?.name || "the store",
                            inviterName: inviterResult.data?.full_name || "the store admin",
                            roleName: roleRow?.display_name || "team member",
                        }),
                    }).catch((err) =>
                        console.error("[storeUsersService] Failed to send invite email:", err)
                    );
                }

                return {
                    data: null,
                    error: null,
                    meta: { invitation_sent: true, email: request.email },
                };
            }

            const userId = existingProfile.id;

            // 3. Check if user is already in this store
            // maybeSingle() avoids PGRST116 when no membership row exists.
            const { data: existingStoreUser } = await client
                .from("store_users")
                .select("id")
                .eq("store_id", storeId)
                .eq("user_id", userId)
                .maybeSingle();

            if (existingStoreUser) {
                return { data: null, error: "User is already part of this store" };
            }

            // 4. Create store_user record
            const { data: storeUser, error: storeUserError } = await client
                .from("store_users")
                .insert({
                    store_id: storeId,
                    user_id: userId,
                    role_id: request.role_id,
                    designation: request.designation,
                    department: request.department,
                    is_active: request.is_active ?? true,
                    custom_permissions: request.custom_permissions || null,
                })
                .select()
                .single();

            if (storeUserError) {
                return { data: null, error: "Failed to add user to store: " + storeUserError.message };
            }

            // 5. If creating employee record
            if (request.create_employee && request.employee_data) {
                const employeeData = request.employee_data;
                const { error: employeeError } = await client
                    .from("employees")
                    .insert({
                        store_id: storeId,
                        store_user_id: storeUser.id,
                        employee_code: employeeData.employee_code,
                        first_name: employeeData.first_name,
                        middle_name: employeeData.middle_name,
                        last_name: employeeData.last_name,
                        email: request.email,
                        phone: existingProfile?.phone || "",
                        employee_type: employeeData.employee_type,
                        employment_status: employeeData.employment_status || "probation",
                        joining_date: employeeData.joining_date,
                        probation_period_months: employeeData.probation_period_months || 3,
                        notice_period_days: employeeData.notice_period_days || 30,
                        salary: employeeData.salary,
                        pay_frequency: employeeData.pay_frequency,
                        // Add other fields as needed
                    });

                if (employeeError) {
                    // Rollback store_user creation
                    await client.from("store_users").delete().eq("id", storeUser.id);
                    return { data: null, error: "Failed to create employee record: " + employeeError.message };
                }
            }

            // 6. Fetch and return complete user data
            const result = await storeUsersService.getStoreUserById(storeId, userId);
            return result;
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : "Failed to add store user",
            };
        }
    },

    /**
     * Update store user details (role, designation, etc.)
     */
    updateStoreUser: async (
        storeId: string,
        userId: string,
        updates: UpdateStoreUserRequest
    ): Promise<ServiceResponse<EnrichedStoreUser>> => {
        try {
            const client = getClient();

            const { error } = await client
                .from("store_users")
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq("store_id", storeId)
                .eq("user_id", userId);

            if (error) {
                return { data: null, error: error.message };
            }

            // Fetch and return updated user
            const result = await storeUsersService.getStoreUserById(storeId, userId);
            return result;
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : "Failed to update store user",
            };
        }
    },

    /**
     * Update employee details
     */
    updateEmployee: async (
        employeeId: string,
        updates: UpdateEmployeeRequest
    ): Promise<ServiceResponse<Employee>> => {
        try {
            const client = getClient();

            const { data, error } = await client
                .from("employees")
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", employeeId)
                .select()
                .single();

            if (error) {
                return { data: null, error: error.message };
            }

            return { data: data as unknown as Employee, error: null };
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : "Failed to update employee",
            };
        }
    },

    /**
     * Create a new employee record for an existing store user
     */
    createEmployeeForUser: async (
        storeId: string,
        storeUserId: string,
        email: string,
        data: {
            first_name: string;
            last_name: string;
            phone?: string;
            employee_type?: string;
            employment_status?: string;
            salary?: number;
            pay_frequency?: string;
            notes?: string;
        }
    ): Promise<ServiceResponse<Employee>> => {
        try {
            const client = getClient();

            // Auto-generate an employee code based on name + timestamp
            const prefix = `${data.first_name.slice(0, 2)}${data.last_name.slice(0, 2)}`.toUpperCase();
            const suffix = Date.now().toString().slice(-4);
            const employeeCode = `EMP-${prefix}${suffix}`;

            const { data: created, error } = await client
                .from("employees")
                .insert({
                    store_id: storeId,
                    store_user_id: storeUserId,
                    employee_code: employeeCode,
                    first_name: data.first_name,
                    last_name: data.last_name,
                    email,
                    phone: data.phone || "",
                    employee_type: (data.employee_type as EmployeeType) || "full_time" as EmployeeType,
                    employment_status: (data.employment_status as EmploymentStatus) || "probation" as EmploymentStatus,
                    joining_date: new Date().toISOString().slice(0, 10),
                    salary: data.salary,
                    pay_frequency: (data.pay_frequency as PayFrequency) || "monthly" as PayFrequency,
                })
                .select()
                .single();

            if (error) {
                return { data: null, error: error.message };
            }

            return { data: created as unknown as Employee, error: null };
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : "Failed to create employee record",
            };
        }
    },

    /**
     * Ban a user from the store
     */
    banUser: async (
        storeId: string,
        userId: string,
        request: BanUserRequest
    ): Promise<ServiceResponse<EnrichedStoreUser>> => {
        try {
            const client = getClient();

            const { error } = await client
                .from("store_users")
                .update({
                    is_banned: true,
                    banned_at: new Date().toISOString(),
                    banned_reason: request.reason,
                    banned_by: request.banned_by,
                    is_active: false,
                    updated_at: new Date().toISOString(),
                })
                .eq("store_id", storeId)
                .eq("user_id", userId);

            if (error) {
                return { data: null, error: error.message };
            }

            // Terminate all active sessions for this user
            await client
                .from("sessions")
                .update({
                    is_active: false,
                    terminated_at: new Date().toISOString(),
                    termination_reason: "User banned",
                })
                .eq("user_id", userId)
                .eq("store_id", storeId)
                .eq("is_active", true);

            const result = await storeUsersService.getStoreUserById(storeId, userId);
            return result;
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : "Failed to ban user",
            };
        }
    },

    /**
     * Unban a user
     */
    unbanUser: async (
        storeId: string,
        userId: string
    ): Promise<ServiceResponse<EnrichedStoreUser>> => {
        try {
            const client = getClient();

            const { error } = await client
                .from("store_users")
                .update({
                    is_banned: false,
                    banned_at: null,
                    banned_reason: null,
                    banned_by: null,
                    updated_at: new Date().toISOString(),
                })
                .eq("store_id", storeId)
                .eq("user_id", userId);

            if (error) {
                return { data: null, error: error.message };
            }

            const result = await storeUsersService.getStoreUserById(storeId, userId);
            return result;
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : "Failed to unban user",
            };
        }
    },

    /**
     * Activate or deactivate a user
     */
    setUserActive: async (
        storeId: string,
        userId: string,
        isActive: boolean
    ): Promise<ServiceResponse<EnrichedStoreUser>> => {
        try {
            const client = getClient();

            const { error } = await client
                .from("store_users")
                .update({
                    is_active: isActive,
                    updated_at: new Date().toISOString(),
                })
                .eq("store_id", storeId)
                .eq("user_id", userId);

            if (error) {
                return { data: null, error: error.message };
            }

            // If deactivating, terminate sessions
            if (!isActive) {
                await client
                    .from("sessions")
                    .update({
                        is_active: false,
                        terminated_at: new Date().toISOString(),
                        termination_reason: "User deactivated",
                    })
                    .eq("user_id", userId)
                    .eq("store_id", storeId)
                    .eq("is_active", true);
            }

            const result = await storeUsersService.getStoreUserById(storeId, userId);
            return result;
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : "Failed to update user status",
            };
        }
    },

    /**
     * Reset user access (unlock account, reset login attempts, etc.)
     */
    resetUserAccess: async (
        storeId: string,
        userId: string,
        request: ResetUserAccessRequest
    ): Promise<ServiceResponse<EnrichedStoreUser>> => {
        try {
            const client = getClient();

            const updates: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
            };

            if (request.reset_login_attempts) {
                updates.login_attempts = 0;
            }

            if (request.unlock_account) {
                updates.locked_until = null;
            }

            if (request.reset_2fa) {
                updates.two_factor_enabled = false;
                updates.two_factor_secret = null;
                updates.backup_codes = null;
            }

            if (request.clear_ban) {
                updates.is_banned = false;
                updates.banned_at = null;
                updates.banned_reason = null;
                updates.banned_by = null;
            }

            const { error } = await client
                .from("store_users")
                .update(updates)
                .eq("store_id", storeId)
                .eq("user_id", userId);

            if (error) {
                return { data: null, error: error.message };
            }

            const result = await storeUsersService.getStoreUserById(storeId, userId);
            return result;
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : "Failed to reset user access",
            };
        }
    },

    /**
     * Delete a user from the store (soft delete by deactivating)
     */
    removeStoreUser: async (
        storeId: string,
        userId: string
    ): Promise<ServiceResponse<null>> => {
        try {
            const client = getClient();

            // Get store_users.id so we can cascade-delete the employee record
            const { data: storeUserRow } = await client
                .from("store_users")
                .select("id")
                .eq("store_id", storeId)
                .eq("user_id", userId)
                .maybeSingle();

            // Delete employee record if one exists
            if (storeUserRow?.id) {
                await client
                    .from("employees")
                    .delete()
                    .eq("store_user_id", storeUserRow.id);
            }

            // Soft delete by deactivating
            const { error } = await client
                .from("store_users")
                .update({
                    is_active: false,
                    updated_at: new Date().toISOString(),
                })
                .eq("store_id", storeId)
                .eq("user_id", userId);

            if (error) {
                return { data: null, error: error.message };
            }

            // Terminate all sessions
            await client
                .from("sessions")
                .update({
                    is_active: false,
                    terminated_at: new Date().toISOString(),
                    termination_reason: "User removed from store",
                })
                .eq("user_id", userId)
                .eq("store_id", storeId)
                .eq("is_active", true);

            return { data: null, error: null };
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : "Failed to remove user",
            };
        }
    },

    /**
     * Get store user statistics
     */
    getStoreUserStats: async (
        storeId: string
    ): Promise<ServiceResponse<StoreUserStats>> => {
        try {
            const client = getClient();

            // Role/department/employment counts from the view (no extra joins needed)
            const { data: viewRows, error: viewError } = await client
                .from("v_employee_details")
                .select("role_id, role_name, department, employment_status")
                .eq("store_id", storeId);

            if (viewError) {
                return { data: null, error: viewError.message };
            }

            // Account-level counts come from store_users (includes users without employee records)
            const { data: suRows, error: suError } = await client
                .from("store_users")
                .select("is_active, is_banned, last_login_at")
                .eq("store_id", storeId);

            if (suError) {
                return { data: null, error: suError.message };
            }

            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            const stats: StoreUserStats = {
                total_users: suRows?.length ?? 0,
                active_users: suRows?.filter((u) => u.is_active).length ?? 0,
                banned_users: suRows?.filter((u) => u.is_banned).length ?? 0,
                inactive_users: suRows?.filter((u) => !u.is_active).length ?? 0,
                by_role: {} as Record<RoleName, number>,
                by_department: {} as Record<string, number>,
                by_employment_status: {} as Record<EmploymentStatus, number>,
                recent_logins: 0,
                never_logged_in: suRows?.filter((u) => !u.last_login_at).length ?? 0,
            };

            // Aggregate view rows (role, department, employment status)
            type StatRow = { role_name: RoleName; department: string | null; employment_status: EmploymentStatus | null };
            (viewRows ?? []).forEach((row) => {
                const r = row as StatRow;
                stats.by_role[r.role_name] = (stats.by_role[r.role_name] ?? 0) + 1;

                if (r.department) {
                    stats.by_department[r.department] =
                        (stats.by_department[r.department] ?? 0) + 1;
                }

                if (r.employment_status) {
                    stats.by_employment_status[r.employment_status] =
                        (stats.by_employment_status[r.employment_status] ?? 0) + 1;
                }
            });

            // Recent logins from store_users (has last_login_at)
            (suRows ?? []).forEach((u) => {
                if (u.last_login_at && new Date(u.last_login_at) > sevenDaysAgo) {
                    stats.recent_logins++;
                }
            });

            return { data: stats, error: null };
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : "Failed to fetch statistics",
            };
        }
    },

    /**
     * Get available roles that can be assigned by current user
     */
    getAvailableRoles: async (
        currentUserRole: RoleName
    ): Promise<ServiceResponse<AvailableRolesResponse>> => {
        try {
            const client = getClient();

            const { data: allRoles, error } = await client
                .from("roles")
                .select("*")
                .order("priority", { ascending: false });

            if (error) {
                return { data: null, error: error.message };
            }

            // Get current user's role priority
            const currentRole = allRoles?.find((r) => r.name === currentUserRole);
            const currentPriority = currentRole?.priority || 0;

            // Only allow assigning roles with lower or equal priority (except super_admin)
            const assignableRoles = allRoles
                ?.filter((role) =>
                    role.name !== "super_admin" &&
                    role.priority <= currentPriority
                )
                .map((role) => ({
                    id: role.id,
                    role_id: role.id,
                    role_name: role.name as RoleName,
                    role_display_name: role.display_name,
                    permissions: role.permissions,
                    priority: role.priority,
                    can_assign: true,
                })) || [];

            return {
                data: {
                    roles: assignableRoles,
                    current_user_role: currentUserRole,
                    current_user_priority: currentPriority,
                },
                error: null,
            };
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : "Failed to fetch roles",
            };
        }
    },

    /**
     * Bulk activate/deactivate users
     */
    bulkActivate: async (
        storeId: string,
        request: BulkActivateRequest
    ): Promise<ServiceResponse<BulkOperationResponse>> => {
        try {
            const results: BulkOperationResponse = {
                success: 0,
                failed: 0,
                errors: [],
            };

            for (const userId of request.user_ids) {
                const result = await storeUsersService.setUserActive(
                    storeId,
                    userId,
                    request.is_active
                );

                if (result.error) {
                    results.failed++;
                    results.errors.push({ user_id: userId, error: result.error });
                } else {
                    results.success++;
                }
            }

            return { data: results, error: null };
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : "Bulk operation failed",
            };
        }
    },

    /**
     * Bulk ban users
     */
    bulkBan: async (
        storeId: string,
        request: BulkBanRequest,
        bannedBy: string
    ): Promise<ServiceResponse<BulkOperationResponse>> => {
        try {
            const results: BulkOperationResponse = {
                success: 0,
                failed: 0,
                errors: [],
            };

            for (const userId of request.user_ids) {
                const result = await storeUsersService.banUser(storeId, userId, {
                    reason: request.reason,
                    banned_by: bannedBy,
                });

                if (result.error) {
                    results.failed++;
                    results.errors.push({ user_id: userId, error: result.error });
                } else {
                    results.success++;
                }
            }

            return { data: results, error: null };
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : "Bulk ban failed",
            };
        }
    },

    /**
     * Bulk change role
     */
    bulkChangeRole: async (
        storeId: string,
        request: BulkRoleChangeRequest
    ): Promise<ServiceResponse<BulkOperationResponse>> => {
        try {
            const results: BulkOperationResponse = {
                success: 0,
                failed: 0,
                errors: [],
            };

            for (const userId of request.user_ids) {
                const result = await storeUsersService.updateStoreUser(storeId, userId, {
                    role_id: request.role_id,
                });

                if (result.error) {
                    results.failed++;
                    results.errors.push({ user_id: userId, error: result.error });
                } else {
                    results.success++;
                }
            }

            return { data: results, error: null };
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : "Bulk role change failed",
            };
        }
    },
};
