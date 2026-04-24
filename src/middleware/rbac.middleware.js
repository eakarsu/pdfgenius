const { Permission } = require('../models');

// In-memory permission cache
let permissionCache = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadPermissions() {
  const now = Date.now();
  if (permissionCache && now < cacheExpiry) {
    return permissionCache;
  }

  try {
    const permissions = await Permission.findAll();
    permissionCache = {};

    for (const perm of permissions) {
      const key = `${perm.role}:${perm.resource}:${perm.action}`;
      permissionCache[key] = perm.allowed;
    }

    cacheExpiry = now + CACHE_TTL;
    return permissionCache;
  } catch (error) {
    console.error('Failed to load permissions:', error.message);
    return permissionCache || {};
  }
}

function authorize(resource, action) {
  return async (req, res, next) => {
    try {
      const userRole = req.user?.role || 'user';

      // Admin always has access
      if (userRole === 'admin') {
        return next();
      }

      const cache = await loadPermissions();
      const key = `${userRole}:${resource}:${action}`;

      // If permission is explicitly denied
      if (cache[key] === false) {
        return res.status(403).json({
          error: 'Access denied',
          message: `You do not have permission to ${action} ${resource}`
        });
      }

      // Allow by default if no explicit deny
      next();
    } catch (error) {
      console.error('RBAC error:', error);
      next(); // Fail open
    }
  };
}

// Clear the cache (e.g., when permissions are updated)
function clearPermissionCache() {
  permissionCache = null;
  cacheExpiry = 0;
}

module.exports = { authorize, clearPermissionCache, loadPermissions };
