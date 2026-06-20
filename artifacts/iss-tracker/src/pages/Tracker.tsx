import { useState, useEffect, useCallback, useRef } from "react";
import Globe3D from "@/components/Globe3D";
import ISSViewFromSpace from "@/components/ISSViewFromSpace";
import AstronautsPanel from "@/components/AstronautsPanel";
import HistoryLog from "@/components/HistoryLog";
import PassoverTimer from "@/components/PassoverTimer";
import SixGPanel from "@/components/SixGPanel";
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
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const geocodeCooldown = useRef<number>(0);

  const fetchAndUpdate = useCallback(async () => {
    try {
      const pos = await fetchISSPosition();
      setPosition(pos);
      setLastUpdate(new Date());
      setOrbitPath(prev => [...prev, { lat: pos.latitude, lon: pos.longitude }].slice(-60));

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

  // Try to silently get user location for 6G panel
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLon(pos.coords.longitude); },
      () => {}
    );
  }, []);

  const getLocalTime = (lon: number) => {
    const utcHour = new Date().getUTCHours();
    const utcMin = new Date().getUTCMinutes();
    const offset = lon / 15;
    const localHour = ((utcHour + offset) % 24 + 24) % 24;
    return `${Math.floor(localHour).toString().padStart(2, '0')}:${utcMin.toString().padStart(2, '0')}`;
  };

  const issLat = position?.latitude ?? 0;
  const issLon = position?.longitude ?? 0;

  return (
    <div className="min-h-screen text-white" style={{ background: 'radial-gradient(ellipse at 20% 30%, hsl(220 40% 6%) 0%, hsl(220 30% 3%) 100%)' }}>
      {/* Header */}
      <header className="border-b border-cyan-400/10 backdrop-blur-sm sticky top-0 z-30" style={{ background: 'rgba(3,6,12,0.9)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#00c8ff22,#9b59b622)', border: '1px solid rgba(0,200,255,0.3)' }}>
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
        {/* Hero stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'الدولة / المنطقة', value: location.country, sub: location.region, icon: '🌍', color: '#00c8ff', testId: 'text-country' },
            { label: 'الارتفاع', value: loading ? '...' : `${position?.altitude.toFixed(1)} km`, sub: 'فوق سطح الأرض', icon: '↑', color: '#9b59b6', testId: 'text-altitude' },
            { label: 'السرعة', value: loading ? '...' : `${position?.velocity.toFixed(0)} km/h`, sub: `${((position?.velocity ?? 0) / 3600).toFixed(2)} km/s`, icon: '⚡', color: '#f39c12', testId: 'text-velocity' },
            { label: 'الإحداثيات', value: loading ? '...' : `${issLat.toFixed(3)}°`, sub: `${issLon.toFixed(3)}°`, icon: '📍', color: '#2ecc71', testId: 'text-coords' },
          ].map((stat) => (
            <div key={stat.label} data-testid={stat.testId} className="card-space rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute top-3 right-3 text-xl opacity-30">{stat.icon}</div>
              <p className="text-gray-500 text-[10px] font-mono-iss tracking-widest uppercase mb-1">{stat.label}</p>
              <p className="font-orbitron font-black text-base md:text-lg leading-tight data-ticker" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-gray-600 text-[10px] font-mono-iss mt-0.5 truncate">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Main content */}
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
                    background: activeTab === tab.id ? 'linear-gradient(135deg,rgba(0,200,255,0.2),rgba(155,89,182,0.2))' : 'transparent',
                    color: activeTab === tab.id ? '#00c8ff' : '#6b7280',
                    border: activeTab === tab.id ? '1px solid rgba(0,200,255,0.3)' : '1px solid transparent',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'globe' && (
              <div className="card-space rounded-2xl overflow-hidden relative" style={{ height: '420px' }}>
                <Globe3D issLat={issLat} issLon={issLon} orbitPath={orbitPath} />
                <div className="absolute bottom-3 left-3 font-mono-iss text-[10px] text-cyan-600">
                  اسحب لتدوير الكرة الأرضية
                </div>
              </div>
            )}

            {activeTab === 'view' && (
              <div className="space-y-4">
                <ISSViewFromSpace lat={issLat} lon={issLon} altitude={position?.altitude ?? 408} localTime={getLocalTime(issLon)} />
                <div className="card-space rounded-2xl overflow-hidden relative" style={{ height: '280px' }}>
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

            {/* 6G panel spans full width on left column */}
            <SixGPanel position={position} userLat={userLat} userLon={userLon} />
          </div>

          {/* Right: Info panels */}
          <div className="space-y-4">
            <AstronautsPanel />
            <PassoverTimer issLat={issLat} issLon={issLon} />
          </div>
        </div>

        {/* History log */}
        <HistoryLog history={history} onClear={() => setHistory([])} />

        <p className="text-center text-gray-700 text-[10px] font-mono-iss pb-4">
          يتحدث تلقائياً كل {REFRESH_INTERVAL / 1000} ثواني · المصدر: wheretheiss.at · open-notify.org
        </p>
      </main>
    </div>
  );
}
