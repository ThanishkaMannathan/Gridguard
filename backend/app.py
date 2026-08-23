"""
GridGuard backend -- Flask REST API.

Endpoints:
  GET  /api/health
  GET  /api/records                 list fault records (summary)
  GET  /api/records/<record_id>     full record incl. waveform samples
  POST /api/classify/<record_id>    run ML fault classifier
  POST /api/diagnose/<record_id>    RAG-grounded AI diagnosis + recommendations
  GET  /api/report/<record_id>      generate a full markdown fault report
  POST /api/chat                    freeform Q&A grounded in the protection KB
"""
import os
import io
import json
import textwrap
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from utils.nvidia_client import chat_complete  # noqa: E402
from rag.retrieve import retrieve as rag_retrieve  # noqa: E402

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_CSV = os.path.join(BASE_DIR, "data", "fault_dataset.csv")
WAVEFORMS_JSON = os.path.join(BASE_DIR, "data", "waveforms.json")
MODEL_PATH = os.path.join(BASE_DIR, "ml", "fault_classifier.joblib")

FAULT_TYPE_LABELS = {
    "NONE": "No Fault (healthy)",
    "LG": "Single Line-to-Ground",
    "LL": "Line-to-Line",
    "LLG": "Double Line-to-Ground",
    "LLL": "Three-Phase (symmetrical)",
    "LLLG": "Three-Phase-to-Ground",
}

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Lazy-loaded shared resources
# ---------------------------------------------------------------------------
_df = None
_waveforms = None
_model_bundle = None


def get_df():
    global _df
    if _df is None:
        if not os.path.exists(DATA_CSV):
            raise RuntimeError("Dataset not found. Run backend/data/generate_synthetic_data.py")
        _df = pd.read_csv(DATA_CSV)
    return _df


def get_waveforms():
    global _waveforms
    if _waveforms is None:
        with open(WAVEFORMS_JSON) as f:
            _waveforms = json.load(f)
    return _waveforms


def get_model_bundle():
    global _model_bundle
    if _model_bundle is None:
        if not os.path.exists(MODEL_PATH):
            raise RuntimeError("Model not found. Run backend/ml/train_classifier.py")
        _model_bundle = joblib.load(MODEL_PATH)
    return _model_bundle


def get_record_row(record_id):
    df = get_df()
    row = df[df["record_id"] == record_id]
    if row.empty:
        return None
    return row.iloc[0]


def classify_row(row):
    bundle = get_model_bundle()
    features = bundle["feature_names"]
    X = row[features].values.reshape(1, -1).astype(float)
    if bundle["needs_scaling"]:
        X = bundle["scaler"].transform(X)
    model = bundle["model"]
    pred_idx = model.predict(X)[0]
    proba = model.predict_proba(X)[0]
    le = bundle["label_encoder"]
    pred_label = le.inverse_transform([pred_idx])[0]
    probabilities = {
        le.inverse_transform([i])[0]: round(float(p), 4)
        for i, p in enumerate(proba)
    }
    return pred_label, probabilities


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "GridGuard backend",
        "time": datetime.now(timezone.utc).isoformat(),
        "nvidia_api_key_configured": bool(os.environ.get("NVIDIA_API_KEY")),
    })


@app.route("/api/records", methods=["GET"])
def list_records():
    df = get_df()
    fault_type = request.args.get("fault_type")
    limit = int(request.args.get("limit", 100))
    offset = int(request.args.get("offset", 0))

    filtered = df if not fault_type else df[df["fault_type"] == fault_type]
    total = len(filtered)
    page = filtered.iloc[offset: offset + limit]

    records = []
    for _, r in page.iterrows():
        records.append({
            "record_id": r["record_id"],
            "fault_type": r["fault_type"],
            "fault_type_label": FAULT_TYPE_LABELS.get(r["fault_type"], r["fault_type"]),
            "frequency_hz": r["frequency_hz"],
            "voltage_unbalance_pct": r["voltage_unbalance_pct"],
            "current_unbalance_pct": r["current_unbalance_pct"],
        })
    return jsonify({
        "total": total,
        "limit": limit,
        "offset": offset,
        "fault_types": sorted(df["fault_type"].unique().tolist()),
        "records": records,
    })


@app.route("/api/records/<record_id>", methods=["GET"])
def get_record(record_id):
    row = get_record_row(record_id)
    if row is None:
        return jsonify({"error": f"record '{record_id}' not found"}), 404

    waveforms = get_waveforms()
    wf = waveforms.get(record_id)

    record = row.to_dict()
    record["fault_type_label"] = FAULT_TYPE_LABELS.get(record["fault_type"], record["fault_type"])
    record["waveform"] = wf
    return jsonify(record)


