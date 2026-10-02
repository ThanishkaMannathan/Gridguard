/**
 * Reports.jsx – Engineering report generation.
 * Supports: Word (.docx), Markdown (.md), PDF (backend).
 */
import { useState } from "react";
import {
  computeGridHealth,
  computeFaultRisk,
  getRiskLevel,
  generateXAIFactors,
} from "../simulation.js";
import { api } from "../api.js";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} from "docx";
import { saveAs } from "file-saver";

export default function Reports({ scenario, lastClassification, lastDiagnosis }) {
  const [generating, setGenerating] = useState(false);
  const [genType, setGenType] = useState(null); // "word"|"md"|"pdf"
  const [reportGenerated, setReportGenerated] = useState(false);
  const [includeWaveform, setIncludeWaveform] = useState(true);
  const [includeXAI, setIncludeXAI] = useState(true);

  const health = computeGridHealth(scenario);
  const risk = computeFaultRisk(scenario);
  const riskLevel = getRiskLevel(risk);
  const xaiFacts = generateXAIFactors(scenario);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const now = new Date();
  const timestamp = now.toLocaleString();
  const isoTs = now.toISOString();

  // ── Word Document Generator ────────────────────────────────────────────────
  const downloadWord = async () => {
    setGenerating(true);
    setGenType("word");
    try {
      // colour constants (hex without #)
      const CYAN   = "2FD9D2";
      const AMBER  = "F5A623";
      const RED    = "FF5470";
      const GREEN  = "3ADC8C";
      const DARK   = "0F1829";
      const MUTED  = "64748B";
      const FAULT_COLOR = scenario.faultType && scenario.faultType !== "NONE" ? RED : GREEN;

      // ── helper paragraph builders ──────────────────────────────────────────
      const heading = (text, level = HeadingLevel.HEADING_1) =>
        new Paragraph({
          text,
          heading: level,
          spacing: { before: 300, after: 120 },
          border: level === HeadingLevel.HEADING_1
            ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: CYAN } }
            : {},
        });

      const body = (text, opts = {}) =>
        new Paragraph({
          children: [new TextRun({ text, size: 22, color: "1E293B", ...opts })],
          spacing: { after: 80 },
        });

      const kv = (label, value, valueColor = "1E293B") =>
        new Paragraph({
          children: [
            new TextRun({ text: `${label}: `, bold: true, size: 22, color: MUTED }),
            new TextRun({ text: String(value), size: 22, color: valueColor }),
          ],
          spacing: { after: 80 },
        });

      const spacer = () => new Paragraph({ text: "", spacing: { after: 100 } });

      // ── Table builder ──────────────────────────────────────────────────────
      const makeTable = (headers, rows) =>
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: headers.map((h) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: h, bold: true, size: 20, color: "FFFFFF" })],
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  shading: { type: ShadingType.CLEAR, fill: DARK },
                  margins: { top: 80, bottom: 80, left: 100, right: 100 },
                })
              ),
            }),
            ...rows.map((row, ri) =>
              new TableRow({
                children: row.map((cell) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: String(cell), size: 20, color: "1E293B" })],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    shading: { type: ShadingType.CLEAR, fill: ri % 2 === 0 ? "F8FAFC" : "FFFFFF" },
                    margins: { top: 60, bottom: 60, left: 100, right: 100 },
                  })
                ),
              })
            ),
          ],
        });

      // ── XAI section ────────────────────────────────────────────────────────
      const xaiRows = includeXAI
        ? [
            heading("5. AI Explanation (XAI)", HeadingLevel.HEADING_2),
            body("The following factors influenced the fault risk assessment:"),
            spacer(),
            ...xaiFacts.flatMap((f) => [
              new Paragraph({
                children: [
                  new TextRun({ text: `● ${f.name} `, bold: true, size: 22, color: "1E293B" }),
                  new TextRun({ text: `[${f.impact}] `, size: 22, color: f.impact === "Critical" ? RED : f.impact === "High" ? "FF8C42" : f.impact === "Medium" ? AMBER : GREEN }),
                  new TextRun({ text: `${f.direction} ${f.value}`, size: 22, color: MUTED }),
                  new TextRun({ text: ` — ${f.description}`, size: 22, color: "1E293B" }),
                ],
                spacing: { after: 80 },
              }),
            ]),
            spacer(),
          ]
        : [];

      // ── Backend diagnosis section ──────────────────────────────────────────
      const diagRows = lastDiagnosis
        ? [
            heading("6. AI Diagnosis (Backend)", HeadingLevel.HEADING_2),
            body(lastDiagnosis.diagnosis || "No diagnosis text available."),
            spacer(),
          ]
        : [];

      // ── Build Document ─────────────────────────────────────────────────────
      const doc = new Document({
        creator: "GridGuard v2.0",
        title: "GridGuard Fault Analysis Report",
        description: "AI Power System Fault Diagnosis Report",
        styles: {
          default: {
            document: {
              run: { font: "Calibri", size: 22 },
            },
          },
          paragraphStyles: [
            {
              id: "Heading1",
              name: "Heading 1",
              basedOn: "Normal",
              next: "Normal",
              run: { bold: true, size: 32, color: DARK, font: "Calibri" },
              paragraph: { spacing: { before: 400, after: 200 } },
            },
            {
              id: "Heading2",
              name: "Heading 2",
              basedOn: "Normal",
              next: "Normal",
              run: { bold: true, size: 26, color: "334155", font: "Calibri" },
              paragraph: { spacing: { before: 300, after: 120 } },
            },
          ],
        },
        sections: [
          {
            headers: {
              default: new Header({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: "⚡ GRIDGUARD  |  AI Power System Fault Diagnosis", size: 18, color: MUTED }),
                      new TextRun({ text: "        ", size: 18 }),
                      new TextRun({ text: "SIMULATION MODE 🧪", size: 18, color: AMBER, bold: true }),
                    ],
                    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" } },
                    spacing: { after: 100 },
                  }),
                ],
              }),
            },
            footers: {
              default: new Footer({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: `Generated: ${isoTs}  |  GridGuard v2.0  |  Simulation data only — not real grid measurements.`, size: 16, color: MUTED }),
                    ],
                    border: { top: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" } },
                    spacing: { before: 100 },
                  }),
                ],
              }),
            },
            children: [
              // ── Cover ─────────────────────────────────────────────────────
              new Paragraph({
                children: [new TextRun({ text: "GridGuard", bold: true, size: 72, color: CYAN })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 600, after: 200 },
              }),
              new Paragraph({
                children: [new TextRun({ text: "Fault Analysis Report", size: 40, color: DARK })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
              }),
              new Paragraph({
                children: [new TextRun({ text: timestamp, size: 22, color: MUTED })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 600 },
              }),

              // ── 1. Summary ────────────────────────────────────────────────
              heading("1. Executive Summary"),
              kv("Grid Health Score", `${health} / 100`, health >= 70 ? GREEN : health >= 40 ? AMBER : RED),
              kv("Fault Risk",        `${risk.toFixed(0)}%`, riskLevel.color?.replace("#","") || RED),
              kv("Risk Level",        riskLevel.label),
              kv("Fault Type",        scenario.faultType || "NONE", FAULT_COLOR),
              kv("Affected Phase",    scenario.affectedPhase || "None", AMBER),
              kv("Severity",          scenario.severity || "Normal"),
              kv("Fault Location",    scenario.faultLocation != null ? `${scenario.faultLocation.toFixed(1)}% of line (SIMULATED)` : "N/A"),
              spacer(),

              // ── 2. Input Parameters ───────────────────────────────────────
              heading("2. Input Parameters"),
              makeTable(
                ["Parameter", "Phase A", "Phase B", "Phase C"],
                [
                  ["Voltage (V)", scenario.Va, scenario.Vb, scenario.Vc],
                  ["Current (A)", scenario.Ia, scenario.Ib, scenario.Ic],
                  ["Frequency (Hz)", scenario.frequency, "—", "—"],
                  ["Power Factor", scenario.powerFactor, "—", "—"],
                  ["V-Unbalance (%)", scenario.voltageUnbalance ?? "—", "—", "—"],
                  ["I-Unbalance (%)", scenario.currentUnbalance ?? "—", "—", "—"],
                ]
              ),
              spacer(),

              // ── 3. Fault Analysis ─────────────────────────────────────────
              heading("3. Fault Analysis"),
              makeTable(
                ["Property", "Value"],
                [
                  ["Fault Type",     scenario.faultType || "NONE"],
                  ["Affected Phase", scenario.affectedPhase || "None"],
                  ["Severity",       scenario.severity || "Normal"],
                  ["Fault Location", scenario.faultLocation != null ? `${scenario.faultLocation.toFixed(1)}% (SIMULATED)` : "N/A"],
                  ["Confidence",     scenario.confidence != null ? `${(scenario.confidence * 100).toFixed(1)}%` : "N/A"],
                ]
              ),
              spacer(),

              // ── 4. Grid Health ────────────────────────────────────────────
              heading("4. Grid Health Assessment"),
              makeTable(
                ["Metric", "Value"],
                [
                  ["Grid Health Score", `${health} / 100`],
                  ["Fault Risk",        `${risk.toFixed(1)}%`],
                  ["Risk Level",        riskLevel.label],
                  ["Active Power (kW)", scenario.activePower != null ? `${scenario.activePower.toFixed(1)} kW` : "—"],
                  ["Reactive Power (kVAR)", scenario.reactivePower != null ? `${scenario.reactivePower.toFixed(1)} kVAR` : "—"],
                  ["Power Factor",      scenario.powerFactor ?? "—"],
                ]
              ),
              spacer(),

              // ── 5. XAI ────────────────────────────────────────────────────
              ...xaiRows,

              // ── 6. AI Diagnosis ───────────────────────────────────────────
              ...diagRows,

              // ── Disclaimer ────────────────────────────────────────────────
              heading("Disclaimer", HeadingLevel.HEADING_2),
              body(
                "This report was generated by GridGuard v2.0 in SIMULATION MODE. " +
                "All parameter values and fault assessments are simulated and do NOT " +
                "represent actual grid measurements. GridGuard's diagnosis and " +
                "recommendations are decision support only and do not replace utility " +
                "protection engineering review or applicable safety/regulatory requirements."
              ),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `GridGuard_Report_${Date.now()}.docx`);
      setReportGenerated(true);
    } catch (e) {
      console.error("Word export error:", e);
      alert("Word export failed: " + e.message);
    } finally {
      setGenerating(false);
      setGenType(null);
    }
  };

  // ── Markdown Download ───────────────────────────────────────────────────────
  const downloadMarkdown = () => {
    setGenerating(true);
    setGenType("md");
    try {
      const lines = [];
      lines.push("# GridGuard Fault Report");
      lines.push(`\n**Generated:** ${isoTs}`);
      lines.push(`**Source:** Simulation Mode 🧪\n\n---\n`);
      lines.push("## 1. Executive Summary");
      lines.push(`- **Grid Health Score:** ${health}/100`);
      lines.push(`- **Fault Risk:** ${risk.toFixed(0)}%  —  ${riskLevel.label}`);
      lines.push(`- **Fault Type:** ${scenario.faultType || "NONE"}`);
      lines.push(`- **Affected Phase:** ${scenario.affectedPhase || "None"}`);
      lines.push(`- **Severity:** ${scenario.severity || "Normal"}`);
      lines.push(`- **Fault Location:** ${scenario.faultLocation != null ? scenario.faultLocation.toFixed(1) + "% of line (SIMULATED)" : "N/A"}`);
      lines.push("\n## 2. Input Parameters");
      lines.push("| Parameter | Phase A | Phase B | Phase C |");
      lines.push("|---|---|---|---|");
      lines.push(`| Voltage (V) | ${scenario.Va} | ${scenario.Vb} | ${scenario.Vc} |`);
      lines.push(`| Current (A) | ${scenario.Ia} | ${scenario.Ib} | ${scenario.Ic} |`);
      lines.push(`| Frequency (Hz) | ${scenario.frequency} | | |`);
      lines.push(`| Power Factor | ${scenario.powerFactor} | | |`);
      lines.push("\n## 3. Grid Health");
      lines.push(`- **Grid Health Score:** ${health}/100`);
      lines.push(`- **Fault Risk:** ${risk.toFixed(0)}%`);
      lines.push(`- **Risk Level:** ${riskLevel.label}`);
      if (includeXAI) {
        lines.push("\n## 4. AI Explanation");
        xaiFacts.forEach((f) =>
          lines.push(`- **${f.name}** [${f.impact}]: ${f.direction} ${f.value} — ${f.description}`)
        );
      }
      if (lastDiagnosis) {
        lines.push("\n## 5. AI Diagnosis (Backend)");
        lines.push(lastDiagnosis.diagnosis || "No diagnosis text.");
      }
      lines.push("\n---\n*Simulation data only. Not real grid measurements.*");

      const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GridGuard_Report_${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);
      setReportGenerated(true);
    } finally {
      setGenerating(false);
      setGenType(null);
    }
  };

  // ── PDF via backend ─────────────────────────────────────────────────────────
  const downloadPDF = async () => {
    if (!lastClassification?.record_id) return;
    setGenerating(true);
    setGenType("pdf");
    try {
      await api.downloadReportPdf(lastClassification.record_id, lastDiagnosis);
      setReportGenerated(true);
    } catch (e) {
      console.error(e);
      alert("PDF download failed: " + e.message);
    } finally {
      setGenerating(false);
      setGenType(null);
    }
  };

  const health_color = health >= 70 ? "#3ADC8C" : health >= 40 ? "#F5A623" : "#FF5470";

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-xl">Engineering Report</h2>
          <p className="text-xs text-ink-muted mt-1">Generate and download a professional fault analysis report</p>
        </div>
        {/* Primary CTA — Word */}
        <button
          className="btn-primary"
          onClick={downloadWord}
          disabled={generating}
          id="generate-report-btn"
        >
          {generating && genType === "word" ? "⏳ Generating…" : "📝 Download Word Report"}
        </button>
      </div>

      {reportGenerated && (
        <div className="px-4 py-3 rounded-lg bg-signal-green/10 border border-signal-green/30 text-signal-green text-sm">
          ✅ Report generated and downloaded successfully!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Report preview */}
        <div className="space-y-4">
          <div className="panel p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-soft">
              <svg width="28" height="20" viewBox="0 0 44 30">
                <path d="M0 15 Q 5.5 2, 11 15 T 22 15" fill="none" stroke="#2FD9D2" strokeWidth="2" />
                <path d="M0 15 Q 5.5 22, 11 15 T 22 15 T 33 15" fill="none" stroke="#F5A623" strokeWidth="2" opacity="0.8" />
                <path d="M0 15 Q 5.5 9, 11 15 T 22 15 T 33 15 T 44 15" fill="none" stroke="#8B7CF6" strokeWidth="2" opacity="0.65" />
              </svg>
              <div>
                <p className="font-display font-bold text-base">GridGuard Fault Report</p>
                <p className="text-[10px] font-mono text-ink-faint">Generated: {timestamp}</p>
              </div>
              <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded bg-signal-amber/10 border border-signal-amber/30 text-signal-amber">🧪 SIMULATION</span>
            </div>

            {/* Input params */}
            <div className="mb-4">
              <p className="eyebrow mb-2">Input Parameters</p>
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-ink-faint">
                    <td className="py-1">Parameter</td>
                    <td className="py-1 text-signal-cyan">Phase A</td>
                    <td className="py-1 text-signal-amber">Phase B</td>
                    <td className="py-1 text-signal-violet">Phase C</td>
                  </tr>
                </thead>
                <tbody className="text-ink-primary">
                  <tr><td className="py-0.5 text-ink-muted">Voltage (V)</td><td>{scenario.Va}</td><td>{scenario.Vb}</td><td>{scenario.Vc}</td></tr>
                  <tr><td className="py-0.5 text-ink-muted">Current (A)</td><td>{scenario.Ia}</td><td>{scenario.Ib}</td><td>{scenario.Ic}</td></tr>
                  <tr><td className="py-0.5 text-ink-muted">Frequency (Hz)</td><td colSpan={3}>{scenario.frequency}</td></tr>
                  <tr><td className="py-0.5 text-ink-muted">Power Factor</td><td colSpan={3}>{scenario.powerFactor}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Fault analysis */}
            <div className="mb-4">
              <p className="eyebrow mb-2">Fault Analysis</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Fault Type",    value: scenario.faultType || "NONE",       color: scenario.faultType && scenario.faultType !== "NONE" ? "#FF5470" : "#3ADC8C" },
                  { label: "Affected Phase",value: scenario.affectedPhase || "None",   color: "#F5A623" },
                  { label: "Severity",      value: scenario.severity || "Normal",      color: riskLevel.color },
                  { label: "Location",      value: scenario.faultLocation != null ? `${scenario.faultLocation.toFixed(1)}% (SIM)` : "N/A", color: "#2FD9D2" },
                ].map((item) => (
                  <div key={item.label} className="bg-bg-raised rounded p-2">
                    <p className="text-[9px] text-ink-faint">{item.label}</p>
                    <p className="font-mono text-sm font-semibold mt-0.5" style={{ color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid health */}
            <div className="mb-4">
              <p className="eyebrow mb-2">Grid Health</p>
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-mono font-bold text-3xl" style={{ color: health_color }}>{health}</p>
                  <p className="text-[10px] text-ink-faint">/ 100</p>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ink-muted">Fault Risk</span>
                    <span className="font-mono" style={{ color: riskLevel.color }}>{risk.toFixed(0)}% — {riskLevel.label}</span>
                  </div>
                  <div className="h-2 rounded-full bg-bg-raised overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${risk}%`, background: riskLevel.color }} />
                  </div>
                </div>
              </div>
            </div>

            {lastDiagnosis && (
              <div className="mb-4">
                <p className="eyebrow mb-2">AI Diagnosis</p>
                <div className="text-xs text-ink-muted leading-relaxed whitespace-pre-wrap bg-bg-raised rounded p-3 max-h-40 overflow-y-auto">
                  {lastDiagnosis.diagnosis}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Options + Export buttons */}
        <div className="space-y-4">
          <div className="panel p-5">
            <p className="eyebrow mb-3">Report Options</p>
            <div className="space-y-3">
              {[
                { id: "opt-waveform", label: "Include Waveform Note",   value: includeWaveform, set: setIncludeWaveform },
                { id: "opt-xai",     label: "Include AI Explanation",   value: includeXAI,      set: setIncludeXAI },
              ].map((opt) => (
                <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={`w-10 h-5 rounded-full transition-all relative ${opt.value ? "bg-signal-cyan" : "bg-bg-raised border border-border"}`}
                    onClick={() => opt.set(!opt.value)}
                    id={opt.id}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${opt.value ? "left-5" : "left-0.5"}`} />
                  </div>
                  <span className="text-sm text-ink-primary">{opt.label}</span>
                </label>
              ))}
            </div>

            {/* Export buttons */}
            <div className="mt-5 pt-4 border-t border-border-soft">
              <p className="eyebrow mb-3">Export Formats</p>
              <div className="flex flex-col gap-2">

                {/* Word — primary */}
                <button
                  className="btn-primary flex items-center gap-2 justify-center"
                  onClick={downloadWord}
                  disabled={generating}
                  id="download-word-btn"
                >
                  <span>📝</span>
                  <span>{generating && genType === "word" ? "Generating Word…" : "Download Word (.docx)"}</span>
                </button>

                {/* Markdown */}
                <button
                  className="btn-ghost flex items-center gap-2 justify-center"
                  onClick={downloadMarkdown}
                  disabled={generating}
                  id="download-md-btn"
                >
                  <span>📄</span>
                  <span>{generating && genType === "md" ? "Generating…" : "Download Markdown (.md)"}</span>
                </button>

                {/* PDF — only if backend record is available */}
                {lastClassification?.record_id && (
                  <button
                    className="btn-ghost flex items-center gap-2 justify-center"
                    onClick={downloadPDF}
                    disabled={generating}
                    id="download-pdf-btn"
                  >
                    <span>🖨️</span>
                    <span>{generating && genType === "pdf" ? "Generating PDF…" : "Download PDF (backend)"}</span>
                  </button>
                )}
              </div>

              <p className="text-[10px] font-mono text-ink-faint mt-3">
                Word & Markdown export work offline. PDF requires backend connection.
              </p>
            </div>
          </div>

          {/* XAI section */}
          {includeXAI && (
            <div className="panel p-5">
              <p className="eyebrow mb-3">AI Explanation (XAI)</p>
              <div className="space-y-2">
                {xaiFacts.map((f, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-bg-raised border border-border-soft text-xs">
                    <span className="font-semibold text-ink-primary">{f.name}: </span>
                    <span className="font-mono" style={{ color: { Critical: "#FF5470", High: "#FF8C42", Medium: "#F5A623", Low: "#3ADC8C" }[f.impact] }}>
                      {f.direction} {f.value}
                    </span>
                    <span className="text-ink-muted"> — {f.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
