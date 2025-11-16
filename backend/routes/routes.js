const express = require("express");
const router = express.Router();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const firebaseAuthController = require("../controllers/firebase-auth-controller");
const verifyToken = require("../middleware");
const PostsController = require("../controllers/posts-controller.js");
const { admin } = require("../config/firebase");
const {
  getAppUser,
  canManageBuilding,
  canManageFloor,
} = require("../controllers/rbac");

// Helpers
const toBi = (v) => {
  const s = String(v);
  if (!/^\d+$/.test(s)) throw new Error(`Invalid ID: ${s}`);
  return BigInt(s);
};

// Auth routes
router.post("/api/register", firebaseAuthController.registerUser);
router.post("/api/login", firebaseAuthController.loginUser);
router.post("/api/logout", firebaseAuthController.logoutUser);
router.post("/api/reset-password", firebaseAuthController.resetPassword);

// Example protected posts
router.get("/api/posts", verifyToken, PostsController.getPosts);

// Groups
router.get("/api/admin/groups", verifyToken, async (req, res) => {
  try {
    const gs = await prisma.groups.findMany({ orderBy: { id: "asc" } });
    res.json(gs.map((g) => ({ id: g.id.toString(), name: g.name })));
  } catch (e) {
    res.status(500).json({ error: "Failed to list groups" });
  }
});

router.post("/api/admin/groups", verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const g = await prisma.groups.create({ data: { name } });
    res.json({ id: g.id.toString(), name: g.name });
  } catch (e) {
    const msg = /Unique|unique/.test(e.message)
      ? "Group already exists"
      : "Failed to create group";
    res.status(400).json({ error: msg });
  }
});

router.put("/api/admin/groups/:id", verifyToken, async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    const { name } = req.body;
    const g = await prisma.groups.update({ where: { id }, data: { name } });
    res.json({ id: g.id.toString(), name: g.name });
  } catch (e) {
    res.status(500).json({ error: "Failed to update group" });
  }
});

router.delete("/api/admin/groups/:id", verifyToken, async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    await prisma.groups.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete group" });
  }
});

// GlobalPermissions
router.get('/api/admin/global-permissions', verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const roleName = user?.role?.name || '';

    // Owner: see everything
    if (roleName === 'Owner') {
      const rows = await prisma.globalPermissions.findMany({
        include: { group: true, building: true, floor: true },
        orderBy: { id: 'asc' },
      });
      return res.json(rows.map(rec => ({
        id: String(rec.id),
        groupId: String(rec.groupId),
        buildingId: String(rec.buildingId),
        floorId: String(rec.floorId),
        groupName: rec.group?.name || null,
        buildingName: rec.building?.name || null,
        floorName: rec.floor?.name || null,
      })));
    }

    // Org Admin: scope by their groups
    if (roleName === 'Organization Admin') {
      const myGroupIds = (user.userGroups || []).map(ug => ug.groupId);
      if (myGroupIds.length === 0) {
        return res.json([]); // nothing to show
      }
      const rows = await prisma.globalPermissions.findMany({
        where: { groupId: { in: myGroupIds } },
        include: { group: true, building: true, floor: true },
        orderBy: { id: 'asc' },
      });
      return res.json(rows.map(rec => ({
        id: String(rec.id),
        groupId: String(rec.groupId),
        buildingId: String(rec.buildingId),
        floorId: String(rec.floorId),
        groupName: rec.group?.name || null,
        buildingName: rec.building?.name || null,
        floorName: rec.floor?.name || null,
      })));
    }

    // Others: forbidden
    return res.status(403).json({ error: 'Forbidden' });
  } catch (e) {
    console.error('GET /api/admin/global-permissions error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post("/api/admin/global-permissions", verifyToken, async (req, res) => {
  try {
    const toBi = (s) => BigInt(String(s));
    const { groupId, buildingId, floorId } = req.body;
    if (!groupId || !buildingId || !floorId) {
      return res
        .status(400)
        .json({ error: "groupId, buildingId, floorId required" });
    }
    const created = await prisma.globalPermissions.create({
      data: {
        groupId: toBi(groupId),
        buildingId: toBi(buildingId),
        floorId: toBi(floorId),
      },
      include: { group: true, building: true, floor: true },
    });
    res.json({
      id: created.id.toString(),
      groupId: created.groupId.toString(),
      groupName: created.group?.name || null,
      buildingId: created.buildingId.toString(),
      buildingName: created.building?.name || null,
      floorId: created.floorId.toString(),
      floorName: created.floor?.name || null,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to create global permission" });
  }
});

router.delete(
  "/api/admin/global-permissions/:id",
  verifyToken,
  async (req, res) => {
    try {
      const id = BigInt(req.params.id);
      await prisma.globalPermissions.delete({ where: { id } });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete global permission" });
    }
  }
);

// Buildings
router.get("/api/admin/buildings", verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    let buildings;
    if (user.role?.name === "Owner") {
      buildings = await prisma.buildings.findMany({ orderBy: { id: "asc" } });
    } else {
      const groupIds = user.userGroups.map((ug) => ug.groupId);
      buildings = await prisma.buildings.findMany({
        where: { globalPermissions: { some: { groupId: { in: groupIds } } } },
        orderBy: { id: "asc" },
      });
    }
    res.json(buildings.map((b) => ({ id: b.id.toString(), name: b.name })));
  } catch (e) {
    console.error("GET /api/admin/buildings failed", e);
    res.status(500).json({ error: "Failed to list buildings" });
  }
});

