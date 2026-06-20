import { useState, useEffect, useCallback, useRef } from "react";
import Globe3D from "@/components/Globe3D";
import ISSViewFromSpace from "@/components/ISSViewFromSpace";
import AstronautsPanel from "@/components/AstronautsPanel";
import HistoryLog from "@/components/HistoryLog";
import PassoverTimer from "@/components/PassoverTimer";
import {
  fetchISSPosition,
  reverseGeocode,
  loadHistory,
  addToHistory,
} from "@/lib/issApi";
import type { ISSPosition, LocationRecord } from "@/lib/issApi";

const REFRESH_INTERVAL = 10000;

export default function Tracker() {
  const [position, setPosition] = useState<ISSPosition | null>(null);
  const [location, setLocation] = useState({ country: '...', region: '...' });
  const [history, setHistory] = useState<LocationRecord[]>(() => loadHistory());
  const [orbitPath, setOrbitPath] = useState<Array<{ lat: number; lon: number }>>([]);
  const [activeTab, setActiveTab] = useState<'globe' | 'view' | 'passover'>('globe');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLayer, setMapLayer] = useState<'dark' | 'night' | 'satellite'>('dark');
  const geocodeCooldown = useRef<number>(0);

  const fetchAndUpdate = useCallback(async () => {
    try {
      const pos = await fetchISSPosition();
      setPosition(pos);
      setLastUpdate(new Date());
      setOrbitPath(prev => {
        const newPath = [...prev, { lat: pos.latitude, lon: pos.longitude }];
        return newPath.slice(-60);
      });

      const now = Date.now();
      if (now - geocodeCooldown.current > 15000) {
        geocodeCooldown.current = now;
        const geo = await reverseGeocode(pos.latitude, pos.longitude);
        setLocation(geo);
        const record: LocationRecord = {
          lat: pos.latitude,
          lon: pos.longitude,
          altitude: pos.altitude,
          velocity: pos.velocity,
          country: geo.country,
          region: geo.region,
          timestamp: pos.timestamp,
        };
        setHistory(prev => addToHistory(record, prev));
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAndUpdate();
    const interval = setInterval(fetchAndUpdate, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAndUpdate]);

  const getLocalTime = (lon: number) => {
    const utcHour = new Date().getUTCHours();
    const utcMin = new Date().getUTCMinutes();
    const offset = lon / 15;
    const localHour = ((utcHour + offset) % 24 + 24) % 24;
    const h = Math.floor(localHour).toString().padStart(2, '0');
    const m = utcMin.toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const mapLayerUrls: Record<string, string> = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    night: 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_Black_Marble/default/2015-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  const issLat = position?.latitude ?? 0;
  const issLon = position?.longitude ?? 0;

  return (
    <div className="min-h-screen text-white" style={{ background: 'radial-gradient(ellipse at 20% 30%, hsl(220 40% 6%) 0%, hsl(220 30% 3%) 100%)' }}>
      {/* Header */}
      <header className="border-b border-cyan-400/10 backdrop-blur-sm sticky top-0 z-30" style={{ background: 'rgba(3,6,12,0.9)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00c8ff22, #9b59b622)', border: '1px solid rgba(0,200,255,0.3)' }}>
              🛸
            </div>
            <div>
              <h1 className="font-orbitron text-sm font-black text-white tracking-widest">ISS TRACKER</h1>
              <p className="text-[10px] text-gray-600 font-mono-iss">محطة الفضاء الدولية</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
              <span className="font-mono-iss text-[10px] text-green-400">LIVE</span>
            </div>
            {lastUpdate && (
              <span className="font-mono-iss text-[10px] text-gray-600 hidden md:block">
                {lastUpdate.toLocaleTimeString('ar-EG')}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Hero stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'الدولة / المنطقة', value: location.country,
              sub: location.region, icon: '🌍', color: 'cyan', testId: 'text-country'
            },
            {
              label: 'الارتفاع', value: loading ? '...' : `${position?.altitude.toFixed(1)} km`,
              sub: 'فوق سطح الأرض', icon: '↑', color: 'purple', testId: 'text-altitude'
            },
            {
              label: 'السرعة', value: loading ? '...' : `${position?.velocity.toFixed(0)} km/h`,
              sub: `${((position?.velocity ?? 0) / 3600).toFixed(2)} km/s`, icon: '⚡', color: 'yellow', testId: 'text-velocity'
            },
            {
              label: 'الإحداثيات', value: loading ? '...' : `${issLat.toFixed(3)}°`,
              sub: `${issLon.toFixed(3)}°`, icon: '📍', color: 'green', testId: 'text-coords'
            },
          ].map((stat) => (
            <div
              key={stat.label}
              data-testid={stat.testId}
              className="card-space rounded-2xl p-4 relative overflow-hidden"
            >
              <div className="absolute top-3 right-3 text-xl opacity-30">{stat.icon}</div>
              <p className="text-gray-500 text-[10px] font-mono-iss tracking-widest uppercase mb-1">{stat.label}</p>
              <p
                className="font-orbitron font-black text-base md:text-lg leading-tight data-ticker"
                style={{ color: stat.color === 'cyan' ? '#00c8ff' : stat.color === 'purple' ? '#9b59b6' : stat.color === 'yellow' ? '#f39c12' : '#2ecc71' }}
              >
                {stat.value}
              </p>
              <p className="text-gray-600 text-[10px] font-mono-iss mt-0.5 truncate">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Globe + tabs */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tab switcher */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(0,200,255,0.05)', border: '1px solid rgba(0,200,255,0.1)' }}>
              {([
                { id: 'globe', label: '🌍 كرة ثلاثية الأبعاد' },
                { id: 'view', label: '🚀 منظر ISS' },
                { id: 'passover', label: '⏱ توقيت العبور' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  data-testid={`button-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-orbitron font-bold transition-all"
                  style={{
                    background: activeTab === tab.id ? 'linear-gradient(135deg, rgba(0,200,255,0.2), rgba(155,89,182,0.2))' : 'transparent',
                    color: activeTab === tab.id ? '#00c8ff' : '#6b7280',
                    border: activeTab === tab.id ? '1px solid rgba(0,200,255,0.3)' : '1px solid transparent',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'globe' && (
              <div className="card-space rounded-2xl overflow-hidden" style={{ height: '420px' }}>
                <Globe3D issLat={issLat} issLon={issLon} orbitPath={orbitPath} />
                <div className="absolute bottom-3 left-3 font-mono-iss text-[10px] text-cyan-600">
                  اسحب لتدوير الكرة الأرضية
                </div>
              </div>
            )}

            {activeTab === 'view' && (
              <div className="space-y-4">
                <ISSViewFromSpace
                  lat={issLat}
                  lon={issLon}
                  altitude={position?.altitude ?? 408}
                  localTime={getLocalTime(issLon)}
                />
                {/* Map with layer switcher */}
                <div className="card-space rounded-2xl overflow-hidden" style={{ height: '280px', position: 'relative' }}>
                  <div className="absolute top-3 right-3 z-10 flex gap-1">
                    {(['dark', 'night', 'satellite'] as const).map((layer) => (
                      <button
                        key={layer}
                        data-testid={`button-map-${layer}`}
                        onClick={() => setMapLayer(layer)}
                        className="text-[10px] px-2 py-1 rounded font-mono-iss transition-all"
                        style={{
                          background: mapLayer === layer ? 'rgba(0,200,255,0.3)' : 'rgba(0,0,0,0.6)',
                          color: mapLayer === layer ? '#00c8ff' : '#9ca3af',
                          border: `1px solid ${mapLayer === layer ? 'rgba(0,200,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
                        }}
                      >
                        {layer === 'dark' ? '🌑 مظلم' : layer === 'night' ? '🌃 أضواء' : '🛰 قمر صناعي'}
                      </button>
                    ))}
                  </div>
                  <iframe
                    key={`${mapLayer}-${Math.round(issLat)}-${Math.round(issLon)}`}
                    title="ISS Map"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${issLon - 8},${issLat - 5},${issLon + 8},${issLat + 5}&layer=mapnik&marker=${issLat},${issLon}`}
                    className="w-full h-full border-0 opacity-80"
                    style={{ filter: mapLayer === 'dark' ? 'invert(0.9) hue-rotate(180deg) brightness(0.7)' : mapLayer === 'night' ? 'invert(1) hue-rotate(180deg) saturate(3) brightness(0.4)' : 'none' }}
                  />
                  <div className="absolute bottom-2 left-2 font-mono-iss text-[10px] text-cyan-600 bg-black/60 px-2 py-0.5 rounded">
                    {issLat.toFixed(4)}° N, {issLon.toFixed(4)}° E
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'passover' && (
              <PassoverTimer issLat={issLat} issLon={issLon} />
            )}
          </div>

          {/* Right: Info panels */}
          <div className="space-y-4">
            <AstronautsPanel />
            <PassoverTimer issLat={issLat} issLon={issLon} />

            {/* Network sim card */}
            <div className="card-space rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📡</span>
                <h2 className="font-orbitron text-xs font-bold text-white tracking-widest">محاكاة 6G</h2>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Latency', value: `${(408 / 299792 * 1000 * 2).toFixed(1)} ms`, bar: 70, color: '#00c8ff' },
                  { label: 'Signal Quality', value: '87%', bar: 87, color: '#2ecc71' },
                  { label: 'Link Status', value: '6G Ready ✓', bar: 100, color: '#9b59b6' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-[10px] font-mono-iss mb-1">
                      <span className="text-gray-500">{item.label}</span>
                      <span style={{ color: item.color }}>{item.value}</span>
                    </div>
                    <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${item.bar}%`, background: item.color, boxShadow: `0 0 6px ${item.color}66` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="flex gap-2 pt-1">
                  <div className="flex-1 text-center card-space rounded-lg py-2">
                    <div className="font-orbitron text-cyan-400 text-sm font-bold">45°</div>
                    <div className="text-gray-600 text-[9px] tracking-widest">AZIMUTH</div>
                  </div>
                  <div className="flex-1 text-center card-space rounded-lg py-2">
                    <div className="font-orbitron text-purple-400 text-sm font-bold">30°</div>
                    <div className="text-gray-600 text-[9px] tracking-widest">ELEVATION</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History log */}
        <HistoryLog
          history={history}
          onClear={() => setHistory([])}
        />

        {/* Auto-refresh notice */}
        <p className="text-center text-gray-700 text-[10px] font-mono-iss pb-4">
          يتحدث تلقائياً كل {REFRESH_INTERVAL / 1000} ثواني · المصدر: wheretheiss.at · open-notify.org
        </p>
      </main>
    </div>
  );
}
