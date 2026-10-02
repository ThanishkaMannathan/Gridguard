/**
 * PredictiveGuard.jsx – Early-warning / predictive fault detection.
 * Shows Fault Risk %, Risk Level, trend graph, and main risk factors.
 */
import { useEffect, useRef, useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { computeFaultRisk, computeGridHealth, getRiskLevel, generateXAIFactors } from "../simulation.js";

const IMPACT_COLOR = {
  Critical: "#FF5470",
  High:     "#FF8C42",
  Medium:   "#F5A623",
  Low:      "#3ADC8C",
};

export default function PredictiveGuard({ scenario }) {
  const [history, setHistory] = useState([]);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);
  const tickRef = useRef(0);

  const risk = useMemo(() => computeFaultRisk(scenario), [scenario]);
  const health = useMemo(() => computeGridHealth(scenario), [scenario]);
  const riskLevel = useMemo(() => getRiskLevel(risk), [risk]);
  const xaiFacts = useMemo(() => generateXAIFactors(scenario), [scenario]);

  // Generate a history by slightly varying risk over time
  const seed = () => {
    tickRef.current += 1;
    const t = tickRef.current;
    const drift = Math.sin(t * 0.3) * 5 + (Math.random() - 0.5) * 3;
    const r = Math.max(0, Math.min(100, risk + drift));
    return { t, risk: parseFloat(r.toFixed(1)), health: parseFloat((100 - r).toFixed(1)) };
  };

  const startMonitoring = () => {
    if (running) return;
    setRunning(true);
    timerRef.current = setInterval(() => {
      setHistory((h) => {
        const next = [...h, seed()];
        return next.length > 80 ? next.slice(next.length - 80) : next;
      });
    }, 400);
  };

  const stopMonitoring = () => {
    clearInterval(timerRef.current);
    setRunning(false);
  };

  useEffect(() => {
    // Seed some initial history
    const initial = [];
    for (let i = 0; i < 30; i++) {
      const r = Math.max(0, Math.min(100, risk + (Math.random() - 0.5) * 8));
      initial.push({ t: i, risk: parseFloat(r.toFixed(1)), health: parseFloat((100 - r).toFixed(1)) });
    }
    tickRef.current = 30;
    setHistory(initial);
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  const latestRisk = history.length ? history[history.length - 1].risk : risk;
  const latestLevel = getRiskLevel(latestRisk);

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-xl">Predictive Guard</h2>
          <p className="text-xs text-ink-muted mt-1">Early-warning fault prediction — <span className="text-signal-amber">🧪 SIMULATION MODE</span></p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={startMonitoring} disabled={running} id="predictive-start-btn">▶ Monitor</button>
          <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={stopMonitoring} disabled={!running} id="predictive-stop-btn">⏸ Stop</button>
        </div>
      </div>

      {/* Risk Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="panel p-5 flex flex-col items-center justify-center gap-2">
          <p className="eyebrow">Fault Risk</p>
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#1B2740" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={latestLevel.color} strokeWidth="8"
                strokeDasharray={`${latestRisk * 2.639} ${263.9}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 0.5s", filter: `drop-shadow(0 0 6px ${latestLevel.color}80)` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono font-bold text-2xl" style={{ color: latestLevel.color }}>{latestRisk.toFixed(0)}%</span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ color: latestLevel.color, background: `${latestLevel.color}18`, border: `1px solid ${latestLevel.color}40` }}>
            {latestLevel.label} Risk
          </span>
        </div>

        <div className="panel p-5 flex flex-col gap-2">
          <p className="eyebrow">Grid Health</p>
          <p className="font-mono font-bold text-4xl text-signal-green">{health}</p>
          <p className="text-xs text-ink-muted">out of 100</p>
          <div className="h-2 rounded-full bg-bg-raised overflow-hidden mt-auto">
            <div className="h-full rounded-full" style={{ width: `${health}%`, background: health >= 70 ? "#3ADC8C" : health >= 40 ? "#F5A623" : "#FF5470" }} />
          </div>
        </div>

        <div className="panel p-5 flex flex-col gap-2">
          <p className="eyebrow">System Condition</p>
          <p className="font-display font-semibold text-xl" style={{ color: latestLevel.color }}>{scenario.severity || "Normal"}</p>
          <p className="text-xs text-ink-muted">{scenario.faultType || "NONE"} — {scenario.affectedPhase || "N/A"}</p>
          <p className="text-xs text-ink-faint mt-auto">{scenario.description}</p>
        </div>
      </div>

      {/* Risk Trend Chart */}
      <div className="panel p-4">
        <p className="eyebrow mb-3">Fault Risk Trend — Real-time Simulation</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={history} margin={{ top: 5, right: 15, left: -5, bottom: 0 }}>
            <defs>
              <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={latestLevel.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={latestLevel.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1B2740" strokeDasharray="3 3" />
            <XAxis dataKey="t" stroke="#5A6B8C" tick={{ fontSize: 9 }} />
            <YAxis stroke="#5A6B8C" tick={{ fontSize: 9 }} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: "#111A2B", border: "1px solid #233049", fontSize: 11 }} formatter={(v) => [`${v}%`, "Fault Risk"]} />
            <ReferenceLine y={70} stroke="#FF5470" strokeDasharray="4 4" label={{ value: "Critical", fill: "#FF5470", fontSize: 9 }} />
            <ReferenceLine y={45} stroke="#F5A623" strokeDasharray="4 4" label={{ value: "High", fill: "#F5A623", fontSize: 9 }} />
            <ReferenceLine y={20} stroke="#3ADC8C" strokeDasharray="4 4" label={{ value: "Low", fill: "#3ADC8C", fontSize: 9 }} />
            <Area type="monotone" dataKey="risk" stroke={latestLevel.color} fill="url(#riskGrad)" strokeWidth={2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* XAI Risk Factors */}
      <div className="panel p-5">
        <p className="eyebrow mb-4">Main Risk Factors — Why is GridGuard raising this alert?</p>
        <div className="space-y-3">
          {xaiFacts.map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-bg-raised border border-border-soft">
              <div
                className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                style={{ background: IMPACT_COLOR[f.impact] || "#8493B0" }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-ink-primary">{f.name}</span>
                  <span className="text-xs font-mono" style={{ color: IMPACT_COLOR[f.impact] }}>{f.direction} {f.value}</span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded" style={{ color: IMPACT_COLOR[f.impact], background: `${IMPACT_COLOR[f.impact]}18` }}>{f.impact}</span>
                </div>
                <p className="text-xs text-ink-muted">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
