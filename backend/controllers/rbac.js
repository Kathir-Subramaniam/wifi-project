// controllers/rbac.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Role names expected in Roles.name
const ROLES = {
  OWNER: 'Owner',
  ORG_ADMIN: 'Organisation Admin',
  SITE_ADMIN: 'Site Admin',
};

// Load the app user and role based on Firebase UID carried in req.user (set by verifyToken)
async function getAppUser(req) {
  // req.user.uid is from Firebase Admin verification
  const firebaseUid = req.user?.uid;
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

// Given a user and target resource, decide permissions.
// Rules:
// - Owner: can manage everything.
// - Organisation Admin: can edit all floors/AP/devices of groups they belong to. Use GlobalPermissions table to map groups to floors/buildings.
// - Site Admin: can edit everything related to all floors of that organisation in one specific building (via GlobalPermissions group + building).
async function canManageBuilding(user, buildingId) {
  if (!user) return false;
  if (hasRole(user, ROLES.OWNER)) return true;

  // Organisation Admin: any building having GlobalPermissions with group in user's groups
  if (hasRole(user, ROLES.ORG_ADMIN)) {
    const groupIds = user.userGroups.map(ug => ug.groupId);
    if (groupIds.length === 0) return false;
    const gp = await prisma.globalPermissions.findFirst({
      where: { buildingId: BigInt(buildingId), groupId: { in: groupIds } },
      select: { id: true },
    });
    return !!gp;
  }

  // Site Admin: must have a GlobalPermissions linking their group AND the specific building
  if (hasRole(user, ROLES.SITE_ADMIN)) {
    const groupIds = user.userGroups.map(ug => ug.groupId);
    if (groupIds.length === 0) return false;
    const gp = await prisma.globalPermissions.findFirst({
      where: { buildingId: BigInt(buildingId), groupId: { in: groupIds } },
      select: { id: true },
    });
    return !!gp;
  }
  return false;
}

async function canManageFloor(user, floorId) {
  if (!user) return false;
  if (hasRole(user, ROLES.OWNER)) return true;

  const floor = await prisma.floors.findUnique({
    where: { id: BigInt(floorId) },
    select: { id: true, buildingId: true },
  });
  if (!floor) return false;

  // ORG_ADMIN: floor is manageable if any GlobalPermissions entry ties user's groups to the same floor OR building
  if (hasRole(user, ROLES.ORG_ADMIN)) {
    const groupIds = user.userGroups.map(ug => ug.groupId);
    if (groupIds.length === 0) return false;
    const gp = await prisma.globalPermissions.findFirst({
      where: {
        OR: [
          { floorId: floor.id, groupId: { in: groupIds } },
          { buildingId: floor.buildingId, groupId: { in: groupIds } },
        ],
      },
      select: { id: true },
    });
    return !!gp;
  }

  // SITE_ADMIN: can manage floors only if GP matches their group AND the building of that floor
  if (hasRole(user, ROLES.SITE_ADMIN)) {
    const groupIds = user.userGroups.map(ug => ug.groupId);
    if (groupIds.length === 0) return false;
    const gp = await prisma.globalPermissions.findFirst({
      where: { buildingId: floor.buildingId, groupId: { in: groupIds } },
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
