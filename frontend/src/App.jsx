// src/App.jsx
import mapSvg from '/src/assets/Component-1.svg';

const points = [
  // Use percentage positions to align with your grey circles
  { id: 1, label: 'AP A', xPct: 18, yPct: 24, intensity: 0.8 },
  { id: 2, label: 'AP B', xPct: 52, yPct: 39, intensity: 0.5 },
  { id: 3, label: 'AP C', xPct: 75, yPct: 70, intensity: 0.3 },
];

function intensityToStyle(intensity) {
  const size = 40 + 90 * intensity; // blob diameter in px
  const hue = (1 - intensity) * 120; // 0=red, 120=green
  const color = `hsl(${hue} 90% 50%)`;
  return {
    width: size,
    height: size,
    background: `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 70%)`,
    filter: 'blur(14px)',
    mixBlendMode: 'screen',
    opacity: 0.85,
  };
}

export default function App() {
  return (
    <div style={{ padding: 24 }}>
      <h1 className="title">Map of CODE</h1>

      <div
        style={{
          position: 'relative',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        <img
          className="map"
          src={mapSvg}
          alt="map"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />

        {/* Heat overlay */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {points.map((p) => {
            const style = intensityToStyle(p.intensity);
            return (
              <div
                key={p.id}
                title={`${p.label} ${Math.round(p.intensity * 100)}%`}
                style={{
                  position: 'absolute',
                  left: `${p.xPct}%`,
                  top: `${p.yPct}%`,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  ...style,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
