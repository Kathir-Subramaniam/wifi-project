import React, { useEffect, useState } from 'react';
import './FloorDashboard.css';
import APMapParsed from './APMapParsed.jsx';
import logo from './assets/logo.png'
import devicesImg from './assets/devices.svg'
import occupancyImg from './assets/occupancy.svg'
import activeAPImg from './assets/activeAP.svg'
import floorStatusImg from './assets/floorStatus.svg'
import ZoomableMap from './ZoomableMap.jsx';

// Marker colors for density tiers
const COLORS = {
  low: '#2DD4BF',    // teal (low)
  medium: '#F59E0B', // amber (medium)
  high: '#EF4444',   // red (high)
};

// Points are in percentage coordinates (0–100)
const samplePoints = [];

export default function FloorDashboard() {


const [stats, setStats] = useState({
  totalDevices : 0,
  totalAps: 0,
  buildingOccupancy: 69,
  floorStatus: 'Active'
})

const [apCount, setApCount] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const devicesResponse = await fetch('http://localhost:3000/api/stats/total-devices')
        const devicesData = await devicesResponse.json()
  
        const apsResponse = await fetch('http://localhost:3000/api/stats/total-aps')
        const apsData = await apsResponse.json()

        const apsCountResponse = await fetch('http://localhost:3000/api/stats/devices-by-ap')
        const apsCount = await apsCountResponse.json()

        console.log(apsCount)
        setApCount(apsCount)

        setStats({
          totalDevices : devicesData.totalDevices,
          totalAps: apsData.totalAps,
          buildingOccupancy: Math.round(devicesData.totalDevices / 400 * 100)+ "%",
          floorStatus: 'Active'
        })
  
      } catch (error) {
        console.log("Error fetching data", error)
      }
    } 
    fetchData()
  }, [])
  
  const statCards = [
    { label: 'Total Devices', value: stats.totalDevices, icon: devicesImg },
    { label: 'Active APs', value: stats.totalAps, icon: activeAPImg },
    { label: 'Building Occupancy', value: stats.buildingOccupancy, icon: occupancyImg },
    { label: 'Floor Status', value: stats.floorStatus, icon: floorStatusImg },
  ];

  const [points, setPoints] = useState(samplePoints);

  const totalDevices = points.reduce((s, p) => s + p.devices, 0);
  const hotspots = points.filter((p) => p.devices >= 20).length;

  return (
    <div className="ft-root">
      {/* Top App Bar */}
      <div className="ft-appbar">
        <div className="ft-brand">
          <div className="ft-brand-icon"><img src={logo} className="ft-brand-icon" /></div>
          <div className="ft-brand-text">FloorTrack</div>
        </div>
        <button className="ft-live-btn">
          <span className="ft-dot" />
          Live
        </button>
      </div>

      {/* Stats Row */}
      <div className="ft-stats-row">
        {statCards.map((c, i) => (
          <div key={i} className="ft-stat-card">
            <div className="ft-stat-icon">
              <img src={c.icon} alt={c.label} className="ft-stat-icon" />
            </div>
            <div className="ft-stat-meta">
              <div className="ft-stat-label">{c.label}</div>
              <div className="ft-stat-value">{c.value}</div>
            </div>
          </div>
        ))}
      </div>


      {/* Content Grid: map + legend */}
      <div className="ft-grid">
        {/* Map Panel */}
        <div className="ft-panel">
          <div className="ft-panel-header">
            <div className="ft-panel-title">Floor 1 - CODE</div>
            <div className="ft-panel-sub">Real-time connection heatmap</div>
          </div>

          <div className="ft-map-frame">
            <ZoomableMap viewBox={{ w: 1355, h: 1016 }}>
              {/* Keep APMapParsed rendering as children so it shares the same coordinate space */}
              <APMapParsed
                apCount = {apCount}
              />
            </ZoomableMap>

          </div>
        </div>

        {/* Legend Panel */}
        <div className="ft-legend-panel">
          <div className="ft-legend-title">Connection Density</div>
          <div className="ft-legend-items">
            <div className="ft-legend-item">
              <span className="ft-dot-swatch" style={{ background: COLORS.high }} />
              <div>
                <div className="ft-legend-label">High density</div>
                <div className="ft-legend-sub">20+ devices</div>
              </div>
            </div>
            <div className="ft-legend-item">
              <span className="ft-dot-swatch" style={{ background: COLORS.medium }} />
              <div>
                <div className="ft-legend-label">Medium density</div>
                <div className="ft-legend-sub">10–20 devices</div>
              </div>
            </div>
            <div className="ft-legend-item">
              <span className="ft-dot-swatch" style={{ background: COLORS.low }} />
              <div>
                <div className="ft-legend-label">Low density</div>
                <div className="ft-legend-sub">1–10 devices</div>
              </div>
            </div>

            <div className="ft-legend-divider" />

            <div className="ft-legend-metrics">
              <div className="ft-legend-metric">
                <span className="ft-metric-label">Total devices</span>
                <span className="ft-metric-value">{totalDevices}</span>
              </div>
              <div className="ft-legend-metric">
                <span className="ft-metric-label">Hotspots (≥20)</span>
                <span className="ft-metric-value">{hotspots}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
