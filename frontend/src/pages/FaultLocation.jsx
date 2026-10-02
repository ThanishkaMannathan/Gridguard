/**
 * FaultLocation.jsx – Visual transmission-line fault location feature.
 * Shows estimated distance, affected line, affected phase.
 * ⚠️ All locations are SIMULATED.
 */
import { useMemo } from "react";
import { computeGridHealth, computeFaultRisk, getRiskLevel } from "../simulation.js";

export default function FaultLocation({ scenario }) {
  const health = useMemo(() => computeGridHealth(scenario), [scenario]);
  const risk = useMemo(() => computeFaultRisk(scenario), [scenario]);
  const riskLevel = useMemo(() => getRiskLevel(risk), [risk]);

  const hasFault = scenario.faultType && scenario.faultType !== "NONE";
  const location = scenario.faultLocation; // 0–100 % of line

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-xl">Fault Location</h2>
          <p className="text-xs text-ink-muted mt-1">
            Visual transmission-line locator —{" "}
            <span className="text-signal-amber font-semibold">🧪 SIMULATED LOCATION</span>
          </p>
        </div>
        <span
          className="px-3 py-1 rounded-full border text-xs font-mono font-semibold"
          style={{
            color: hasFault ? "#FF5470" : "#3ADC8C",
            background: hasFault ? "#FF547015" : "#3ADC8C15",
            borderColor: hasFault ? "#FF547040" : "#3ADC8C40",
          }}
        >
          {hasFault ? `⚡ ${scenario.faultType} DETECTED` : "✅ NO FAULT"}
        </span>
      </div>

      {/* Fault summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Fault Type",      value: scenario.faultType || "NONE",       color: hasFault ? "#FF5470" : "#3ADC8C" },
          { label: "Affected Phase",  value: scenario.affectedPhase || "None",   color: hasFault ? "#F5A623" : "#3ADC8C" },
          { label: "Severity",        value: scenario.severity || "Normal",      color: riskLevel.color },
          { label: "Fault Risk",      value: `${risk.toFixed(0)}%`,              color: riskLevel.color },
        ].map((item) => (
          <div key={item.label} className="panel px-4 py-3">
            <p className="eyebrow">{item.label}</p>
            <p className="font-mono font-semibold text-xl mt-1" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Transmission line visual */}
      <div className="panel p-6">
        <p className="eyebrow mb-6">Transmission Line — Fault Location Visualizer</p>
        <div className="space-y-6">
          {/* Bus labels */}
          <div className="flex justify-between text-xs font-mono text-ink-muted">
            <span>🔲 Bus 1 (Source)</span>
            <span>🔲 Bus 2 (Load)</span>
          </div>

          {/* Line with fault marker */}
          <div className="relative h-12">
            {/* Base line */}
            <div className="absolute top-1/2 left-0 right-0 h-1.5 rounded-full -translate-y-1/2" style={{ background: hasFault ? "linear-gradient(90deg, #3ADC8C, #233049 " + (location || 50) + "%, #FF5470 " + (location || 50) + "%, #233049)" : "#233049" }} />

            {/* Bus 1 dot */}
            <div className="absolute left-0 top-1/2 w-5 h-5 rounded-full -translate-y-1/2 -translate-x-1/2 border-2 border-signal-green bg-signal-green/20 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-signal-green" />
            </div>

            {/* Bus 2 dot */}
            <div className="absolute right-0 top-1/2 w-5 h-5 rounded-full -translate-y-1/2 translate-x-1/2 border-2 border-signal-green bg-signal-green/20 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-signal-green" />
            </div>

            {/* Fault marker */}
            {hasFault && location != null && (
              <div
                className="absolute top-0 bottom-0 flex flex-col items-center justify-center"
                style={{ left: `${location}%`, transform: "translateX(-50%)" }}
              >
                <div className="w-0.5 h-full bg-signal-red opacity-60 animate-blink" />
                <div className="absolute -top-7 flex flex-col items-center">
                  <span className="text-signal-red text-xl animate-blink">⚡</span>
                  <span className="text-[10px] font-mono text-signal-red whitespace-nowrap mt-0.5">
                    {location.toFixed(1)}% from Bus 1
                  </span>
                </div>
              </div>
            )}

            {/* Protection zones */}
            <div className="absolute top-0 h-full" style={{ left: "0%", width: "30%", borderRight: "1px dashed #233049", opacity: 0.5 }}>
              <span className="absolute top-0 right-1 text-[8px] font-mono text-ink-faint">Zone 1</span>
            </div>
            <div className="absolute top-0 h-full" style={{ left: "30%", width: "50%", borderRight: "1px dashed #233049", opacity: 0.5 }}>
              <span className="absolute top-0 right-1 text-[8px] font-mono text-ink-faint">Zone 2</span>
            </div>
            <div className="absolute top-0 h-full" style={{ left: "80%", width: "20%", opacity: 0.5 }}>
              <span className="absolute top-0 right-1 text-[8px] font-mono text-ink-faint">Zone 3</span>
            </div>
          </div>

          {/* Scale */}
          <div className="flex justify-between text-[9px] font-mono text-ink-faint">
            <span>0 km</span>
            <span>30 km</span>
            <span>60 km</span>
            <span>90 km</span>
            <span>120 km</span>
          </div>
        </div>

        {/* Fault details below line */}
        {hasFault && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-signal-red/5 border border-signal-red/20">
              <p className="eyebrow text-signal-red mb-1">Estimated Distance</p>
              <p className="font-mono font-bold text-2xl text-signal-red">
                {location != null ? `${(location * 1.2).toFixed(1)} km` : "N/A"}
              </p>
              <p className="text-[10px] font-mono text-ink-faint mt-1">🧪 SIMULATED LOCATION — Not real measurement</p>
            </div>
            <div className="p-4 rounded-lg bg-signal-amber/5 border border-signal-amber/20">
              <p className="eyebrow text-signal-amber mb-1">Affected Line</p>
              <p className="font-mono font-bold text-xl text-signal-amber">Bus 1 → Bus 2</p>
              <p className="text-[10px] font-mono text-ink-faint mt-1">275 kV Overhead Transmission Line</p>
            </div>
            <div className="p-4 rounded-lg bg-signal-cyan/5 border border-signal-cyan/20">
              <p className="eyebrow text-signal-cyan mb-1">Affected Phase</p>
              <p className="font-mono font-bold text-xl text-signal-cyan">{scenario.affectedPhase || "?"}</p>
              <p className="text-[10px] font-mono text-ink-faint mt-1">Protection zone: {location != null && location < 30 ? "Zone 1" : location < 80 ? "Zone 2" : "Zone 3"}</p>
            </div>
          </div>
        )}

        {!hasFault && (
          <div className="mt-6 p-4 rounded-lg bg-signal-green/5 border border-signal-green/20 text-center">
            <p className="text-signal-green font-semibold">✅ No fault detected on transmission line</p>
            <p className="text-xs text-ink-muted mt-1">Select a fault scenario to see fault location visualization.</p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="panel p-4 bg-signal-amber/5 border-signal-amber/20">
        <p className="text-xs font-mono text-signal-amber">
          ⚠️ SIMULATED LOCATION: Fault distance and location estimates shown here are generated by simulation algorithms only.
          They do not represent real-time measurements from actual transmission line protection relays.
          In real power systems, impedance-based distance relays (using R-X plane analysis) are used for accurate fault location.
        </p>
      </div>
    </div>
  );
}
