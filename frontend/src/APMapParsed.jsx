import React, { useEffect, useState } from 'react';
import floorSvgUrl from './assets/floorMap.svg';
import wifiSvgUrl from './assets/wifiSymbol.svg';
import svgText from './assets/floorMap.svg?raw';

const VIEWBOX = { w: 1355, h: 1016 };

const COLORS = {
  low: '#2DD4BF',
  medium: '#F59E0B',
  high: '#EF4444',
};
const getFill = (clients) => (clients >= 20 ? COLORS.high : clients >= 10 ? COLORS.medium : COLORS.low);

export default function APMapParsed({ apCount = [] }) {
  const [circles, setCircles] = useState([]);
  const [hoveredAP, setHoveredAP] = useState(null);
  console.log("ApCount: " , apCount)

  useEffect(() => {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const cs = Array.from(doc.querySelectorAll('circle'));
    console.log('Parsed circles:', cs.length);
    setCircles(
      cs.map((c, i) => ({
        idx: i,
        apId: parseInt(c.getAttribute('data-ap-id') || "0"),
        cx: parseFloat(c.getAttribute('cx') || '0'),
        cy: parseFloat(c.getAttribute('cy') || '0'),
        r: parseFloat(c.getAttribute('r') || '11.5'),
      }))
    );
  }, []);

const getDeviceCountByApId = (apId) => {
  const ap = apCount.find(ap => ap.apNumber === apId)
  console.log("AP Count: ", ap)
  return ap ? ap.deviceCount : 0
}

const getAPTitle = (apId) => {
  const ap = apCount.find(ap => ap.apNumber === apId)
  return ap ? ap.title : `AP ${apId}`
}

  return (
    <svg 
      viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`} 
      className="ft-map-svg" 
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Base floorplan */}
      <image href={floorSvgUrl} x="0" y="0" width={VIEWBOX.w} height={VIEWBOX.h} opacity="0.95" />

      {/* AP overlay */}
      <g className="ap-overlay">
        {circles.map((c) => {
          const clients = getDeviceCountByApId(c.apId) ?? 0;
          const fill = getFill(clients);
          const r = 14.5;

          // Soft glow tiers (no blur → no edge clipping)
          const tier = clients >= 20 ? 3 : clients >= 10 ? 2 : 1;

          // Wi‑Fi icon size relative to AP radius
          const iconSize = r * 1.5; // tweak 1.6–2.0 to taste
          const half = iconSize / 2;

          return (
            <g key={c.idx} transform={`translate(${c.cx}, ${c.cy})`}>
              {/* Glows behind the dot */}
              {tier >= 1 && <circle r={r + 8} fill={fill} opacity={0.18} />}
              {tier >= 1 && <circle r={r + 18} fill={fill} opacity={0.16} />}
              {tier >= 2 && <circle r={r + 28} fill={fill} opacity={0.14} />}
              {tier >= 2 && <circle r={r + 38} fill={fill} opacity={0.12} />}  
              {tier >= 3 && <circle r={r + 48} fill={fill} opacity={0.10} />}
              {tier >= 3 && <circle r={r + 58} fill={fill} opacity={0.08} />}              

              {/* Main dot */}
              <circle 
                r={r} 
                fill={fill} 
                opacity={0.98}
                title={`${getAPTitle(c.apId)} • ${clients} devices`}
                onMouseEnter={() => setHoveredAP(c)}
                onMouseLeave={() => setHoveredAP(null)}
                style={{ cursor: 'pointer' }}
              >
                <title>{`${getAPTitle(c.apId)} • ${clients} devices`}</title>
              </circle>
              
              {/* Custom SVG Tooltip */}
              {hoveredAP && hoveredAP.idx === c.idx && (
                <g transform="translate(0, -40)">
                  <rect
                    x="-70"
                    y="-22"
                    width="140"
                    height="22"
                    rx="5"
                    fill="rgba(15, 20, 28, 0.95)"
                    stroke="#1F2937"
                    strokeWidth="1.5"
                  />
                  
                  {/* AP Name */}
                  <text
                    x="0"
                    y="-7"
                    textAnchor="middle"
                    fill="#E6EDF3"
                    fontSize="12"
                    fontWeight="600"
                  >
                    {getAPTitle(c.apId)} • {clients}
                  </text>
                </g>
              )}

              {/* Wi‑Fi icon centered on the dot */}
              <image
                href={wifiSvgUrl}
                x={-half}
                y={-half}
                width={iconSize}
                height={iconSize}
                style={{ pointerEvents: 'none' }}
                opacity="0.95"
                preserveAspectRatio="xMidYMid meet"
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
