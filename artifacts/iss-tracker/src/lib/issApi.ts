export interface ISSPosition {
  name: string;
  id: number;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
  footprint: number;
  timestamp: number;
  daynum: number;
  solar_lat: number;
  solar_lon: number;
  units: string;
}

export interface Astronaut {
  name: string;
  craft: string;
}

export interface AstronautsResponse {
  message: string;
  number: number;
  people: Astronaut[];
}

export interface LocationRecord {
  lat: number;
  lon: number;
  altitude: number;
  velocity: number;
  country: string;
  region: string;
  timestamp: number;
}

export async function fetchISSPosition(): Promise<ISSPosition> {
  const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
  if (!res.ok) throw new Error('Failed to fetch ISS position');
  return res.json();
}

export async function fetchAstronauts(): Promise<AstronautsResponse> {
  const res = await fetch('https://corsproxy.io/?url=http://api.open-notify.org/astros.json');
  if (!res.ok) throw new Error('Failed to fetch astronauts');
  return res.json();
}

export async function reverseGeocode(lat: number, lon: number): Promise<{ country: string; region: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&format=json&zoom=5`,
      { headers: { 'Accept-Language': 'ar,en' } }
    );
    if (!res.ok) return { country: 'المحيط', region: 'منطقة بحرية' };
    const data = await res.json();
    const addr = data.address || {};
    const country = addr.country || 'المحيط';
    const region = addr.state || addr.county || addr.city || addr.ocean || addr.sea || 'غير محدد';
    return { country, region };
  } catch {
    return { country: 'المحيط', region: 'منطقة بحرية' };
  }
}

const STORAGE_KEY = 'iss_location_history';

export function loadHistory(): LocationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocationRecord[];
  } catch {
    return [];
  }
}

export function saveHistory(records: LocationRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore storage errors
  }
}

export function addToHistory(record: LocationRecord, existing: LocationRecord[]): LocationRecord[] {
  const updated = [record, ...existing].slice(0, 500);
  saveHistory(updated);
  return updated;
}

export function clearHistory(): LocationRecord[] {
  localStorage.removeItem(STORAGE_KEY);
  return [];
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function getAstronautInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export function getAstronautColor(name: string): string {
  const colors = [
    '#00C8FF', '#9B59B6', '#2ECC71', '#F39C12', '#E74C3C',
    '#1ABC9C', '#3498DB', '#E91E63', '#FF5722', '#607D8B'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function getNationalityFlag(name: string): string {
  const lower = name.toLowerCase();
  if (/ivanov|novitsky|kononenko|borisov|fedyaev|grebenkin|pletenko/i.test(name)) return '🇷🇺';
  if (/oleg|sergei|alexei|yuri|dmitri|nikolai/i.test(name)) return '🇷🇺';
  if (/zhang|tang|ye|wang|li|zhu/i.test(name)) return '🇨🇳';
  if (/furukawa|wakata|hoshide|onishi/i.test(name)) return '🇯🇵';
  if (/parmitano|cristoforetti|nespoli|mogensen|peake|maurer|kuipers/i.test(name)) return '🇪🇺';
  if (/mogensen/i.test(name)) return '🇩🇰';
  if (/maurer/i.test(name)) return '🇩🇪';
  return '🇺🇸';
}

export function calculatePassTime(issLat: number, issLon: number, userLat: number, userLon: number): number | null {
  const R = 6371;
  const issAlt = 408;
  const issOrbitalPeriod = 92;
  const issOrbitalSpeed = 7.66;
  const groundTrackRate = 360 / issOrbitalPeriod;

  const dlat = (issLat - userLat) * Math.PI / 180;
  const dlon = (issLon - userLon) * Math.PI / 180;
  const a = Math.sin(dlat/2)**2 + Math.cos(userLat*Math.PI/180) * Math.cos(issLat*Math.PI/180) * Math.sin(dlon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const groundDist = R * c;

  const maxViewDist = Math.sqrt((R + issAlt)**2 - R**2);
  if (groundDist < maxViewDist * 0.3) return 0;

  const minutesUntil = (groundDist / (issOrbitalSpeed * 60)) * 1.5;
  return Math.min(minutesUntil, issOrbitalPeriod);
}