@app.route("/api/classify/<record_id>", methods=["POST"])
def classify_record(record_id):
    row = get_record_row(record_id)
    if row is None:
        return jsonify({"error": f"record '{record_id}' not found"}), 404

    pred_label, probabilities = classify_row(row)
    bundle = get_model_bundle()
    return jsonify({
        "record_id": record_id,
        "predicted_fault_type": pred_label,
        "predicted_fault_type_label": FAULT_TYPE_LABELS.get(pred_label, pred_label),
        "confidence": probabilities.get(pred_label),
        "probabilities": probabilities,
        "actual_fault_type": row["fault_type"],
        "model": bundle["model_name"],
        "model_cv_accuracy": bundle["cv_accuracy"],
    })


SAFETY_DISCLAIMER = (
    "\n\n---\n**Safety Notice:** This output is decision support only. "
    "It does not replace utility protection engineering review or established safety procedures."
)


def build_diagnosis_prompt(row, pred_label, probabilities, retrieved_chunks):
    context = "\n\n---\n\n".join(
        f"[Source: {c['source']}]\n{c['text']}" for c in retrieved_chunks
    )
    record_summary = (
        f"Record ID: {row['record_id']}\n"
        f"Fault type: {FAULT_TYPE_LABELS.get(pred_label, pred_label)} ({pred_label}), "
        f"confidence {probabilities.get(pred_label, 0) * 100:.1f}%\n"
        f"Voltages (V): A={row['Va_rms']} B={row['Vb_rms']} C={row['Vc_rms']}\n"
        f"Currents (A): A={row['Ia_rms']} B={row['Ib_rms']} C={row['Ic_rms']}\n"
        f"Freq: {row['frequency_hz']} Hz | V-unbal: {row['voltage_unbalance_pct']}% | "
        f"I-unbal: {row['current_unbalance_pct']}%"
    )
    system_prompt = (
        "You are GridGuard, a power-system protection AI. "
        "Answer using only the provided guideline excerpts. Be concise and technical."
    )
    user_prompt = (
        f"FAULT RECORD:\n{record_summary}\n\n"
        f"GUIDELINE EXCERPTS:\n{context}\n\n"
        "Reply in EXACTLY this format (under 150 words total):\n"
        "**Diagnosis:** <one sentence>\n"
        "**Likely Cause:** <one sentence>\n"
        "**Corrective Actions:**\n- <action 1>\n- <action 2>\n- <action 3 if needed>\n"
        "**Reclose Guidance:** <one sentence>"
    )
    return system_prompt, user_prompt


# ---------------------------------------------------------------------------
# PDF report renderer
# ---------------------------------------------------------------------------

