/**
 * GridSimulator.jsx – What-If Grid Simulator.
 * Users can change Va, Vb, Vc, Ia, Ib, Ic, frequency, power factor, etc.
 * and see resulting grid health, fault risk, waveform, and XAI explanation.
 */
import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { computeGridHealth, computeFaultRisk, getRiskLevel, generateWaveform, generateXAIFactors } from "../simulation.js";

function Slider({ label, id, min, max, step, value, onChange, unit, color }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <label htmlFor={id} className="text-ink-muted">{label}</label>
        <span className="font-mono font-semibold" style={{ color }}>{value}{unit}</span>
      </div>
      <input
        id={id}
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: color }}
      />
      <div className="flex justify-between text-[9px] font-mono text-ink-faint">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

const DEFAULT_PARAMS = {
  Va: 230, Vb: 230, Vc: 230,
  Ia: 100, Ib: 100, Ic: 100,
  frequency: 50.0,
  powerFactor: 0.92,
  voltageUnbalance: 0.2,
  currentUnbalance: 0.3,
  activePower: 63.25,
  reactivePower: 26.2,
  faultType: "NONE",
  severity: "Normal",
  affectedPhase: "None",
};

function inferFaultType(p) {
  const vDrop_a = 230 - p.Va;
  const vDrop_b = 230 - p.Vb;
  const iOver_a = p.Ia > 250;
  const iOver_b = p.Ib > 250;
  const iOver_c = p.Ic > 250;

  if (p.Va < 50 && p.Vb < 50 && p.Vc < 50 && iOver_a && iOver_b && iOver_c) return { faultType: "LLL", severity: "Critical", affectedPhase: "A-B-C" };
  if (p.Va < 80 && p.Vb < 80 && iOver_a && iOver_b) return { faultType: "LLG", severity: "Critical", affectedPhase: "A-B" };
  if (p.Va < 80 && p.Vb < 80 && !iOver_c) return { faultType: "LL", severity: "High", affectedPhase: "A-B" };
  if (vDrop_a > 100 && iOver_a) return { faultType: "LG", severity: "Critical", affectedPhase: "A" };
  if (p.voltageUnbalance > 5) return { faultType: "NONE", severity: "Warning", affectedPhase: "?" };
  if (p.Ia > 150 && p.Ib > 150 && p.Ic > 150) return { faultType: "NONE", severity: "High", affectedPhase: "A-B-C" };
  return { faultType: "NONE", severity: "Normal", affectedPhase: "None" };
}

