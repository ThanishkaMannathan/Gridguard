import { useState } from "react";

const NAV_ITEMS = [
  { id: "dashboard",    label: "Dashboard",       icon: "⊞" },
  { id: "diagnosis",    label: "Fault Diagnosis",  icon: "🔍" },
  { id: "monitor",      label: "Live Monitor",     icon: "📡" },
  { id: "waveforms",    label: "Waveforms",        icon: "〰" },
  { id: "grid",         label: "Digital Grid",     icon: "🗺" },
  { id: "predictive",   label: "Predictive Guard", icon: "⚠" },
  { id: "simulator",    label: "Grid Simulator",   icon: "🧪" },
  { id: "replay",       label: "Fault Replay",     icon: "▶" },
  { id: "history",      label: "Fault History",    icon: "📋" },
  { id: "reports",      label: "Reports",          icon: "📄" },
  { id: "learn",        label: "Learn Mode",       icon: "📚" },
];

export default function Sidebar({ activePage, onNavigate, apiOnline }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`sidebar flex flex-col border-r border-border bg-bg-panel transition-all duration-300 ${
        collapsed ? "w-16" : "w-56"
      } shrink-0`}
    >
      {/* Logo row */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border-soft">
        <svg width="28" height="20" viewBox="0 0 44 30" className="shrink-0">
          <path d="M0 15 Q 5.5 2, 11 15 T 22 15" fill="none" stroke="#2FD9D2" strokeWidth="2" />
          <path d="M0 15 Q 5.5 22, 11 15 T 22 15 T 33 15" fill="none" stroke="#F5A623" strokeWidth="2" opacity="0.8" />
          <path d="M0 15 Q 5.5 9, 11 15 T 22 15 T 33 15 T 44 15" fill="none" stroke="#8B7CF6" strokeWidth="2" opacity="0.65" />
        </svg>
        {!collapsed && (
          <span className="font-display font-semibold text-base leading-none">
            Grid<span className="text-signal-cyan">Guard</span>
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-ink-faint hover:text-ink-primary transition text-xs"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* API status */}
      <div className={`flex items-center gap-2 px-4 py-2 border-b border-border-soft ${collapsed ? "justify-center px-0" : ""}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${apiOnline ? "bg-signal-green" : "bg-signal-red animate-blink"}`} />
        {!collapsed && (
          <span className="text-[10px] font-mono text-ink-faint">
            {apiOnline ? "BACKEND ONLINE" : "BACKEND OFFLINE"}
          </span>
        )}
      </div>

      {/* Simulation badge */}
      {!collapsed && (
        <div className="mx-3 mt-2 py-1.5 px-2 rounded-md bg-signal-amber/10 border border-signal-amber/30 flex items-center gap-1.5">
          <span className="text-[10px]">🧪</span>
          <span className="text-[9px] font-mono text-signal-amber tracking-wider">SIMULATION MODE</span>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={item.label}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all
              ${activePage === item.id
                ? "bg-signal-cyan/10 text-signal-cyan border-r-2 border-signal-cyan font-medium"
                : "text-ink-muted hover:bg-bg-hover hover:text-ink-primary"
              } ${collapsed ? "justify-center px-0" : ""}`}
          >
            <span className="text-base shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-border-soft">
          <p className="text-[9px] font-mono text-ink-faint leading-relaxed">
            GridGuard v2.0<br />
            Decision support only.<br />
            Not real grid data.
          </p>
        </div>
      )}
    </aside>
  );
}