router.post("/api/admin/buildings", verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: "Unauthorized" });
    if (user.role?.name !== "Owner")
      return res.status(403).json({ error: "Only Owner can create buildings" });

    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });

    const b = await prisma.buildings.create({ data: { name } });
    res.json({ id: b.id.toString(), name: b.name });
  } catch (e) {
    console.error("POST /api/admin/buildings failed", e);
    res.status(500).json({ error: "Failed to create building" });
  }
});

router.put("/api/admin/buildings/:id", verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    const id = req.params.id;
    if (!user) return res.status(403).json({ error: "Unauthorized" });
    if (user.role?.name !== "Owner")
      return res.status(403).json({ error: "Only Owner can Edit Building" });

    const { name } = req.body;
    const b = await prisma.buildings.update({
      where: { id: toBi(id) },
      data: { name },
    });
    res.json({ id: b.id.toString(), name: b.name });
  } catch (e) {
    console.error("PUT /api/admin/buildings/:id failed", e);
    res.status(500).json({ error: "Failed to update building" });
  }
});

router.delete("/api/admin/buildings/:id", verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    const id = req.params.id;
    if (!user || user.role?.name !== "Owner")
      return res.status(403).json({ error: "Only Owner can delete buildings" });

    await prisma.buildings.delete({ where: { id: toBi(id) } });
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/buildings/:id failed", e);
    res.status(500).json({ error: "Failed to delete building" });
  }
});

// Floors
router.get("/api/admin/floors", verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    let floors;
    if (user.role?.name === "Owner") {
      floors = await prisma.floors.findMany({
        include: { building: true },
        orderBy: { id: "asc" },
      });
    } else {
      const groupIds = user.userGroups.map((ug) => ug.groupId);
      floors = await prisma.floors.findMany({
        where: {
          OR: [
            { globalPermissions: { some: { groupId: { in: groupIds } } } },
            {
              building: {
                globalPermissions: { some: { groupId: { in: groupIds } } },
              },
            },
          ],
        },
        include: { building: true },
        orderBy: { id: "asc" },
      });
    }
    res.json(
      floors.map((f) => ({
        id: f.id.toString(),
        name: f.name,
        buildingId: f.buildingId.toString(),
        buildingName: f.building?.name ?? null,
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/floors failed", e);
    res.status(500).json({ error: "Failed to list floors" });
  }
});

router.post("/api/admin/floors", verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    const { name, svgMap, buildingId } = req.body;
    if (!name || !svgMap || !buildingId)
      return res
        .status(400)
        .json({ error: "name, svgMap, buildingId required" });

    if (!(await canManageBuilding(user, buildingId)))
      return res.status(403).json({ error: "Forbidden for building" });

    const f = await prisma.floors.create({
      data: { name, svgMap, buildingId: toBi(buildingId) },
    });
    res.json({
      id: f.id.toString(),
      name: f.name,
      buildingId: f.buildingId.toString(),
    });
  } catch (e) {
    console.error("POST /api/admin/floors failed", e);
    res.status(500).json({ error: "Failed to create floor" });
  }
});

