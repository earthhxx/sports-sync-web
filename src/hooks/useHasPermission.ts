import { useAuthStore } from '@/store/useAuthStore';
import { hasPermission } from '@/lib/auth-utils';

/**
 * Custom React hook to check if the current logged-in user has the given permission(s).
 */
export function useHasPermission(permission: string | string[]): boolean {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return false;
  }

  return hasPermission(user, permission);
}
