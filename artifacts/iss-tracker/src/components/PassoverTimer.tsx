import { useState, useEffect } from "react";
import { calculatePassTime } from "@/lib/issApi";

interface PassoverTimerProps {
  issLat: number;
  issLon: number;
}

export default function PassoverTimer({ issLat, issLon }: PassoverTimerProps) {
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [minutesAway, setMinutesAway] = useState<number | null>(null);
  const [permission, setPermission] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [azimuth, setAzimuth] = useState<number | null>(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setPermission('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLon(pos.coords.longitude);
        setPermission('granted');
      },
      () => setPermission('denied')
    );
  };

  useEffect(() => {
    if (userLat === null || userLon === null) return;
    const mins = calculatePassTime(issLat, issLon, userLat, userLon);
    setMinutesAway(mins);

    // Calculate azimuth
    const dLon = (issLon - userLon) * Math.PI / 180;
    const lat1 = userLat * Math.PI / 180;
    const lat2 = issLat * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const az = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    setAzimuth(Math.round(az));
  }, [issLat, issLon, userLat, userLon]);

  const getDirection = (az: number) => {
    const dirs = ['شمال', 'شمال شرق', 'شرق', 'جنوب شرق', 'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب'];
    return dirs[Math.round(az / 45) % 8];
  };

  return (
    <div className="card-space rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">⏱</span>
        <h2 className="font-orbitron text-sm font-bold text-white tracking-widest">توقيت العبور فوقك</h2>
      </div>

      {permission === 'idle' && (
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm mb-3">احسب متى ستمر المحطة فوق موقعك</p>
          <button
            data-testid="button-request-location"
            onClick={requestLocation}
            className="px-4 py-2 rounded-lg font-orbitron text-xs font-bold text-black transition-all"
            style={{ background: 'linear-gradient(135deg, #00c8ff, #9b59b6)' }}
          >
            📍 شارك موقعك
          </button>
        </div>
      )}

      {permission === 'denied' && (
        <div className="text-center py-4">
          <p className="text-gray-500 text-xs">تعذر الوصول للموقع. اسمح للمتصفح بالوصول.</p>
        </div>
      )}

      {permission === 'granted' && minutesAway !== null && (
        <div className="space-y-3">
          <div className="text-center">
            {minutesAway < 2 ? (
              <div>
                <div className="font-orbitron text-2xl font-black text-green-400 glow-cyan-text">
                  المحطة فوقك الآن!
                </div>
                <p className="text-gray-400 text-xs mt-1">انظر للسماء الآن 👀</p>
              </div>
            ) : (
              <div>
                <div className="font-orbitron text-3xl font-black text-cyan-400 glow-cyan-text">
                  {Math.floor(minutesAway)}<span className="text-lg"> دقيقة</span>
                </div>
                <p className="text-gray-400 text-xs mt-1">حتى المرور فوق موقعك (تقريبي)</p>
              </div>
            )}
          </div>

          {azimuth !== null && (
            <div className="flex gap-3 justify-center">
              <div className="text-center card-space rounded-lg px-3 py-2">
                <div className="font-orbitron text-cyan-400 text-lg font-bold">{azimuth}°</div>
                <div className="text-gray-500 text-[10px] tracking-widest">AZIMUTH</div>
              </div>
              <div className="text-center card-space rounded-lg px-3 py-2">
                <div className="font-orbitron text-purple-400 text-lg font-bold">{getDirection(azimuth)}</div>
                <div className="text-gray-500 text-[10px] tracking-widest">DIRECTION</div>
              </div>
            </div>
          )}

          <p className="text-[10px] text-gray-600 text-center font-mono-iss">
            موقعك: {userLat?.toFixed(2)}°N, {userLon?.toFixed(2)}°E
          </p>
        </div>
      )}
    </div>
  );
}