router.put("/api/admin/floors/:id", verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    const id = req.params.id;
    if (!user) return res.status(403).json({ error: "Unauthorized" });
    if (!(await canManageFloor(user, id)))
      return res.status(403).json({ error: "Forbidden" });

    const { name, svgMap } = req.body;
    const f = await prisma.floors.update({
      where: { id: toBi(id) },
      data: { ...(name && { name }), ...(svgMap && { svgMap }) },
    });
    res.json({ id: f.id.toString(), name: f.name });
  } catch (e) {
    console.error("PUT /api/admin/floors/:id failed", e);
    res.status(500).json({ error: "Failed to update floor" });
  }
});

router.delete("/api/admin/floors/:id", verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    const id = req.params.id;
    if (!user) return res.status(403).json({ error: "Unauthorized" });
    if (!(await canManageFloor(user, id)) && user.role?.name !== "Owner")
      return res.status(403).json({ error: "Forbidden" });

    await prisma.floors.delete({ where: { id: toBi(id) } });
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/floors/:id failed", e);
    res.status(500).json({ error: "Failed to delete floor" });
  }
});

// APs
router.get("/api/admin/aps", verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    const aps = await prisma.aPs.findMany({
      include: { floor: { include: { building: true } } },
      orderBy: { id: "asc" },
    });

    const filtered = [];
    for (const ap of aps) {
      if (
        user.role?.name === "Owner" ||
        (await canManageFloor(user, ap.floorId))
      ) {
        filtered.push({
          id: ap.id.toString(),
          name: ap.name,
          cx: ap.cx,
          cy: ap.cy,
          floorId: ap.floorId.toString(),
          buildingId: ap.floor.buildingId.toString(),
        });
      }
    }
    res.json(filtered);
  } catch (e) {
    console.error("GET /api/admin/aps failed", e);
    res.status(500).json({ error: "Failed to list APs" });
  }
});

router.post("/api/admin/aps", verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    const { name, cx, cy, floorId } = req.body;
    if (!name || cx == null || cy == null || !floorId)
      return res.status(400).json({ error: "name, cx, cy, floorId required" });

    if (!(await canManageFloor(user, floorId)))
      return res.status(403).json({ error: "Forbidden for floor" });

    const ap = await prisma.aPs.create({
      data: { name, cx: Number(cx), cy: Number(cy), floorId: toBi(floorId) },
    });
    res.json({ id: ap.id.toString(), name: ap.name });
  } catch (e) {
    console.error("POST /api/admin/aps failed", e);
    res.status(500).json({ error: "Failed to create AP" });
  }
});

router.put("/api/admin/aps/:id", verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    const apId = req.params.id;
    const ap = await prisma.aPs.findUnique({ where: { id: toBi(apId) } });
    if (!ap) return res.status(404).json({ error: "AP not found" });
    if (!(await canManageFloor(user, ap.floorId)))
      return res.status(403).json({ error: "Forbidden" });

    const { name, cx, cy } = req.body;
    const updated = await prisma.aPs.update({
      where: { id: toBi(apId) },
      data: {
        ...(name && { name }),
        ...(cx != null && { cx: Number(cx) }),
        ...(cy != null && { cy: Number(cy) }),
      },
    });
    res.json({ id: updated.id.toString(), name: updated.name });
  } catch (e) {
    console.error("PUT /api/admin/aps/:id failed", e);
    res.status(500).json({ error: "Failed to update AP" });
  }
});

router.delete("/api/admin/aps/:id", verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    const apId = req.params.id;
    const ap = await prisma.aPs.findUnique({ where: { id: toBi(apId) } });
    if (!ap) return res.status(404).json({ error: "AP not found" });
    if (
      !(await canManageFloor(user, ap.floorId)) &&
      user.role?.name !== "Owner"
    )
      return res.status(403).json({ error: "Forbidden" });

    await prisma.aPs.delete({ where: { id: toBi(apId) } });
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/aps/:id failed", e);
    res.status(500).json({ error: "Failed to delete AP" });
  }
});

