const express = require('express');
const router = express.Router();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const firebaseAuthController = require('../controllers/firebase-auth-controller.js');
const verifyToken = require('../middleware/index.js');
const PostsController = require('../controllers/posts-controller.js');
const { getAppUser, canManageBuilding, canManageFloor } = require('../controllers/rbac.js');

// Helpers
const toBi = (v) => {
  const s = String(v);
  if (!/^\d+$/.test(s)) throw new Error(`Invalid ID: ${s}`);
  return BigInt(s);
};

// Auth routes
router.post('/api/register', firebaseAuthController.registerUser);
router.post('/api/login', firebaseAuthController.loginUser);
router.post('/api/logout', firebaseAuthController.logoutUser);
router.post('/api/reset-password', firebaseAuthController.resetPassword);

// Example protected posts
router.get('/api/posts', verifyToken, PostsController.getPosts);

// Buildings
router.get('/api/admin/buildings', verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: 'Unauthorized' });

    let buildings;
    if (user.role?.name === 'Owner') {
      buildings = await prisma.buildings.findMany({ orderBy: { id: 'asc' } });
    } else {
      const groupIds = user.userGroups.map(ug => ug.groupId);
      buildings = await prisma.buildings.findMany({
        where: { globalPermissions: { some: { groupId: { in: groupIds } } } },
        orderBy: { id: 'asc' },
      });
    }
    res.json(buildings.map(b => ({ id: b.id.toString(), name: b.name })));
  } catch (e) {
    console.error('GET /api/admin/buildings failed', e);
    res.status(500).json({ error: 'Failed to list buildings' });
  }
});

router.post('/api/admin/buildings', verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: 'Unauthorized' });
    if (user.role?.name !== 'Owner')
      return res.status(403).json({ error: 'Only Owner can create buildings' });

    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const b = await prisma.buildings.create({ data: { name } });
    res.json({ id: b.id.toString(), name: b.name });
  } catch (e) {
    console.error('POST /api/admin/buildings failed', e);
    res.status(500).json({ error: 'Failed to create building' });
  }
});

router.put('/api/admin/buildings/:id', verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    const id = req.params.id;
    if (!user) return res.status(403).json({ error: 'Unauthorized' });
    if (!(await canManageBuilding(user, id)))
      return res.status(403).json({ error: 'Forbidden' });

    const { name } = req.body;
    const b = await prisma.buildings.update({ where: { id: toBi(id) }, data: { name } });
    res.json({ id: b.id.toString(), name: b.name });
  } catch (e) {
    console.error('PUT /api/admin/buildings/:id failed', e);
    res.status(500).json({ error: 'Failed to update building' });
  }
});

router.delete('/api/admin/buildings/:id', verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    const id = req.params.id;
    if (!user || user.role?.name !== 'Owner')
      return res.status(403).json({ error: 'Only Owner can delete buildings' });

    await prisma.buildings.delete({ where: { id: toBi(id) } });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/admin/buildings/:id failed', e);
    res.status(500).json({ error: 'Failed to delete building' });
  }
});

// Floors
router.get('/api/admin/floors', verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: 'Unauthorized' });

    let floors;
    if (user.role?.name === 'Owner') {
      floors = await prisma.floors.findMany({
        include: { building: true },
        orderBy: { id: 'asc' },
      });
    } else {
      const groupIds = user.userGroups.map(ug => ug.groupId);
      floors = await prisma.floors.findMany({
        where: {
          OR: [
            { globalPermissions: { some: { groupId: { in: groupIds } } } },
            { building: { globalPermissions: { some: { groupId: { in: groupIds } } } } },
          ],
        },
        include: { building: true },
        orderBy: { id: 'asc' },
      });
    }
    res.json(floors.map(f => ({
      id: f.id.toString(),
      name: f.name,
      buildingId: f.buildingId.toString(),
      buildingName: f.building?.name ?? null,
    })));
  } catch (e) {
    console.error('GET /api/admin/floors failed', e);
    res.status(500).json({ error: 'Failed to list floors' });
  }
});

router.post('/api/admin/floors', verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: 'Unauthorized' });

    const { name, svgMap, buildingId } = req.body;
    if (!name || !svgMap || !buildingId)
      return res.status(400).json({ error: 'name, svgMap, buildingId required' });

    if (!(await canManageBuilding(user, buildingId)))
      return res.status(403).json({ error: 'Forbidden for building' });

    const f = await prisma.floors.create({
      data: { name, svgMap, buildingId: toBi(buildingId) },
    });
    res.json({ id: f.id.toString(), name: f.name, buildingId: f.buildingId.toString() });
  } catch (e) {
    console.error('POST /api/admin/floors failed', e);
    res.status(500).json({ error: 'Failed to create floor' });
  }
});

router.put('/api/admin/floors/:id', verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    const id = req.params.id;
    if (!user) return res.status(403).json({ error: 'Unauthorized' });
    if (!(await canManageFloor(user, id)))
      return res.status(403).json({ error: 'Forbidden' });

    const { name, svgMap } = req.body;
    const f = await prisma.floors.update({
      where: { id: toBi(id) },
      data: { ...(name && { name }), ...(svgMap && { svgMap }) },
    });
    res.json({ id: f.id.toString(), name: f.name });
  } catch (e) {
    console.error('PUT /api/admin/floors/:id failed', e);
    res.status(500).json({ error: 'Failed to update floor' });
  }
});