def render_report_pdf(report_data):
    """Build a formatted PDF from report_data dict and return bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    # Custom styles
    title_style = ParagraphStyle(
        "GGTitle", parent=styles["Title"],
        fontSize=18, spaceAfter=6, textColor=colors.HexColor("#1e3a5f")
    )
    h2_style = ParagraphStyle(
        "GGH2", parent=styles["Heading2"],
        fontSize=12, spaceBefore=12, spaceAfter=4,
        textColor=colors.HexColor("#1e3a5f")
    )
    body_style = ParagraphStyle(
        "GGBody", parent=styles["Normal"],
        fontSize=9, leading=13, spaceAfter=4
    )
    meta_style = ParagraphStyle(
        "GGMeta", parent=styles["Normal"],
        fontSize=8, textColor=colors.HexColor("#555555"), spaceAfter=2
    )
    warn_style = ParagraphStyle(
        "GGWarn", parent=styles["Normal"],
        fontSize=8, textColor=colors.HexColor("#7a5200"),
        backColor=colors.HexColor("#fff8e1"), leading=12,
        leftIndent=6, rightIndent=6, borderPad=4
    )

    row = report_data["row"]
    pred_label = report_data["pred_label"]
    probabilities = report_data["probabilities"]
    diagnosis_text = report_data.get("diagnosis_text")
    sources = report_data.get("sources", [])
    generated_at = report_data["generated_at"]
    record_id = report_data["record_id"]

    story = []
    story.append(Paragraph("GridGuard Fault Report", title_style))
    story.append(Paragraph(f"Record ID: <font name='Courier'>{record_id}</font>", meta_style))
    story.append(Paragraph(f"Generated: {generated_at}", meta_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#ccddee"), spaceAfter=8))

    # Classification
    story.append(Paragraph("Classification", h2_style))
    fault_label = FAULT_TYPE_LABELS.get(pred_label, pred_label)
    conf = probabilities.get(pred_label, 0) * 100
    story.append(Paragraph(f"<b>Predicted fault type:</b> {fault_label} ({pred_label})", body_style))
    story.append(Paragraph(f"<b>Classifier confidence:</b> {conf:.1f}%", body_style))
    story.append(Paragraph(f"<b>Ground-truth label (dataset):</b> {row['fault_type']}", body_style))

    # Measured Quantities table
    story.append(Paragraph("Measured Quantities", h2_style))
    tbl_data = [
        ["Quantity", "Phase A", "Phase B", "Phase C"],
        ["RMS Voltage (V)", str(row["Va_rms"]), str(row["Vb_rms"]), str(row["Vc_rms"])],
        ["RMS Current (A)", str(row["Ia_rms"]), str(row["Ib_rms"]), str(row["Ic_rms"])],
    ]
    tbl = Table(tbl_data, colWidths=[4.5 * cm, 3.5 * cm, 3.5 * cm, 3.5 * cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f4f8fc"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#ccddee")),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f"<b>Frequency:</b> {row['frequency_hz']} Hz &nbsp;&nbsp; "
        f"<b>Voltage unbalance:</b> {row['voltage_unbalance_pct']}% &nbsp;&nbsp; "
        f"<b>Current unbalance:</b> {row['current_unbalance_pct']}%",
        body_style
    ))
    story.append(Paragraph(
        f"<b>Fault duration:</b> {row.get('duration_ms', 'N/A')} ms &nbsp;&nbsp; "
        f"<b>Fault location:</b> {row.get('fault_location_pct', 'N/A')}% of line length",
        body_style
    ))

    # AI Diagnosis
    story.append(Paragraph("AI Diagnosis &amp; Recommendations", h2_style))
    if diagnosis_text:
        # Render each line, converting markdown bold (**x**) to <b>x</b>
        import re
        full_text = diagnosis_text + SAFETY_DISCLAIMER
        for line in full_text.split("\n"):
            line = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", line)
            if line.startswith("- "):
                line = "&bull; " + line[2:]
            if line.strip():
                story.append(Paragraph(line, body_style))
    else:
        story.append(Paragraph(
            "<i>AI diagnosis unavailable (NVIDIA_API_KEY not configured or RAG index not built).</i>",
            body_style
        ))

    # Sources
    if sources:
        story.append(Paragraph("Sources Referenced", h2_style))
        for s in sources:
            story.append(Paragraph(f"&bull; {s}", body_style))

    # Footer disclaimer
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#ccddee"), spaceAfter=6))
    story.append(Paragraph(
        "This report was generated by GridGuard and is intended as decision support only. "
        "It does not replace utility protection engineering review or established safety procedures.",
        warn_style
    ))

    doc.build(story)
    buf.seek(0)
    return buf


@app.route("/api/diagnose/<record_id>", methods=["POST"])
def diagnose_record(record_id):
    row = get_record_row(record_id)
    if row is None:
        return jsonify({"error": f"record '{record_id}' not found"}), 404

    pred_label, probabilities = classify_row(row)

    query = (
        f"Protection guidance for a {FAULT_TYPE_LABELS.get(pred_label, pred_label)} fault "
        f"with voltage unbalance {row['voltage_unbalance_pct']}%, current unbalance "
        f"{row['current_unbalance_pct']}%, frequency {row['frequency_hz']} Hz"
    )
    try:
        retrieved_chunks = rag_retrieve(query, top_k=2)
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 503

    system_prompt, user_prompt = build_diagnosis_prompt(row, pred_label, probabilities, retrieved_chunks)

    try:
        diagnosis_text = chat_complete([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])
    except Exception as e:
        return jsonify({"error": f"NVIDIA generation call failed: {e}"}), 502

    # Append static safety disclaimer (not generated by LLM)
    diagnosis_text = diagnosis_text + SAFETY_DISCLAIMER

    return jsonify({
        "record_id": record_id,
        "predicted_fault_type": pred_label,
        "predicted_fault_type_label": FAULT_TYPE_LABELS.get(pred_label, pred_label),
        "confidence": probabilities.get(pred_label),
        "diagnosis": diagnosis_text,
        "sources": [{"source": c["source"], "relevance": c["relevance"]} for c in retrieved_chunks],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    })


@app.route("/api/report/<record_id>", methods=["GET", "POST"])
def generate_report(record_id):
    row = get_record_row(record_id)
    if row is None:
        return jsonify({"error": f"record '{record_id}' not found"}), 404

    pred_label, probabilities = classify_row(row)
    fmt = request.args.get("format", "json")

    # Accept pre-fetched diagnosis from request body to avoid a second LLM call
    body = {}
    if request.method == "POST":
        body = request.get_json(force=True, silent=True) or {}
    diagnosis_text = body.get("diagnosis_text") or None
    sources = body.get("sources") or []

    # Only call LLM if no diagnosis was supplied
    if not diagnosis_text:
        query = f"Protection guidance for a {FAULT_TYPE_LABELS.get(pred_label, pred_label)} fault"
        try:
            retrieved_chunks = rag_retrieve(query, top_k=2)
        except RuntimeError:
            retrieved_chunks = []

        if retrieved_chunks:
            system_prompt, user_prompt = build_diagnosis_prompt(
                row, pred_label, probabilities, retrieved_chunks
            )
            try:
                diagnosis_text = chat_complete([
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ])
                diagnosis_text = diagnosis_text + SAFETY_DISCLAIMER
                sources = [c["source"] for c in retrieved_chunks]
            except Exception:
                diagnosis_text = None

    generated_at = datetime.now(timezone.utc).isoformat()
    md = f"""# GridGuard Fault Report

