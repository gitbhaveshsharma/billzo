// ============================================================================
// Permission Utility Functions
// ============================================================================

/** Check whether userPermissions includes a specific permission */
export function checkPermission(
  userPermissions: string[],
  required: string
): boolean {
  return userPermissions.includes(required);
}

/** Check whether userPermissions includes ALL required permissions (AND) */
export function checkAllPermissions(
  userPermissions: string[],
  required: string[]
): boolean {
  return required.every((p) => userPermissions.includes(p));
}

/** Check whether userPermissions includes ANY of the required permissions (OR) */
export function checkAnyPermission(
  userPermissions: string[],
  required: string[]
): boolean {
  return required.some((p) => userPermissions.includes(p));
}
