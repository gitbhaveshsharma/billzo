import type { EnrichedStoreUser, Employee, StoreUserStats } from "@/types/store-users.types";
import type { RoleName, EmploymentStatus, EmployeeType } from "@/types/database.types";
import { ROLE_PRIORITY } from "@/constants/roles";

// ============================================================================
// PERMISSION UTILITIES
// ============================================================================

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: EnrichedStoreUser, permission: string): boolean {
    if (!user.permissions) return false;

    const perms = user.permissions as Record<string, boolean>;
    return perms[permission] === true || perms.all === true;
}

/**
 * Check if a user can manage another user based on role hierarchy
 */
export function canManageUser(
    currentUser: EnrichedStoreUser,
    targetUser: EnrichedStoreUser
): boolean {
    // Super admin can manage everyone
    if (currentUser.role_name === "super_admin") return true;

    // Cannot manage users with equal or higher role priority
    const currentPriority = ROLE_PRIORITY[currentUser.role_name] || 0;
    const targetPriority = ROLE_PRIORITY[targetUser.role_name] || 0;

    return currentPriority > targetPriority;
}

/**
 * Check if a user can assign a specific role
 */
export function canAssignRole(currentUserRole: RoleName, targetRole: RoleName): boolean {
    // Super admin can assign any role except super_admin
    if (currentUserRole === "super_admin") {
        return targetRole !== "super_admin";
    }

    // Store admin can assign roles below their level
    if (currentUserRole === "store_admin") {
        return !["super_admin", "store_admin"].includes(targetRole);
    }

    // Manager can only assign cashier and inventory_manager
    if (currentUserRole === "manager") {
        return ["cashier", "inventory_manager"].includes(targetRole);
    }

    return false;
}

/**
 * Get permissions that current user can modify
 */
export function getModifiablePermissions(
    currentUserRole: RoleName
): string[] {
    const allPermissions = [
        "manage_employees",
        "view_employees",
        "manage_inventory",
        "view_inventory",
        "process_sales",
        "void_sales",
        "manage_customers",
        "view_reports",
        "manage_settings",
        "manage_roles",
        "manage_store",
    ];

    if (currentUserRole === "super_admin") {
        return allPermissions;
    }

    if (currentUserRole === "store_admin") {
        return allPermissions.filter((p) => p !== "manage_store");
    }

    if (currentUserRole === "manager") {
        return [
            "view_employees",
            "view_inventory",
            "process_sales",
            "view_reports",
        ];
    }

    return [];
}

// ============================================================================
// ROLE UTILITIES
// ============================================================================

/**
 * Get role display name
 */