// Devices (Clients)
router.get("/api/admin/devices", verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    const devices = await prisma.clients.findMany({
      include: { ap: { include: { floor: true } } },
      orderBy: { id: "asc" },
    });

    const filtered = [];
    for (const d of devices) {
      if (
        user.role?.name === "Owner" ||
        (await canManageFloor(user, d.ap.floorId))
      ) {
        filtered.push({
          id: d.id.toString(),
          mac: d.mac,
          apId: d.apId.toString(),
          floorId: d.ap.floorId.toString(),
          createdAt: d.createdAt,
        });
      }
    }
    res.json(filtered);
  } catch (e) {
    console.error("GET /api/admin/devices failed", e);
    res.status(500).json({ error: "Failed to list devices" });
  }
});

router.post("/api/admin/devices", verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    const { mac, apId } = req.body;
    if (!mac || !apId)
      return res.status(400).json({ error: "mac and apId required" });

    const ap = await prisma.aPs.findUnique({ where: { id: toBi(apId) } });
    if (!ap) return res.status(404).json({ error: "AP not found" });
    if (!(await canManageFloor(user, ap.floorId)))
      return res.status(403).json({ error: "Forbidden" });

    const created = await prisma.clients.create({
      data: { mac, apId: toBi(apId) },
    });
    res.json({ id: created.id.toString(), mac: created.mac });
  } catch (e) {
    console.error("POST /api/admin/devices failed", e);
    res.status(500).json({ error: "Failed to create device" });
  }
});

router.put("/api/admin/devices/:id", verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    const id = req.params.id;
    const toBi = (v) => {
      const s = String(v);
      if (!/^\d+$/.test(s)) throw new Error(`Invalid ID: ${s}`);
      return BigInt(s);
    };

    // Load existing device with its floor to check permissions
    const existing = await prisma.clients.findUnique({
      where: { id: toBi(id) },
      include: { ap: { select: { id: true, floorId: true } } },
    });
    if (!existing) return res.status(404).json({ error: "Device not found" });

    if (!(await canManageFloor(user, existing.ap.floorId))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { mac, apId } = req.body;
    const data = {};

    if (mac != null) {
      data.mac = mac;
    }

    if (apId != null) {
      const targetAp = await prisma.aPs.findUnique({
        where: { id: toBi(apId) },
        select: { id: true, floorId: true },
      });
      if (!targetAp) return res.status(404).json({ error: "AP not found" });

      if (!(await canManageFloor(user, targetAp.floorId))) {
        return res.status(403).json({ error: "Forbidden for target floor" });
      }

      data.apId = toBi(apId);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const updated = await prisma.clients.update({
      where: { id: toBi(id) },
      data,
      include: { ap: { select: { floorId: true } } },
    });

    res.json({
      id: updated.id.toString(),
      mac: updated.mac,
      apId: updated.apId.toString(),
      floorId: updated.ap?.floorId?.toString?.() ?? undefined,
    });
  } catch (e) {
    console.error("PUT /api/admin/devices/:id failed", e);
    const msg = /Unique|unique/i.test(e.message)
      ? "MAC already exists"
      : "Failed to update device";
    res.status(400).json({ error: msg });
  }
});

router.delete("/api/admin/devices/:id", verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    const id = req.params.id;
    const device = await prisma.clients.findUnique({
      where: { id: toBi(id) },
      include: { ap: { select: { floorId: true } } },
    });
    if (!device) return res.status(404).json({ error: "Device not found" });
    if (
      !(await canManageFloor(user, device.ap.floorId)) &&
      user.role?.name !== "Owner"
    )
      return res.status(403).json({ error: "Forbidden" });

    await prisma.clients.delete({ where: { id: toBi(id) } });
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/devices/:id failed", e);
    res.status(500).json({ error: "Failed to delete device" });
  }
});

