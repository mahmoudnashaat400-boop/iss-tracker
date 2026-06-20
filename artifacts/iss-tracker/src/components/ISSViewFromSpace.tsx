interface ISSViewProps {
  lat: number;
  lon: number;
  altitude: number;
  localTime: string;
}

export default function ISSViewFromSpace({ lat, lon, altitude, localTime }: ISSViewProps) {
  const isDay = (() => {
    const hour = new Date().getUTCHours() + (lon / 15);
    const local = ((hour % 24) + 24) % 24;
    return local >= 6 && local < 18;
  })();

  const dayFraction = (() => {
    const hour = new Date().getUTCHours() + (lon / 15);
    const local = ((hour % 24) + 24) % 24;
    if (local >= 6 && local < 18) return (local - 6) / 12;
    return 0;
  })();

  const skyColor = isDay
    ? `hsl(${210 + dayFraction * 10}, ${60 - dayFraction * 10}%, ${15 + dayFraction * 25}%)`
    : '#050a14';

  const horizonColor = isDay
    ? `hsl(${200 + dayFraction * 20}, 70%, ${35 + dayFraction * 20}%)`
    : '#0a1530';

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden" style={{ background: '#020408' }}>
      {/* Space (top) */}
      <div className="absolute inset-0" style={{ background: '#020408' }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 1.5 + 0.5 + 'px',
              height: Math.random() * 1.5 + 0.5 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 55 + '%',
              opacity: Math.random() * 0.6 + 0.2,
            }}
          />
        ))}
      </div>

      {/* Earth curvature */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '55%',
          background: `radial-gradient(ellipse 120% 80% at 50% 100%, ${skyColor} 0%, ${horizonColor} 60%, transparent 100%)`,
          borderRadius: '50% 50% 0 0 / 30% 30% 0 0',
        }}
      />

      {/* Atmosphere glow at horizon */}
      <div
        className="absolute"
        style={{
          bottom: '52%',
          left: '0',
          right: '0',
          height: '12px',
          background: isDay
            ? 'linear-gradient(180deg, transparent, rgba(100,180,255,0.6), transparent)'
            : 'linear-gradient(180deg, transparent, rgba(30,60,120,0.4), transparent)',
        }}
      />

      {/* City lights if night */}
      {!isDay && (
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{ height: '50%' }}
        >
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 3 + 1 + 'px',
                height: Math.random() * 1 + 0.5 + 'px',
                left: Math.random() * 90 + 5 + '%',
                bottom: Math.random() * 40 + 5 + '%',
                background: 'rgba(255, 220, 100, 0.8)',
                boxShadow: '0 0 4px rgba(255,220,100,0.5)',
              }}
            />
          ))}
        </div>
      )}

      {/* HUD overlay */}
      <div className="absolute inset-0 flex flex-col justify-between p-3 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="card-space rounded px-2 py-1 text-[10px] font-mono-iss text-cyan-400">
            VIEW FROM ISS
          </div>
          <div className="card-space rounded px-2 py-1 text-[10px] font-mono-iss text-yellow-400">
            {isDay ? '☀ DAY SIDE' : '🌙 NIGHT SIDE'}
          </div>
        </div>

        {/* Crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-8 h-8">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400 opacity-60" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400 opacity-60" />
            <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 border border-cyan-400 rounded-full opacity-80" />
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div className="card-space rounded px-2 py-1 text-[10px] font-mono-iss text-gray-400">
            ALT: <span className="text-cyan-400">{altitude.toFixed(0)} km</span>
          </div>
          <div className="card-space rounded px-2 py-1 text-[10px] font-mono-iss text-gray-400">
            LOCAL: <span className="text-green-400">{localTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