**Record ID:** {row['record_id']}
**Generated:** {generated_at}

## Classification
- **Predicted fault type:** {FAULT_TYPE_LABELS.get(pred_label, pred_label)} ({pred_label})
- **Classifier confidence:** {probabilities.get(pred_label, 0) * 100:.1f}%
- **Ground-truth label (dataset):** {row['fault_type']}

## Measured Quantities
| Quantity | Phase A | Phase B | Phase C |
|---|---|---|---|
| RMS Voltage (V) | {row['Va_rms']} | {row['Vb_rms']} | {row['Vc_rms']} |
| RMS Current (A) | {row['Ia_rms']} | {row['Ib_rms']} | {row['Ic_rms']} |

- **System frequency:** {row['frequency_hz']} Hz
- **Voltage unbalance:** {row['voltage_unbalance_pct']}%
- **Current unbalance:** {row['current_unbalance_pct']}%
- **Zero-sequence voltage / current:** {row['zero_seq_voltage']} / {row['zero_seq_current']}
- **Fault duration:** {row.get('duration_ms', 'N/A')} ms
- **Estimated fault location:** {row.get('fault_location_pct', 'N/A')}% of line length
- **Estimated fault resistance:** {row.get('fault_resistance_ohm', 'N/A')} ohm

## AI Diagnosis & Recommendations
{diagnosis_text if diagnosis_text else "_AI diagnosis unavailable._"}

## Sources Referenced
{chr(10).join(f"- {s}" for s in sources) if sources else "_None_"}

---
*This report was generated by GridGuard and is intended as decision support only. It does not
replace utility protection engineering review or established safety procedures.*
"""

    if fmt == "markdown":
        buf = io.BytesIO(md.encode("utf-8"))
        return send_file(
            buf, mimetype="text/markdown", as_attachment=True,
            download_name=f"gridguard_report_{record_id}.md"
        )

    if fmt == "pdf":
        pdf_buf = render_report_pdf({
            "row": row,
            "pred_label": pred_label,
            "probabilities": probabilities,
            "diagnosis_text": diagnosis_text,
            "sources": sources,
            "generated_at": generated_at,
            "record_id": record_id,
        })
        return send_file(
            pdf_buf, mimetype="application/pdf", as_attachment=True,
            download_name=f"gridguard_report_{record_id}.pdf"
        )

    return jsonify({
        "record_id": record_id,
        "generated_at": generated_at,
        "predicted_fault_type": pred_label,
        "confidence": probabilities.get(pred_label),
        "markdown": md,
        "sources": sources,
    })


@app.route("/api/chat", methods=["POST"])
def chat():
    body = request.get_json(force=True) or {}
    question = (body.get("message") or "").strip()
    if not question:
        return jsonify({"error": "message is required"}), 400

    try:
        retrieved_chunks = rag_retrieve(question, top_k=4)
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 503

    context = "\n\n---\n\n".join(f"[Source: {c['source']}]\n{c['text']}" for c in retrieved_chunks)
    system_prompt = (
        "You are GridGuard, an assistant for power system protection engineers. Answer the "
        "user's question using only the provided protection guideline excerpts. If the "
        "excerpts don't contain the answer, say so."
    )
    user_prompt = f"QUESTION: {question}\n\nGUIDELINE EXCERPTS:\n{context}"

    try:
        answer = chat_complete([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])
    except Exception as e:
        return jsonify({"error": f"NVIDIA generation call failed: {e}"}), 502

    return jsonify({
        "answer": answer,
        "sources": [{"source": c["source"], "relevance": c["relevance"]} for c in retrieved_chunks],
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG", "0") == "1")
