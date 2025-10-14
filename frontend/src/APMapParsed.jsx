import React, { useEffect, useState } from 'react';
// Same file, imported twice: as URL and as raw text
import floorSvgUrl from './assets/floorMap.svg';
import svgText from './assets/floorMap.svg?raw';

const VIEWBOX = { w: 1355, h: 1016 };

const COLORS = {
  low: '#2DD4BF',
  medium: '#F59E0B',
  high: '#EF4444',
};

const getFill = (clients) => {
  if (clients >= 20) return COLORS.high;
  if (clients >= 10) return COLORS.medium;
  if (clients >= 1) return COLORS.low;
  return COLORS.low; // default visible color
};

export default function APMapParsed({ clientsByIndex = [] }) {
  const [circles, setCircles] = useState([]);

  useEffect(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const cs = Array.from(doc.querySelectorAll('circle'));
    // Expect 32; log to verify
    console.log('Parsed circles:', cs.length); //gets 31 for some reason (could be because array starts at 0); Remove after debug finished
    setCircles(
      cs.map((c, i) => ({
        idx: i,
        cx: parseFloat(c.getAttribute('cx') || '0'),
        cy: parseFloat(c.getAttribute('cy') || '0'),
        r: parseFloat(c.getAttribute('r') || '0'),
      }))
    );
  }, []);

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
      className="ft-map-svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Base floorplan image (keeps the map visuals) */}
      <image href={floorSvgUrl} x="0" y="0" width={VIEWBOX.w} height={VIEWBOX.h} opacity="0.95" />

      {/* Colored overlays — MUST be after the image */}
      <g className="ap-overlay">
        {circles.map((c) => {
          const clients = clientsByIndex[c.idx] ?? 0;
          const fill = getFill(clients);

          // Create glow effect based on color intensity
          const glowOpacity = clients >= 20 ? 0.6 : clients >= 10 ? 0.4 : 0.2;
          const glowRadius = clients >= 20 ? 35 : clients >= 10 ? 25 : 18;
          const tier = clients >= 20 ? 3 : clients >= 10 ? 2 : 1;

          return (
            <g key={c.idx}>
              {/* Glow effect - rendered first (behind the main circle) */}
              {tier >= 1 && (
                <circle cx={c.cx} cy={c.cy} r={c.r + 18} fill={fill} opacity={0.18} />
              )}
              {tier >= 2 && (
                <circle cx={c.cx} cy={c.cy} r={c.r + 28} fill={fill} opacity={0.12} />
              )}
              {tier >= 3 && (
                <circle cx={c.cx} cy={c.cy} r={c.r + 38} fill={fill} opacity={0.08} />
              )}

              <circle cx={c.cx} cy={c.cy} r={c.r} style={{ fill }} opacity={0.98}>
                <title>{`AP #${c.idx + 1} • ${clients} clients`}</title>
              </circle>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
