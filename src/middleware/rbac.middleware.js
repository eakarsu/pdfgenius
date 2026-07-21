const Permission = require('../models/Permission');

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
    throw new Error('Permission policy is unavailable');
  }
}

function authorize(resource, action) {
  return async (req, res, next) => {
    try {
      const userRole = req.user?.role || 'user';

      const cache = await loadPermissions();
      const key = `${userRole}:${resource}:${action}`;

      // Missing or unavailable policy data must never grant access.
      if (cache[key] !== true) {
        return res.status(403).json({
          error: 'Access denied',
          message: `You do not have permission to ${action} ${resource}`
        });
      }

      next();
    } catch (error) {
      console.error('RBAC error:', error);
      res.status(503).json({
        error: 'Authorization unavailable',
        message: 'Permission policy could not be evaluated'
      });
    }
  };
}

// Clear the cache (e.g., when permissions are updated)
function clearPermissionCache() {
  permissionCache = null;
  cacheExpiry = 0;
}

module.exports = { authorize, clearPermissionCache, loadPermissions };