export default function GridSimulator() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [result, setResult] = useState(null);

  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }));

  const simulate = () => {
    const inferred = inferFaultType(params);
    const vUnbal = params.voltageUnbalance;
    const iUnbal = params.currentUnbalance;
    const pf = params.powerFactor;
    const ap = params.Va * params.Ia * pf * 3 / 1000;
    const rp = params.Va * params.Ia * Math.sin(Math.acos(pf)) * 3 / 1000;
    const simParams = { ...params, ...inferred, activePower: ap, reactivePower: rp, voltageUnbalance: vUnbal, currentUnbalance: iUnbal };
    const health = computeGridHealth(simParams);
    const risk = computeFaultRisk(simParams);
    const riskLevel = getRiskLevel(risk);
    const waveform = generateWaveform(simParams, inferred.faultType !== "NONE");
    const xai = generateXAIFactors(simParams);
    setResult({ ...simParams, health, risk, riskLevel, waveform, xai });
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-xl">What-If Grid Simulator</h2>
          <p className="text-xs text-ink-muted mt-1">Adjust parameters and simulate — <span className="text-signal-amber">🧪 SIMULATION MODE</span></p>
        </div>
        <button className="btn-primary" onClick={simulate} id="grid-simulate-btn">🧪 Simulate</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Parameter Controls */}
        <div className="panel p-5 space-y-5">
          <p className="eyebrow">Phase Voltages (V)</p>
          <Slider id="sim-va" label="Voltage A (Va)" min={0} max={350} step={1} value={params.Va} onChange={set("Va")} unit="V" color="#2FD9D2" />
          <Slider id="sim-vb" label="Voltage B (Vb)" min={0} max={350} step={1} value={params.Vb} onChange={set("Vb")} unit="V" color="#F5A623" />
          <Slider id="sim-vc" label="Voltage C (Vc)" min={0} max={350} step={1} value={params.Vc} onChange={set("Vc")} unit="V" color="#8B7CF6" />

          <p className="eyebrow pt-2">Phase Currents (A)</p>
          <Slider id="sim-ia" label="Current A (Ia)" min={0} max={700} step={5} value={params.Ia} onChange={set("Ia")} unit="A" color="#FF5470" />
          <Slider id="sim-ib" label="Current B (Ib)" min={0} max={700} step={5} value={params.Ib} onChange={set("Ib")} unit="A" color="#F5A623" />
          <Slider id="sim-ic" label="Current C (Ic)" min={0} max={700} step={5} value={params.Ic} onChange={set("Ic")} unit="A" color="#3ADC8C" />
        </div>

        <div className="panel p-5 space-y-5">
          <p className="eyebrow">System Parameters</p>
          <Slider id="sim-freq" label="Frequency" min={45} max={55} step={0.1} value={params.frequency} onChange={set("frequency")} unit="Hz" color="#2FD9D2" />
          <Slider id="sim-pf" label="Power Factor" min={0.1} max={1} step={0.01} value={params.powerFactor} onChange={set("powerFactor")} unit="" color="#3ADC8C" />
          <Slider id="sim-vunbal" label="Voltage Unbalance" min={0} max={40} step={0.5} value={params.voltageUnbalance} onChange={set("voltageUnbalance")} unit="%" color="#F5A623" />
          <Slider id="sim-iunbal" label="Current Unbalance" min={0} max={60} step={0.5} value={params.currentUnbalance} onChange={set("currentUnbalance")} unit="%" color="#FF5470" />

          {/* Quick presets */}
          <div className="pt-3 border-t border-border-soft">
            <p className="eyebrow mb-2">Quick Reset</p>
            <button className="btn-secondary text-xs !px-2 !py-1" onClick={() => setParams(DEFAULT_PARAMS)} id="sim-reset-btn">↺ Reset to Normal</button>
          </div>
        </div>
      </div>

      {/* Simulation Results */}
      {result && (
        <div className="space-y-4 animate-fadeIn">
          <div className="px-4 py-2 rounded-lg bg-signal-amber/10 border border-signal-amber/30 text-signal-amber text-xs font-mono">
            🧪 SIMULATION RESULT — Parameters evaluated at {new Date().toLocaleTimeString()}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Grid Health",  value: `${result.health}/100`,          color: result.health >= 70 ? "#3ADC8C" : result.health >= 40 ? "#F5A623" : "#FF5470" },
              { label: "Fault Risk",   value: `${result.risk.toFixed(0)}%`,    color: result.riskLevel.color },
              { label: "Risk Level",   value: result.riskLevel.label,          color: result.riskLevel.color },
              { label: "Fault Type",   value: result.faultType || "NONE",      color: result.faultType === "NONE" ? "#3ADC8C" : "#FF5470" },
            ].map((item) => (
              <div key={item.label} className="panel px-4 py-3">
                <p className="eyebrow">{item.label}</p>
                <p className="font-mono font-semibold text-xl mt-1" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Severity */}
          <div className="panel p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{result.faultType !== "NONE" ? "⚡" : "✅"}</span>
              <div>
                <p className="font-semibold text-ink-primary">{result.faultType !== "NONE" ? result.faultType + " Fault Detected" : "No Fault Condition"}</p>
                <p className="text-xs text-ink-muted">Severity: <span className="font-semibold" style={{ color: result.riskLevel.color }}>{result.severity}</span> — Affected phase: <span className="font-mono">{result.affectedPhase}</span></p>
              </div>
            </div>
          </div>

          {/* Waveform */}
          <div className="panel p-4">
            <p className="eyebrow mb-3">Simulated Voltage Waveform (V)</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={result.waveform} margin={{ top: 5, right: 15, left: -5, bottom: 0 }}>
                <CartesianGrid stroke="#1B2740" strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke="#5A6B8C" tick={{ fontSize: 8 }} hide />
                <YAxis stroke="#5A6B8C" tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ background: "#111A2B", border: "1px solid #233049", fontSize: 10 }} />
                <Line type="monotone" dataKey="Va" stroke="#2FD9D2" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                <Line type="monotone" dataKey="Vb" stroke="#F5A623" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                <Line type="monotone" dataKey="Vc" stroke="#8B7CF6" dot={false} strokeWidth={1.5} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* XAI Explanation */}
          <div className="panel p-5">
            <p className="eyebrow mb-3">AI Explanation — Why this result?</p>
            <div className="space-y-2">
              {result.xai.map((f, i) => (
                <div key={i} className="p-3 rounded-lg bg-bg-raised border border-border-soft text-xs">
                  <span className="font-semibold text-ink-primary">{f.name}: </span>
                  <span className="font-mono" style={{ color: { Critical: "#FF5470", High: "#FF8C42", Medium: "#F5A623", Low: "#3ADC8C" }[f.impact] }}>
                    {f.direction} {f.value}
                  </span>
                  <span className="text-ink-muted ml-2">— {f.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div className="panel p-8 text-center text-ink-muted">
          <p className="text-4xl mb-3">🧪</p>
          <p className="font-semibold">Adjust parameters above and click <span className="text-signal-cyan">Simulate</span> to see results.</p>
        </div>
      )}
    </div>
  );
}
