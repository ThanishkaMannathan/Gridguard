/**
 * LiveMonitor.jsx – Real-time simulated grid monitoring.
 * ⚠️ SIMULATION MODE – Not real electrical measurements.
 */
import { useEffect, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { liveMonitorTick } from "../simulation.js";

const MAX_POINTS = 60;

function DataRow({ label, value, unit, color, nominal, deviation }) {
  const isAlarm = deviation != null && Math.abs(deviation) > 5;
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 border-b border-border-soft last:border-0 transition-all ${isAlarm ? "bg-signal-red/5" : ""}`}>
      <span className="text-xs font-mono text-ink-muted w-24">{label}</span>
      <span className="font-mono font-semibold text-base" style={{ color }}>{value}</span>
      <span className="text-[10px] font-mono text-ink-faint w-6">{unit}</span>
      {deviation != null && (
        <span className={`text-[10px] font-mono ml-2 ${isAlarm ? "text-signal-red" : "text-ink-faint"}`}>
          {deviation >= 0 ? "+" : ""}{deviation.toFixed(2)}%
        </span>
      )}
    </div>
  );
}

export default function LiveMonitor({ baseScenario }) {
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState([]);
  const [current, setCurrent] = useState(null);
  const timerRef = useRef(null);
  const tickCount = useRef(0);

  const tick = () => {
    const data = liveMonitorTick(baseScenario);
    tickCount.current += 1;
    data.tick = tickCount.current;
    setCurrent(data);
    setHistory((h) => {
      const next = [...h, data];
      return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
    });
  };

  const start = () => {
    if (running) return;
    setRunning(true);
    timerRef.current = setInterval(tick, 500);
  };

  const stop = () => {
    setRunning(false);
    clearInterval(timerRef.current);
  };

  const reset = () => {
    stop();
    setHistory([]);
    setCurrent(null);
    tickCount.current = 0;
  };

  useEffect(() => {
    reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseScenario]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const vDev = (v) => v != null && baseScenario.Va ? ((v - baseScenario.Va) / baseScenario.Va) * 100 : null;

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-xl">Live Grid Monitor</h2>
          <p className="text-xs text-ink-muted mt-1">Simulated real-time electrical parameters — <span className="text-signal-amber">🧪 SIMULATION MODE</span></p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={start} disabled={running} id="monitor-start-btn">▶ Start</button>
          <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={stop} disabled={!running} id="monitor-stop-btn">⏸ Stop</button>
          <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={reset} id="monitor-reset-btn">↺ Reset</button>
        </div>
      </div>

      {/* Live Parameter Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="panel overflow-hidden">
          <div className="px-4 py-3 border-b border-border-soft bg-bg-raised flex items-center justify-between">
            <p className="eyebrow">Phase Voltages</p>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${running ? "bg-signal-green/10 text-signal-green border border-signal-green/30" : "bg-bg-hover text-ink-faint border border-border"}`}>
              {running ? "● LIVE" : "● PAUSED"}
            </span>
          </div>
          <DataRow label="Va" value={current ? current.Va.toFixed(1) : "--"} unit="V" color="#2FD9D2" deviation={current ? vDev(current.Va) : null} />
          <DataRow label="Vb" value={current ? current.Vb.toFixed(1) : "--"} unit="V" color="#F5A623" />
          <DataRow label="Vc" value={current ? current.Vc.toFixed(1) : "--"} unit="V" color="#8B7CF6" />
        </div>

        <div className="panel overflow-hidden">
          <div className="px-4 py-3 border-b border-border-soft bg-bg-raised flex items-center justify-between">
            <p className="eyebrow">Phase Currents</p>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${running ? "bg-signal-green/10 text-signal-green border border-signal-green/30" : "bg-bg-hover text-ink-faint border border-border"}`}>
              {running ? "● LIVE" : "● PAUSED"}
            </span>
          </div>
          <DataRow label="Ia" value={current ? current.Ia.toFixed(1) : "--"} unit="A" color="#FF5470" />
          <DataRow label="Ib" value={current ? current.Ib.toFixed(1) : "--"} unit="A" color="#F5A623" />
          <DataRow label="Ic" value={current ? current.Ic.toFixed(1) : "--"} unit="A" color="#3ADC8C" />
        </div>

        <div className="panel overflow-hidden">
          <div className="px-4 py-3 border-b border-border-soft bg-bg-raised">
            <p className="eyebrow">Power Parameters</p>
          </div>
          <DataRow label="Frequency"     value={current ? current.frequency.toFixed(3) : "--"}    unit="Hz"  color="#2FD9D2" />
          <DataRow label="Active Power"  value={current ? current.activePower.toFixed(2) : "--"}   unit="kW"  color="#8B7CF6" />
          <DataRow label="Reactive Pwr"  value={current ? current.reactivePower.toFixed(2) : "--"} unit="kVAR" color="#F5A623" />
          <DataRow label="Power Factor"  value={current ? current.powerFactor.toFixed(3) : "--"}   unit=""    color="#3ADC8C" />
        </div>

        <div className="panel p-4 flex flex-col gap-2">
          <p className="eyebrow">Sample Count</p>
          <p className="font-mono font-bold text-4xl text-signal-cyan">{tickCount.current}</p>
          <p className="text-xs text-ink-muted">samples at 0.5 s interval</p>
          <p className="text-[10px] font-mono text-ink-faint mt-auto">🧪 Simulated values only</p>
        </div>
      </div>

      {/* Live Charts */}
      <div className="panel p-4">
        <p className="eyebrow mb-3">Phase Voltage — Live Trend (V)</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={history} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#1B2740" strokeDasharray="3 3" />
            <XAxis dataKey="tick" stroke="#5A6B8C" tick={{ fontSize: 9 }} />
            <YAxis stroke="#5A6B8C" tick={{ fontSize: 9 }} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: "#111A2B", border: "1px solid #233049", fontSize: 11 }} />
            <Line type="monotone" dataKey="Va" stroke="#2FD9D2" dot={false} strokeWidth={1.5} isAnimationActive={false} />
            <Line type="monotone" dataKey="Vb" stroke="#F5A623" dot={false} strokeWidth={1.5} isAnimationActive={false} />
            <Line type="monotone" dataKey="Vc" stroke="#8B7CF6" dot={false} strokeWidth={1.5} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="panel p-4">
        <p className="eyebrow mb-3">Phase Current — Live Trend (A)</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={history} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#1B2740" strokeDasharray="3 3" />
            <XAxis dataKey="tick" stroke="#5A6B8C" tick={{ fontSize: 9 }} />
            <YAxis stroke="#5A6B8C" tick={{ fontSize: 9 }} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: "#111A2B", border: "1px solid #233049", fontSize: 11 }} />
            <Line type="monotone" dataKey="Ia" stroke="#FF5470" dot={false} strokeWidth={1.5} isAnimationActive={false} />
            <Line type="monotone" dataKey="Ib" stroke="#F5A623" dot={false} strokeWidth={1.5} isAnimationActive={false} />
            <Line type="monotone" dataKey="Ic" stroke="#3ADC8C" dot={false} strokeWidth={1.5} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="panel p-4">
        <p className="eyebrow mb-3">Frequency — Live Trend (Hz)</p>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={history} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#1B2740" strokeDasharray="3 3" />
            <XAxis dataKey="tick" stroke="#5A6B8C" tick={{ fontSize: 9 }} />
            <YAxis stroke="#5A6B8C" tick={{ fontSize: 9 }} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: "#111A2B", border: "1px solid #233049", fontSize: 11 }} />
            <Line type="monotone" dataKey="frequency" stroke="#2FD9D2" dot={false} strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
