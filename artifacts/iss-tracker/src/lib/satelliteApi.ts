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
  const res = await fetch(`/api/tle/${noradId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const data = await res.json() as { name: string; line1: string; line2: string };
  if (!data.line1 || !data.line2) throw new Error('Invalid TLE response');
  return data;
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

    // velocity from velocity vector
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
  // Mean motion is in line 2, field revolutions/day
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
