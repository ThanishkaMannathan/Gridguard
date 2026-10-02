/**
 * FaultDiagnosis.jsx – Improved AI Fault Diagnosis page.
 * Keeps existing backend API functionality + enhanced result display + XAI.
 */
import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { FAULT_SCENARIOS, computeGridHealth, computeFaultRisk, getRiskLevel, generateXAIFactors } from "../simulation.js";
import { saveFaultToHistory } from "./FaultHistory.jsx";
import AlertCenter, { computeAlerts } from "../components/AlertCenter.jsx";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const SCENARIO_BUTTONS = [
  { key: "NORMAL",           label: "Normal",          icon: "🟢" },
  { key: "LG",               label: "L-G Fault",       icon: "🔴" },
  { key: "LL",               label: "L-L Fault",       icon: "🔴" },
  { key: "LLG",              label: "L-L-G Fault",     icon: "🔴" },
  { key: "LLL",              label: "Three-Phase",      icon: "🔴" },
  { key: "VOLTAGE_IMBALANCE",label: "V-Imbalance",     icon: "🟠" },
  { key: "OVERLOAD",         label: "Overload",         icon: "🟠" },
];

const FAULT_TYPE_LABELS = {
  NONE: "No Fault (healthy)", LG: "Single Line-to-Ground", LL: "Line-to-Line",
  LLG: "Double Line-to-Ground", LLL: "Three-Phase (symmetrical)", LLLG: "Three-Phase-to-Ground",
};

const PROB_COLORS = ["#2FD9D2", "#F5A623", "#8B7CF6", "#FF5470", "#3ADC8C", "#FF8C42"];

function ProbBar({ label, prob, isTop }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-32 text-xs font-mono text-ink-muted shrink-0">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-bg-raised overflow-hidden">
        <div className="h-full bg-signal-cyan rounded-full transition-all duration-700" style={{ width: `${prob * 100}%`, opacity: isTop ? 1 : 0.4 }} />
      </div>
      <span className="w-12 text-right text-xs font-mono text-ink-muted">{(prob * 100).toFixed(1)}%</span>
    </div>
  );
}

