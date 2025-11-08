const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3000;
const router = require('../routes');

app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(router);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

/**
 * Floor details: svgMap (raw text or URL)
 */
app.get('/api/floors/:floorId', async (req, res) => {
  try {
    const floorId = BigInt(req.params.floorId);
    const floor = await prisma.floors.findUnique({
      where: { id: floorId },
      select: { id: true, name: true, svgMap: true },
    });
    if (!floor) return res.status(404).json({ error: 'Floor not found' });

    res.json({
      id: floor.id.toString(),
      name: floor.name,
      svgMap: floor.svgMap,
    });
  } catch (err) {
    console.error('Error fetching floor', err);
    res.status(500).json({ error: 'Failed to fetch floor' });
  }
});

app.get('/api/floors', async (req, res) => {
  try {
    const floors = await prisma.floors.findMany({
      select: {
        id: true,
        name: true,
        building: { select: { id: true, name: true } },
      },
      orderBy: { id: 'asc' },
    });

    const payload = floors.map(f => ({
      id: f.id.toString(),
      name: f.name,
      buildingId: f.building?.id?.toString?.() ?? null,
      buildingName: f.building?.name ?? null,
    }));

    res.json(payload);
  } catch (err) {
    console.error('Error fetching floors', err);
    res.status(500).json({ error: 'Failed to fetch floors' });
  }
});

app.get('/api/floors/:floorId/building', async (req, res) => {
  try {
    const floorId = BigInt(req.params.floorId);
    const floor = await prisma.floors.findUnique({
      where: { id: floorId },
      select: {
        building: { select: { id: true, name: true } },
      },
    });

    if (!floor || !floor.building) {
      return res.status(404).json({ error: 'Building not found for floor' });
    }

    res.json({
      id: floor.building.id.toString(),
      name: floor.building.name,
    });
  } catch (err) {
    console.error('Error fetching building for floor', err);
    res.status(500).json({ error: 'Failed to fetch building' });
  }
});

/**
 * Devices by AP for a floor
 */
app.get('/api/stats/devices-by-ap', async (req, res) => {
  try {
    const floorIdParam = req.query.floorId;
    if (!floorIdParam) {
      return res.status(400).json({ error: 'floorId query param is required' });
    }
    const floorId = BigInt(floorIdParam);

    const aps = await prisma.aPs.findMany({
      where: { floorId },
      select: {
        id: true,
        name: true,
        cx: true,
        cy: true,
        _count: { select: { client: true } }, // Clients relation
      },
      orderBy: { id: 'asc' },
    });

    const payload = aps.map(ap => ({
      apId: ap.id.toString(),
      title: ap.name,
      cx: ap.cx,
      cy: ap.cy,
      deviceCount: ap._count.client,
    }));

    res.json({ floorId: floorId.toString(), aps: payload });
  } catch (error) {
    console.error('Error fetching devices-by-ap', error);
    res.status(500).json({ error: 'Failed to fetch devices-by-ap' });
  }
});

/**
 * Totals
 */
app.get('/api/stats/total-devices', async (req, res) => {
  try {
    const totalDevices = await prisma.clients.count();
    res.json({ totalDevices });
  } catch (error) {
    console.error('Error fetching device count', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

app.get('/api/stats/total-aps', async (req, res) => {
  try {
    const totalAps = await prisma.aPs.count();
    res.json({ totalAps });
  } catch (error) {
    console.error('Error fetching AP count', error);
    res.status(500).json({ error: 'Failed to fetch APs' });
  }
});

/**
 * Create a client device record (attach to an AP)
 */
app.post('/api/clients', async (req, res) => {
  try {
    const { mac, apId } = req.body;
    if (!mac || !apId) {
      return res.status(400).json({ error: 'mac and apId are required' });
    }

    const created = await prisma.clients.create({
      data: {
        mac,
        apId: BigInt(apId),
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
    console.error('Error creating client device:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});



