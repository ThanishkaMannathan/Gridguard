export default function ReportView({ recordId, onGenerate, loading, report, error }) {
  const downloadMarkdown = () => {
    if (!report) return;
    const blob = new Blob([report.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gridguard_report_${recordId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow">Fault Report</p>
        <div className="flex gap-2">
          <button className="btn-secondary !px-3 !py-1 text-xs" onClick={onGenerate} disabled={loading}>
            {loading ? "Generating…" : "Generate Report"}
          </button>
          {report && (
            <button className="btn-primary !px-3 !py-1 text-xs" onClick={downloadMarkdown}>
              Download .md
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-signal-red">{error}</p>}
      {!report && !loading && !error && (
        <p className="text-sm text-ink-muted">Generate a full markdown fault report combining measurements, classification, and AI diagnosis.</p>
      )}
      {report && (
        <pre className="text-xs font-mono whitespace-pre-wrap max-h-96 overflow-y-auto bg-bg-raised rounded-md p-3 border border-border-soft">
          {report.markdown}
        </pre>
      )}
    </div>
  );
}
