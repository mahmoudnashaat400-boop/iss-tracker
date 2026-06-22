import { useState, useEffect, useRef, useCallback } from "react";
import Globe3D from "@/components/Globe3D";
import AstronautsPanel from "@/components/AstronautsPanel";
import SixGPanel from "@/components/SixGPanel";
import PassoverTimer from "@/components/PassoverTimer";
import {
  fetchTLE, computePosition, computeOrbitPath,
  getOrbitalPeriod, getInclination, getEccentricity,
  POPULAR_SATELLITES,
} from "@/lib/satelliteApi";
import { reverseGeocode, formatTime } from "@/lib/issApi";
import type { TLEData, SatellitePosition } from "@/lib/satelliteApi";
import type { ISSPosition } from "@/lib/issApi";

const REFRESH_MS = 5000;

interface HistoryEntry {
  lat: number; lon: number; altitude: number; velocity: number;
  country: string; timestamp: number;
}

interface SatelliteTrackerProps {
  onReplayIntro: () => void;
}

export default function SatelliteTracker({ onReplayIntro }: SatelliteTrackerProps) {
  const [noradInput, setNoradInput] = useState('');
  const [tle, setTle] = useState<TLEData | null>(null);
  const [position, setPosition] = useState<SatellitePosition | null>(null);
  const [orbitPath, setOrbitPath] = useState<Array<{ lat: number; lon: number }>>([]);
  const [country, setCountry] = useState('...');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'globe' | 'data' | 'history'>('globe');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const tleRef = useRef<TLEData | null>(null);
  const geocodeCooldown = useRef(0);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => { setUserLat(p.coords.latitude); setUserLon(p.coords.longitude); },
        () => {}
      );
    }
  }, []);

  const loadSatellite = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    setPosition(null);
    setOrbitPath([]);
    setHistory([]);
    try {
      const data = await fetchTLE(id.trim());
      setTle(data);
      tleRef.current = data;
      const pos = computePosition(data);
      if (pos) {
        setPosition(pos);
        setOrbitPath(computeOrbitPath(data, 80));
        setLastUpdate(new Date());
        const geo = await reverseGeocode(pos.lat, pos.lon);
        setCountry(geo.country);
        setHistory([{ lat: pos.lat, lon: pos.lon, altitude: pos.altitude, velocity: pos.velocity, country: geo.country, timestamp: pos.timestamp }]);
      }
    } catch (e) {
      setError('تعذر تحميل بيانات القمر الصناعي. تأكد من رقم NORAD وحاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh position from TLE every 5s
  useEffect(() => {
    if (!tleRef.current) return;
    const id = setInterval(async () => {
      const t = tleRef.current;
      if (!t) return;
      const pos = computePosition(t);
      if (!pos) return;
      setPosition(pos);
      setLastUpdate(new Date());

      const now = Date.now();
      if (now - geocodeCooldown.current > 20000) {
        geocodeCooldown.current = now;
        const geo = await reverseGeocode(pos.lat, pos.lon);
        setCountry(geo.country);
        setHistory(prev => [
          { lat: pos.lat, lon: pos.lon, altitude: pos.altitude, velocity: pos.velocity, country: geo.country, timestamp: pos.timestamp },
          ...prev
        ].slice(0, 200));
      }
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [tle]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (noradInput.trim()) loadSatellite(noradInput);
  };

  const period = tle ? getOrbitalPeriod(tle) : null;
  const inclination = tle ? getInclination(tle) : null;
  const eccentricity = tle ? getEccentricity(tle) : null;

  // Build a fake ISSPosition-compatible object for SixGPanel
  const fakeIssPos: ISSPosition | null = position ? {
    name: tle?.name ?? 'SAT',
    id: parseInt(noradInput || '0'),
    latitude: position.lat,
    longitude: position.lon,
    altitude: position.altitude,
    velocity: position.velocity,
    visibility: 'daylight',
    footprint: 0,
    timestamp: position.timestamp,
    daynum: 0,
    solar_lat: 0,
    solar_lon: 0,
    units: 'kilometers',
  } : null;

  return (
    <div className="min-h-screen text-white" style={{ background: 'radial-gradient(ellipse at 20% 30%, hsl(270 30% 6%) 0%, hsl(220 30% 3%) 100%)' }}>
      {/* Header */}
      <header className="border-b border-purple-400/10 backdrop-blur-sm sticky top-0 z-30" style={{ background: 'rgba(3,4,12,0.92)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 mr-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg,#9b59b622,#00c8ff22)', border: '1px solid rgba(155,89,182,0.4)' }}>
              🛰
            </div>
            <div>
              <h1 className="font-orbitron text-xs font-black text-white tracking-widest">SAT TRACKER</h1>
              <p className="text-[9px] text-gray-600 font-mono-iss">Celestrak + SGP4</p>
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[260px] max-w-lg">
            <input
              data-testid="input-norad-id"
              type="text"
              value={noradInput}
              onChange={e => setNoradInput(e.target.value)}
              placeholder="رقم NORAD (مثال: 20580 للـ Hubble)"
              className="flex-1 px-3 py-1.5 rounded-lg font-mono-iss text-xs text-white placeholder-gray-600 outline-none transition-all focus:ring-1"
              style={{ background: 'rgba(155,89,182,0.1)', border: '1px solid rgba(155,89,182,0.25)', '--tw-ring-color': 'rgba(155,89,182,0.5)' } as React.CSSProperties}
            />
            <button
              data-testid="button-track-satellite"
              type="submit"
              disabled={loading || !noradInput.trim()}
              className="px-4 py-1.5 rounded-lg font-orbitron text-[10px] font-bold text-black transition-all disabled:opacity-40"
              style={{ background: loading ? '#555' : 'linear-gradient(135deg,#9b59b6,#00c8ff)' }}
            >
              {loading ? '⏳' : '🔍 تتبع'}
            </button>
          </form>

          <div className="flex items-center gap-2 ml-auto">
            {position && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 pulse-dot" />
                <span className="font-mono-iss text-[10px] text-purple-400">LIVE</span>
              </div>
            )}
            <button
              data-testid="button-replay-intro-sat"
              onClick={onReplayIntro}
              className="font-orbitron text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105"
              style={{ background: 'rgba(155,89,182,0.15)', border: '1px solid rgba(155,89,182,0.3)', color: '#9b59b6' }}
            >
              ▶ المقدمة
            </button>
          </div>
        </div>

        {/* Popular satellites quick-pick */}
        <div className="max-w-7xl mx-auto px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {POPULAR_SATELLITES.map(sat => (
            <button
              key={sat.noradId}
              data-testid={`button-sat-${sat.noradId}`}
              onClick={() => { setNoradInput(sat.noradId); loadSatellite(sat.noradId); }}
              className="flex-shrink-0 text-[10px] font-mono-iss px-2.5 py-1 rounded-full transition-all hover:scale-105 whitespace-nowrap"
              style={{
                background: tle && noradInput === sat.noradId ? 'rgba(155,89,182,0.3)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${tle && noradInput === sat.noradId ? 'rgba(155,89,182,0.6)' : 'rgba(255,255,255,0.1)'}`,
                color: tle && noradInput === sat.noradId ? '#c084fc' : '#9ca3af',
              }}
            >
              {sat.name.length > 18 ? sat.name.slice(0, 18) + '…' : sat.name}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Error */}
        {error && (
          <div className="rounded-xl p-4 font-mono-iss text-sm text-red-400 text-center"
            style={{ background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Empty state */}
        {!tle && !loading && !error && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🛰</div>
            <h2 className="font-orbitron text-xl font-bold text-white mb-2">اختر قمراً صناعياً</h2>
            <p className="text-gray-500 text-sm font-mono-iss mb-6">أدخل رقم NORAD أو اختر من القائمة أعلاه</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-lg mx-auto">
              {POPULAR_SATELLITES.slice(0, 6).map(sat => (
                <button
                  key={sat.noradId}
                  onClick={() => { setNoradInput(sat.noradId); loadSatellite(sat.noradId); }}
                  className="p-3 rounded-xl text-left transition-all hover:scale-105"
                  style={{ background: 'rgba(155,89,182,0.08)', border: '1px solid rgba(155,89,182,0.15)' }}
                >
                  <div className="font-orbitron text-purple-400 text-xs font-bold">{sat.noradId}</div>
                  <div className="text-white text-xs mt-0.5 leading-tight">{sat.name}</div>
                  <div className="text-gray-600 text-[9px] mt-1">{sat.category}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-spin">🛸</div>
            <p className="font-orbitron text-sm text-purple-400">جاري تحميل بيانات TLE من Celestrak...</p>
            <p className="font-mono-iss text-xs text-gray-600 mt-2">NORAD #{noradInput}</p>
          </div>
        )}

        {/* Main data */}
        {tle && position && !loading && (
          <>
            {/* Satellite name banner */}
            <div className="rounded-2xl p-4 flex items-center gap-4"
              style={{ background: 'linear-gradient(135deg, rgba(155,89,182,0.12), rgba(0,200,255,0.08))', border: '1px solid rgba(155,89,182,0.2)' }}>
              <div className="text-3xl">🛰</div>
              <div className="flex-1">
                <h2 className="font-orbitron text-lg font-black text-white">{tle.name}</h2>
                <div className="flex gap-4 mt-1 flex-wrap">
                  <span className="font-mono-iss text-[10px] text-purple-400">NORAD #{noradInput}</span>
                  {inclination !== null && <span className="font-mono-iss text-[10px] text-gray-500">Inclination: {inclination.toFixed(2)}°</span>}
                  {eccentricity !== null && <span className="font-mono-iss text-[10px] text-gray-500">Eccentricity: {eccentricity.toFixed(6)}</span>}
                  {period !== null && <span className="font-mono-iss text-[10px] text-gray-500">Period: {period.toFixed(1)} min</span>}
                </div>
              </div>
              {lastUpdate && (
                <div className="text-right">
                  <div className="font-mono-iss text-[9px] text-gray-600">آخر تحديث</div>
                  <div className="font-mono-iss text-[10px] text-purple-400">{lastUpdate.toLocaleTimeString('ar-EG')}</div>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Country */}
              <div className="card-space rounded-2xl p-4 relative overflow-hidden">
                <div className="absolute top-3 right-3 text-xl opacity-30">🌍</div>
                <p className="text-gray-500 text-[10px] font-mono-iss tracking-widest uppercase mb-1">الدولة / المنطقة</p>
                <p className="font-orbitron font-black text-base data-ticker" style={{ color: '#9b59b6' }}>{country}</p>
              </div>
              {/* Altitude */}
              <div className="card-space rounded-2xl p-4 relative overflow-hidden">
                <div className="absolute top-3 right-3 text-xl opacity-30">↑</div>
                <p className="text-gray-500 text-[10px] font-mono-iss tracking-widest uppercase mb-1">الارتفاع</p>
                <p className="font-orbitron font-black text-base data-ticker" style={{ color: '#00c8ff' }}>{position.altitude.toFixed(1)} km</p>
                <p className="text-gray-600 text-[10px] font-mono-iss mt-0.5">فوق سطح الأرض</p>
              </div>
              {/* Speed */}
              <div className="card-space rounded-2xl p-4 relative overflow-hidden">
                <div className="absolute top-3 right-3 text-xl opacity-30">⚡</div>
                <p className="text-gray-500 text-[10px] font-mono-iss tracking-widest uppercase mb-1">السرعة</p>
                <p className="font-orbitron font-black text-base data-ticker" style={{ color: '#f39c12' }}>{position.velocity.toFixed(0)} km/h</p>
                <p className="text-gray-600 text-[10px] font-mono-iss mt-0.5">{(position.velocity / 3600).toFixed(3)} km/s</p>
              </div>
              {/* Coordinates — both LAT + LON */}
              <div className="card-space rounded-2xl p-4 relative overflow-hidden">
                <div className="absolute top-3 right-3 text-xl opacity-30">📍</div>
                <p className="text-gray-500 text-[10px] font-mono-iss tracking-widest uppercase mb-2">الإحداثيات</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono-iss text-[9px] text-gray-500 w-5">LAT</span>
                    <span className="font-orbitron font-black text-sm data-ticker" style={{ color: '#2ecc71' }}>
                      {Math.abs(position.lat).toFixed(4)}°
                    </span>
                    <span className="font-orbitron text-[10px] font-bold px-1 rounded"
                      style={{ color: position.lat >= 0 ? '#2ecc71' : '#e74c3c', background: position.lat >= 0 ? 'rgba(46,204,113,0.12)' : 'rgba(231,76,60,0.12)' }}>
                      {position.lat >= 0 ? 'N' : 'S'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono-iss text-[9px] text-gray-500 w-5">LON</span>
                    <span className="font-orbitron font-black text-sm data-ticker" style={{ color: '#1abc9c' }}>
                      {Math.abs(position.lon).toFixed(4)}°
                    </span>
                    <span className="font-orbitron text-[10px] font-bold px-1 rounded"
                      style={{ color: position.lon >= 0 ? '#1abc9c' : '#c084fc', background: position.lon >= 0 ? 'rgba(26,188,156,0.12)' : 'rgba(192,132,252,0.12)' }}>
                      {position.lon >= 0 ? 'E' : 'W'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs + content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {/* Tab bar */}
                <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(155,89,182,0.05)', border: '1px solid rgba(155,89,182,0.12)' }}>
                  {([
                    { id: 'globe', label: '🌍 الكرة الأرضية' },
                    { id: 'data', label: '📡 البيانات التقنية' },
                    { id: 'history', label: '📍 السجل' },
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      data-testid={`button-sat-tab-${tab.id}`}
                      onClick={() => setActiveTab(tab.id)}
                      className="flex-1 py-2 px-3 rounded-lg text-xs font-orbitron font-bold transition-all"
                      style={{
                        background: activeTab === tab.id ? 'linear-gradient(135deg,rgba(155,89,182,0.25),rgba(0,200,255,0.15))' : 'transparent',
                        color: activeTab === tab.id ? '#c084fc' : '#6b7280',
                        border: activeTab === tab.id ? '1px solid rgba(155,89,182,0.35)' : '1px solid transparent',
                      }}
                    >{tab.label}</button>
                  ))}
                </div>

                {activeTab === 'globe' && (
                  <div className="card-space rounded-2xl overflow-hidden relative" style={{ height: '400px' }}>
                    <Globe3D issLat={position.lat} issLon={position.lon} orbitPath={orbitPath} />
                    <div className="absolute top-3 left-3 font-mono-iss text-[10px] rounded px-2 py-1" style={{ background: 'rgba(0,0,0,0.7)', color: '#c084fc' }}>
                      {tle.name}
                    </div>
                    <div className="absolute bottom-3 left-3 font-mono-iss text-[10px] text-purple-600">
                      اسحب لتدوير الكرة · {orbitPath.length} نقطة في المسار
                    </div>
                  </div>
                )}

                {activeTab === 'data' && (
                  <div className="space-y-4">
                    {/* TLE raw data */}
                    <div className="card-space rounded-2xl p-4">
                      <p className="font-orbitron text-[10px] text-gray-500 tracking-widest mb-3">📄 بيانات TLE الخام (Celestrak)</p>
                      <div className="font-mono-iss text-[10px] space-y-1 rounded-lg p-3 overflow-x-auto" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(155,89,182,0.1)' }}>
                        <div className="text-purple-400">{tle.name}</div>
                        <div className="text-green-400 whitespace-nowrap">{tle.line1}</div>
                        <div className="text-cyan-400 whitespace-nowrap">{tle.line2}</div>
                      </div>
                    </div>

                    {/* Orbital elements */}
                    <div className="card-space rounded-2xl p-4">
                      <p className="font-orbitron text-[10px] text-gray-500 tracking-widest mb-3">🪐 العناصر المدارية</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'الميل (Inclination)', value: `${inclination?.toFixed(4)}°`, color: '#9b59b6' },
                          { label: 'الانحراف (Eccentricity)', value: eccentricity?.toFixed(7), color: '#00c8ff' },
                          { label: 'الدورة (Period)', value: `${period?.toFixed(2)} دقيقة`, color: '#2ecc71' },
                          { label: 'الارتفاع الحالي', value: `${position.altitude.toFixed(2)} km`, color: '#f39c12' },
                          { label: 'السرعة المدارية', value: `${(position.velocity / 3600).toFixed(3)} km/s`, color: '#e74c3c' },
                          { label: 'خط العرض', value: `${position.lat.toFixed(4)}°`, color: '#1abc9c' },
                          { label: 'خط الطول', value: `${position.lon.toFixed(4)}°`, color: '#1abc9c' },
                        ].map(item => (
                          <div key={item.label} className="rounded-lg p-3 flex flex-col gap-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <span className="font-mono-iss text-[9px] text-gray-500">{item.label}</span>
                            <span className="font-orbitron font-bold text-sm" style={{ color: item.color }}>{item.value ?? '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 6G simulation */}
                    <SixGPanel position={fakeIssPos} userLat={userLat} userLon={userLon} />
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="card-space rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-lg">📍</span>
                      <h2 className="font-orbitron text-sm font-bold text-white tracking-widest">سجل المواقع</h2>
                      <span className="font-mono-iss text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full ml-auto">
                        {history.length} موقع
                      </span>
                      <button
                        data-testid="button-clear-sat-history"
                        onClick={() => setHistory([])}
                        className="text-[10px] font-mono-iss text-red-400 hover:text-red-300 px-2 py-0.5 rounded border border-red-400/20 hover:border-red-400/50 transition-colors"
                      >مسح</button>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {history.map((rec, i) => (
                        <div
                          key={rec.timestamp + i}
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors"
                          style={{ borderLeft: '2px solid rgba(155,89,182,0.3)' }}
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{ background: 'rgba(155,89,182,0.1)', color: '#c084fc' }}>{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-xs font-medium truncate">{rec.country}</div>
                            <div className="font-mono-iss text-[10px] text-purple-600 mt-0.5">
                              {rec.lat.toFixed(2)}°, {rec.lon.toFixed(2)}° · {rec.altitude.toFixed(0)} km
                            </div>
                          </div>
                          <div className="font-mono-iss text-[9px] text-gray-600">
                            {new Date(rec.timestamp * 1000).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))}
                      {history.length === 0 && (
                        <p className="text-center text-gray-600 text-sm font-mono-iss py-8">لا يوجد سجل بعد</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right panel */}
              <div className="space-y-4">
                <PassoverTimer issLat={position.lat} issLon={position.lon} />
                <SixGPanel position={fakeIssPos} userLat={userLat} userLon={userLon} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
