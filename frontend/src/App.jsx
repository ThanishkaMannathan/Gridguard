/**
 * App.jsx – GridGuard v2.0 main application shell.
 * Wires sidebar navigation, scenario state, and all page components.
 */
import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import { api } from "./api.js";
import { FAULT_SCENARIOS } from "./simulation.js";

// Pages
import Dashboard       from "./pages/Dashboard.jsx";
import FaultDiagnosis  from "./pages/FaultDiagnosis.jsx";
import LiveMonitor     from "./pages/LiveMonitor.jsx";
import Waveforms       from "./pages/Waveforms.jsx";
import DigitalGrid     from "./pages/DigitalGrid.jsx";
import PredictiveGuard from "./pages/PredictiveGuard.jsx";
import GridSimulator   from "./pages/GridSimulator.jsx";
import FaultReplay     from "./pages/FaultReplay.jsx";
import FaultHistory    from "./pages/FaultHistory.jsx";
import FaultLocation   from "./pages/FaultLocation.jsx";
import Reports         from "./pages/Reports.jsx";
import LearnMode       from "./pages/LearnMode.jsx";

function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-deep animate-fade-out" style={{ animationDelay: "2.5s", animationFillMode: "forwards" }}>
      <div className="relative mb-8">
        <svg width="120" height="80" viewBox="0 0 44 30" className="drop-shadow-[0_0_24px_rgba(47,217,210,0.5)]">
          <path d="M0 15 Q 5.5 2, 11 15 T 22 15" fill="none" stroke="#2FD9D2" strokeWidth="1.8" />
          <path d="M0 15 Q 5.5 22, 11 15 T 22 15 T 33 15" fill="none" stroke="#F5A623" strokeWidth="1.8" opacity="0.8" />
          <path d="M0 15 Q 5.5 9, 11 15 T 22 15 T 33 15 T 44 15" fill="none" stroke="#8B7CF6" strokeWidth="1.8" opacity="0.65" />
        </svg>
      </div>
      <h1 className="font-display font-semibold text-4xl tracking-wide text-ink-primary">
        Grid<span className="text-signal-cyan">Guard</span>
      </h1>
      <p className="eyebrow mt-3 text-signal-amber">AI Power System Monitoring & Fault Diagnosis</p>
      <p className="text-xs font-mono text-ink-faint mt-2">v2.0 · Simulation Mode</p>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [apiOnline, setApiOnline] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");

  // Global active scenario (used by all pages that don't manage their own records)
  const [scenario, setScenario] = useState(FAULT_SCENARIOS.NORMAL);

  // Classification/diagnosis state (passed to Reports)
  const [lastClassification, setLastClassification] = useState(null);
  const [lastDiagnosis, setLastDiagnosis] = useState(null);

  useEffect(() => {
    api.health().then(() => setApiOnline(true)).catch(() => setApiOnline(false));
    const t = setTimeout(() => setShowSplash(false), 3200);
    return () => clearTimeout(t);
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard scenario={scenario} />;
      case "diagnosis":
        return (
          <FaultDiagnosis
            scenario={scenario}
            onScenarioChange={setScenario}
            onClassification={setLastClassification}
            onDiagnosis={setLastDiagnosis}
          />
        );
      case "monitor":
        return <LiveMonitor baseScenario={scenario} />;
      case "waveforms":
        return <Waveforms scenario={scenario} />;
      case "grid":
        return <DigitalGrid scenario={scenario} />;
      case "predictive":
        return <PredictiveGuard scenario={scenario} />;
      case "simulator":
        return <GridSimulator />;
      case "replay":
        return <FaultReplay scenario={scenario} />;
      case "history":
        return <FaultHistory />;
      case "location":
        return <FaultLocation scenario={scenario} />;
      case "reports":
        return <Reports scenario={scenario} lastClassification={lastClassification} lastDiagnosis={lastDiagnosis} />;
      case "learn":
        return <LearnMode />;
      default:
        return <Dashboard scenario={scenario} />;
    }
  };

  // Quick scenario switcher at the top
  const QUICK_SCENARIOS = [
    { key: "NORMAL", icon: "🟢" },
    { key: "LG",     icon: "🔴" },
    { key: "LL",     icon: "🔴" },
    { key: "LLG",    icon: "🔴" },
    { key: "LLL",    icon: "🔴" },
    { key: "VOLTAGE_IMBALANCE", icon: "🟠" },
    { key: "OVERLOAD",          icon: "🟠" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-bg-deep">
      {showSplash && <SplashScreen />}

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <Sidebar activePage={activePage} onNavigate={setActivePage} apiOnline={apiOnline} />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="border-b border-border bg-bg-panel/90 backdrop-blur sticky top-0 z-10 flex items-center gap-4 px-6 py-3">
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs text-ink-faint font-mono hidden md:block">Active Scenario:</span>
              <div className="flex gap-1.5 flex-wrap">
                {QUICK_SCENARIOS.map((s) => {
                  const sc = FAULT_SCENARIOS[s.key];
                  const isActive = scenario.label === sc?.label;
                  return (
                    <button
                      key={s.key}
                      id={`quick-scenario-${s.key}`}
                      onClick={() => sc && setScenario(sc)}
                      title={sc?.label}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[10px] font-mono transition hover:scale-105 ${
                        isActive ? "border-signal-cyan bg-signal-cyan/10 text-signal-cyan" : "border-border text-ink-faint hover:text-ink-primary hover:bg-bg-hover"
                      }`}
                    >
                      {s.icon} {s.key}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-signal-amber bg-signal-amber/10 border border-signal-amber/30 px-3 py-1 rounded-full">
              🧪 SIMULATION MODE
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            {renderPage()}
          </main>

          {/* Footer */}
          <footer className="border-t border-border-soft py-2.5 text-center text-[10px] text-ink-faint font-mono bg-bg-panel/50">
            GridGuard v2.0 — Decision support only. All simulation values are synthetic. Not real grid data.
          </footer>
        </div>
      </div>
    </div>
  );
}
