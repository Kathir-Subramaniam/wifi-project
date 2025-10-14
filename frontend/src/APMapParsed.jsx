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

export default function APMapParsed({ clientsByIndex = [] }) {
  const [circles, setCircles] = useState([]);

  useEffect(() => {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const cs = Array.from(doc.querySelectorAll('circle'));
    console.log('Parsed circles:', cs.length);
    setCircles(
      cs.map((c, i) => ({
        idx: i,
        cx: parseFloat(c.getAttribute('cx') || '0'),
        cy: parseFloat(c.getAttribute('cy') || '0'),
        r: parseFloat(c.getAttribute('r') || '11.5'),
      }))
    );
  }, []);

  return (
    <svg viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`} className="ft-map-svg" preserveAspectRatio="xMidYMid meet">
      {/* Base floorplan */}
      <image href={floorSvgUrl} x="0" y="0" width={VIEWBOX.w} height={VIEWBOX.h} opacity="0.95" />

      {/* AP overlay */}
      <g className="ap-overlay">
        {circles.map((c) => {
          const clients = clientsByIndex[c.idx] ?? 0;
          const fill = getFill(clients);
          const r = c.r || 11.5;

          // Soft glow tiers (no blur → no edge clipping)
          const tier = clients >= 20 ? 3 : clients >= 10 ? 2 : 1;

          // Wi‑Fi icon size relative to AP radius
          const iconSize = r * 1.5; // tweak 1.6–2.0 to taste
          const half = iconSize / 2;

          return (
            <g key={c.idx} transform={`translate(${c.cx}, ${c.cy})`}>
              {/* Glows behind the dot */}
              {tier >= 1 && <circle r={r + 18} fill={fill} opacity={0.18} />}
              {tier >= 2 && <circle r={r + 28} fill={fill} opacity={0.12} />}
              {tier >= 3 && <circle r={r + 38} fill={fill} opacity={0.08} />}

              {/* Main dot */}
              <circle r={r} fill={fill} opacity={0.98}>
                <title>{`AP #${c.idx + 1} • ${clients} clients`}</title>
              </circle>

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
