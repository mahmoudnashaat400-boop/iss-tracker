import { useState, useEffect } from "react";
import type { ISSPosition } from "@/lib/issApi";

interface SixGPanelProps {
  position: ISSPosition | null;
  userLat: number | null;
  userLon: number | null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function slantRangeKm(groundKm: number, altKm: number): number {
  return Math.sqrt(groundKm ** 2 + altKm ** 2);
}

function elevationAngle(groundKm: number, altKm: number): number {
  return Math.atan2(altKm, groundKm) * 180 / Math.PI;
}

function azimuthDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function signalQuality(elevDeg: number): number {
  if (elevDeg < 0) return 0;
  return Math.min(100, Math.round(30 + elevDeg * 1.1 + Math.random() * 3));
}

function latencyMs(slantKm: number): number {
  return (slantKm / 299792) * 1000 * 2;
}

function freqBand(elevDeg: number): string {
  if (elevDeg > 60) return 'THz (0.3–3 THz)';
  if (elevDeg > 30) return 'mmWave (26 GHz)';
  if (elevDeg > 10) return 'Sub-6GHz (3.5 GHz)';
  return 'L-Band (1.5 GHz)';
}

function linkStatus(latMs: number): { label: string; color: string } {
  if (latMs < 5) return { label: '6G Ready ✓', color: '#2ecc71' };
  if (latMs < 15) return { label: '5G / 6G Boundary', color: '#f39c12' };
  return { label: '5G Standard', color: '#e74c3c' };
}

const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export default function SixGPanel({ position, userLat, userLon }: SixGPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [animTick, setAnimTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setAnimTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const hasUser = userLat !== null && userLon !== null && position !== null;

  const issLat = position?.latitude ?? 0;
  const issLon = position?.longitude ?? 0;
  const alt = position?.altitude ?? 408;

  const groundKm = hasUser ? haversineKm(userLat!, userLon!, issLat, issLon) : 4800;
  const slant = slantRangeKm(groundKm, alt);
  const elev = elevationAngle(groundKm, alt);
  const az = hasUser ? azimuthDeg(userLat!, userLon!, issLat, issLon) : 45;
  const sig = signalQuality(elev);
  const lat_ms = latencyMs(slant);
  const band = freqBand(elev);
  const status = linkStatus(lat_ms);
  const dirLabel = DIRECTIONS[Math.round(az / 45) % 8];

  const throughputMbps = Math.round(sig * 12 + (elev > 30 ? 400 : 100));
  const berExp = elev > 40 ? -9 : elev > 20 ? -7 : -5;

  const metrics = [
    { label: 'Latency (RTT)', value: `${lat_ms.toFixed(2)} ms`, bar: Math.min(100, (15 - lat_ms) / 15 * 100), color: lat_ms < 5 ? '#2ecc71' : lat_ms < 15 ? '#f39c12' : '#e74c3c', desc: '6G target < 1ms' },
    { label: 'Signal Quality', value: `${sig}%`, bar: sig, color: sig > 70 ? '#2ecc71' : sig > 40 ? '#f39c12' : '#e74c3c', desc: 'Link margin' },
    { label: 'Link Status', value: status.label, bar: 100, color: status.color, desc: 'ITU IMT-2030' },
  ];

  return (
    <div className="card-space rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        data-testid="button-6g-expand"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 p-5 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-lg">📡</span>
        <div className="flex-1">
          <h2 className="font-orbitron text-sm font-bold text-white tracking-widest">محاكاة شبكة 6G الفضائية</h2>
          <p className="font-mono-iss text-[10px] text-gray-500 mt-0.5">NTN · Non-Terrestrial Network · IMT-2030</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="font-orbitron text-xs font-bold px-2 py-1 rounded"
            style={{ color: status.color, background: `${status.color}22`, border: `1px solid ${status.color}44` }}
          >
            {status.label}
          </span>
          <span className="text-gray-500 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Always-visible quick metrics */}
      <div className="px-5 pb-4 grid grid-cols-3 gap-2">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex justify-between text-[10px] font-mono-iss mb-1">
              <span className="text-gray-500 truncate">{m.label}</span>
              <span style={{ color: m.color }} className="ml-1 shrink-0">{m.value}</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.max(0, m.bar)}%`, background: m.color, boxShadow: `0 0 6px ${m.color}66` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="border-t border-white/5 px-5 py-5 space-y-5">

          {!hasUser && (
            <p className="font-mono-iss text-[10px] text-yellow-500/80 text-center">
              * القيم محسوبة بدون موقع المستخدم — شارك موقعك للحصول على بيانات دقيقة
            </p>
          )}

          {/* Antenna angles */}
          <div>
            <p className="font-orbitron text-[10px] text-gray-500 tracking-widest mb-2">🧭 ANTENNA POINTING (Beamforming)</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Azimuth', value: `${Math.round(az)}°`, sub: dirLabel, color: '#00c8ff' },
                { label: 'Elevation', value: `${Math.max(0, elev).toFixed(1)}°`, sub: elev < 10 ? 'Low — poor link' : elev > 45 ? 'Excellent' : 'Good', color: '#9b59b6' },
                { label: 'Slant Range', value: `${slant.toFixed(0)} km`, sub: 'Distance to ISS', color: '#f39c12' },
                { label: 'Ground Dist.', value: `${groundKm.toFixed(0)} km`, sub: 'Horizontal', color: '#2ecc71' },
              ].map(item => (
                <div key={item.label} className="text-center rounded-lg py-2.5 px-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="font-orbitron font-black text-base" style={{ color: item.color }}>{item.value}</div>
                  <div className="font-mono-iss text-[9px] text-gray-400 mt-0.5">{item.label}</div>
                  <div className="font-mono-iss text-[9px] text-gray-600 mt-0.5">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced link budget */}
          <div>
            <p className="font-orbitron text-[10px] text-gray-500 tracking-widest mb-2">📶 LINK BUDGET (6G NTN)</p>
            <div className="space-y-2">
              {[
                { label: 'Frequency Band', value: band, color: '#00c8ff' },
                { label: 'Throughput (est.)', value: `${throughputMbps} Mbps`, color: '#2ecc71' },
                { label: 'BER (Bit Error Rate)', value: `10⁻${Math.abs(berExp)}`, color: '#9b59b6' },
                { label: 'Doppler Shift', value: `${(position?.velocity ?? 27600 / 3.6 * 26 / 3e8 * 1e6).toFixed(1)} kHz`, color: '#f39c12' },
                { label: 'Free-space Path Loss', value: `${(20 * Math.log10(slant * 1e3) + 20 * Math.log10(26e9) - 147.55).toFixed(1)} dB`, color: '#e74c3c' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="font-mono-iss text-[10px] text-gray-500">{row.label}</span>
                  <span className="font-mono-iss text-[10px] font-bold" style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 6G vs 5G comparison */}
          <div>
            <p className="font-orbitron text-[10px] text-gray-500 tracking-widest mb-2">⚖️ 6G vs 5G (IMT-2030)</p>
            <div className="overflow-x-auto">
              <table className="w-full font-mono-iss text-[10px]">
                <thead>
                  <tr className="text-gray-600">
                    <td className="py-1 pr-3">المعيار</td>
                    <td className="py-1 pr-3 text-blue-400">5G</td>
                    <td className="py-1 text-cyan-400">6G (Target)</td>
                  </tr>
                </thead>
                <tbody className="text-gray-400">
                  {[
                    ['Latency', '< 1 ms', '< 0.1 ms'],
                    ['Peak Speed', '20 Gbps', '1 Tbps'],
                    ['Reliability', '99.999%', '99.9999%'],
                    ['Altitude', 'Ground only', 'LEO / GEO'],
                    ['AI Integration', 'Limited', 'Native AI'],
                  ].map(([feat, v5, v6]) => (
                    <tr key={feat} className="border-b border-white/5">
                      <td className="py-1 pr-3 text-gray-500">{feat}</td>
                      <td className="py-1 pr-3 text-blue-400">{v5}</td>
                      <td className="py-1 text-cyan-400">{v6}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Academic citation */}
          <div className="rounded-lg p-3 font-mono-iss text-[10px] text-gray-500 leading-relaxed" style={{ background: 'rgba(0,200,255,0.03)', border: '1px solid rgba(0,200,255,0.08)' }}>
            <span className="text-cyan-600">📚 المرجع: </span>
            ITU-R IMT-2030 (6G) Framework — Non-Terrestrial Networks (NTN) support Satellite-to-Ground links with LEO coverage at 400–1200 km altitude, enabling sub-10ms RTT global connectivity.
          </div>
        </div>
      )}
    </div>
  );
}