router.get("/api/profile", verifyToken, async (req, res) => {
  try {
    const u = await prisma.users.findUnique({
      where: { firebaseUid: req.user.uid },
      include: {
        role: true,
        userGroups: { include: { group: true } }, // optional; remove if you don’t need it
      },
    });
    if (!u) return res.status(403).json({ error: "Unauthorized" });

    res.json({
      user: {
        id: u.id.toString(),
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role ? { id: u.role.id.toString(), name: u.role.name } : null,
        // include more fields as needed, but keep it BigInt-safe:
        groups: u.userGroups?.map(g => ({ id: g.group.id.toString(), name: g.group.name })) ?? [],
      },
    });
  } catch (e) {
    console.error("GET /api/profile failed", e);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// In server.js (or routes):
router.put("/api/profile", verifyToken, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const u = await prisma.users.update({
      where: { firebaseUid: req.user.uid },
      data: {
        ...(firstName != null && { firstName }),
        ...(lastName != null && { lastName }),
      },
      select: { id: true, firstName: true, lastName: true },
    });
    res.json({
      id: u.id.toString(),
      firstName: u.firstName,
      lastName: u.lastName,
    });
  } catch (e) {
    console.error("PUT /api/profile failed", e);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// GET current user's owned devices
router.get("/api/profile/devices", verifyToken, async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { firebaseUid: req.user.uid },
      select: { id: true },
    });
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    const devs = await prisma.userDevices.findMany({
      where: { userId: user.id },
      orderBy: { id: "asc" },
      select: { id: true, name: true, mac: true },
    });

    res.json(
      devs.map((d) => ({ id: d.id.toString(), name: d.name, mac: d.mac }))
    );
  } catch (e) {
    console.error("GET /api/profile/devices failed", e);
    res.status(500).json({ error: "Failed to load devices" });
  }
});

// POST create owned device
router.post("/api/profile/devices", verifyToken, async (req, res) => {
  try {
    const { name, mac } = req.body;
    if (!name || !mac)
      return res.status(400).json({ error: "name and mac required" });

    const user = await prisma.users.findUnique({
      where: { firebaseUid: req.user.uid },
      select: { id: true },
    });
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    const created = await prisma.userDevices.create({
      data: { name, mac, userId: user.id },
      select: { id: true, name: true, mac: true },
    });

    res.json({
      id: created.id.toString(),
      name: created.name,
      mac: created.mac,
    });
  } catch (e) {
    console.error("POST /api/profile/devices failed", e);
    // Unique MACs will throw; reflect as 400 for UX
    const msg = /Unique|unique/i.test(e.message)
      ? "MAC already exists"
      : "Failed to create device";
    res.status(400).json({ error: msg });
  }
});

// PUT update owned device (name/mac)
router.put("/api/profile/devices/:id", verifyToken, async (req, res) => {
  try {
    const id = toBi(req.params.id);
    const { name, mac } = req.body;

    const user = await prisma.users.findUnique({
      where: { firebaseUid: req.user.uid },
      select: { id: true },
    });
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    const dev = await prisma.userDevices.findUnique({ where: { id } });
    if (!dev) return res.status(404).json({ error: "Device not found" });
    if (dev.userId !== user.id)
      return res.status(403).json({ error: "Forbidden" });

    const upd = await prisma.userDevices.update({
      where: { id },
      data: {
        ...(name != null && { name }),
        ...(mac != null && { mac }),
      },
      select: { id: true, name: true, mac: true },
    });

    res.json({ id: upd.id.toString(), name: upd.name, mac: upd.mac });
  } catch (e) {
    console.error("PUT /api/profile/devices/:id failed", e);
    const msg = /Unique|unique/i.test(e.message)
      ? "MAC already exists"
      : "Failed to update device";
    res.status(400).json({ error: msg });
  }
});

// DELETE owned device
router.delete("/api/profile/devices/:id", verifyToken, async (req, res) => {
  try {
    const id = toBi(req.params.id);

    const user = await prisma.users.findUnique({
      where: { firebaseUid: req.user.uid },
      select: { id: true },
    });
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    const dev = await prisma.userDevices.findUnique({ where: { id } });
    if (!dev) return res.status(404).json({ error: "Device not found" });
    if (dev.userId !== user.id)
      return res.status(403).json({ error: "Forbidden" });

    await prisma.userDevices.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/profile/devices/:id failed", e);
    res.status(500).json({ error: "Failed to delete device" });
  }
});

