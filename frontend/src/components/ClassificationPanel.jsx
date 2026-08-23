const LABELS = {
  NONE: "No Fault",
  LG: "Line-to-Ground",
  LL: "Line-to-Line",
  LLG: "Double Line-to-Ground",
  LLL: "Three-Phase",
  LLLG: "Three-Phase-to-Ground",
};

export default function ClassificationPanel({ result, loading, onClassify }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow">ML Fault Classification</p>
        <button className="btn-secondary !px-3 !py-1 text-xs" onClick={onClassify} disabled={loading}>
          {loading ? "Running…" : result ? "Re-run" : "Classify"}
        </button>
      </div>

      {!result && !loading && (
        <p className="text-sm text-ink-muted">Run the classifier to identify the fault type from this record's electrical signature.</p>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-display font-semibold text-signal-cyan">
              {result.predicted_fault_type_label}
            </p>
            <p className="data-value text-sm text-ink-muted">
              {(result.confidence * 100).toFixed(1)}% confidence
            </p>
          </div>
          <p className="text-xs text-ink-faint font-mono">
            model: {result.model} · cv accuracy {(result.model_cv_accuracy * 100).toFixed(1)}%
          </p>

          <div className="space-y-1.5 pt-2">
            {Object.entries(result.probabilities)
              .sort((a, b) => b[1] - a[1])
              .map(([type, p]) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="w-32 text-xs font-mono text-ink-muted shrink-0">{LABELS[type] || type}</span>
                  <div className="flex-1 h-2 rounded-full bg-bg-raised overflow-hidden">
                    <div
                      className="h-full bg-signal-cyan rounded-full"
                      style={{ width: `${p * 100}%`, opacity: type === result.predicted_fault_type ? 1 : 0.4 }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs font-mono text-ink-muted">{(p * 100).toFixed(0)}%</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
