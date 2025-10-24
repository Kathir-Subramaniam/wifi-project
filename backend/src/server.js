const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient()
const app = express()
const port = process.env.PORT || 3000
const router = require("../routes");

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'], // Allow your frontend ports
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use(cookieParser());
app.use(router);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

app.get('/api/health', (req,res) => {
    res.json({message: 'Server is running', timestamp: new Date().toISOString()})
})

//SQL request for # of devices

app.get('/api/stats/total-devices', async (req,res) => {
    try {
        const totalDevices = await prisma.device.count() //prisma sends and sql query to the db asking for the count of devices
        res.json({totalDevices})
    } catch (error){
        console.error('Error fetching device count')
        res.status(500).json({ error: 'Failed to fetch devices'})
    }
})

app.get('/api/stats/total-aps', async (req,res) => {
    try {
        const totalAps = await prisma.aP.count() //prisma sends and sql query to the db asking for the count of Aps
        res.json({totalAps})
    } catch (error){
        console.error("Error fetching Aps count")
        res.status(500).json({ error: 'Failed to fetch devices'})
    }
})

app.get('/api/stats/devices-by-ap', async (req, res) => {
    try{
        const aps = await prisma.aP.findMany({
            select: {
                title: true,
                apNumber: true,
                _count: {
                    select: {devices: true},
                }
            }
        })

        const devices = aps.map(ap => {
        return {
            title : ap.title,
            apNumber: ap.apNumber,
            deviceCount: ap._count.devices
        }
        }) 

        res.json(devices)
    } catch (error) {
        console.error("Error fetching Aps count")
        res.status(500).json({error : 'Failed to fetch data'})
    }
})


app.post("/api/devices", async (req,res) => {
    try {
        const {mac, apId} = req.body
        const device = await prisma.device.create({
            data : { 
                mac,
                apId
            }
        })
        res.json(device)
    } catch(error){
        console.error("Error creating device:", error)
        res.status(500).json({ error: "Failed to create device" })
    }
})