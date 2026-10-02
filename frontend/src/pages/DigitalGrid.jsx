/**
 * DigitalGrid.jsx – Interactive visual power grid diagram.
 * Generator → Bus → Transmission Line → Bus → Transformer → Load
 * Highlights faulted section in red.
 */
import { useState } from "react";

const COMPONENTS = [
  { id: "gen",    label: "Generator",        icon: "⚡", type: "gen",   x: 40,  info: "3-phase synchronous generator. Rated: 11 kV, 50 Hz." },
  { id: "bus1",   label: "Bus 1",            icon: "━",  type: "bus",   x: 160, info: "High-voltage bus. Rated voltage: 132 kV. Connected to generator step-up transformer." },
  { id: "line",   label: "Transmission Line",icon: "〰", type: "line",  x: 280, info: "275 kV overhead transmission line. Length: 120 km. Impedance: 0.1 + j0.4 Ω/km." },
  { id: "bus2",   label: "Bus 2",            icon: "━",  type: "bus",   x: 400, info: "Receiving-end bus. Rated voltage: 132 kV. Protected by distance relay zone." },
  { id: "trafo",  label: "Transformer",      icon: "⊕",  type: "trafo", x: 520, info: "132/11 kV distribution transformer. Rated: 50 MVA. Dyn11 winding." },
  { id: "load",   label: "Load",             icon: "▭",  type: "load",  x: 640, info: "Industrial load. Rated 40 MW at 0.9 pf lagging." },
];

// Which component(s) are affected by each fault type
const FAULT_AFFECTS = {
  NONE:            [],
  LG:              ["line", "bus2"],
  LL:              ["line", "bus2"],
  LLG:             ["line", "bus2"],
  LLL:             ["line", "bus1", "bus2"],
  LLLG:            ["line", "bus1", "bus2"],
  VOLTAGE_IMBALANCE: ["trafo"],
  OVERLOAD:        ["trafo", "load"],
};

function GridNode({ comp, isActive, isFault, isSelected, onClick }) {
  const baseColor = isFault ? "#FF5470" : isActive ? "#2FD9D2" : "#233049";
  const textColor = isFault ? "#FF5470" : isActive ? "#2FD9D2" : "#8493B0";
  const glowStyle = isFault
    ? "drop-shadow(0 0 8px #FF547080)"
    : isActive
    ? "drop-shadow(0 0 6px #2FD9D260)"
    : "none";

  return (
    <button
      id={`grid-node-${comp.id}`}
      onClick={() => onClick(comp)}
      className="flex flex-col items-center gap-1 group transition-transform hover:scale-110 focus:outline-none"
      title={comp.label}
    >
      <div
        className="w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl transition-all"
        style={{
          borderColor: baseColor,
          background: isFault ? "rgba(255,84,112,0.1)" : isActive ? "rgba(47,217,210,0.08)" : "rgba(35,48,73,0.3)",
          filter: glowStyle,
          boxShadow: isSelected ? `0 0 0 2px ${baseColor}` : "none",
        }}
      >
        {comp.icon}
      </div>
      <span className="text-[9px] font-mono text-center leading-tight" style={{ color: textColor }}>
        {comp.label}
      </span>
      {isFault && <span className="text-[8px] font-mono text-signal-red animate-blink">FAULT</span>}
    </button>
  );
}

function Connector({ isFault }) {
  return (
    <div className="flex items-center justify-center w-8 mt-[-20px]">
      <div
        className="w-full h-1 rounded transition-all"
        style={{
          background: isFault ? "#FF5470" : "#233049",
          boxShadow: isFault ? "0 0 6px #FF547080" : "none",
        }}
      />
    </div>
  );
}

export default function DigitalGrid({ scenario }) {
  const [selected, setSelected] = useState(null);
  const faultType = scenario.faultType || "NONE";
  const affected = FAULT_AFFECTS[faultType] || [];

  const handleClick = (comp) => {
    setSelected(selected?.id === comp.id ? null : comp);
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-xl">Interactive Digital Grid</h2>
          <p className="text-xs text-ink-muted mt-1">Click any component to view its status — <span className="text-signal-amber">🧪 SIMULATION MODE</span></p>
        </div>
        <div className={`px-3 py-1.5 rounded-full border text-xs font-mono font-semibold ${
          faultType === "NONE" ? "bg-signal-green/10 border-signal-green/30 text-signal-green" : "bg-signal-red/10 border-signal-red/30 text-signal-red animate-blink"
        }`}>
          {faultType === "NONE" ? "● HEALTHY" : `⚡ FAULT: ${faultType}`}
        </div>
      </div>

      {/* Grid Diagram */}
      <div className="panel p-8 overflow-x-auto">
        <div className="flex items-center gap-0 min-w-max mx-auto justify-center">
          {COMPONENTS.map((comp, i) => (
            <div key={comp.id} className="flex items-center">
              <GridNode
                comp={comp}
                isActive={true}
                isFault={affected.includes(comp.id)}
                isSelected={selected?.id === comp.id}
                onClick={handleClick}
              />
              {i < COMPONENTS.length - 1 && (
                <Connector isFault={affected.includes(comp.id) && affected.includes(COMPONENTS[i + 1].id)} />
              )}
            </div>
          ))}
        </div>

        {/* Fault overlay line label */}
        {faultType !== "NONE" && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-signal-red/10 border border-signal-red/30">
              <span className="text-signal-red text-sm animate-blink">⚡</span>
              <span className="text-xs font-mono text-signal-red">
                {scenario.label} — Fault on Phase {scenario.affectedPhase || "?"} at {scenario.faultLocation ? `${scenario.faultLocation.toFixed(1)}% of line length` : "unknown location"} (SIMULATED)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Component info panel */}
      {selected && (
        <div className="panel p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{selected.icon}</span>
            <div>
              <p className="font-semibold text-ink-primary">{selected.label}</p>
              <p className="eyebrow">Component Details</p>
            </div>
            <div className="ml-auto">
              {affected.includes(selected.id) ? (
                <span className="px-3 py-1 rounded-full bg-signal-red/10 border border-signal-red/30 text-signal-red text-xs font-mono font-semibold animate-blink">
                  ⚡ FAULTED
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-signal-green/10 border border-signal-green/30 text-signal-green text-xs font-mono font-semibold">
                  ✓ NORMAL
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-ink-muted">{selected.info}</p>
          {affected.includes(selected.id) && (
            <div className="mt-3 p-3 rounded-lg bg-signal-red/5 border border-signal-red/20">
              <p className="text-xs text-signal-red font-mono">
                ⚠ This component is in the fault path for a {faultType} fault. 
                Estimated fault location: {scenario.faultLocation ? `${scenario.faultLocation.toFixed(1)}% from Bus 1` : "N/A"} (SIMULATED LOCATION)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="panel p-4">
        <p className="eyebrow mb-3">Grid Legend</p>
        <div className="flex flex-wrap gap-4 text-xs font-mono">
          <div className="flex items-center gap-2"><span className="w-4 h-1 rounded bg-border" /><span className="text-ink-muted">Normal path</span></div>
          <div className="flex items-center gap-2"><span className="w-4 h-1 rounded bg-signal-red" /><span className="text-ink-muted">Fault path</span></div>
          <div className="flex items-center gap-2"><span className="w-4 h-4 rounded border-2 border-signal-cyan" /><span className="text-ink-muted">Normal component</span></div>
          <div className="flex items-center gap-2"><span className="w-4 h-4 rounded border-2 border-signal-red" /><span className="text-ink-muted">Faulted component</span></div>
        </div>
      </div>
    </div>
  );
}
