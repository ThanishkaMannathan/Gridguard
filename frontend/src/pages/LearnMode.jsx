/**
 * LearnMode.jsx – Educational section explaining fault types.
 * EEE-student-friendly explanations with visual aids.
 */
import { useState } from "react";

const LESSONS = [
  {
    id: "lg",
    title: "L-G Fault (Line-to-Ground)",
    icon: "⚡",
    color: "#FF5470",
    short: "One phase makes contact with ground.",
    explanation: `A Line-to-Ground (L-G) fault is the most common type of fault in power systems, accounting for about 70-80% of all faults.

It occurs when one of the phase conductors (A, B, or C) accidentally contacts the ground — due to lightning strikes, broken insulators, or tree contact.

What happens electrically:
• The faulted phase voltage drops to near zero
• A large fault current flows through the faulted phase and returns via ground
• The other two phases may show voltage rise (up to √3 × normal) — this is called the ground potential rise

How to detect:
• Zero-sequence current (I₀) is present — this is the key signature
• Differential protection and earth-fault relays trip
• Distance relay Zone 1 operates instantly if the fault is close

Example: Va = 5V, Ia = 480A while Vb, Vc remain near normal`,
    analogy: "Think of it like accidentally touching a live wire with your hand while standing on the ground — a large current flows through you to earth.",
    parameters: ["Va ≈ 0 (Phase A collapses)", "Ia >> rated (fault current)", "I₀ ≠ 0 (zero-seq component)", "Voltage unbalance > 20%"],
  },
  {
    id: "ll",
    title: "L-L Fault (Line-to-Line)",
    icon: "⚡",
    color: "#FF8C42",
    short: "Two phases make contact with each other.",
    explanation: `A Line-to-Line (L-L) fault occurs when two phase conductors short-circuit each other, without ground involvement.

Common causes: wind bringing conductors together, conductor galloping, or insulation failure between two phases.

What happens electrically:
• Both faulted phases show reduced voltage
• Equal and opposite fault currents flow between the two phases
• The third healthy phase remains undisturbed
• No zero-sequence current flows (unlike L-G faults)

How to detect:
• Negative-sequence current (I₂) is high — the key signature
• Positive-sequence voltage drops
• Overcurrent relays detect the raised current
• Distance relay operates depending on fault location

Example: Va = Vb ≈ 95V, Ia = Ib ≈ 320A (opposite polarity)`,
    analogy: "Like short-circuiting two terminals of a battery with a wire — large current flows between them.",
    parameters: ["Va, Vb drop equally", "Ia = -Ib (opposite currents)", "I₀ = 0 (no ground)", "Negative-sequence present"],
  },
  {
    id: "llg",
    title: "L-L-G Fault (Double Line-to-Ground)",
    icon: "⚡",
    color: "#FF5470",
    short: "Two phases contact each other and ground simultaneously.",
    explanation: `A Double Line-to-Ground (L-L-G) fault is a more severe fault where two phase conductors simultaneously contact the ground.

It can start as an L-G fault and evolve as the fault arc spreads, or can occur directly from a physical failure.

What happens electrically:
• Both faulted phases collapse in voltage
• Very large fault currents flow through both phases and ground
• All sequence components (positive, negative, zero) are present
• This is among the most severe asymmetric faults

How to detect:
• Both zero-sequence (I₀) and negative-sequence (I₂) currents present
• High fault current on two phases simultaneously
• Protection must discriminate from L-G and L-L faults

Example: Va = Vb ≈ 40V, Ia = Ib ≈ 420A, Ic = 100A`,
    analogy: "Like two people both accidentally grabbing a live wire while standing on wet ground — current flows through both and through the earth.",
    parameters: ["Va, Vb ≈ 0", "Ia, Ib >> rated", "I₀ ≠ 0, I₂ ≠ 0 (both)", "Very high V-unbalance"],
  },
  {
    id: "lll",
    title: "Three-Phase Fault (L-L-L)",
    icon: "⚡",
    color: "#FF5470",
    short: "All three phases short-circuit together.",
    explanation: `A Three-Phase (L-L-L) or symmetrical fault occurs when all three phase conductors short-circuit simultaneously.

Although rare (~5% of faults), it is the most severe and produces the highest fault current.

What happens electrically:
• All three phase voltages collapse to near zero
• Symmetrical fault currents on all three phases
• No negative or zero sequence components — the fault is balanced
• The fault current is limited only by source impedance

How to detect:
• All three phase voltages drop simultaneously
• All three phase currents surge equally
• Positive-sequence current is the only sequence — but it's massive
• Distance relay, differential relay, and overcurrent relay all respond

Example: Va = Vb = Vc ≈ 10V, Ia = Ib = Ic ≈ 650A`,
    analogy: "Like completely short-circuiting a three-phase generator's output — all phases collapse and maximum current flows.",
    parameters: ["Va = Vb = Vc ≈ 0", "Ia = Ib = Ic >> rated", "No I₀ or I₂ (balanced)", "Frequency drops rapidly"],
  },
  {
    id: "oc",
    title: "Overcurrent",
    icon: "🌡",
    color: "#F5A623",
    short: "Current exceeds the rated value without a fault.",
    explanation: `Overcurrent is a condition where the current drawn by the load exceeds the rated (designed) value of the equipment.

This is different from a fault — it is a gradual or sudden increase in load demand.

Causes:
• Heavy load connected suddenly (large motors starting)
• Load growth beyond system capacity
• Partial faults creating sustained high current

Effects:
• Transformer and cable overheating
• Insulation degradation over time
• Reduction in equipment lifespan

Protection:
• Overcurrent relays (IDMT — Inverse Definite Minimum Time)
• Fuses and circuit breakers
• Load shedding systems

Example: Ia = Ib = Ic = 185A when rated current is 150A`,
    analogy: "Like running too many appliances on one circuit — the cable heats up and the fuse blows.",
    parameters: ["Ia, Ib, Ic slightly elevated", "Balanced phases (no unbalance)", "Temperature rise", "Frequency may drop slightly"],
  },
  {
    id: "vsag",
    title: "Voltage Sag",
    icon: "📉",
    color: "#F5A623",
    short: "Temporary drop in supply voltage, usually 10–90% of nominal.",
    explanation: `A Voltage Sag (also called voltage dip) is a short-duration reduction in RMS voltage, typically lasting from 0.5 cycles to 1 minute.

It is one of the most common power quality disturbances in distribution systems.

Causes:
• Starting of large motors (induction motors draw 5-7× rated starting current)
• Short-circuit faults on nearby feeders
• Lightning strikes
• Transformer energisation

Effects on sensitive loads:
• Computer and PLC resets
• Motor speed fluctuations
• UPS switching
• Flickering lighting

Characterised by:
• Magnitude: how much voltage dropped (e.g., Va = 180V instead of 230V)
• Duration: how long it lasted (ms to seconds)

Example: Va = 170V, Vb = 220V, Vc = 225V for 200 ms`,
    analogy: "Like a brief dimming of lights when a large air conditioner starts — voltage drops temporarily.",
    parameters: ["One or more V phases drop 10-90%", "Duration: 0.5 cycles to 60 s", "Possible unbalance", "Current may spike briefly"],
  },
  {
    id: "pimbal",
    title: "Phase Imbalance",
    icon: "⚖",
    color: "#F5A623",
    short: "Voltages or currents are unequal across the three phases.",
    explanation: `Phase imbalance occurs when the three phases of a three-phase power system are not equal — either in voltage magnitude, current magnitude, or phase angle.

Causes of voltage imbalance:
• Unequal single-phase loads connected across phases
• Open-delta transformer connection
• Blown fuse on one phase of a capacitor bank
• Conductor impedance differences

Effects on three-phase motors:
• Negative-sequence currents cause braking torque
• Heating in rotor (~6-10× proportional to % unbalance²)
• Vibration and noise
• Reduced efficiency and lifetime

IEC/NEMA standard: Voltage imbalance should not exceed 1-2% at motor terminals.

Measurement formula (NEMA):
% Unbalance = (Max deviation from average / Average) × 100

Example: Va = 210V, Vb = 245V, Vc = 218V → ~7.8% imbalance`,
    analogy: "Like a three-legged stool with legs of different lengths — the stool wobbles and wears unevenly.",
    parameters: ["Va ≠ Vb ≠ Vc", "Negative-sequence current (I₂) present", "Motor heating and vibration", "Unbalance % > 2% is alarming"],
  },
  {
    id: "pf",
    title: "Power Factor",
    icon: "🔌",
    color: "#2FD9D2",
    short: "Ratio of useful (active) power to total (apparent) power.",
    explanation: `Power Factor (PF) is the ratio of real power (kW) to apparent power (kVA). It represents how efficiently the electrical system is being used.

Mathematical definition:
PF = cos(φ) = P / S = kW / kVA

Where:
• P = Active power (kW) — does useful work
• Q = Reactive power (kVAR) — creates magnetic fields
• S = Apparent power (kVA) = √(P² + Q²)

Types:
• Lagging PF: Inductive loads (motors, transformers) — most common
• Leading PF: Capacitive loads (capacitor banks, some electronics)
• Unity PF (= 1.0): Purely resistive, most efficient

Why PF matters:
• Low PF (< 0.8) means more current for same useful work
• Higher losses in cables and transformers
• Utilities charge penalties for poor PF
• Generators and transformers must be oversized

Correction:
• Install power factor correction capacitors (shunt capacitor banks)
• Synchronous condensers

Example: P = 63 kW, Q = 26 kVAR → S = 68.2 kVA → PF = 0.92`,
    analogy: "Power factor is like the efficiency of drinking from a glass — unity PF means drinking only beer, low PF means the glass is full of foam.",
    parameters: ["PF = P/S = cos(φ)", "< 0.85 is poor (industry target)", "Low PF → high current for same kW", "Capacitors improve lagging PF"],
  },
];

