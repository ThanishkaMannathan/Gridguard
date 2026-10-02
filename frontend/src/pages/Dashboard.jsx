/**
 * Dashboard.jsx – Advanced EEE Power System Dashboard
 * Shows: Grid Health, Voltage, Current, Frequency, Power, PF, Fault Risk, Status
 */
import { useMemo } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { computeGridHealth, computeFaultRisk, getRiskLevel } from "../simulation.js";
import AlertCenter, { computeAlerts } from "../components/AlertCenter.jsx";

/* ── Gauge component ──────────────────────────────────────────── */
function Gauge({ value, max = 100, label, unit, color, size = 100 }) {
  const pct = Math.min(1, Math.max(0, value / max));
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ * 0.75;
  const offset = circ * 0.125;

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: size, height: size * 0.75 }} className="relative">
        <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`}>
          <circle cx={size / 2} cy={size * 0.6} r={r} fill="none" stroke="#1B2740" strokeWidth="8" strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeDashoffset={-offset} strokeLinecap="round" />
          <circle cx={size / 2} cy={size * 0.6} r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${color}80)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span className="font-mono font-semibold text-sm" style={{ color }}>{typeof value === "number" ? value.toFixed(value > 10 ? 0 : 2) : value}</span>
          <span className="text-[9px] text-ink-faint font-mono">{unit}</span>
        </div>
      </div>
      <span className="text-[10px] text-ink-muted text-center leading-tight">{label}</span>
    </div>
  );
}

/* ── Health Score Ring ────────────────────────────────────────── */
function HealthRing({ score }) {
  const pct = score / 100;
  const color = score >= 80 ? "#3ADC8C" : score >= 60 ? "#F5A623" : score >= 40 ? "#FF8C42" : "#FF5470";
  const data = [{ value: pct * 100 }, { value: 100 - pct * 100 }];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={62} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
              <Cell fill={color} style={{ filter: `drop-shadow(0 0 8px ${color}60)` }} />
              <Cell fill="#1B2740" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-bold text-2xl" style={{ color }}>{score}</span>
          <span className="text-[9px] font-mono text-ink-faint">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-ink-primary">Grid Health Score</p>
        <p className="text-[10px] text-ink-muted">
          {score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Degraded" : "Critical"}
        </p>
      </div>
    </div>
  );
}

/* ── Metric Card ─────────────────────────────────────────────── */
function MetricCard({ label, values, unit, colors, eyebrow }) {
  return (
    <div className="panel p-4">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <p className="text-xs text-ink-faint mb-3">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {values.map((v, i) => (
          <div key={i} className="text-center">
            <p className="font-mono font-semibold text-lg" style={{ color: colors[i] }}>
              {typeof v === "number" ? v.toFixed(v > 10 ? 1 : 3) : v}
            </p>
            <p className="text-[9px] text-ink-faint font-mono">{unit}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        {["Ph-A", "Ph-B", "Ph-C"].map((ph, i) => (
          <span key={i} className="text-[9px] text-ink-muted font-mono">{ph}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Status Badge ─────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const conf = {
    Normal:   { bg: "bg-signal-green/10",   border: "border-signal-green/30",  text: "text-signal-green",  dot: "bg-signal-green"  },
    Warning:  { bg: "bg-signal-amber/10",  border: "border-signal-amber/30",  text: "text-signal-amber",  dot: "bg-signal-amber"  },
    High:     { bg: "bg-orange-400/10",    border: "border-orange-400/30",    text: "text-orange-400",    dot: "bg-orange-400"    },
    Abnormal: { bg: "bg-orange-400/10",    border: "border-orange-400/30",    text: "text-orange-400",    dot: "bg-orange-400"    },
    Critical: { bg: "bg-signal-red/10",    border: "border-signal-red/30",    text: "text-signal-red",    dot: "bg-signal-red animate-blink" },
  };
  const c = conf[status] || conf.Normal;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${c.bg} ${c.border} ${c.text}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

/* ── Main Dashboard ───────────────────────────────────────────── */
export default function Dashboard({ scenario }) {
  const health = useMemo(() => computeGridHealth(scenario), [scenario]);
  const risk = useMemo(() => computeFaultRisk(scenario), [scenario]);
  const riskLevel = useMemo(() => getRiskLevel(risk), [risk]);
  const alerts = useMemo(() => computeAlerts(scenario, scenario.severity), [scenario]);

  const V_COLORS = ["#2FD9D2", "#F5A623", "#8B7CF6"];
  const I_COLORS = ["#FF5470", "#F5A623", "#3ADC8C"];

  return (
    <div className="space-y-5 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-xl">System Dashboard</h2>
          <p className="text-xs text-ink-muted mt-1">Real-time power system overview — <span className="text-signal-amber">🧪 SIMULATION MODE</span></p>
        </div>
        <StatusBadge status={scenario.severity || "Normal"} />
      </div>

      {/* Alerts */}
      <AlertCenter alerts={alerts} />

      {/* Top Row: Health + Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Health Ring */}
        <div className="panel p-5 flex flex-col items-center justify-center md:col-span-1">
          <HealthRing score={health} />
        </div>

        {/* Gauge Bank */}
        <div className="panel p-5 md:col-span-3">
          <p className="eyebrow mb-4">Key Electrical Indicators</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <Gauge value={scenario.frequency || 50} max={52} min={48} label="Frequency" unit="Hz" color="#2FD9D2" />
            <Gauge value={scenario.Va || 230} max={300} label="Voltage A" unit="V" color="#2FD9D2" />
            <Gauge value={scenario.Ia || 100} max={600} label="Current A" unit="A" color="#FF5470" />
            <Gauge value={Math.min(100, scenario.powerFactor * 100 || 90)} max={100} label="Power Factor" unit="×0.01" color="#3ADC8C" />
            <Gauge value={scenario.activePower || 63} max={150} label="Active Power" unit="kW" color="#8B7CF6" />
            <Gauge value={risk} max={100} label="Fault Risk" unit="%" color={riskLevel.color} />
          </div>
        </div>
      </div>

      {/* Voltage + Current Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          eyebrow="Three-Phase Voltage"
          label="RMS line voltage per phase (V)"
          values={[scenario.Va || 230, scenario.Vb || 230, scenario.Vc || 230]}
          unit="V"
          colors={V_COLORS}
        />
        <MetricCard
          eyebrow="Three-Phase Current"
          label="RMS line current per phase (A)"
          values={[scenario.Ia || 100, scenario.Ib || 100, scenario.Ic || 100]}
          unit="A"
          colors={I_COLORS}
        />
      </div>

      {/* System Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Active Power",    value: `${(scenario.activePower || 63).toFixed(1)} kW`,  color: "#8B7CF6" },
          { label: "Reactive Power",  value: `${(scenario.reactivePower || 26).toFixed(1)} kVAR`, color: "#F5A623" },
          { label: "Power Factor",    value: (scenario.powerFactor || 0.9).toFixed(3),          color: "#3ADC8C" },
          { label: "V-Unbalance",     value: `${(scenario.voltageUnbalance || 0).toFixed(1)}%`, color: scenario.voltageUnbalance > 5 ? "#FF5470" : "#2FD9D2" },
          { label: "I-Unbalance",     value: `${(scenario.currentUnbalance || 0).toFixed(1)}%`, color: scenario.currentUnbalance > 10 ? "#FF5470" : "#2FD9D2" },
        ].map((item) => (
          <div key={item.label} className="panel px-4 py-3 flex flex-col gap-1">
            <p className="eyebrow">{item.label}</p>
            <p className="font-mono font-semibold text-lg mt-1" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Fault Risk Card */}
      <div className="panel p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="eyebrow">Fault Risk Assessment</p>
          <span className="text-xs font-mono font-semibold px-2 py-1 rounded-full" style={{ color: riskLevel.color, background: `${riskLevel.color}18`, border: `1px solid ${riskLevel.color}40` }}>
            {riskLevel.label} Risk
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-bg-raised overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${risk}%`, background: `linear-gradient(90deg, #3ADC8C, ${riskLevel.color})`, boxShadow: `0 0 8px ${riskLevel.color}60` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] font-mono text-ink-faint">0% (Safe)</span>
          <span className="text-[10px] font-mono font-semibold" style={{ color: riskLevel.color }}>{risk.toFixed(0)}%</span>
          <span className="text-[10px] font-mono text-ink-faint">100% (Critical)</span>
        </div>
        <div className="mt-3 text-xs text-ink-muted">
          <span className="font-medium text-ink-primary">{scenario.faultType || "NONE"}</span> — {scenario.description || "System operating normally."}
        </div>
      </div>

      {/* Grid Health Factors */}
      <div className="panel p-5">
        <p className="eyebrow mb-4">Grid Health Score Factors</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            { label: "Voltage Stability",   score: Math.max(0, 100 - (Math.abs((scenario.Va||230)-230)/230 + Math.abs((scenario.Vb||230)-230)/230 + Math.abs((scenario.Vc||230)-230)/230) * 50) },
            { label: "Current Stability",   score: Math.max(0, 100 - (scenario.currentUnbalance || 0) * 3) },
            { label: "Frequency Stability", score: Math.max(0, 100 - Math.abs((scenario.frequency||50)-50) * 200) },
            { label: "Phase Balance",        score: Math.max(0, 100 - (scenario.voltageUnbalance || 0) * 5) },
            { label: "Load Condition",       score: Math.max(0, 100 - (Math.max(scenario.Ia||100, scenario.Ib||100, scenario.Ic||100) / 150 - 0.5) * 200) },
          ].map((f) => {
            const s = Math.max(0, Math.min(100, Math.round(f.score)));
            const c = s >= 80 ? "#3ADC8C" : s >= 60 ? "#F5A623" : s >= 40 ? "#FF8C42" : "#FF5470";
            return (
              <div key={f.label} className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-ink-muted">{f.label}</span>
                  <span className="font-mono" style={{ color: c }}>{s}%</span>
                </div>
                <div className="h-2 rounded-full bg-bg-raised overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${s}%`, background: c }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
