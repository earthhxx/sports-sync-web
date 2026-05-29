export interface UserPayload {
  roles?: string[];
  permissions?: string[];
}

/**
 * Checks if a user has a specific permission or at least one of the list of permissions.
 * Supports Super Admin bypass (users with ADMIN role or manage:all permission).
 */
export function hasPermission(
  user: UserPayload | null,
  permission: string | string[]
): boolean {
  if (!user) return false;

  // Super Admin Bypass: ADMIN role or manage:all permission
  if (user.roles?.includes('ADMIN') || user.permissions?.includes('manage:all')) {
    return true;
  }

  const permissionsToCheck = Array.isArray(permission) ? permission : [permission];
  return permissionsToCheck.some((p) => user.permissions?.includes(p));
}