// List roles for dropdown
router.get("/api/admin/roles", verifyToken, async (req, res) => {
  try {
    const roles = await prisma.roles.findMany({ orderBy: { id: "asc" } });
    res.json(roles.map((r) => ({ id: r.id.toString(), name: r.name })));
  } catch (e) {
    res.status(500).json({ error: "Failed to list roles" });
  }
});

// List pending users (role = "Pending User")
router.get("/api/admin/pending-users", verifyToken, async (req, res) => {
  try {
    // Authorization: Allow only Owner
    const me = await prisma.users.findUnique({
      where: { firebaseUid: req.user.uid },
      include: { role: true },
    });
    if (!me || me.role?.name !== "Owner")
      return res.status(403).json({ error: "Forbidden" });

    const pendingRole = await prisma.roles.findFirst({
      where: { name: "Pending User" },
    });
    if (!pendingRole) return res.json([]);

    const users = await prisma.users.findMany({
      where: { roleId: pendingRole.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, createdAt: true },
    });
    res.json(
      users.map((u) => ({
        id: u.id.toString(),
        email: u.email,
        createdAt: u.createdAt,
      }))
    );
  } catch (e) {
    res.status(500).json({ error: "Failed to list pending users" });
  }
});

// Assign role + group to a pending user
// REPLACE-ALL: assign role and replace groups set with groupIds[]
router.post(
  "/api/admin/pending-users/:id/assign",
  verifyToken,
  async (req, res) => {
    try {
      // const owner = await ensureOwner(req, prisma);
      // if (!owner) return res.status(403).json({ error: 'Forbidden' });

      const userId = toBi(req.params.id);
      const { roleId, groupIds } = req.body || {};

      if (!roleId || !Array.isArray(groupIds) || groupIds.length === 0) {
        return res
          .status(400)
          .json({ error: "roleId and groupIds[] are required" });
      }

      // Validate user
      const user = await prisma.users.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: "User not found" });

      // Assign role
      await prisma.users.update({
        where: { id: userId },
        data: { roleId: toBi(roleId) },
      });

      // Replace group memberships
      await prisma.$transaction([
        prisma.userGroups.deleteMany({ where: { userId } }),
        prisma.userGroups.createMany({
          data: groupIds.map((gid) => ({ userId, groupId: toBi(gid) })),
          skipDuplicates: true, // Prisma 4.4+ supports this
        }),
      ]);

      res.json({ ok: true });
    } catch (e) {
      console.error(
        "POST /api/admin/pending-users/:id/assign replace-all failed",
        e
      );
      res.status(400).json({ error: "Failed to assign" });
    }
  }
);

router.delete("/api/profile", verifyToken, async (req, res) => {
  const firebaseUid = req.user?.uid;
  if (!firebaseUid) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    // Find the app user by Firebase UID
    const user = await prisma.users.findUnique({
      where: { firebaseUid },
      select: { id: true, firebaseUid: true },
    });
    if (!user) {
      // If app user not found, still attempt to delete Firebase user
      try {
        await admin.auth().deleteUser(firebaseUid);
      } catch {}
      res.clearCookie("access_token");
      return res.json({ ok: true });
    }

    // Transaction to delete related data first, then the user
    await prisma.$transaction(async (tx) => {
      // 1) Remove from UserGroups
      await tx.userGroups.deleteMany({ where: { userId: user.id } });

      // 2) Remove UserDevices
      await tx.userDevices.deleteMany({ where: { userId: user.id } });

      // 3) If you have more relations tied to Users, delete them here in the right order

      // 4) Finally delete the Users row
      await tx.users.delete({ where: { id: user.id } });
    });

    // Delete Firebase account after DB transaction succeeds
    await admin.auth().deleteUser(firebaseUid);

    // Clear session cookie
    res.clearCookie("access_token");
    return res.json({ ok: true });
  } catch (e) {
    console.error("Delete profile failed", e);
    return res.status(500).json({ error: "Failed to delete account" });
  }
});

module.exports = router;
