import { useEffect, useState, useRef } from "react";

interface IntroAnimationProps {
  onComplete: () => void;
  issLat: number;
  issLon: number;
}

export default function IntroAnimation({ onComplete, issLat, issLon }: IntroAnimationProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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

  const current = phases[Math.min(phase, phases.length - 1)];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end overflow-hidden bg-black">

      {/* ── Video background ── */}
      {!videoError ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          onError={() => setVideoError(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.75 }}
        >
          <source src="/iss-intro.mp4" type="video/mp4" />
        </video>
      ) : (
        /* Fallback star field if video fails */
        <div className="absolute inset-0">
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
      )}

      {/* Dark gradient overlay so text is always readable */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.25) 100%)',
        }}
      />

      {/* Scan-line effect */}
      <style>{`
        @keyframes twinkle { 0%,100%{opacity:.2} 50%{opacity:1} }
        @keyframes scanLine { from{top:-2px} to{top:100%} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      <div
        className="absolute left-0 right-0 h-px opacity-20 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg,transparent,rgba(0,200,255,.9),transparent)',
          animation: 'scanLine 3s linear infinite',
        }}
      />

      {/* ── Bottom HUD ── */}
      <div className="relative z-10 w-full px-6 pb-10 flex flex-col items-center gap-5">

        {/* Agency logos row */}
        <div
          className="font-orbitron text-[10px] text-cyan-400/70 tracking-[0.35em]"
          style={{ animation: 'fadeInUp 1s ease-out' }}
        >
          NASA · ESA · ROSCOSMOS · JAXA · CSA
        </div>

        {/* Dynamic phase title */}
        <div className="text-center" style={{ animation: 'fadeInUp 1s ease-out .15s both' }}>
          <h1 className="font-orbitron text-3xl md:text-5xl font-black text-white glow-cyan-text leading-tight tracking-wide">
            {current.title}
          </h1>
          <p className="font-mono-iss text-cyan-300 text-sm mt-1.5 opacity-80">
            {current.sub}
          </p>
        </div>

        {/* Live data cards */}
        <div
          className="flex gap-3 flex-wrap justify-center"
          style={{ animation: 'fadeInUp 1s ease-out .3s both' }}
        >
          {[
            { label: 'ALTITUDE', value: '408 KM', icon: '↑', color: '#00c8ff' },
            { label: 'SPEED', value: '7.66 KM/S', icon: '→', color: '#9b59b6' },
            { label: 'ORBIT', value: '92 MIN', icon: '↻', color: '#2ecc71' },
            { label: 'CREW', value: '7 ASTRO', icon: '👨‍🚀', color: '#f39c12' },
            {
              label: 'LAT',
              value: `${issLat >= 0 ? '+' : ''}${issLat.toFixed(1)}°`,
              icon: '↕',
              color: '#e74c3c',
            },
            {
              label: 'LON',
              value: `${issLon >= 0 ? '+' : ''}${issLon.toFixed(1)}°`,
              icon: '↔',
              color: '#1abc9c',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg px-4 py-2.5 text-center min-w-[80px]"
              style={{
                background: 'rgba(0,0,0,0.55)',
                border: `1px solid ${item.color}33`,
                backdropFilter: 'blur(8px)',
              }}
            >
              <div className="text-lg font-bold" style={{ color: item.color }}>{item.icon}</div>
              <div className="font-orbitron text-white text-xs font-bold mt-0.5" style={{ color: item.color }}>
                {item.value}
              </div>
              <div className="text-gray-500 text-[9px] tracking-widest mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-lg" style={{ animation: 'fadeInUp 1s ease-out .45s both' }}>
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-orbitron text-[10px] text-cyan-400 tracking-widest">INITIALIZING TRACKER</span>
            <span className="font-mono-iss text-[10px] text-gray-400">{Math.floor(progress)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg,#00c8ff,#9b59b6)',
                boxShadow: '0 0 12px rgba(0,200,255,.7)',
              }}
            />
          </div>
        </div>

        {/* Skip button */}
        <button
          data-testid="button-skip-intro"
          onClick={onComplete}
          className="font-mono-iss text-xs text-gray-400 hover:text-cyan-400 transition-colors underline underline-offset-4"
        >
          تخطي المقدمة ← Skip Intro
        </button>
      </div>
    </div>
  );
}
