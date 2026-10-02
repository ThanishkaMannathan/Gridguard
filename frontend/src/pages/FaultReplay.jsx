/**
 * FaultReplay.jsx – Step-by-step fault event replay animation.
 * Normal → Abnormal → Parameter change → Fault detected → AI diagnosis → Location → Alert
 */
import { useState, useRef, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { generateWaveform } from "../simulation.js";

const STEPS = [
  {
    id: 0, label: "Normal Operation", icon: "🟢", color: "#3ADC8C",
    desc: "System operating within normal parameters. Voltage and current are balanced across all three phases.",
    status: "Normal",
  },
  {
    id: 1, label: "Abnormal Condition Begins", icon: "🟡", color: "#F5A623",
    desc: "Voltage unbalance starts rising. Small deviation detected in Phase A. Protective relay monitoring triggered.",
    status: "Warning",
  },
  {
    id: 2, label: "Parameter Deviation", icon: "🟠", color: "#FF8C42",
    desc: "Phase A voltage drops significantly. Phase A current begins to rise. Frequency shows slight deviation from 50 Hz.",
    status: "Abnormal",
  },
  {
    id: 3, label: "Fault Detected", icon: "🔴", color: "#FF5470",
    desc: "Fault condition confirmed. Phase A voltage collapsed. Fault current detected at 4.8× rated value. Distance relay initiated.",
    status: "Critical",
  },
  {
    id: 4, label: "AI Diagnosis", icon: "🤖", color: "#8B7CF6",
    desc: "GridGuard ML model classified fault as Line-to-Ground (LG) on Phase A. Confidence: 94.2%. Recommended immediate isolation.",
    status: "Diagnosing",
  },
  {
    id: 5, label: "Fault Location", icon: "📍", color: "#2FD9D2",
    desc: "SIMULATED LOCATION: Fault estimated at 34.5% of transmission line length from Bus 1. Zone-1 protection boundary confirmed.",
    status: "Locating",
  },
  {
    id: 6, label: "Alert Dispatched", icon: "🚨", color: "#FF5470",
    desc: "Protection relay issued trip command. Alert sent to SCADA system. Automatic reclosing initiated after 300 ms delay.",
    status: "Alert",
  },
];

function StepCard({ step, isActive, isDone }) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
        isActive
          ? "bg-bg-hover border-signal-cyan"
          : isDone
          ? "bg-bg-raised border-border-soft"
          : "border-border opacity-40"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5 transition-all ${
          isActive ? "ring-2 ring-signal-cyan scale-110" : ""
        }`}
        style={{ background: isDone || isActive ? `${step.color}20` : "#17233A", border: `1px solid ${isDone || isActive ? step.color : "#233049"}` }}
      >
        {step.icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-ink-primary">{step.label}</p>
        <p className={`text-[10px] font-mono mt-0.5`} style={{ color: step.color }}>{step.status}</p>
        {(isActive || isDone) && (
          <p className="text-xs text-ink-muted mt-1">{step.desc}</p>
        )}
      </div>
    </div>
  );
}

export default function FaultReplay({ scenario }) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  const normalWaveform = generateWaveform({ ...scenario, Va: 230, Vb: 230, Vc: 230, Ia: 100, Ib: 100, Ic: 100, affectedPhase: "None" }, false);
  const faultWaveform = generateWaveform(scenario, scenario.faultType !== "NONE");

  // Blended waveform based on current step
  const waveformData = () => {
    if (currentStep < 2) return normalWaveform;
    if (currentStep < 3) {
      return normalWaveform.map((d, i) => ({
        ...d,
        Va: d.Va * 0.85 + faultWaveform[i].Va * 0.15,
        Ia: d.Ia * 0.85 + faultWaveform[i].Ia * 0.15,
      }));
    }
    return faultWaveform;
  };

  const play = () => {
    if (playing) return;
    if (currentStep >= STEPS.length - 1) {
      setCurrentStep(-1);
      setTimeout(startPlay, 100);
    } else {
      startPlay();
    }
  };

  const startPlay = () => {
    setPlaying(true);
    let step = currentStep < 0 ? 0 : currentStep + 1;
    setCurrentStep(step);
    timerRef.current = setInterval(() => {
      step++;
      if (step >= STEPS.length) {
        clearInterval(timerRef.current);
        setPlaying(false);
        return;
      }
      setCurrentStep(step);
    }, 1800);
  };

  const pause = () => {
    clearInterval(timerRef.current);
    setPlaying(false);
  };

  const restart = () => {
    clearInterval(timerRef.current);
    setPlaying(false);
    setCurrentStep(-1);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const wf = waveformData();

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-xl">Fault Replay</h2>
          <p className="text-xs text-ink-muted mt-1">Step-by-step fault event simulation — <span className="text-signal-amber">🧪 SIMULATION MODE</span></p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={play} disabled={playing} id="replay-play-btn">▶ Play</button>
          <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={pause} disabled={!playing} id="replay-pause-btn">⏸ Pause</button>
          <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={restart} id="replay-restart-btn">↺ Restart</button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-ink-muted">Replay Progress</p>
          <span className="text-xs font-mono text-ink-muted">{currentStep + 1} / {STEPS.length}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-bg-raised overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${((currentStep + 1) / STEPS.length) * 100}%`,
              background: currentStep >= 3 ? "linear-gradient(90deg, #FF5470, #FF8C42)" : "linear-gradient(90deg, #3ADC8C, #2FD9D2)",
            }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex justify-between mt-3">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              id={`replay-step-${i}`}
              onClick={() => setCurrentStep(i)}
              className="w-7 h-7 rounded-full border flex items-center justify-center text-xs transition-all hover:scale-110"
              style={{
                borderColor: i <= currentStep ? s.color : "#233049",
                background: i <= currentStep ? `${s.color}20` : "#17233A",
              }}
              title={s.label}
            >
              {s.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Steps list */}
        <div className="space-y-2">
          {STEPS.map((s, i) => (
            <StepCard
              key={s.id}
              step={s}
              isActive={i === currentStep}
              isDone={i < currentStep}
            />
          ))}
        </div>

        {/* Live waveform */}
        <div className="space-y-4">
          {/* Current state display */}
          {currentStep >= 0 && (
            <div
              className="panel p-4 transition-all"
              style={{ borderColor: STEPS[currentStep]?.color + "60" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{STEPS[currentStep]?.icon}</span>
                <div>
                  <p className="font-semibold text-ink-primary">{STEPS[currentStep]?.label}</p>
                  <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: STEPS[currentStep]?.color, background: `${STEPS[currentStep]?.color}15` }}>
                    {STEPS[currentStep]?.status}
                  </span>
                </div>
              </div>
              <p className="text-xs text-ink-muted">{STEPS[currentStep]?.desc}</p>
            </div>
          )}

          {currentStep < 0 && (
            <div className="panel p-8 text-center text-ink-muted">
              <p className="text-3xl mb-2">▶</p>
              <p className="text-sm">Press Play to start fault replay</p>
            </div>
          )}

          {/* Waveform preview */}
          <div className="panel p-4">
            <p className="eyebrow mb-3">
              {currentStep < 2 ? "Normal Waveform" : currentStep < 3 ? "Transitioning…" : "Fault Waveform"}
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={wf} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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
        </div>
      </div>
    </div>
  );
}
