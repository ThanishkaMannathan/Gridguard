/**
 * Waveforms.jsx – Interactive three-phase waveform analysis.
 * Normal vs Fault condition view, phase selection.
 */
import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { generateWaveform } from "../simulation.js";

const PHASE_CONFIG = {
  Va: { color: "#2FD9D2", label: "Phase A Voltage" },
  Vb: { color: "#F5A623", label: "Phase B Voltage" },
  Vc: { color: "#8B7CF6", label: "Phase C Voltage" },
  Ia: { color: "#FF5470", label: "Phase A Current" },
  Ib: { color: "#3ADC8C", label: "Phase B Current" },
  Ic: { color: "#F5A623", label: "Phase C Current" },
};

export default function Waveforms({ scenario }) {
  const [mode, setMode] = useState("voltage"); // "voltage" | "current"
  const [condition, setCondition] = useState("normal"); // "normal" | "fault"
  const [selectedPhases, setSelectedPhases] = useState(["Va", "Vb", "Vc"]);

  const normalScenario = useMemo(() => ({
    ...scenario,
    Va: 230, Vb: 230, Vc: 230,
    Ia: 100, Ib: 100, Ic: 100,
    powerFactor: 0.92,
    affectedPhase: "None",
  }), [scenario]);

  const normalData = useMemo(() => generateWaveform(normalScenario, false), [normalScenario]);
  const faultData = useMemo(() => generateWaveform(scenario, scenario.faultType !== "NONE"), [scenario]);

  const data = condition === "normal" ? normalData : faultData;

  const phases = mode === "voltage"
    ? ["Va", "Vb", "Vc"]
    : ["Ia", "Ib", "Ic"];

  const togglePhase = (ph) => {
    setSelectedPhases((prev) =>
      prev.includes(ph)
        ? prev.length > 1 ? prev.filter((p) => p !== ph) : prev
        : [...prev, ph]
    );
  };

  const switchMode = (m) => {
    setMode(m);
    setSelectedPhases(m === "voltage" ? ["Va", "Vb", "Vc"] : ["Ia", "Ib", "Ic"]);
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-xl">Waveform Analysis</h2>
          <p className="text-xs text-ink-muted mt-1">Three-phase waveform viewer — <span className="text-signal-amber">🧪 SIMULATION MODE</span></p>
        </div>
        <div className="flex gap-2">
          {/* Condition toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs font-mono">
            <button
              className={`px-3 py-1.5 transition ${condition === "normal" ? "bg-signal-green/20 text-signal-green" : "text-ink-muted hover:bg-bg-hover"}`}
              onClick={() => setCondition("normal")}
              id="waveform-normal-btn"
            >
              Normal
            </button>
            <button
              className={`px-3 py-1.5 transition border-l border-border ${condition === "fault" ? "bg-signal-red/20 text-signal-red" : "text-ink-muted hover:bg-bg-hover"}`}
              onClick={() => setCondition("fault")}
              id="waveform-fault-btn"
            >
              Fault
            </button>
          </div>
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs font-mono">
            <button
              className={`px-3 py-1.5 transition ${mode === "voltage" ? "bg-signal-cyan/20 text-signal-cyan" : "text-ink-muted hover:bg-bg-hover"}`}
              onClick={() => switchMode("voltage")}
              id="waveform-voltage-btn"
            >
              Voltage
            </button>
            <button
              className={`px-3 py-1.5 transition border-l border-border ${mode === "current" ? "bg-signal-red/20 text-signal-red" : "text-ink-muted hover:bg-bg-hover"}`}
              onClick={() => switchMode("current")}
              id="waveform-current-btn"
            >
              Current
            </button>
          </div>
        </div>
      </div>

      {/* Condition badge */}
      <div className={`px-4 py-2 rounded-lg border text-sm font-mono ${condition === "fault" ? "bg-signal-red/10 border-signal-red/30 text-signal-red" : "bg-signal-green/10 border-signal-green/30 text-signal-green"}`}>
        {condition === "fault"
          ? `⚡ FAULT CONDITION — ${scenario.label || "Unknown Fault"} — Affected Phase: ${scenario.affectedPhase || "?"}`
          : "✅ NORMAL CONDITION — All phases balanced at rated values"}
      </div>

      {/* Phase selector buttons */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs text-ink-muted self-center">Select phases:</span>
        {phases.map((ph) => (
          <button
            key={ph}
            id={`phase-btn-${ph}`}
            onClick={() => togglePhase(ph)}
            className={`px-3 py-1 rounded-full border text-xs font-mono transition ${
              selectedPhases.includes(ph)
                ? "border-transparent text-bg-deep font-semibold"
                : "border-border text-ink-muted hover:bg-bg-hover"
            }`}
            style={selectedPhases.includes(ph) ? { background: PHASE_CONFIG[ph].color } : {}}
          >
            {ph}
          </button>
        ))}
      </div>

      {/* Main waveform chart */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="eyebrow">
            {mode === "voltage" ? "Three-Phase Voltage Waveform (V)" : "Three-Phase Current Waveform (A)"}
          </p>
          <span className="text-[10px] font-mono text-ink-faint">200 samples · f = 50 Hz · simulated</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 15, left: -5, bottom: 0 }}>
            <CartesianGrid stroke="#1B2740" strokeDasharray="3 3" />
            <XAxis dataKey="t" stroke="#5A6B8C" tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v * 1000).toFixed(1)}ms`} />
            <YAxis stroke="#5A6B8C" tick={{ fontSize: 9 }} />
            <Tooltip
              contentStyle={{ background: "#111A2B", border: "1px solid #233049", fontSize: 11 }}
              labelFormatter={(v) => `t = ${(v * 1000).toFixed(2)} ms`}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {condition === "fault" && scenario.faultType !== "NONE" && (
              <ReferenceLine x={data[39]?.t} stroke="#FF5470" strokeDasharray="4 4" label={{ value: "Fault →", fill: "#FF5470", fontSize: 10 }} />
            )}
            {phases.filter((ph) => selectedPhases.includes(ph)).map((ph) => (
              <Line
                key={ph}
                type="monotone"
                dataKey={ph}
                stroke={PHASE_CONFIG[ph].color}
                dot={false}
                strokeWidth={1.8}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="panel p-4">
          <p className="eyebrow mb-3 text-signal-green">✅ Normal Condition</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={normalData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#1B2740" strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke="#5A6B8C" tick={{ fontSize: 8 }} hide />
              <YAxis stroke="#5A6B8C" tick={{ fontSize: 8 }} />
              <Tooltip contentStyle={{ background: "#111A2B", border: "1px solid #233049", fontSize: 10 }} />
              {(mode === "voltage" ? ["Va","Vb","Vc"] : ["Ia","Ib","Ic"]).map((ph) => (
                <Line key={ph} type="monotone" dataKey={ph} stroke={PHASE_CONFIG[ph].color} dot={false} strokeWidth={1.5} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="panel p-4">
          <p className="eyebrow mb-3 text-signal-red">⚡ Fault Condition — {scenario.faultType || "NONE"}</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={faultData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#1B2740" strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke="#5A6B8C" tick={{ fontSize: 8 }} hide />
              <YAxis stroke="#5A6B8C" tick={{ fontSize: 8 }} />
              <Tooltip contentStyle={{ background: "#111A2B", border: "1px solid #233049", fontSize: 10 }} />
              {(mode === "voltage" ? ["Va","Vb","Vc"] : ["Ia","Ib","Ic"]).map((ph) => (
                <Line key={ph} type="monotone" dataKey={ph} stroke={PHASE_CONFIG[ph].color} dot={false} strokeWidth={1.5} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
