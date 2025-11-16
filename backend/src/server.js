const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const app = express();
const port = process.env.PORT || 3000;

const router = require("../routes/routes");
const verifyToken = require("../middleware");
const { toJSONSafe } = require("../utils/jsonBigInt");

// Helpers
const toBi = (v) => {
  const s = String(v);
  if (!/^\d+$/.test(s)) throw new Error(`Invalid ID: ${s}`);
  return BigInt(s);
};

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Mount routes.js (already protected inside)
app.use(router);

// Public minimal endpoints (optional to protect)
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/api/health", (req, res) => {
  res.json({
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Diagnostics (protected)
app.get("/api/diag", verifyToken, async (req, res) => {
  try {
    const now = await prisma.$queryRaw`SELECT NOW()`;
    res.json(toJSONSafe({ ok: true, uid: req.user?.uid, db: now }));
  } catch (e) {
    console.error("diag error", e);
    res.status(500).json({ error: e.message });
  }
});

// Current user profile (protected)
app.get("/api/me", verifyToken, async (req, res) => {
  try {
    const u = await prisma.users.findUnique({
      where: { firebaseUid: req.user.uid },
      include: { role: true, userGroups: { include: { group: true } } },
    });
    res.json(toJSONSafe({ firebaseUid: req.user.uid, user: u }));
  } catch (e) {
    console.error("/api/me failed", e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * Floor details: svgMap (protected)
 */
// server.js
// Floor details: svgMap (protected) — STRICT floor-only
app.get("/api/floors/:floorId", verifyToken, async (req, res) => {
  try {
    const toBi = (v) => {
      const s = String(v);
      if (!/^\d+$/.test(s)) throw new Error(`Invalid ID: ${s}`);
      return BigInt(s);
    };

    const user = await prisma.users.findUnique({
      where: { firebaseUid: req.user.uid },
      include: { role: true, userGroups: true },
    });
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    const floorId = toBi(req.params.floorId);

    // Owner bypass; non-Owner must have direct floor-level GP
    if (user.role?.name !== "Owner") {
      const groupIds = (user.userGroups || []).map((ug) => ug.groupId);
      if (groupIds.length === 0) return res.status(403).json({ error: "Forbidden" });

      const allowed = await prisma.globalPermissions.findFirst({
        where: {
          floorId,                  // STRICT floor-only
          groupId: { in: groupIds },
        },
        select: { id: true },
      });

      if (!allowed) return res.status(403).json({ error: "Forbidden" });
    }

    const floor = await prisma.floors.findUnique({
      where: { id: floorId },
      select: { id: true, name: true, svgMap: true },
    });
    if (!floor) return res.status(404).json({ error: "Floor not found" });

    res.json({
      id: floor.id.toString(),
      name: floor.name,
      svgMap: floor.svgMap,
    });
  } catch (err) {
    console.error("Error fetching floor", err);
    res.status(500).json({ error: "Failed to fetch floor" });
  }
});

// Floors list (protected) — STRICT floor-only
app.get("/api/floors", verifyToken, async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { firebaseUid: req.user.uid },
      include: { role: true, userGroups: true },
    });
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    const role = user.role?.name || '';
    let floors = [];

    if (role === "Owner") {
      floors = await prisma.floors.findMany({
        select: {
          id: true,
          name: true,
          building: { select: { id: true, name: true } },
        },
        orderBy: { id: "asc" },
      });
    } else if (role === "Organization Admin" || role === "Site Admin") {
      const groupIds = (user.userGroups || []).map((ug) => ug.groupId);
      if (groupIds.length === 0) return res.json([]);

      floors = await prisma.floors.findMany({
        where: {
          // STRICT floor-only: must have direct GP for this floor
          globalPermissions: { some: { groupId: { in: groupIds } } },
        },
        select: {
          id: true,
          name: true,
          building: { select: { id: true, name: true } },
        },
        orderBy: { id: "asc" },
      });
    } else {
      return res.json([]);
    }

    const payload = floors.map((f) => ({
      id: f.id.toString(),
      name: f.name,
      buildingId: f.building?.id?.toString?.() ?? null,
      buildingName: f.building?.name ?? null,
    }));

    res.json(payload);
  } catch (err) {
    console.error("Error fetching floors", err);
    res.status(500).json({ error: "Failed to fetch floors" });
  }
});

// Floor’s building (protected) — STRICT floor-only
app.get("/api/floors/:floorId/building", verifyToken, async (req, res) => {
  try {
    const toBi = (v) => {
      const s = String(v);
      if (!/^\d+$/.test(s)) throw new Error(`Invalid ID: ${s}`);
      return BigInt(s);
    };

    const user = await prisma.users.findUnique({
      where: { firebaseUid: req.user.uid },
      include: { role: true, userGroups: true },
    });
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    const floorId = toBi(req.params.floorId);

    // Owner bypass; non-Owner must have direct floor-level GP
    if (user.role?.name !== "Owner") {
      const groupIds = (user.userGroups || []).map((ug) => ug.groupId);
      if (groupIds.length === 0) return res.status(403).json({ error: "Forbidden" });

      const allowed = await prisma.globalPermissions.findFirst({
        where: {
          floorId,                  // STRICT floor-only
          groupId: { in: groupIds },
        },
        select: { id: true },
      });

      if (!allowed) return res.status(403).json({ error: "Forbidden" });
    }

    const floor = await prisma.floors.findUnique({
      where: { id: floorId },
      select: {
        building: { select: { id: true, name: true } },
      },
    });

    if (!floor || !floor.building) {
      return res.status(404).json({ error: "Building not found for floor" });
    }

    res.json({
      id: floor.building.id.toString(),
      name: floor.building.name,
    });
  } catch (err) {
    console.error("Error fetching building for floor", err);
    res.status(500).json({ error: "Failed to fetch building" });
  }
});



/**
 * Devices by AP for a floor (protected)
 */
// Stats: devices-by-ap for a specific floor (protected, STRICT floor-only)
app.get("/api/stats/devices-by-ap", verifyToken, async (req, res) => {
  try {
    const floorIdParam = req.query.floorId;
    if (!floorIdParam) {
      return res.status(400).json({ error: "floorId query param is required" });
    }
    const floorId = toBi(floorIdParam);

    // Load user and groups
    const user = await prisma.users.findUnique({
      where: { firebaseUid: req.user.uid },
      include: { role: true, userGroups: true },
    });
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    // Owner bypass; non-Owner must have direct floor-level GP
    if (user.role?.name !== "Owner") {
      const groupIds = (user.userGroups || []).map((ug) => ug.groupId);
      if (groupIds.length === 0) return res.status(403).json({ error: "Forbidden" });

      const allowed = await prisma.globalPermissions.findFirst({
        where: {
          floorId,                  // STRICT floor-only
          groupId: { in: groupIds },
        },
        select: { id: true },
      });

      if (!allowed) return res.status(403).json({ error: "Forbidden" });
    }

    // Only query APs on this floor
    const aps = await prisma.aPs.findMany({
      where: { floorId },
      select: {
        id: true,
        name: true,
        cx: true,
        cy: true,
        _count: { select: { client: true } }, // number of devices per AP
      },
      orderBy: { id: "asc" },
    });

    const payload = aps.map((ap) => ({
      apId: ap.id.toString(),
      title: ap.name,
      cx: ap.cx,
      cy: ap.cy,
      deviceCount: ap._count.client,
    }));

    res.json({ floorId: floorId.toString(), aps: payload });
  } catch (error) {
    console.error("Error fetching devices-by-ap", error);
    res.status(500).json({ error: "Failed to fetch devices-by-ap" });
  }
});


/**
 * Totals (protected)
 */
// Totals: devices on a specific floor (protected, STRICT floor-only)
// GET /api/stats/total-devices?floorId=123
app.get("/api/stats/total-devices", verifyToken, async (req, res) => {
  try {
    const floorIdParam = req.query.floorId;
    if (!floorIdParam) {
      return res.status(400).json({ error: "floorId query param is required" });
    }
    const floorId = toBi(floorIdParam);

    // Load user
    const user = await prisma.users.findUnique({
      where: { firebaseUid: req.user.uid },
      include: { role: true, userGroups: true },
    });
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    // Owner bypass; non-Owner must have direct floor-level GP
    if (user.role?.name !== "Owner") {
      const groupIds = (user.userGroups || []).map((ug) => ug.groupId);
      if (groupIds.length === 0) return res.status(403).json({ error: "Forbidden" });

      const allowed = await prisma.globalPermissions.findFirst({
        where: {
          floorId, // STRICT floor-only
          groupId: { in: groupIds },
        },
        select: { id: true },
      });
      if (!allowed) return res.status(403).json({ error: "Forbidden" });
    }

    // Count devices where their AP is on this floor
    const totalDevices = await prisma.clients.count({
      where: { ap: { floorId } },
    });

    res.json({ floorId: floorId.toString(), totalDevices });
  } catch (error) {
    console.error("Error fetching device count", error);
    res.status(500).json({ error: "Failed to fetch devices" });
  }
});

// Totals: APs on a specific floor (protected, STRICT floor-only)
// GET /api/stats/total-aps?floorId=123
app.get("/api/stats/total-aps", verifyToken, async (req, res) => {
  try {
    const floorIdParam = req.query.floorId;
    if (!floorIdParam) {
      return res.status(400).json({ error: "floorId query param is required" });
    }
    const floorId = toBi(floorIdParam);

    // Load user
    const user = await prisma.users.findUnique({
      where: { firebaseUid: req.user.uid },
      include: { role: true, userGroups: true },
    });
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    // Owner bypass; non-Owner must have direct floor-level GP
    if (user.role?.name !== "Owner") {
      const groupIds = (user.userGroups || []).map((ug) => ug.groupId);
      if (groupIds.length === 0) return res.status(403).json({ error: "Forbidden" });

      const allowed = await prisma.globalPermissions.findFirst({
        where: {
          floorId, // STRICT floor-only
          groupId: { in: groupIds },
        },
        select: { id: true },
      });
      if (!allowed) return res.status(403).json({ error: "Forbidden" });
    }

    // Count APs on this floor
    const totalAps = await prisma.aPs.count({
      where: { floorId },
    });

    res.json({ floorId: floorId.toString(), totalAps });
  } catch (error) {
    console.error("Error fetching AP count", error);
    res.status(500).json({ error: "Failed to fetch APs" });
  }
});


/**
 * Create a client device record (attach to an AP) — protected
 */
app.post("/api/clients", verifyToken, async (req, res) => {
  try {
    const { mac, apId } = req.body;
    if (!mac || !apId) {
      return res.status(400).json({ error: "mac and apId are required" });
    }

    const created = await prisma.clients.create({
      data: {
        mac,
        apId: toBi(apId),
      },
      select: { id: true, mac: true, apId: true, createdAt: true },
    });

    res.json({
      id: created.id.toString(),
      mac: created.mac,
      apId: created.apId.toString(),
      createdAt: created.createdAt,
    });
  } catch (error) {
    console.error("Error creating client device:", error);
    res.status(500).json({ error: "Failed to create client" });
  }
});

// GET the AP connection(s) for a user's registered devices (by MAC).
// Returns the most recent AP per device MAC the user owns.
app.get('/api/users/:userId/ap-connection', verifyToken, async (req, res) => {
  try {
    const toBi = (v) => {
      const s = String(v);
      if (!/^\d+$/.test(s)) throw new Error(`Invalid ID: ${s}`);
      return BigInt(s);
    };

    const userId = toBi(req.params.userId);

    const userRow = await prisma.users.findUnique({
      where: { id: userId },
      select: { firebaseUid: true },
    });

    if (!userRow) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure the authed user matches the requested user
    if (req.user?.uid !== userRow.firebaseUid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get user's registered device MACs
    const devices = await prisma.userDevices.findMany({
      where: { userId },
      select: { mac: true },
      orderBy: { id: 'asc' },
    });

    if (!devices.length) {
      return res.status(404).json({ error: 'User has no registered device MAC' });
    }

    const results = [];
    for (const d of devices) {
      const normalizedMac = d.mac.trim().toLowerCase();

      const client = await prisma.clients.findFirst({
        where: {
          mac: { equals: normalizedMac, mode: 'insensitive' },
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          apId: true,
          updatedAt: true,
          ap: {
            select: { id: true, name: true, floorId: true },
          },
        },
      });

      results.push({
        mac: normalizedMac,
        ap: client?.ap
          ? {
              id: client.ap.id.toString(),
              name: client.ap.name,
              floorId: client.ap.floorId?.toString(),
            }
          : null,
        updatedAt: client?.updatedAt ?? null,
      });
    }

    return res.json({ connections: results });
  } catch (error) {
    console.error('ap-connection lookup failed', error);
    return res.status(500).json({ error: 'Failed to resolve AP connection' });
  }
});


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
