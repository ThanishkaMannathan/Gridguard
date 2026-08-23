import { useEffect, useState, useCallback } from "react";
import Header from "./components/Header.jsx";
import RecordList from "./components/RecordList.jsx";
import FaultCharts from "./components/FaultCharts.jsx";
import ClassificationPanel from "./components/ClassificationPanel.jsx";
import DiagnosisPanel from "./components/DiagnosisPanel.jsx";
import ReportView from "./components/ReportView.jsx";
import { api } from "./api.js";

export default function App() {
  const [apiOnline, setApiOnline] = useState(false);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [faultTypes, setFaultTypes] = useState([]);
  const [filter, setFilter] = useState("");
  const [recordsLoading, setRecordsLoading] = useState(true);

  const [selectedId, setSelectedId] = useState(null);
  const [record, setRecord] = useState(null);

  const [classification, setClassification] = useState(null);
  const [classifyLoading, setClassifyLoading] = useState(false);

  const [diagnosis, setDiagnosis] = useState(null);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState(null);

  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);

  useEffect(() => {
    api.health().then(() => setApiOnline(true)).catch(() => setApiOnline(false));
  }, []);

  const loadRecords = useCallback(() => {
    setRecordsLoading(true);
    api
      .listRecords(filter ? { fault_type: filter, limit: 200 } : { limit: 200 })
      .then((data) => {
        setRecords(data.records);
        setTotal(data.total);
        setFaultTypes(data.fault_types);
        setApiOnline(true);
        if (!selectedId && data.records.length > 0) {
          setSelectedId(data.records[0].record_id);
        }
      })
      .catch(() => setApiOnline(false))
      .finally(() => setRecordsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    if (!selectedId) return;
    setClassification(null);
    setDiagnosis(null);
    setDiagnosisError(null);
    setReport(null);
    setReportError(null);
    api.getRecord(selectedId).then(setRecord).catch(() => setRecord(null));
  }, [selectedId]);

  const runClassify = () => {
    setClassifyLoading(true);
    api
      .classify(selectedId)
      .then(setClassification)
      .catch((e) => setDiagnosisError(e.message))
      .finally(() => setClassifyLoading(false));
  };

  const runDiagnose = () => {
    setDiagnosisLoading(true);
    setDiagnosisError(null);
    api
      .diagnose(selectedId)
      .then(setDiagnosis)
      .catch((e) => setDiagnosisError(e.message))
      .finally(() => setDiagnosisLoading(false));
  };

  const runReport = () => {
    setReportLoading(true);
    setReportError(null);
    api
      .getReport(selectedId)
      .then(setReport)
      .catch((e) => setReportError(e.message))
      .finally(() => setReportLoading(false));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header apiOnline={apiOnline} />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr_360px] gap-6">
        <div className="h-[calc(100vh-140px)] lg:sticky lg:top-24">
          <RecordList
            records={records}
            total={total}
            selectedId={selectedId}
            onSelect={setSelectedId}
            filter={filter}
            onFilterChange={setFilter}
            faultTypes={faultTypes}
            loading={recordsLoading}
          />
        </div>

        <div className="space-y-4 min-w-0">
          {!apiOnline && (
            <div className="panel p-4 text-sm text-signal-amber bg-signal-amber/5 border-signal-amber/30">
              Backend unreachable. Confirm the Flask API is running and VITE_API_URL is set
              correctly (see frontend/.env.example).
            </div>
          )}
          {record ? (
            <>
              <div className="panel p-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-ink-muted">{record.record_id}</p>
                  <p className="font-display text-xl font-semibold">{record.fault_type_label}</p>
                </div>
                <p className="text-xs text-ink-faint font-mono">dataset label: {record.fault_type}</p>
              </div>
              <FaultCharts record={record} />
              <ReportView
                recordId={selectedId}
                onGenerate={runReport}
                loading={reportLoading}
                report={report}
                error={reportError}
              />
            </>
          ) : (
            <div className="panel p-8 text-center text-ink-muted">Select a fault record to begin.</div>
          )}
        </div>

        <div className="space-y-4 min-w-0">
          <ClassificationPanel result={classification} loading={classifyLoading} onClassify={runClassify} />
          <DiagnosisPanel
            diagnosis={diagnosis}
            loading={diagnosisLoading}
            error={diagnosisError}
            onDiagnose={runDiagnose}
            canDiagnose={!!classification}
          />
        </div>
      </main>

      <footer className="border-t border-border-soft py-4 text-center text-xs text-ink-faint font-mono">
        GridGuard — decision support only. Not a substitute for utility protection engineering review.
      </footer>
    </div>
  );
}
