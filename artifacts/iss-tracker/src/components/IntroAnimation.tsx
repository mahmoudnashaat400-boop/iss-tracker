import { useEffect, useState, useRef } from "react";
import Globe3D from "./Globe3D";

interface IntroAnimationProps {
  onComplete: () => void;
  issLat: number;
  issLon: number;
}

export default function IntroAnimation({ onComplete, issLat, issLon }: IntroAnimationProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const DURATION = 10000;

  useEffect(() => {
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      setPhase(Math.floor(pct / 25));
      if (pct >= 100) {
        clearInterval(timerRef.current!);
        setTimeout(onComplete, 400);
      }
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [onComplete]);

  const phases = [
    { title: "INTERNATIONAL SPACE STATION", sub: "محطة الفضاء الدولية" },
    { title: "ALTITUDE: 408 KM", sub: "الارتفاع: ٤٠٨ كيلومتر" },
    { title: "VELOCITY: 27,600 KM/H", sub: "السرعة: ٢٧٦٠٠ كم/ساعة" },
    { title: "ORBITAL PERIOD: 92 MIN", sub: "دورة كاملة كل ٩٢ دقيقة" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-black">
      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 120 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              opacity: Math.random() * 0.8 + 0.2,
              animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
              animationDelay: Math.random() * 3 + 's',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scanLine {
          from { top: -2px; }
          to { top: 100%; }
        }
      `}</style>

      {/* Scan line effect */}
      <div
        className="absolute left-0 right-0 h-px opacity-30 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(0,200,255,0.8), transparent)',
          animation: 'scanLine 3s linear infinite',
        }}
      />

      {/* 3D Globe */}
      <div className="relative w-full h-full max-w-2xl max-h-96 mx-auto mt-8">
        <Globe3D issLat={issLat} issLon={issLon} orbitPath={[]} interactive={false} />

        {/* ISS orbit ring overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ transform: 'perspective(800px) rotateX(55deg)' }}
        >
          <div
            className="border border-cyan-400 rounded-full opacity-30"
            style={{ width: '55%', height: '55%', animation: 'spin 20s linear infinite' }}
          />
        </div>
      </div>

      {/* Data overlays */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-6 mt-4">
        {/* Main title */}
        <div style={{ animation: 'fadeInUp 1s ease-out' }} className="text-center">
          <div className="font-orbitron text-xs text-cyan-400 tracking-[0.3em] mb-2 opacity-80">
            NASA · ESA · ROSCOSMOS · JAXA · CSA
          </div>
          <h1 className="font-orbitron text-2xl md:text-4xl font-black text-white glow-cyan-text leading-tight">
            {phases[phase]?.title || phases[0].title}
          </h1>
          <p className="font-mono-iss text-cyan-300 text-sm mt-1 opacity-80">
            {phases[phase]?.sub || phases[0].sub}
          </p>
        </div>

        {/* Live data cards */}
        <div className="flex gap-4 flex-wrap justify-center">
          {[
            { label: 'ALTITUDE', value: '408 KM', icon: '↑' },
            { label: 'SPEED', value: '7.66 KM/S', icon: '→' },
            { label: 'ORBIT', value: '92 MIN', icon: '↻' },
            { label: 'CREW', value: '7 ASTRO', icon: '👨‍🚀' },
          ].map((item) => (
            <div
              key={item.label}
              className="card-space rounded-lg px-3 py-2 text-center min-w-[80px]"
              style={{ borderColor: 'rgba(0,200,255,0.2)' }}
            >
              <div className="text-cyan-400 text-lg font-bold">{item.icon}</div>
              <div className="font-orbitron text-white text-xs font-bold">{item.value}</div>
              <div className="text-gray-500 text-[10px] tracking-widest mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-md">
          <div className="flex justify-between items-center mb-2">
            <span className="font-orbitron text-xs text-cyan-400 tracking-widest">INITIALIZING TRACKER</span>
            <span className="font-mono-iss text-xs text-gray-400">{Math.floor(progress)}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden relative">
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #00c8ff, #9b59b6)',
                boxShadow: '0 0 10px rgba(0,200,255,0.6)',
              }}
            />
          </div>
        </div>

        {/* Skip button */}
        <button
          data-testid="button-skip-intro"
          onClick={onComplete}
          className="font-mono-iss text-xs text-gray-500 hover:text-cyan-400 transition-colors underline underline-offset-4 mt-1"
        >
          تخطي المقدمة ← Skip Intro
        </button>
      </div>
    </div>
  );
}
