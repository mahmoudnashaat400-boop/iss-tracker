import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import IntroAnimation from "@/components/IntroAnimation";
import Tracker from "@/pages/Tracker";
import NotFound from "@/pages/not-found";
import { fetchISSPosition } from "@/lib/issApi";
import type { ISSPosition } from "@/lib/issApi";

const queryClient = new QueryClient();

function AppContent() {
  const [showIntro, setShowIntro] = useState(true);
  const [initialPos, setInitialPos] = useState<ISSPosition | null>(null);

  useEffect(() => {
    fetchISSPosition().then(setInitialPos).catch(() => {
      setInitialPos({ latitude: 0, longitude: 0, altitude: 408, velocity: 27600, name: 'ISS', id: 25544, visibility: 'daylight', footprint: 4500, timestamp: Date.now() / 1000, daynum: 0, solar_lat: 0, solar_lon: 0, units: 'kilometers' });
    });
  }, []);

  const handleIntroComplete = () => setShowIntro(false);

  return (
    <>
      {showIntro && (
        <IntroAnimation
          onComplete={handleIntroComplete}
          issLat={initialPos?.latitude ?? 0}
          issLon={initialPos?.longitude ?? 0}
        />
      )}
      <div style={{ visibility: showIntro ? 'hidden' : 'visible' }}>
        <Switch>
          <Route path="/" component={Tracker} />
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
