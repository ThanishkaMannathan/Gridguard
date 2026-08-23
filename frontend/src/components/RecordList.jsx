const FAULT_COLORS = {
  NONE: "bg-signal-green",
  LG: "bg-signal-amber",
  LL: "bg-signal-amber",
  LLG: "bg-signal-red",
  LLL: "bg-signal-red",
  LLLG: "bg-signal-red",
};

export default function RecordList({
  records,
  total,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  faultTypes,
  loading,
}) {
  return (
    <aside className="panel flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-border-soft">
        <p className="eyebrow mb-2">Fault Records ({total})</p>
        <select
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="w-full bg-bg-raised border border-border rounded-md px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-signal-cyan"
        >
          <option value="">All fault types</option>
          {faultTypes.map((ft) => (
            <option key={ft} value={ft}>
              {ft}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="p-4 text-sm text-ink-muted">Loading records…</p>}
        {!loading && records.length === 0 && (
          <p className="p-4 text-sm text-ink-muted">No records match this filter.</p>
        )}
        {records.map((r) => (
          <button
            key={r.record_id}
            onClick={() => onSelect(r.record_id)}
            className={`w-full text-left px-4 py-3 border-b border-border-soft transition flex items-center justify-between gap-2 ${
              selectedId === r.record_id ? "bg-bg-hover" : "hover:bg-bg-raised"
            }`}
          >
            <div>
              <p className="font-mono text-sm text-ink-primary">{r.record_id}</p>
              <p className="text-xs text-ink-muted mt-0.5">{r.fault_type_label}</p>
            </div>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${FAULT_COLORS[r.fault_type] || "bg-ink-faint"}`} />
          </button>
        ))}
      </div>
    </aside>
  );
}
