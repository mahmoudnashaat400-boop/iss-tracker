import { useState, useEffect } from "react";
import { fetchAstronauts, getAstronautInitials, getAstronautColor, getNationalityFlag } from "@/lib/issApi";
import type { Astronaut } from "@/lib/issApi";

export default function AstronautsPanel() {
  const [astronauts, setAstronauts] = useState<Astronaut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchAstronauts()
      .then((data) => {
        setAstronauts(data.people.filter((p) => p.craft === "ISS"));
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
        // fallback crew
        setAstronauts([
          { name: "Oleg Kononenko", craft: "ISS" },
          { name: "Nikolai Chub", craft: "ISS" },
          { name: "Tracy Dyson", craft: "ISS" },
          { name: "Matthew Dominick", craft: "ISS" },
          { name: "Michael Barratt", craft: "ISS" },
          { name: "Jeanette Epps", craft: "ISS" },
          { name: "Alexander Grebenkin", craft: "ISS" },
        ]);
      });
  }, []);

  return (
    <div className="card-space rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
        <h2 className="font-orbitron text-sm font-bold text-white tracking-widest">LIVE CREW ON ISS</h2>
        {!loading && (
          <span className="ml-auto font-mono-iss text-xs text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full">
            {astronauts.length} رواد
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-16 h-20 rounded-xl bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {astronauts.map((astro) => (
            <div
              key={astro.name}
              data-testid={`card-astronaut-${astro.name.replace(/\s/g, '-')}`}
              className="flex-shrink-0 flex flex-col items-center gap-2 group cursor-default"
            >
              <div
                className="relative w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white transition-transform group-hover:scale-110"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${getAstronautColor(astro.name)}cc, ${getAstronautColor(astro.name)}44)`,
                  border: `2px solid ${getAstronautColor(astro.name)}66`,
                  boxShadow: `0 0 12px ${getAstronautColor(astro.name)}44`,
                }}
              >
                {getAstronautInitials(astro.name)}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-gray-900 pulse-dot" />
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-300 font-medium leading-tight max-w-[60px] truncate">
                  {astro.name.split(' ')[0]}
                </div>
                <div className="text-sm">{getNationalityFlag(astro.name)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-[10px] text-gray-600 mt-2 font-mono-iss">* بيانات احتياطية — API غير متاح</p>
      )}
    </div>
  );
}
