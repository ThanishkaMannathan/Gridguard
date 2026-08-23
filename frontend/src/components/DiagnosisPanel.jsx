export default function DiagnosisPanel({ diagnosis, loading, error, onDiagnose, canDiagnose }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow">AI Diagnosis & Recommendations</p>
        <button
          className="btn-primary !px-3 !py-1 text-xs"
          onClick={onDiagnose}
          disabled={loading || !canDiagnose}
        >
          {loading ? "Analyzing…" : diagnosis ? "Re-analyze" : "Diagnose"}
        </button>
      </div>

      {!canDiagnose && !loading && (
        <p className="text-sm text-ink-muted">Run classification first, then request an AI diagnosis grounded in the protection guideline knowledge base.</p>
      )}

      {error && (
        <div className="text-sm text-signal-red bg-signal-red/10 border border-signal-red/30 rounded-md p-3">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-bg-raised rounded w-3/4" />
          <div className="h-3 bg-bg-raised rounded w-full" />
          <div className="h-3 bg-bg-raised rounded w-5/6" />
        </div>
      )}

      {diagnosis && !loading && (
        <div className="space-y-4">
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-ink-primary">
            {diagnosis.diagnosis}
          </div>
          {diagnosis.sources && diagnosis.sources.length > 0 && (
            <div className="pt-3 border-t border-border-soft">
              <p className="eyebrow mb-2">Grounded in</p>
              <div className="flex flex-wrap gap-2">
                {diagnosis.sources.map((s, i) => (
                  <span key={i} className="text-xs font-mono px-2 py-1 rounded-md bg-bg-raised border border-border text-ink-muted">
                    {s.source} {s.relevance != null ? `· ${(s.relevance * 100).toFixed(0)}%` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
