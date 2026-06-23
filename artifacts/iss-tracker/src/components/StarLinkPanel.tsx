import { useState, useEffect, useRef } from "react";
import { fetchTLE, computePosition } from "@/lib/satelliteApi";
import type { TLEData, SatellitePosition } from "@/lib/satelliteApi";

const STARLINK_IDS = [
  { noradId: '44713', label: 'STARLINK-1007' },
  { noradId: '44714', label: 'STARLINK-1008' },
  { noradId: '44715', label: 'STARLINK-1009' },
  { noradId: '44716', label: 'STARLINK-1010' },
];

const SPEED_OF_LIGHT_KM_S = 299792;
const KU_FREQ_HZ = 12e9;
const REF_DIST_KM = 550;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function dist3dKm(uLat: number, uLon: number, sLat: number, sLon: number, altKm: number): number {
  const ground = haversineKm(uLat, uLon, sLat, sLon);
  return Math.sqrt(ground ** 2 + altKm ** 2);
}

function elevationDeg(uLat: number, uLon: number, sLat: number, sLon: number, altKm: number): number {
  const ground = haversineKm(uLat, uLon, sLat, sLon);
  return (Math.atan2(altKm, ground) * 180) / Math.PI;
}

function fsplDb(distKm: number, freqHz: number): number {
  const d = distKm * 1000;
  return 20 * Math.log10(d) + 20 * Math.log10(freqHz) - 147.55;
}

interface LinkResult {
  name: string;
  noradId: string;
  distKm: number;
  elevDeg: number;
  rttMs: number;
  fspl: number;
  signalPct: number;
  speedMbps: number;
  statusLabel: string;
  statusColor: string;
}

function computeLink(
  uLat: number,
  uLon: number,
  name: string,
  noradId: string,
  pos: SatellitePosition
): LinkResult {
  const dist = dist3dKm(uLat, uLon, pos.lat, pos.lon, pos.altitude);
  const elev = elevationDeg(uLat, uLon, pos.lat, pos.lon, pos.altitude);
  const rtt = (2 * dist / SPEED_OF_LIGHT_KM_S) * 1000;
  const fspl = fsplDb(dist, KU_FREQ_HZ);

  let sig = Math.max(5, Math.min(100, 100 - ((dist - REF_DIST_KM) / 8)));
  if (elev < 25) sig = Math.max(5, sig - (25 - elev) * 1.8);

  const speedMbps = Math.round(50 + (sig / 100) * 170);

  let statusLabel = 'ممتاز ✅';
  let statusColor = '#2ecc71';
  if (sig < 40) { statusLabel = 'ضعيف ❌'; statusColor = '#e74c3c'; }
  else if (sig < 60) { statusLabel = 'مقبول ⚠️'; statusColor = '#f39c12'; }
  else if (sig < 80) { statusLabel = 'جيد 🟡'; statusColor = '#f1c40f'; }

  return {
    name,
    noradId,
    distKm: dist,
    elevDeg: elev,
    rttMs: rtt,
    fspl,
    signalPct: sig,
    speedMbps,
    statusLabel,
    statusColor,
  };
}

interface Props {
  userLat: number | null;
  userLon: number | null;
}