export default function FaultDiagnosis({ scenario, onScenarioChange }) {
  const [apiOnline, setApiOnline] = useState(false);
  const [records, setRecords] = useState([]);
  const [faultTypes, setFaultTypes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [record, setRecord] = useState(null);
  const [filter, setFilter] = useState("");
  const [classification, setClassification] = useState(null);
  const [classifyLoading, setClassifyLoading] = useState(false);
  const [classifyError, setClassifyError] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState(null);

  // Determine active scenario (for XAI) from current scenario
  const xaiScenario = scenario;
  const xaiFacts = generateXAIFactors(xaiScenario);
  const health = computeGridHealth(xaiScenario);
  const risk = computeFaultRisk(xaiScenario);
  const riskLevel = getRiskLevel(risk);
  const alerts = computeAlerts(xaiScenario, xaiScenario.severity);

  const loadRecords = useCallback(() => {
    api.listRecords(filter ? { fault_type: filter, limit: 200 } : { limit: 200 })
      .then((data) => {
        setRecords(data.records || []);
        setFaultTypes(data.fault_types || []);
        setApiOnline(true);
        if (!selectedId && data.records?.length) setSelectedId(data.records[0].record_id);
      })
      .catch(() => setApiOnline(false));
  }, [filter, selectedId]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  useEffect(() => {
    if (!selectedId) return;
    setClassification(null); setDiagnosis(null); setClassifyError(null); setDiagError(null);
    api.getRecord(selectedId).then(setRecord).catch(() => setRecord(null));
  }, [selectedId]);

  const runClassify = () => {
    setClassifyLoading(true); setClassifyError(null);
    api.classify(selectedId)
      .then((c) => {
        setClassification(c);
        // Save to history
        saveFaultToHistory({
          source: "AI Classifier",
          faultType: c.predicted_fault_type,
          affectedPhase: "?",
          severity: c.predicted_fault_type === "NONE" ? "Normal" : "High",
          confidence: c.confidence,
          faultLocation: record?.fault_location_pct,
          health,
        });
      })
      .catch((e) => setClassifyError(e.message))
      .finally(() => setClassifyLoading(false));
  };

  const runDiagnose = () => {
    setDiagLoading(true); setDiagError(null);
    api.diagnose(selectedId).then(setDiagnosis).catch((e) => setDiagError(e.message)).finally(() => setDiagLoading(false));
  };

  // Waveform data from record
  const voltageData = record?.waveform
    ? record.waveform.Va.map((v, i) => ({ i, Va: v, Vb: record.waveform.Vb[i], Vc: record.waveform.Vc[i] }))
    : [];

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-xl">AI Fault Diagnosis</h2>
          <p className="text-xs text-ink-muted mt-1">
            ML classification + RAG-grounded AI diagnosis
            {!apiOnline && <span className="text-signal-red ml-2">— Backend offline, using simulation only</span>}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full border text-[10px] font-mono ${apiOnline ? "border-signal-green/30 text-signal-green bg-signal-green/10" : "border-signal-red/30 text-signal-red bg-signal-red/10"}`}>
          {apiOnline ? "● BACKEND ONLINE" : "● BACKEND OFFLINE"}
        </span>
      </div>

      {/* Demo Scenario Buttons */}
      <div className="panel p-4">
        <p className="eyebrow mb-3">Demo Fault Scenarios — Click to load simulation data</p>
        <div className="flex flex-wrap gap-2">
          {SCENARIO_BUTTONS.map((s) => {
            const sc = FAULT_SCENARIOS[s.key];
            const isActive = scenario.faultType === (sc?.faultType) && scenario.label === sc?.label;
            return (
              <button
                key={s.key}
                id={`scenario-btn-${s.key}`}
                onClick={() => { if (sc) onScenarioChange(sc); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition hover:scale-105 ${
                  isActive ? "bg-signal-cyan/20 border-signal-cyan text-signal-cyan" : "border-border text-ink-muted hover:bg-bg-hover"
                }`}
              >
                <span>{s.icon}</span> {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      <AlertCenter alerts={alerts} />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* Record list */}
        <div className="panel flex flex-col overflow-hidden" style={{ maxHeight: "600px" }}>
          <div className="p-4 border-b border-border-soft bg-bg-raised">
            <p className="eyebrow mb-2">Fault Records ({records.length})</p>
            {apiOnline ? (
              <select
                value={filter} onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-bg-raised border border-border rounded-md px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-signal-cyan"
              >
                <option value="">All fault types</option>
                {faultTypes.map((ft) => <option key={ft}>{ft}</option>)}
              </select>
            ) : (
              <p className="text-xs text-ink-faint">Backend offline — using simulation mode</p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {!apiOnline && (
              <div className="p-4 text-xs text-ink-muted">
                No records available. Start backend or use demo scenarios above.
              </div>
            )}
            {records.map((r) => (
              <button
                key={r.record_id}
                onClick={() => setSelectedId(r.record_id)}
                className={`w-full text-left px-4 py-3 border-b border-border-soft transition flex items-center justify-between gap-2 ${
                  selectedId === r.record_id ? "bg-bg-hover" : "hover:bg-bg-raised"
                }`}
              >
                <div>
                  <p className="font-mono text-xs text-ink-primary">{r.record_id}</p>
                  <p className="text-[10px] text-ink-muted mt-0.5">{r.fault_type_label}</p>
                </div>
                <span className={`w-2 h-2 rounded-full shrink-0 ${r.fault_type === "NONE" ? "bg-signal-green" : r.fault_type === "LG" || r.fault_type === "LL" ? "bg-signal-amber" : "bg-signal-red"}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Main panel */}
        <div className="space-y-4">
          {/* Record header */}
          {record && (
            <div className="panel p-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-sm text-ink-muted">{record.record_id}</p>
                <p className="font-display text-xl font-semibold">{record.fault_type_label}</p>
              </div>
              <p className="text-xs text-ink-faint font-mono">dataset label: {record.fault_type}</p>
            </div>
          )}

          {/* Classify button + result */}
          <div className="panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="eyebrow">ML Fault Classification</p>
              <button className="btn-secondary !px-3 !py-1 text-xs" onClick={runClassify} disabled={classifyLoading || !selectedId} id="classify-btn">
                {classifyLoading ? "Running…" : classification ? "Re-run" : "Classify"}
              </button>
            </div>
            {classifyError && <div className="text-xs text-signal-red bg-signal-red/10 border border-signal-red/30 rounded p-2">{classifyError}</div>}
            {classification && (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-display font-semibold text-signal-cyan">{classification.predicted_fault_type_label}</p>
                  <p className="text-sm font-mono text-ink-muted">{(classification.confidence * 100).toFixed(1)}% confidence</p>
                </div>
                <p className="text-xs font-mono text-ink-faint">model: {classification.model} · cv accuracy {(classification.model_cv_accuracy * 100).toFixed(1)}%</p>
                <div className="space-y-1.5 pt-2">
                  {Object.entries(classification.probabilities)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, p]) => (
                      <ProbBar key={type} label={FAULT_TYPE_LABELS[type] || type} prob={p} isTop={type === classification.predicted_fault_type} />
                    ))}
                </div>

                {/* Enhanced result cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border-soft">
                  {[
                    { label: "Fault Type",   value: classification.predicted_fault_type,           color: classification.predicted_fault_type === "NONE" ? "#3ADC8C" : "#FF5470" },
                    { label: "Confidence",   value: `${(classification.confidence*100).toFixed(1)}%`, color: "#2FD9D2" },
                    { label: "Fault Risk",   value: `${risk.toFixed(0)}%`,                         color: riskLevel.color },
                    { label: "Grid Health",  value: `${health}/100`,                               color: health >= 70 ? "#3ADC8C" : health >= 40 ? "#F5A623" : "#FF5470" },
                  ].map((item) => (
                    <div key={item.label} className="bg-bg-raised rounded-lg p-3">
                      <p className="text-[9px] font-mono text-ink-faint uppercase tracking-wider">{item.label}</p>
                      <p className="font-mono font-semibold mt-1" style={{ color: item.color }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Simulated location */}
                {record?.fault_location_pct != null && (
                  <div className="p-3 rounded-lg bg-signal-amber/5 border border-signal-amber/20">
                    <p className="text-[10px] font-mono text-signal-amber mb-1">📍 ESTIMATED FAULT LOCATION (from dataset)</p>
                    <p className="text-sm font-mono text-ink-primary">{record.fault_location_pct}% of transmission line from Bus 1</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Diagnose button + result */}
          <div className="panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="eyebrow">AI Diagnosis & Recommendations</p>
              <button className="btn-primary !px-3 !py-1 text-xs" onClick={runDiagnose} disabled={diagLoading || !classification} id="diagnose-btn">
                {diagLoading ? "Analyzing…" : diagnosis ? "Re-analyze" : "Diagnose"}
              </button>
            </div>
            {!classification && <p className="text-xs text-ink-muted">Run classification first.</p>}
            {diagError && <div className="text-xs text-signal-red bg-signal-red/10 border border-signal-red/30 rounded p-2">{diagError}</div>}
            {diagLoading && (
              <div className="space-y-2 animate-pulse">
                {[3, 4, 5].map((w) => <div key={w} className={`h-3 bg-bg-raised rounded w-${w}/4`} />)}
              </div>
            )}
            {diagnosis && !diagLoading && (
              <div className="space-y-3">
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-ink-primary">{diagnosis.diagnosis}</div>
                {diagnosis.sources?.length > 0 && (
                  <div className="pt-2 border-t border-border-soft">
                    <p className="eyebrow mb-1">Grounded in</p>
                    <div className="flex flex-wrap gap-2">
                      {diagnosis.sources.map((s, i) => (
                        <span key={i} className="text-xs font-mono px-2 py-0.5 rounded bg-bg-raised border border-border text-ink-muted">
                          {s.source} {s.relevance != null ? `· ${(s.relevance * 100).toFixed(0)}%` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* XAI panel */}
          <div className="panel p-4 space-y-3">
            <p className="eyebrow">🔍 Why did GridGuard detect this?</p>
            <p className="text-xs text-ink-muted">Key electrical parameters that contributed to this assessment (based on current scenario):</p>
            <div className="space-y-2">
              {xaiFacts.map((f, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-bg-raised border border-border-soft text-xs">
                  <span className="font-semibold text-ink-primary">{f.name}:</span>
                  <span className="font-mono" style={{ color: { Critical: "#FF5470", High: "#FF8C42", Medium: "#F5A623", Low: "#3ADC8C" }[f.impact] }}>
                    {f.direction} {f.value}
                  </span>
                  <span className="text-ink-muted">— {f.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Waveform preview */}
          {voltageData.length > 0 && (
            <div className="panel p-4">
              <p className="eyebrow mb-3">Phase Voltage Waveform (V)</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={voltageData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#1B2740" strokeDasharray="3 3" />
                  <XAxis dataKey="i" stroke="#5A6B8C" tick={{ fontSize: 9 }} />
                  <YAxis stroke="#5A6B8C" tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ background: "#111A2B", border: "1px solid #233049", fontSize: 10 }} />
                  <Line type="monotone" dataKey="Va" stroke="#2FD9D2" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="Vb" stroke="#F5A623" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="Vc" stroke="#8B7CF6" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
