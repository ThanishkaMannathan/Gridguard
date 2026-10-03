/**
 * Reports.jsx – Engineering report generation.
 * Supports: PDF (jsPDF, browser-native), Markdown (.md), PDF (backend).
 */
import { useState } from "react";
import {
  computeGridHealth,
  computeFaultRisk,
  getRiskLevel,
  generateXAIFactors,
} from "../simulation.js";
import { api } from "../api.js";
import { jsPDF } from "jspdf";

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

  // ── PDF Document Generator (jsPDF — 100% browser-native) ──────────────────
  const downloadPDFReport = async () => {
    setGenerating(true);
    setGenType("pdf");
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210; // A4 width mm
      const MARGIN = 18;
      const CONTENT_W = W - MARGIN * 2;
      let y = 0;

      // ── colour helpers (RGB arrays) ────────────────────────────────────────
      const C = {
        cyan:   [47, 217, 210],
        amber:  [245, 166, 35],
        red:    [255, 84, 112],
        green:  [58, 220, 140],
        dark:   [15, 24, 41],
        ink:    [30, 41, 59],
        muted:  [100, 116, 139],
        white:  [255, 255, 255],
        light:  [248, 250, 252],
        border: [226, 232, 240],
      };
      const hasFault = scenario.faultType && scenario.faultType !== "NONE";
      const faultColor = hasFault ? C.red : C.green;

      const setColor  = (rgb) => doc.setTextColor(...rgb);
      const setFill   = (rgb) => doc.setFillColor(...rgb);
      const setDraw   = (rgb) => doc.setDrawColor(...rgb);

      const needPage = (needed = 20) => {
        if (y + needed > 275) { doc.addPage(); y = MARGIN; addPageHeader(); }
      };

      const addPageHeader = () => {
        doc.setFontSize(7.5);
        setColor(C.muted);
        doc.text("⚡ GRIDGUARD  |  AI Power System Fault Diagnosis", MARGIN, 10);
        doc.text("SIMULATION MODE", W - MARGIN, 10, { align: "right" });
        setDraw(C.border);
        doc.line(MARGIN, 12, W - MARGIN, 12);
      };

      const addPageFooter = () => {
        setDraw(C.border);
        doc.line(MARGIN, 285, W - MARGIN, 285);
        doc.setFontSize(7);
        setColor(C.muted);
        doc.text(`Generated: ${isoTs}  |  GridGuard v2.0  |  Simulation data only`, MARGIN, 290);
        doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, W - MARGIN, 290, { align: "right" });
      };

      // ── Cover Page ─────────────────────────────────────────────────────────
      setFill(C.dark);
      doc.rect(0, 0, W, 297, "F");

      // Accent bar
      setFill(C.cyan);
      doc.rect(0, 0, 6, 297, "F");

      // Logo / Brand
      doc.setFontSize(48);
      doc.setFont("helvetica", "bold");
      setColor(C.cyan);
      doc.text("GridGuard", W / 2, 100, { align: "center" });

      doc.setFontSize(20);
      doc.setFont("helvetica", "normal");
      setColor(C.white);
      doc.text("Fault Analysis Report", W / 2, 118, { align: "center" });

      doc.setFontSize(11);
      setColor(C.muted);
      doc.text(timestamp, W / 2, 132, { align: "center" });

      // Badge
      setFill(C.amber);
      doc.roundedRect(W / 2 - 28, 142, 56, 10, 2, 2, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      setColor(C.dark);
      doc.text("🧪 SIMULATION MODE", W / 2, 148.5, { align: "center" });

      // Stats row
      const stats = [
        { label: "Grid Health", value: `${health}/100`, color: health >= 70 ? C.green : health >= 40 ? C.amber : C.red },
        { label: "Fault Risk",  value: `${risk.toFixed(0)}%`,  color: hasFault ? C.red : C.green },
        { label: "Fault Type",  value: scenario.faultType || "NONE", color: faultColor },
      ];
      stats.forEach((s, i) => {
        const bx = MARGIN + i * (CONTENT_W / 3);
        setFill([255,255,255,0.05]);
        doc.setAlpha ? null : null;
        setFill([30, 40, 60]);
        doc.roundedRect(bx, 165, CONTENT_W / 3 - 4, 22, 3, 3, "F");
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        setColor(s.color);
        doc.text(s.value, bx + (CONTENT_W / 3 - 4) / 2, 177, { align: "center" });
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        setColor(C.muted);
        doc.text(s.label, bx + (CONTENT_W / 3 - 4) / 2, 183, { align: "center" });
      });

      addPageFooter();

      // ── Page 2+ ─────────────────────────────────────────────────────────────
      doc.addPage();
      y = MARGIN + 5;
      addPageHeader();

      // Section heading helper
      const sectionHeading = (text) => {
        needPage(16);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        setColor(C.dark);
        doc.text(text, MARGIN, y);
        setDraw(C.cyan);
        doc.setLineWidth(0.7);
        doc.line(MARGIN, y + 1.5, W - MARGIN, y + 1.5);
        doc.setLineWidth(0.2);
        y += 10;
      };

      // Key-value row helper
      const kvRow = (label, value, valueRgb = C.ink) => {
        needPage(8);
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "bold");
        setColor(C.muted);
        doc.text(label + ":", MARGIN, y);
        doc.setFont("helvetica", "normal");
        setColor(valueRgb);
        doc.text(String(value), MARGIN + 52, y);
        y += 7;
      };

      // Table helper
      const drawTable = (headers, rows) => {
        needPage(12 + rows.length * 8);
        const colW = CONTENT_W / headers.length;
        // Header row
        setFill(C.dark);
        doc.rect(MARGIN, y, CONTENT_W, 9, "F");
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        setColor(C.white);
        headers.forEach((h, i) => doc.text(h, MARGIN + i * colW + colW / 2, y + 6, { align: "center" }));
        y += 9;
        // Data rows
        rows.forEach((row, ri) => {
          needPage(8);
          setFill(ri % 2 === 0 ? C.light : C.white);
          doc.rect(MARGIN, y, CONTENT_W, 8, "F");
          setDraw(C.border);
          doc.rect(MARGIN, y, CONTENT_W, 8, "S");
          doc.setFont("helvetica", "normal");
          setColor(C.ink);
          row.forEach((cell, ci) => doc.text(String(cell ?? "—"), MARGIN + ci * colW + colW / 2, y + 5.5, { align: "center" }));
          y += 8;
        });
        y += 5;
      };

      // ── 1. Executive Summary ───────────────────────────────────────────────
      sectionHeading("1. Executive Summary");
      kvRow("Grid Health Score", `${health} / 100`, health >= 70 ? C.green : health >= 40 ? C.amber : C.red);
      kvRow("Fault Risk",        `${risk.toFixed(0)}%`, hasFault ? C.red : C.green);
      kvRow("Risk Level",        riskLevel.label);
      kvRow("Fault Type",        scenario.faultType || "NONE", faultColor);
      kvRow("Affected Phase",    scenario.affectedPhase || "None", C.amber);
      kvRow("Severity",          scenario.severity || "Normal");
      kvRow("Fault Location",    scenario.faultLocation != null ? `${scenario.faultLocation.toFixed(1)}% of line (SIMULATED)` : "N/A");
      y += 3;

      // ── 2. Input Parameters ───────────────────────────────────────────────
      sectionHeading("2. Input Parameters");
      drawTable(
        ["Parameter", "Phase A", "Phase B", "Phase C"],
        [
          ["Voltage (V)",      scenario.Va,          scenario.Vb,  scenario.Vc],
          ["Current (A)",      scenario.Ia,          scenario.Ib,  scenario.Ic],
          ["Frequency (Hz)",   scenario.frequency,   "—",          "—"],
          ["Power Factor",     scenario.powerFactor, "—",          "—"],
          ["V-Unbalance (%)",  scenario.voltageUnbalance ?? "—", "—", "—"],
          ["I-Unbalance (%)",  scenario.currentUnbalance  ?? "—", "—", "—"],
        ]
      );

      // ── 3. Fault Analysis ─────────────────────────────────────────────────
      sectionHeading("3. Fault Analysis");
      drawTable(
        ["Property", "Value"],
        [
          ["Fault Type",     scenario.faultType || "NONE"],
          ["Affected Phase", scenario.affectedPhase || "None"],
          ["Severity",       scenario.severity || "Normal"],
          ["Fault Location", scenario.faultLocation != null ? `${scenario.faultLocation.toFixed(1)}% (SIMULATED)` : "N/A"],
          ["Confidence",     scenario.confidence != null ? `${(scenario.confidence * 100).toFixed(1)}%` : "N/A"],
        ]
      );

      // ── 4. Grid Health Assessment ─────────────────────────────────────────
      sectionHeading("4. Grid Health Assessment");
      drawTable(
        ["Metric", "Value"],
        [
          ["Grid Health Score",    `${health} / 100`],
          ["Fault Risk",           `${risk.toFixed(1)}%`],
          ["Risk Level",           riskLevel.label],
          ["Active Power (kW)",    scenario.activePower    != null ? `${scenario.activePower.toFixed(1)} kW`    : "—"],
          ["Reactive Power (kVAR)",scenario.reactivePower  != null ? `${scenario.reactivePower.toFixed(1)} kVAR` : "—"],
          ["Power Factor",         scenario.powerFactor ?? "—"],
        ]
      );

      // ── 5. AI Explanation (XAI) ───────────────────────────────────────────
      if (includeXAI) {
        sectionHeading("5. AI Explanation (XAI)");
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        setColor(C.ink);
        doc.text("The following factors influenced the fault risk assessment:", MARGIN, y);
        y += 8;
        xaiFacts.forEach((f) => {
          needPage(10);
          const impactColor = f.impact === "Critical" ? C.red : f.impact === "High" ? [255, 140, 66] : f.impact === "Medium" ? C.amber : C.green;
          doc.setFont("helvetica", "bold"); setColor(C.ink);
          doc.text(`● ${f.name}`, MARGIN, y);
          const nameW = doc.getTextWidth(`● ${f.name}`) + 3;
          doc.setFont("helvetica", "bold"); setColor(impactColor);
          doc.text(`[${f.impact}]`, MARGIN + nameW, y);
          const impW = doc.getTextWidth(`[${f.impact}]`) + 3;
          doc.setFont("helvetica", "normal"); setColor(C.muted);
          const rest = `${f.direction} ${f.value} — ${f.description}`;
          const lines = doc.splitTextToSize(rest, CONTENT_W - nameW - impW - 5);
          doc.text(lines, MARGIN + nameW + impW, y);
          y += Math.max(7, lines.length * 5);
        });
        y += 3;
      }

      // ── 6. AI Diagnosis (Backend) ─────────────────────────────────────────
      if (lastDiagnosis) {
        sectionHeading("6. AI Diagnosis (Backend)");
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        setColor(C.ink);
        const diagText = lastDiagnosis.diagnosis || "No diagnosis text available.";
        const diagLines = doc.splitTextToSize(diagText, CONTENT_W);
        diagLines.forEach((line) => { needPage(7); doc.text(line, MARGIN, y); y += 6; });
        y += 3;
      }

      // ── Disclaimer ────────────────────────────────────────────────────────
      sectionHeading("Disclaimer");
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      setColor(C.muted);
      const disclaimer =
        "This report was generated by GridGuard v2.0 in SIMULATION MODE. " +
        "All parameter values and fault assessments are simulated and do NOT " +
        "represent actual grid measurements. GridGuard's diagnosis and " +
        "recommendations are decision support only and do not replace utility " +
        "protection engineering review or applicable safety/regulatory requirements.";
      const discLines = doc.splitTextToSize(disclaimer, CONTENT_W);
      discLines.forEach((line) => { needPage(7); doc.text(line, MARGIN, y); y += 6; });

      // Add footer to every content page
      const totalPages = doc.getNumberOfPages();
      for (let p = 2; p <= totalPages; p++) {
        doc.setPage(p);
        addPageFooter();
      }

      // ── Save ──────────────────────────────────────────────────────────────
      doc.save(`GridGuard_Report_${Date.now()}.pdf`);
      setReportGenerated(true);
    } catch (e) {
      console.error("PDF export error:", e);
      alert("PDF export failed: " + e.message);
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
        {/* Primary CTA — PDF */}
        <button
          className="btn-primary"
          onClick={downloadPDFReport}
          disabled={generating}
          id="generate-report-btn"
        >
          {generating && genType === "pdf" ? "⏳ Generating…" : "📄 Download PDF Report"}
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

                {/* PDF — primary */}
                <button
                  className="btn-primary flex items-center gap-2 justify-center"
                  onClick={downloadPDFReport}
                  disabled={generating}
                  id="download-pdf-report-btn"
                >
                  <span>📄</span>
                  <span>{generating && genType === "pdf" ? "Generating PDF…" : "Download PDF (.pdf)"}</span>
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
                PDF &amp; Markdown export work offline. Backend PDF requires connection.
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
