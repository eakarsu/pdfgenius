import { useAuth } from './index';

export function usePermission() {
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  const can = (resource, action) => {
    // Admin can do anything
    if (isAdmin) return true;

    // Default permissions for user role
    const defaultAllowed = {
      'documents:read': true,
      'documents:create': true,
      'documents:update': true,
      'documents:delete': true,
      'documents:export': true,
      'comparisons:read': true,
      'comparisons:create': true,
      'comparisons:delete': true,
      'tables:read': true,
      'tables:create': true,
      'tables:export': true,
      'forms:read': true,
      'forms:create': true,
      'forms:update': true,
      'ai:read': true,
      'ai:create': true,
      // Restricted for users
      'documents:bulk_delete': false,
      'comparisons:bulk_delete': false,
      'tables:bulk_delete': false,
      'forms:bulk_delete': false,
      'users:read': false,
      'users:update': false,
      'users:delete': false,
      'permissions:read': false,
      'permissions:update': false,
    };

    const key = `${resource}:${action}`;
    return defaultAllowed[key] !== false;
  };

  return { can, isAdmin };
}
