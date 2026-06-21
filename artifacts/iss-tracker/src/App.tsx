import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import IntroAnimation from "@/components/IntroAnimation";
import Tracker from "@/pages/Tracker";
import SatelliteTracker from "@/pages/SatelliteTracker";
import NotFound from "@/pages/not-found";
import { fetchISSPosition } from "@/lib/issApi";
import type { ISSPosition } from "@/lib/issApi";

const queryClient = new QueryClient();

function NavBar() {
  const [loc, setLoc] = useLocation();
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex gap-1 p-1 rounded-2xl"
      style={{ background: 'rgba(5,8,18,0.9)', border: '1px solid rgba(0,200,255,0.15)', backdropFilter: 'blur(16px)' }}
    >
      <button
        data-testid="nav-iss"
        onClick={() => setLoc('/')}
        className="flex items-center gap-2 px-4 py-2 rounded-xl font-orbitron text-[10px] font-bold transition-all"
        style={{
          background: loc === '/' ? 'linear-gradient(135deg,rgba(0,200,255,0.2),rgba(0,200,255,0.1))' : 'transparent',
          color: loc === '/' ? '#00c8ff' : '#6b7280',
          border: loc === '/' ? '1px solid rgba(0,200,255,0.3)' : '1px solid transparent',
        }}
      >
        🛸 ISS
      </button>
      <button
        data-testid="nav-satellites"
        onClick={() => setLoc('/satellites')}
        className="flex items-center gap-2 px-4 py-2 rounded-xl font-orbitron text-[10px] font-bold transition-all"
        style={{
          background: loc === '/satellites' ? 'linear-gradient(135deg,rgba(155,89,182,0.2),rgba(155,89,182,0.1))' : 'transparent',
          color: loc === '/satellites' ? '#c084fc' : '#6b7280',
          border: loc === '/satellites' ? '1px solid rgba(155,89,182,0.3)' : '1px solid transparent',
        }}
      >
        🛰 أقمار صناعية
      </button>
    </div>
  );
}

function AppContent() {
  const [showIntro, setShowIntro] = useState(true);
  const [initialPos, setInitialPos] = useState<ISSPosition | null>(null);

  useEffect(() => {
    fetchISSPosition().then(setInitialPos).catch(() => {
      setInitialPos({
        latitude: 0, longitude: 0, altitude: 408, velocity: 27600,
        name: 'ISS', id: 25544, visibility: 'daylight', footprint: 4500,
        timestamp: Date.now() / 1000, daynum: 0, solar_lat: 0, solar_lon: 0, units: 'kilometers',
      });
    });
  }, []);

  return (
    <>
      {showIntro && (
        <IntroAnimation
          onComplete={() => setShowIntro(false)}
          issLat={initialPos?.latitude ?? 0}
          issLon={initialPos?.longitude ?? 0}
        />
      )}
      <div style={{ visibility: showIntro ? 'hidden' : 'visible' }}>
        <NavBar onReplayIntro={() => setShowIntro(true)} />
        <Switch>
          <Route path="/">
            {() => <Tracker onReplayIntro={() => setShowIntro(true)} />}
          </Route>
          <Route path="/satellites">
            {() => <SatelliteTracker onReplayIntro={() => setShowIntro(true)} />}
          </Route>
          <Route component={NotFound} />
        </Switch>
      </div>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppContent />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
