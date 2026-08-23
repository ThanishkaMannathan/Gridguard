export default function ReportView({ recordId, onGenerate, loading, error }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow">Fault Report</p>
        <button className="btn-primary !px-3 !py-1 text-xs" onClick={onGenerate} disabled={loading}>
          {loading ? "Generating PDF…" : "Download PDF"}
        </button>
      </div>

      {error && <p className="text-sm text-signal-red">{error}</p>}
      {!loading && !error && (
        <p className="text-sm text-ink-muted">Generate a full PDF fault report combining measurements, classification, and AI diagnosis.</p>
      )}
    </div>
  );
}