export function getRoleDisplayName(roleName: RoleName): string {
    const roleNames: Record<RoleName, string> = {
        super_admin: "Super Admin",
        store_admin: "Store Admin",
        manager: "Manager",
        cashier: "Cashier",
        accountant: "Accountant",
        inventory_manager: "Inventory Manager",
    };

    return roleNames[roleName] || roleName;
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(roleName: RoleName): string {
    const colors: Record<RoleName, string> = {
        super_admin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
        store_admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        manager: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        accountant: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        inventory_manager: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
        cashier: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    };

    return colors[roleName] || colors.cashier;
}

/**
 * Sort roles by priority
 */
export function sortRolesByPriority(roles: RoleName[]): RoleName[] {
    return [...roles].sort((a, b) => {
        return (ROLE_PRIORITY[b] || 0) - (ROLE_PRIORITY[a] || 0);
    });
}

// ============================================================================
// STATUS UTILITIES
// ============================================================================

/**
 * Get employment status badge color
 */
export function getEmploymentStatusBadgeColor(status: EmploymentStatus): string {
    const colors: Record<EmploymentStatus, string> = {
        active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        probation: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        notice_period: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
        terminated: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        resigned: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
        absconded: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };

    return colors[status] || colors.active;
}

/**
 * Get employment status display name
 */
export function getEmploymentStatusDisplayName(status: EmploymentStatus): string {
    const names: Record<EmploymentStatus, string> = {
        active: "Active",
        probation: "On Probation",
        notice_period: "Notice Period",
        terminated: "Terminated",
        resigned: "Resigned",
        absconded: "Absconded",
    };

    return names[status] || status;
}

/**
 * Get user active status badge
 */
export function getUserStatusBadge(user: EnrichedStoreUser): {
    text: string;
    color: string;
} {
    if (user.is_banned) {
        return {
            text: "Banned",
            color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        };
    }

    if (!user.is_active) {
        return {
            text: "Inactive",
            color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
        };
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return {
            text: "Locked",
            color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
        };
    }

    return {
        text: "Active",
        color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    };
}

/**
 * Check if user account is locked
 */
export function isAccountLocked(user: EnrichedStoreUser): boolean {
    if (!user.locked_until) return false;
    return new Date(user.locked_until) > new Date();
}

// ============================================================================
// EMPLOYEE TYPE UTILITIES
// ============================================================================

/**
 * Get employee type display name
 */
export function getEmployeeTypeDisplayName(type: EmployeeType): string {
    const names: Record<EmployeeType, string> = {
        full_time: "Full Time",
        part_time: "Part Time",
        contractor: "Contractor",
        intern: "Intern",
        trainee: "Trainee",
    };

    return names[type] || type;
}

/**
 * Get employee type badge color
 */
export function getEmployeeTypeBadgeColor(type: EmployeeType): string {
    const colors: Record<EmployeeType, string> = {
        full_time: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        part_time: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
        contractor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        intern: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        trainee: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    };

    return colors[type] || colors.full_time;
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format salary with currency
 */
export function formatSalary(amount: number | null, currency = "INR"): string {
    if (amount === null || amount === undefined) return "Not set";

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Format phone number (Indian format)
 */
export function formatPhoneNumber(phone: string | null): string {
    if (!phone) return "N/A";

    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, "");

    // Format as +91 XXXXX XXXXX
    if (cleaned.length === 10) {
        return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }

    return phone;
}

/**
 * Format date
 */
export function formatDate(date: string | null, includeTime = false): string {
    if (!date) return "N/A";

    const d = new Date(date);

    if (includeTime) {
        return d.toLocaleString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    return d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | null): string {
    if (!date) return "Never";

    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return formatDate(date);
}

/**
 * Get user initials for avatar
 */
export function getUserInitials(fullName: string | null): string {
    if (!fullName) return "?";

    const parts = fullName.trim().split(" ");
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Get avatar background color based on name
 */
export function getAvatarColor(name: string | null): string {
    if (!name) return "bg-gray-500";

    const colors = [
        "bg-red-500",
        "bg-blue-500",
        "bg-green-500",
        "bg-yellow-500",
        "bg-purple-500",
        "bg-pink-500",
        "bg-indigo-500",
        "bg-teal-500",
    ];

    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate Aadhar number
 */
export function isValidAadhar(aadhar: string): boolean {
    return /^\d{12}$/.test(aadhar);
}

/**
 * Validate PAN number
 */
export function isValidPAN(pan: string): boolean {
    return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
}

/**
 * Validate phone number (Indian)
 */
export function isValidPhone(phone: string): boolean {
    return /^[6-9]\d{9}$/.test(phone);
}

/**
 * Validate IFSC code
 */
export function isValidIFSC(ifsc: string): boolean {
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
    return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/.test(email);
}

// ============================================================================
// STATISTICS UTILITIES
// ============================================================================

/**
 * Calculate user retention rate
 */
export function calculateRetentionRate(stats: StoreUserStats): number {
    if (stats.total_users === 0) return 0;

    const retained = stats.active_users - (stats.by_employment_status?.probation ?? 0);
    return Math.round((retained / stats.total_users) * 100);
}

/**
 * Calculate engagement rate (users who logged in recently)
 */
export function calculateEngagementRate(stats: StoreUserStats): number {
    if (stats.total_users === 0) return 0;

    return Math.round((stats.recent_logins / stats.total_users) * 100);
}

/**
 * Get role distribution percentage
 */
export function getRoleDistribution(stats: StoreUserStats): Array<{
    role: RoleName;
    count: number;
    percentage: number;
}> {
    const distribution = Object.entries(stats.by_role).map(([role, count]) => ({
        role: role as RoleName,
        count,
        percentage: stats.total_users > 0
            ? Math.round((count / stats.total_users) * 100)
            : 0,
    }));

    return distribution.sort((a, b) => b.count - a.count);
}

// ============================================================================
// FILTERING UTILITIES
// ============================================================================

/**
 * Filter users by search term
 */
export function filterUsersBySearch(
    users: EnrichedStoreUser[],
    searchTerm: string
): EnrichedStoreUser[] {
    if (!searchTerm) return users;

    const term = searchTerm.toLowerCase();

    return users.filter((user) =>
        user.full_name?.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.employee_code?.toLowerCase().includes(term) ||
        user.phone?.includes(term)
    );
}

/**
 * Sort users by field
 */
export function sortUsers(
    users: EnrichedStoreUser[],
    sortBy: "full_name" | "employee_code" | "created_at" | "last_login_at",
    order: "asc" | "desc" = "asc"
): EnrichedStoreUser[] {
    const sorted = [...users].sort((a, b) => {
        let aVal: any = a[sortBy];
        let bVal: any = b[sortBy];

        // Handle null values
        if (!aVal && !bVal) return 0;
        if (!aVal) return 1;
        if (!bVal) return -1;

        // String comparison
        if (typeof aVal === "string" && typeof bVal === "string") {
            return aVal.localeCompare(bVal);
        }

        // Number or date comparison
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
    });

    return order === "desc" ? sorted.reverse() : sorted;
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/**
 * Convert users to CSV format
 */
export function exportUsersToCSV(users: EnrichedStoreUser[]): string {
    const headers = [
        "Employee Code",
        "Full Name",
        "Email",
        "Phone",
        "Role",
        "Department",
        "Status",
        "Employment Status",
        "Joining Date",
        "Last Login",
    ];

    const rows = users.map((user) => [
        user.employee_code || "N/A",
        user.full_name || "N/A",
        user.email,
        user.phone || "N/A",
        user.role_display_name,
        user.department || "N/A",
        getUserStatusBadge(user).text,
        user.employee?.employment_status || "N/A",
        user.employee?.joining_date ? formatDate(user.employee.joining_date) : "N/A",
        user.last_login_at ? formatDate(user.last_login_at, true) : "Never",
    ]);

    const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================================================
// EMPLOYEE UTILITIES
// ============================================================================

/**
 * Calculate employee tenure in months
 */
export function calculateTenure(joiningDate: string | null): number {
    if (!joiningDate) return 0;

    const start = new Date(joiningDate);
    const now = new Date();

    const months =
        (now.getFullYear() - start.getFullYear()) * 12 +
        (now.getMonth() - start.getMonth());

    return Math.max(0, months);
}

/**
 * Format tenure
 */
export function formatTenure(months: number): string {
    if (months === 0) return "New";
    if (months < 12) return `${months} month${months > 1 ? "s" : ""}`;

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (remainingMonths === 0) {
        return `${years} year${years > 1 ? "s" : ""}`;
    }

    return `${years} year${years > 1 ? "s" : ""} ${remainingMonths} month${remainingMonths > 1 ? "s" : ""
        }`;
}

/**
 * Check if employee is on probation
 */
export function isOnProbation(employee: Employee | undefined): boolean {
    if (!employee) return false;

    if (employee.employment_status === "probation") return true;

    // Check if within probation period
    if (employee.confirmation_date) {
        return new Date(employee.confirmation_date) > new Date();
    }

    if (employee.joining_date && employee.probation_period_months) {
        const probationEnd = new Date(employee.joining_date);
        probationEnd.setMonth(probationEnd.getMonth() + employee.probation_period_months);
        return probationEnd > new Date();
    }

    return false;
}

/**
 * Calculate remaining probation days
 */
export function getRemainingProbationDays(employee: Employee | undefined): number {
    if (!employee || !isOnProbation(employee)) return 0;

    let probationEnd: Date;

    if (employee.confirmation_date) {
        probationEnd = new Date(employee.confirmation_date);
    } else if (employee.joining_date && employee.probation_period_months) {
        probationEnd = new Date(employee.joining_date);
        probationEnd.setMonth(probationEnd.getMonth() + employee.probation_period_months);
    } else {
        return 0;
    }

    const now = new Date();
    const diffMs = probationEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
}
