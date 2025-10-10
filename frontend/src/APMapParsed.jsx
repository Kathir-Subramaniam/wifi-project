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
    console.log('Parsed circles:', cs.length);
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
          return (
            <circle
              key={c.idx}
              cx={c.cx}
              cy={c.cy}
              r={c.r}
              style={{ fill }}
              opacity={0.98}
            >
              <title>{`AP #${c.idx + 1} • ${clients} clients`}</title>
            </circle>
          );
        })}
      </g>
    </svg>
  );
}
