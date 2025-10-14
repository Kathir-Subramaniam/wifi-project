const express = require('express')
const cors = require('cors')
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient()
const app = express()
const port = 3000

app.use(cors())

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
        const totalDevices = await prisma.device.count() //for kathir: prisma sends and sql query to the db asking for the count of devices
        res.json({totalDevices})
    } catch (error){
        console.error('Error fetching device count')
        res.status(500).json({ error: 'Failed to fetch devices'})
    }
})

app.get('/api/stats/total-aps', async (req,res) => {
    try {
        const totalAps = await prisma.aP.count() //for kathir: prisma sends and sql query to the db asking for the count of Aps
        res.json({totalAps})
    } catch (error){
        console.error("Error fetching Aps count")
        res.status(500).json({ error: 'Failed to fetch devices'})
    }
})