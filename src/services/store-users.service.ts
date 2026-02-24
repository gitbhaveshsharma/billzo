import { createClient } from "@/lib/supabase/client";
import type { ServiceResponse } from "@/types/api.types";
import type {
    EnrichedStoreUser,
    StoreUser,
    Employee,
    AddStoreUserRequest,
    UpdateStoreUserRequest,
    UpdateEmployeeRequest,
    BanUserRequest,
    ActivateUserRequest,
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
    CreateEmployeeData,
} from "@/types/store-users.types";
import type { RoleName, EmploymentStatus } from "@/types/database.types";

const getClient = () => createClient();

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

            // Start with base query joining all necessary tables
            let query = client
                .from("store_users")
                .select(`
          *,
          profiles:user_id (
            email,
            full_name,
            phone,
            profile_picture
          ),
          roles:role_id (
            id,
            name,
            display_name,
            permissions,
            priority
          ),
          employees!store_user_id (
            *
          ),
          stores:store_id (
            id,
            name,
            store_code,
            status,
            organization_id,
            organizations:organization_id (
              id,
              name
            )
          )
        `, { count: "exact" })
                .eq("store_id", storeId);

            // Apply filters
            if (filters) {
                if (filters.role_id) {
                    query = query.eq("role_id", filters.role_id);
                }
                if (filters.department) {
                    query = query.eq("department", filters.department);
                }
                if (filters.is_active !== undefined) {
                    query = query.eq("is_active", filters.is_active);
                }
                if (filters.is_banned !== undefined) {
                    query = query.eq("is_banned", filters.is_banned);
                }
                if (filters.search) {
                    // Search across multiple fields
                    query = query.or(
                        `profiles.full_name.ilike.%${filters.search}%,` +
                        `profiles.email.ilike.%${filters.search}%,` +
                        `employees.employee_code.ilike.%${filters.search}%`
                    );
                }
            }

            // Apply pagination and sorting
            const page = pagination?.page || 1;
            const limit = pagination?.limit || 10;
            const sortBy = pagination?.sort_by || "created_at";
            const sortOrder = pagination?.sort_order || "desc";

            query = query
                .order(sortBy, { ascending: sortOrder === "asc" })
                .range((page - 1) * limit, page * limit - 1);

            const { data, error, count } = await query;

            if (error) {
                return { data: null, error: error.message };
            }

            // Transform data to EnrichedStoreUser format
            const users: EnrichedStoreUser[] = (data as any[] || []).map((item: any) => ({
                ...item,
                email: item.profiles?.email || "",
                full_name: item.profiles?.full_name || null,
                phone: item.profiles?.phone || null,
                profile_picture: item.profiles?.profile_picture || null,
                role_name: (item.roles?.name || "cashier") as RoleName,
                role_display_name: item.roles?.display_name || "",
                permissions: item.roles?.permissions || {},
                role_priority: item.roles?.priority || 0,
                employee: item.employees ? (item.employees as Employee) : null,
                employee_code: item.employees?.employee_code || undefined,
                organization_id: item.stores?.organization_id || "",
                organization_name: item.stores?.organizations?.name || "",
                store_name: item.stores?.name || "",
                store_code: item.stores?.store_code || "",
                store_status: item.stores?.status || "",
            }));

            const totalPages = count ? Math.ceil(count / limit) : 0;

            return {
                data: {
                    users,
                    total: count || 0,
                    page,
                    limit,
                    total_pages: totalPages,
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

    /**
     * Get a single store user by ID with enriched data
     */
    getStoreUserById: async (
        storeId: string,
        userId: string
    ): Promise<ServiceResponse<EnrichedStoreUser>> => {
        try {
            const client = getClient();

            const { data, error } = await client
                .from("store_users")
                .select(`
          *,
          profiles:user_id (
            email,
            full_name,
            phone,
            profile_picture
          ),
          roles:role_id (
            id,
            name,
            display_name,
            permissions,
            priority
          ),
          employees!store_user_id (
            *
          ),
          stores:store_id (
            id,
            name,
            store_code,
            status,
            organization_id,
            organizations:organization_id (
              id,
              name
            )
          )
        `)
                .eq("store_id", storeId)
                .eq("user_id", userId)
                .single();

            if (error) {
                return { data: null, error: error.message };
            }

            if (!data) {
                return { data: null, error: "User not found" };
            }

            // Transform to EnrichedStoreUser
            const result = data as any;
            const user: EnrichedStoreUser = {
                ...result,
                email: result.profiles?.email || "",
                full_name: result.profiles?.full_name || null,
                phone: result.profiles?.phone || null,
                profile_picture: result.profiles?.profile_picture || null,
                role_name: (result.roles?.name || "cashier") as RoleName,
                role_display_name: result.roles?.display_name || "",
                permissions: result.roles?.permissions || {},
                role_priority: result.roles?.priority || 0,
                employee: result.employees ? (result.employees as Employee) : null,
                employee_code: result.employees?.employee_code || undefined,
                organization_id: result.stores?.organization_id || "",
                organization_name: result.stores?.organizations?.name || "",
                store_name: result.stores?.name || "",
                store_code: result.stores?.store_code || "",
                store_status: result.stores?.status || "",
            };

            return { data: user, error: null };
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

            let userId: string;

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

            userId = existingProfile.id;

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

            return { data: data as any as Employee, error: null };
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
                    employee_type: data.employee_type as any || "full_time",
                    employment_status: data.employment_status as any || "probation",
                    joining_date: new Date().toISOString().slice(0, 10),
                    salary: data.salary,
                    pay_frequency: data.pay_frequency as any || "monthly",
                } as any)
                .select()
                .single();

            if (error) {
                return { data: null, error: error.message };
            }

            return { data: created as any as Employee, error: null };
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

            const updates: any = {
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

            // Get all store users
            const { data: users, error } = await client
                .from("store_users")
                .select(`
          *,
          roles:role_id (name),
          employees!store_user_id (employment_status)
        `)
                .eq("store_id", storeId);

            if (error) {
                return { data: null, error: error.message };
            }

            const stats: StoreUserStats = {
                total_users: users?.length || 0,
                active_users: users?.filter((u) => u.is_active).length || 0,
                banned_users: users?.filter((u) => u.is_banned).length || 0,
                inactive_users: users?.filter((u) => !u.is_active).length || 0,
                by_role: {} as Record<RoleName, number>,
                by_department: {} as Record<string, number>,
                by_employment_status: {} as Record<any, number>,
                recent_logins: 0,
                never_logged_in: users?.filter((u) => !u.last_login_at).length || 0,
            };

            // Count by role
            users?.forEach((user: any) => {
                const roleName = (user.roles?.name || "cashier") as RoleName;
                stats.by_role[roleName] = (stats.by_role[roleName] || 0) + 1;

                // Count by department
                if (user.department) {
                    stats.by_department[user.department] =
                        (stats.by_department[user.department] || 0) + 1;
                }

                // Count by employment status
                if (user.employees?.employment_status) {
                    const status = user.employees.employment_status as EmploymentStatus;
                    stats.by_employment_status[status] =
                        (stats.by_employment_status[status] || 0) + 1;
                }

                // Recent logins (last 7 days)
                if (user.last_login_at) {
                    const lastLogin = new Date(user.last_login_at);
                    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    if (lastLogin > sevenDaysAgo) {
                        stats.recent_logins++;
                    }
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
            const client = getClient();
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