export default function LearnMode() {
  const [selected, setSelected] = useState("lg");
  const lesson = LESSONS.find((l) => l.id === selected) || LESSONS[0];

  return (
    <div className="space-y-5 p-6">
      <div>
        <h2 className="font-display font-semibold text-xl">Learn Mode</h2>
        <p className="text-xs text-ink-muted mt-1">EEE-student-friendly explanations of power system faults and concepts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5">
        {/* Topic selector */}
        <div className="panel overflow-hidden">
          <div className="px-4 py-3 border-b border-border-soft bg-bg-raised">
            <p className="eyebrow">Topics</p>
          </div>
          <div className="p-2 space-y-1">
            {LESSONS.map((l) => (
              <button
                key={l.id}
                id={`learn-${l.id}`}
                onClick={() => setSelected(l.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition flex items-center gap-2.5 ${
                  selected === l.id ? "bg-bg-hover border border-border-soft" : "hover:bg-bg-raised"
                }`}
              >
                <span className="text-base">{l.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink-primary truncate">{l.title}</p>
                  <p className="text-[9px] text-ink-faint truncate">{l.short}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Lesson content */}
        <div className="space-y-4">
          {/* Header */}
          <div className="panel p-5">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: `${lesson.color}15`, border: `1px solid ${lesson.color}40` }}
              >
                {lesson.icon}
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg text-ink-primary">{lesson.title}</h3>
                <p className="text-sm text-ink-muted mt-0.5">{lesson.short}</p>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="panel p-5">
            <p className="eyebrow mb-3">Technical Explanation</p>
            <pre className="text-sm text-ink-primary leading-relaxed whitespace-pre-wrap font-body">{lesson.explanation}</pre>
          </div>

          {/* Analogy */}
          <div className="panel p-5 bg-signal-cyan/5 border-signal-cyan/20">
            <p className="eyebrow mb-2 text-signal-cyan">💡 Simple Analogy</p>
            <p className="text-sm text-ink-primary">{lesson.analogy}</p>
          </div>

          {/* Key parameters */}
          <div className="panel p-5">
            <p className="eyebrow mb-3">Key Electrical Signatures</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {lesson.parameters.map((p, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-bg-raised border border-border-soft">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: lesson.color }} />
                  <span className="text-xs font-mono text-ink-muted">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
