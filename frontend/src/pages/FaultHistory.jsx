/**
 * FaultHistory.jsx – Stores & displays previous diagnosis/simulation results.
 * Searchable, filterable table with all fault details.
 */
import { useEffect, useState } from "react";

const STORAGE_KEY = "gridguard_fault_history";

export function saveFaultToHistory(entry) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    const updated = [newEntry, ...existing].slice(0, 200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newEntry;
  } catch {
    return null;
  }
}

export function loadFaultHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

const SEVERITY_BADGE = {
  Normal:   { bg: "bg-signal-green/10", border: "border-signal-green/30", text: "text-signal-green" },
  Warning:  { bg: "bg-signal-amber/10", border: "border-signal-amber/30", text: "text-signal-amber" },
  High:     { bg: "bg-orange-400/10",   border: "border-orange-400/30",   text: "text-orange-400"   },
  Abnormal: { bg: "bg-orange-400/10",   border: "border-orange-400/30",   text: "text-orange-400"   },
  Critical: { bg: "bg-signal-red/10",   border: "border-signal-red/30",   text: "text-signal-red"   },
};

function SeverityBadge({ sev }) {
  const c = SEVERITY_BADGE[sev] || SEVERITY_BADGE.Normal;
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${c.bg} ${c.border} ${c.text}`}>{sev || "Normal"}</span>;
}

export default function FaultHistory() {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterType, setFilterType] = useState("");

  const reload = () => setHistory(loadFaultHistory());

  useEffect(() => {
    reload();
    const interval = setInterval(reload, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = history.filter((h) => {
    const s = search.toLowerCase();
    const matchSearch = !s || (h.faultType || "").toLowerCase().includes(s) || (h.affectedPhase || "").toLowerCase().includes(s) || (h.severity || "").toLowerCase().includes(s) || (h.source || "").toLowerCase().includes(s);
    const matchSev = !filterSeverity || h.severity === filterSeverity;
    const matchType = !filterType || h.faultType === filterType;
    return matchSearch && matchSev && matchType;
  });

  const clearHistory = () => {
    if (window.confirm("Clear all fault history?")) {
      localStorage.removeItem(STORAGE_KEY);
      setHistory([]);
    }
  };

  const uniqueTypes = [...new Set(history.map((h) => h.faultType).filter(Boolean))];

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-xl">Fault History</h2>
          <p className="text-xs text-ink-muted mt-1">{history.length} records stored locally</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs !px-3 !py-1.5" onClick={reload} id="history-refresh-btn">↺ Refresh</button>
          {history.length > 0 && <button className="btn-secondary text-xs !px-3 !py-1.5 text-signal-red border-signal-red/30" onClick={clearHistory} id="history-clear-btn">🗑 Clear</button>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          id="history-search"
          type="text"
          placeholder="Search fault type, phase, severity…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-bg-raised border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-signal-cyan flex-1 min-w-48"
        />
        <select
          id="history-filter-severity"
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="bg-bg-raised border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-signal-cyan"
        >
          <option value="">All Severities</option>
          <option value="Normal">Normal</option>
          <option value="Warning">Warning</option>
          <option value="High">High</option>
          <option value="Abnormal">Abnormal</option>
          <option value="Critical">Critical</option>
        </select>
        <select
          id="history-filter-type"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-bg-raised border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-signal-cyan"
        >
          <option value="">All Fault Types</option>
          {uniqueTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="panel p-12 text-center text-ink-muted">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold">No fault history yet.</p>
          <p className="text-sm mt-1">Run fault diagnosis or simulation scenarios to populate history.</p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-bg-raised">
                  {["Date / Time", "Source", "Fault Type", "Phase", "Severity", "Confidence", "Location", "Grid Health"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-ink-faint whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-border-soft hover:bg-bg-hover transition">
                    <td className="px-4 py-3 font-mono text-ink-faint whitespace-nowrap">
                      {new Date(row.timestamp).toLocaleDateString()}<br />
                      <span className="text-[10px]">{new Date(row.timestamp).toLocaleTimeString()}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-ink-muted">{row.source || "Simulation"}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-ink-primary">{row.faultType || "—"}</td>
                    <td className="px-4 py-3 font-mono text-signal-cyan">{row.affectedPhase || "—"}</td>
                    <td className="px-4 py-3"><SeverityBadge sev={row.severity} /></td>
                    <td className="px-4 py-3 font-mono text-ink-muted">
                      {row.confidence ? `${(row.confidence * 100).toFixed(1)}%` : row.confidencePct ? `${row.confidencePct}%` : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-ink-muted">
                      {row.faultLocation ? `${parseFloat(row.faultLocation).toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {row.health != null ? (
                        <span className={row.health >= 70 ? "text-signal-green" : row.health >= 40 ? "text-signal-amber" : "text-signal-red"}>
                          {row.health}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
