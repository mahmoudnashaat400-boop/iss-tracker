import { useState } from "react";
import { clearHistory, formatTime } from "@/lib/issApi";
import type { LocationRecord } from "@/lib/issApi";

interface HistoryLogProps {
  history: LocationRecord[];
  onClear: () => void;
}

export default function HistoryLog({ history, onClear }: HistoryLogProps) {
  const [showAll, setShowAll] = useState(false);

  const displayed = showAll ? history : history.slice(0, 20);

  const handleClear = () => {
    onClear();
    clearHistory();
  };

  return (
    <div className="card-space rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📍</span>
        <h2 className="font-orbitron text-sm font-bold text-white tracking-widest">سجل المواقع</h2>
        <span className="font-mono-iss text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full ml-auto">
          {history.length} موقع
        </span>
        <button
          data-testid="button-clear-history"
          onClick={handleClear}
          className="text-[10px] font-mono-iss text-red-400 hover:text-red-300 transition-colors px-2 py-0.5 rounded border border-red-400/20 hover:border-red-400/50"
        >
          مسح الكل
        </button>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🛸</div>
          <p className="text-gray-500 text-sm font-mono-iss">جاري تسجيل المواقع...</p>
          <p className="text-gray-600 text-xs mt-1">سيبدأ التسجيل تلقائياً</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
            {displayed.map((rec, i) => (
              <div
                key={rec.timestamp}
                data-testid={`row-history-${i}`}
                className="flex items-center gap-3 p-2.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ borderLeft: '2px solid rgba(0,200,255,0.2)' }}
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: 'rgba(0,200,255,0.1)', color: '#00c8ff' }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-medium truncate">{rec.country}</span>
                    {rec.region && rec.region !== rec.country && (
                      <span className="text-gray-500 text-[10px] truncate">— {rec.region}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="font-mono-iss text-[10px] text-cyan-600">
                      {rec.lat.toFixed(2)}°, {rec.lon.toFixed(2)}°
                    </span>
                    <span className="font-mono-iss text-[10px] text-gray-600">
                      {rec.altitude.toFixed(0)} km
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-[10px] text-gray-600 font-mono-iss text-right">
                  {new Date(rec.timestamp * 1000).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>

          {history.length > 20 && (
            <button
              data-testid="button-show-all-history"
              onClick={() => setShowAll(!showAll)}
              className="w-full mt-3 py-2 text-xs font-mono-iss text-cyan-400 hover:text-cyan-300 transition-colors border border-cyan-400/20 hover:border-cyan-400/40 rounded-lg"
            >
              {showAll ? `عرض أقل ↑` : `عرض الكل (${history.length}) ↓`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
