import * as satellite from 'satellite.js';

export interface SatelliteInfo {
  name: string;
  noradId: string;
  category: string;
}

export const POPULAR_SATELLITES: SatelliteInfo[] = [
  { name: 'ISS (ZARYA)', noradId: '25544', category: 'محطة فضاء' },
  { name: 'Hubble Space Telescope', noradId: '20580', category: 'علمي' },
  { name: 'Tiangong CSS', noradId: '48274', category: 'محطة فضاء' },
  { name: 'NOAA 19', noradId: '33591', category: 'طقس' },
  { name: 'Landsat 8', noradId: '39084', category: 'مراقبة أرض' },
  { name: 'GPS BIIR-2', noradId: '28474', category: 'ملاحة' },
  { name: 'GOES-16', noradId: '41866', category: 'طقس' },
  { name: 'Terra', noradId: '25994', category: 'علمي' },
  { name: 'Aqua', noradId: '27424', category: 'علمي' },
  { name: 'Sentinel-2A', noradId: '40697', category: 'مراقبة أرض' },
  { name: 'Starlink-1007', noradId: '44713', category: 'اتصالات' },
  { name: 'SPOT 7', noradId: '40053', category: 'تصوير' },
];

export interface SatellitePosition {
  lat: number;
  lon: number;
  altitude: number;
  velocity: number;
  timestamp: number;
}

export interface TLEData {
  name: string;
  line1: string;
  line2: string;
}

export async function fetchTLE(noradId: string): Promise<TLEData> {
  // Try ivanstanojevic first (CORS-friendly public API)
  try {
    const res = await fetch(`https://tle.ivanstanojevic.me/api/tle/${noradId}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json() as { name?: string; line1?: string; line2?: string };
      if (data.line1 && data.line2) {
        return { name: data.name ?? `SAT-${noradId}`, line1: data.line1, line2: data.line2 };
      }
    }
  } catch {
    // fall through to next source
  }

  // Fallback: celestrak via cors proxy
  try {
    const url = `https://corsproxy.io/?url=https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=TLE`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const text = await res.text();
      const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length >= 3) {
        return {
          name: lines[0].replace(/^0 /, '').trim(),
          line1: lines[1],
          line2: lines[2],
        };
      }
    }
  } catch {
    // fall through
  }

  throw new Error(`Failed to fetch TLE for NORAD ID ${noradId}`);
}

export function computePosition(tle: TLEData, date: Date = new Date()): SatellitePosition | null {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    if (satrec.error !== 0) return null;

    const posVel = satellite.propagate(satrec, date);
    if (!posVel.position || posVel.position === false) return null;

    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(posVel.position as { x: number; y: number; z: number }, gmst);

    const lat = satellite.degreesLat(geodetic.latitude);
    const lon = satellite.degreesLong(geodetic.longitude);
    const altitude = geodetic.height; // km

    const vel = posVel.velocity as { x: number; y: number; z: number } | false;
    const speed = vel
      ? Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2) * 3600 // km/h
      : 0;

    return {
      lat,
      lon,
      altitude,
      velocity: speed,
      timestamp: date.getTime() / 1000,
    };
  } catch {
    return null;
  }
}

export function getOrbitalPeriod(tle: TLEData): number {
  try {
    const line2 = tle.line2;
    const meanMotion = parseFloat(line2.substring(52, 63)); // rev/day
    return 1440 / meanMotion; // minutes per orbit
  } catch {
    return 90;
  }
}

export function getInclination(tle: TLEData): number {
  try {
    return parseFloat(tle.line2.substring(8, 16));
  } catch {
    return 0;
  }
}

export function getEccentricity(tle: TLEData): number {
  try {
    return parseFloat('0.' + tle.line2.substring(26, 33));
  } catch {
    return 0;
  }
}

export function getNoradFromLine(line1: string): string {
  return line1.substring(2, 7).trim();
}

export function computeOrbitPath(tle: TLEData, points = 60): Array<{ lat: number; lon: number }> {
  const now = new Date();
  const period = getOrbitalPeriod(tle);
  const step = (period * 60 * 1000) / points; // ms between points
  const result: Array<{ lat: number; lon: number }> = [];

  for (let i = -points / 2; i <= points / 2; i++) {
    const date = new Date(now.getTime() + i * step);
    const pos = computePosition(tle, date);
    if (pos) result.push({ lat: pos.lat, lon: pos.lon });
  }

  return result;
}
