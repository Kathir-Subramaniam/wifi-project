import React, { useEffect, useState } from 'react';
import './FloorDashboard.css';
import APMapParsed from './APMapParsed.jsx';
import logo from './assets/logo.png'
import devicesImg from './assets/devices.svg'
import occupancyImg from './assets/occupancy.svg'
import activeAPImg from './assets/activeAP.svg'
import floorStatusImg from './assets/floorStatus.svg'
import ZoomableMap from './ZoomableMap.jsx';

const statCards = [
  { label: 'Total Devices', value: '117', icon: devicesImg },
  { label: 'Active APs', value: '24/24', icon: activeAPImg },
  { label: 'Building Occupancy', value: '69%', icon: occupancyImg },
  { label: 'Floor Status', value: 'Active', icon: floorStatusImg },
];

// Marker colors for density tiers
const COLORS = {
  low: '#2DD4BF',    // teal (low)
  medium: '#F59E0B', // amber (medium)
  high: '#EF4444',   // red (high)
};

function getDensityColor(n) {
  if (n >= 20) return COLORS.high;
  if (n >= 10) return COLORS.medium;
  return COLORS.low;
}

// Points are in percentage coordinates (0–100)
const samplePoints = [
  { x: 22, y: 34, devices: 6, label: 'NW Office' },
  { x: 31, y: 45, devices: 12, label: 'Open Area' },
  { x: 47, y: 62, devices: 18, label: 'Hall' },
  { x: 59, y: 36, devices: 7, label: 'Conference' },
  { x: 72, y: 40, devices: 22, label: 'Focus Pods' },
  { x: 84, y: 69, devices: 9, label: 'Team Room' },
  { x: 63, y: 79, devices: 5, label: 'Lobby' },
  { x: 43, y: 86, devices: 8, label: 'Breakout' },
  { x: 15, y: 75, devices: 10, label: 'Workshop' },
  { x: 89, y: 30, devices: 21, label: 'East Wing' },
];

export default function FloorDashboard() {
  const [points, setPoints] = useState(samplePoints);

  useEffect(() => {
    // TODO: plug in your live data source here and map to [{x,y,devices,label}]
    // setPoints(liveData);
  }, []);

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
            <ZoomableMap viewBox={{ w: 1355, h: 1016 }} height={560}>
              {/* Keep APMapParsed rendering as children so it shares the same coordinate space */}
              <APMapParsed
                clientsByIndex={[7, 5, 12, 6, 3, 4, 2, 8, 11, 7, 9, 5, 8, 7, 3, 4, 5, 6, 12, 18, 10, 4, 3, 2, 6, 9, 10, 7, 21, 14, 16, 8]}
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