export default function StarLinkPanel({ userLat, userLon }: Props) {
  const [best, setBest] = useState<LinkResult | null>(null);
  const [all, setAll] = useState<LinkResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(false);
  const tlesRef = useRef<Array<{ tle: TLEData; noradId: string; label: string }>>([]);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      const results: typeof tlesRef.current = [];
      for (const s of STARLINK_IDS) {
        try {
          const tle = await fetchTLE(s.noradId);
          results.push({ tle, noradId: s.noradId, label: s.label });
        } catch { /* skip */ }
      }
      tlesRef.current = results;
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const run = () => {
      const tles = tlesRef.current;
      if (tles.length === 0) return;
      const uLat = userLat ?? 30.06;
      const uLon = userLon ?? 31.24;
      const results: LinkResult[] = [];
      for (const { tle, noradId, label } of tles) {
        const pos = computePosition(tle);
        if (pos) results.push(computeLink(uLat, uLon, label, noradId, pos));
      }
      if (results.length === 0) return;
      results.sort((a, b) => a.distKm - b.distKm);
      setBest(results[0]);
      setAll(results);
      setLastUpdate(new Date());
    };
    const id = setInterval(run, 5000);
    run();
    return () => clearInterval(id);
  }, [userLat, userLon]);

  const barStyle = (pct: number, color: string) => ({
    width: `${pct}%`,
    background: `linear-gradient(90deg, ${color}88, ${color})`,
    height: '4px',
    borderRadius: '2px',
    transition: 'width 1s ease',
  });

  return (
    <div
      className="card-space rounded-2xl p-5"
      style={{ border: '1px solid rgba(26,188,156,0.2)', background: 'linear-gradient(135deg,rgba(26,188,156,0.05),rgba(0,200,255,0.03))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛰️</span>
          <div>
            <h3 className="font-orbitron text-xs font-black text-white tracking-widest">STARLINK LINK ANALYSIS</h3>
            <p className="font-mono-iss text-[9px] text-gray-500 mt-0.5">محاكاة · Ku-band 12 GHz · SGP4</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="font-mono-iss text-[9px] text-teal-600">
              {lastUpdate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-teal-400 pulse-dot'}`} />
        </div>
      </div>

      {loading && (
        <div className="text-center py-6">
          <div className="text-2xl mb-2 animate-spin">🛸</div>
          <p className="font-mono-iss text-[10px] text-teal-400">جاري جلب بيانات Starlink من Celestrak...</p>
        </div>
      )}

      {!loading && best && (
        <>
          {/* Nearest satellite banner */}
          <div className="rounded-xl p-3 mb-4"
            style={{ background: 'rgba(26,188,156,0.08)', border: '1px solid rgba(26,188,156,0.15)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono-iss text-[9px] text-gray-500">📍 أقرب قمر Starlink</span>
              <span className="font-orbitron text-[10px] font-bold text-teal-400 ml-auto">#{best.noradId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-orbitron text-sm font-black text-white">{best.name}</span>
              <span className="font-orbitron text-xs font-bold px-2 py-0.5 rounded-lg"
                style={{ color: best.statusColor, background: `${best.statusColor}18`, border: `1px solid ${best.statusColor}40` }}>
                {best.statusLabel}
              </span>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'المسافة', value: `${best.distKm.toFixed(0)} km`, icon: '📏', color: '#1abc9c' },
              { label: 'زمن الاستجابة (RTT)', value: `${best.rttMs.toFixed(1)} ms`, icon: '⏱️', color: '#00c8ff' },
              { label: 'السرعة المتوقعة', value: `${best.speedMbps} Mbps`, icon: '🚀', color: '#9b59b6' },
              { label: 'زاوية الارتفاع', value: `${best.elevDeg.toFixed(1)}°`, icon: '📡', color: '#f39c12' },
            ].map(m => (
              <div key={m.label} className="rounded-lg p-3"
                style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-base">{m.icon}</span>
                  <span className="font-mono-iss text-[9px] text-gray-500">{m.label}</span>
                </div>
                <span className="font-orbitron font-black text-sm" style={{ color: m.color }}>{m.value}</span>
              </div>
            ))}
          </div>

          {/* Signal quality bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono-iss text-[9px] text-gray-500">📶 جودة الإشارة (Ku-band)</span>
              <span className="font-orbitron text-xs font-black" style={{ color: best.statusColor }}>
                {best.signalPct.toFixed(0)}%
              </span>
            </div>
            <div className="rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', height: '6px' }}>
              <div style={{ ...barStyle(best.signalPct, best.statusColor), height: '6px' }} />
            </div>
          </div>

          {/* Link budget */}
          <div className="rounded-lg p-3 mb-4"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(26,188,156,0.1)' }}>
            <p className="font-mono-iss text-[9px] text-gray-500 mb-2">📊 ميزانية الرابط (Link Budget)</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'FSPL', value: `${best.fspl.toFixed(1)} dB`, desc: 'فقدان الفضاء الحر' },
                { label: 'الترددد', value: '12 GHz', desc: 'نطاق Ku-band' },
                { label: 'Latency (OW)', value: `${(best.rttMs / 2).toFixed(1)} ms`, desc: 'اتجاه واحد' },
                { label: 'مقارنة 4G/5G', value: '20–50 ms', desc: 'أرضي' },
              ].map(item => (
                <div key={item.label} className="flex flex-col">
                  <span className="font-mono-iss text-[9px] text-gray-600">{item.label}</span>
                  <span className="font-orbitron text-[10px] font-bold text-teal-400">{item.value}</span>
                  <span className="font-mono-iss text-[8px] text-gray-600">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* All satellites toggle */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full text-center font-mono-iss text-[9px] text-gray-500 hover:text-teal-400 transition-colors py-1"
          >
            {expanded ? '▲ إخفاء باقي الأقمار' : `▼ عرض كل الأقمار (${all.length})`}
          </button>

          {expanded && (
            <div className="mt-3 space-y-2">
              {all.map((sat, i) => (
                <div
                  key={sat.noradId}
                  className="flex items-center gap-3 p-2.5 rounded-lg"
                  style={{
                    background: i === 0 ? 'rgba(26,188,156,0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${i === 0 ? 'rgba(26,188,156,0.25)' : 'rgba(255,255,255,0.05)'}`,
                  }}
                >
                  <span className="font-mono-iss text-[9px] font-bold w-4 text-center" style={{ color: i === 0 ? '#1abc9c' : '#6b7280' }}>
                    {i === 0 ? '★' : `${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-orbitron text-[10px] font-bold text-white">{sat.name}</div>
                    <div className="font-mono-iss text-[9px] text-gray-500">
                      {sat.distKm.toFixed(0)} km · {sat.elevDeg.toFixed(0)}° elev · {sat.rttMs.toFixed(1)} ms RTT
                    </div>
                  </div>
                  <div className="font-orbitron text-[10px] font-bold" style={{ color: sat.statusColor }}>
                    {sat.signalPct.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Note */}
          <p className="font-mono-iss text-[8px] text-gray-700 text-center mt-3">
            {userLat ? `موقعك: ${userLat.toFixed(2)}°, ${userLon?.toFixed(2)}°` : 'موقع افتراضي (القاهرة)'} · محاكاة تعليمية · NTN 6G
          </p>
        </>
      )}
    </div>
  );
}
