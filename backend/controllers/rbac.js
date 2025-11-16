// controllers/rbac.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Role names expected in Roles.name
const ROLES = {
  OWNER: 'Owner',
  ORG_ADMIN: 'Organization Admin',
  SITE_ADMIN: 'Site Admin',
};

// Load the app user and role based on Firebase UID carried in req.user (set by verifyToken)
async function getAppUser(req) {
  const firebaseUid = req.user?.uid; // set by verifyToken (Firebase Admin)
  if (!firebaseUid) return null;
  return prisma.users.findUnique({
    where: { firebaseUid },
    include: {
      role: true,
      userGroups: { include: { group: true } },
    },
  });
}

// Check if user has role name
function hasRole(user, roleName) {
  return user?.role?.name === roleName;
}

/**
 * Building-level manage check
 * - Owner: can manage all buildings
 * - Org Admin: can manage buildings explicitly granted via GlobalPermissions (by their groups)
 * - Site Admin: same building-level rule (requires explicit building GP)
 */
async function canManageBuilding(user, buildingId) {
  if (!user) return false;
  if (hasRole(user, ROLES.OWNER)) return true;

  const biBuildingId = BigInt(String(buildingId));
  const groupIds = (user.userGroups || []).map(ug => ug.groupId);
  if (groupIds.length === 0) return false;

  if (hasRole(user, ROLES.ORG_ADMIN) || hasRole(user, ROLES.SITE_ADMIN)) {
    const gp = await prisma.globalPermissions.findFirst({
      where: { buildingId: biBuildingId, groupId: { in: groupIds } },
      select: { id: true },
    });
    return !!gp;
  }

  return false;
}

/**
 * Floor-level manage check (STRICT floor-only for Org Admin)
 * - Owner: can manage all floors
 * - Org Admin: can manage a floor only if there is a direct GlobalPermissions entry for that floorId (no building inheritance)
 * - Site Admin: (current behavior) may manage floors if their groups have building-level GP; change to strict floor-only if desired
 */
async function canManageFloor(user, floorId) {
  if (!user) return false;
  if (hasRole(user, ROLES.OWNER)) return true;

  const floor = await prisma.floors.findUnique({
    where: { id: BigInt(String(floorId)) },
    select: { id: true, buildingId: true },
  });
  if (!floor) return false;

  const groupIds = (user.userGroups || []).map(ug => ug.groupId);
  if (groupIds.length === 0) return false;

  // Org Admin: STRICT floor-only (must have direct GP for this floor)
  if (hasRole(user, ROLES.ORG_ADMIN)) {
    const gp = await prisma.globalPermissions.findFirst({
      where: {
        floorId: floor.id,         // only direct floor grants
        groupId: { in: groupIds },
      },
      select: { id: true },
    });
    return !!gp;
  }

  // Site Admin: current rule uses building-level GP
  // To make Site Admin also strict floor-only, replace buildingId check with floorId (like Org Admin above).
  if (hasRole(user, ROLES.SITE_ADMIN)) {
    const gp = await prisma.globalPermissions.findFirst({
      where: {
        buildingId: floor.buildingId, // current behavior: via building GP
        groupId: { in: groupIds },
      },
      select: { id: true },
    });
    return !!gp;
  }

  return false;
}

module.exports = {
  ROLES,
  getAppUser,
  hasRole,
  canManageBuilding,
  canManageFloor,
};