router.delete('/api/admin/floors/:id', verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    const id = req.params.id;
    if (!user) return res.status(403).json({ error: 'Unauthorized' });
    if (!(await canManageFloor(user, id)) && user.role?.name !== 'Owner')
      return res.status(403).json({ error: 'Forbidden' });

    await prisma.floors.delete({ where: { id: toBi(id) } });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/admin/floors/:id failed', e);
    res.status(500).json({ error: 'Failed to delete floor' });
  }
});

// APs
router.get('/api/admin/aps', verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: 'Unauthorized' });

    const aps = await prisma.aPs.findMany({
      include: { floor: { include: { building: true } } },
      orderBy: { id: 'asc' },
    });

    const filtered = [];
    for (const ap of aps) {
      if (user.role?.name === 'Owner' || (await canManageFloor(user, ap.floorId))) {
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
    console.error('GET /api/admin/aps failed', e);
    res.status(500).json({ error: 'Failed to list APs' });
  }
});

router.post('/api/admin/aps', verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: 'Unauthorized' });

    const { name, cx, cy, floorId } = req.body;
    if (!name || cx == null || cy == null || !floorId)
      return res.status(400).json({ error: 'name, cx, cy, floorId required' });

    if (!(await canManageFloor(user, floorId)))
      return res.status(403).json({ error: 'Forbidden for floor' });

    const ap = await prisma.aPs.create({
      data: { name, cx: Number(cx), cy: Number(cy), floorId: toBi(floorId) },
    });
    res.json({ id: ap.id.toString(), name: ap.name });
  } catch (e) {
    console.error('POST /api/admin/aps failed', e);
    res.status(500).json({ error: 'Failed to create AP' });
  }
});

router.put('/api/admin/aps/:id', verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: 'Unauthorized' });

    const apId = req.params.id;
    const ap = await prisma.aPs.findUnique({ where: { id: toBi(apId) } });
    if (!ap) return res.status(404).json({ error: 'AP not found' });
    if (!(await canManageFloor(user, ap.floorId)))
      return res.status(403).json({ error: 'Forbidden' });

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
    console.error('PUT /api/admin/aps/:id failed', e);
    res.status(500).json({ error: 'Failed to update AP' });
  }
});

router.delete('/api/admin/aps/:id', verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: 'Unauthorized' });

    const apId = req.params.id;
    const ap = await prisma.aPs.findUnique({ where: { id: toBi(apId) } });
    if (!ap) return res.status(404).json({ error: 'AP not found' });
    if (!(await canManageFloor(user, ap.floorId)) && user.role?.name !== 'Owner')
      return res.status(403).json({ error: 'Forbidden' });

    await prisma.aPs.delete({ where: { id: toBi(apId) } });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/admin/aps/:id failed', e);
    res.status(500).json({ error: 'Failed to delete AP' });
  }
});

// Devices (Clients)
router.get('/api/admin/devices', verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: 'Unauthorized' });

    const devices = await prisma.clients.findMany({
      include: { ap: { include: { floor: true } } },
      orderBy: { id: 'asc' },
    });

    const filtered = [];
    for (const d of devices) {
      if (user.role?.name === 'Owner' || (await canManageFloor(user, d.ap.floorId))) {
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
    console.error('GET /api/admin/devices failed', e);
    res.status(500).json({ error: 'Failed to list devices' });
  }
});

router.post('/api/admin/devices', verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: 'Unauthorized' });

    const { mac, apId } = req.body;
    if (!mac || !apId) return res.status(400).json({ error: 'mac and apId required' });

    const ap = await prisma.aPs.findUnique({ where: { id: toBi(apId) } });
    if (!ap) return res.status(404).json({ error: 'AP not found' });
    if (!(await canManageFloor(user, ap.floorId)))
      return res.status(403).json({ error: 'Forbidden' });

    const created = await prisma.clients.create({ data: { mac, apId: toBi(apId) } });
    res.json({ id: created.id.toString(), mac: created.mac });
  } catch (e) {
    console.error('POST /api/admin/devices failed', e);
    res.status(500).json({ error: 'Failed to create device' });
  }
});

router.delete('/api/admin/devices/:id', verifyToken, async (req, res) => {
  try {
    const user = await getAppUser(req);
    if (!user) return res.status(403).json({ error: 'Unauthorized' });

    const id = req.params.id;
    const device = await prisma.clients.findUnique({
      where: { id: toBi(id) },
      include: { ap: { select: { floorId: true } } },
    });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    if (!(await canManageFloor(user, device.ap.floorId)) && user.role?.name !== 'Owner')
      return res.status(403).json({ error: 'Forbidden' });

    await prisma.clients.delete({ where: { id: toBi(id) } });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/admin/devices/:id failed', e);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

module.exports = router;
