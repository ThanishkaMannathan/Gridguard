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


def build_diagnosis_prompt(row, pred_label, probabilities, retrieved_chunks):
    context = "\n\n---\n\n".join(
        f"[Source: {c['source']}]\n{c['text']}" for c in retrieved_chunks
    )
    record_summary = (
        f"Record ID: {row['record_id']}\n"
        f"Classified fault type: {FAULT_TYPE_LABELS.get(pred_label, pred_label)} ({pred_label}), "
        f"classifier confidence {probabilities.get(pred_label, 0) * 100:.1f}%\n"
        f"Phase voltages (RMS V): A={row['Va_rms']}, B={row['Vb_rms']}, C={row['Vc_rms']}\n"
        f"Phase currents (RMS A): A={row['Ia_rms']}, B={row['Ib_rms']}, C={row['Ic_rms']}\n"
        f"System frequency: {row['frequency_hz']} Hz\n"
        f"Voltage unbalance: {row['voltage_unbalance_pct']}%  |  "
        f"Current unbalance: {row['current_unbalance_pct']}%\n"
        f"Zero-sequence voltage: {row['zero_seq_voltage']}  |  "
        f"Zero-sequence current: {row['zero_seq_current']}\n"
        f"Fault duration: {row.get('duration_ms', 'N/A')} ms  |  "
        f"Estimated fault location: {row.get('fault_location_pct', 'N/A')}% of line length"
    )
    system_prompt = (
        "You are GridGuard, an AI assistant for power system protection engineers. "
        "You diagnose electrical faults and recommend corrective actions, grounded strictly "
        "in the provided protection guideline excerpts. Be precise, use correct power-system "
        "terminology, and always include a safety caveat that recommendations are decision "
        "support only and do not replace utility protection engineering review and standard "
        "safety procedures. If the guideline excerpts don't cover something, say so rather "
        "than inventing settings or standards."
    )
    user_prompt = (
        f"FAULT RECORD DATA:\n{record_summary}\n\n"
        f"RELEVANT PROTECTION GUIDELINE EXCERPTS:\n{context}\n\n"
        "Using only the record data and the guideline excerpts above, provide:\n"
        "1. **Diagnosis** -- a concise interpretation of what this fault signature indicates.\n"
        "2. **Likely Cause** -- the most probable physical cause(s) consistent with the guidelines.\n"
        "3. **Recommended Corrective Actions** -- specific, prioritized steps referencing the "
        "guideline where relevant.\n"
        "4. **Reclose / Restoration Guidance** -- whether automatic reclosing should be blocked "
        "and what should happen before restoration.\n"
        "5. **Safety Note** -- a brief safety caveat.\n"
        "Keep the whole response under 350 words and use the section headers above."
    )
    return system_prompt, user_prompt


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
        retrieved_chunks = rag_retrieve(query, top_k=4)
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

    return jsonify({
        "record_id": record_id,
        "predicted_fault_type": pred_label,
        "predicted_fault_type_label": FAULT_TYPE_LABELS.get(pred_label, pred_label),
        "confidence": probabilities.get(pred_label),
        "diagnosis": diagnosis_text,
        "sources": [{"source": c["source"], "relevance": c["relevance"]} for c in retrieved_chunks],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    })


@app.route("/api/report/<record_id>", methods=["GET"])
def generate_report(record_id):
    row = get_record_row(record_id)
    if row is None:
        return jsonify({"error": f"record '{record_id}' not found"}), 404

    pred_label, probabilities = classify_row(row)
    fmt = request.args.get("format", "json")

    query = f"Protection guidance and reporting requirements for a {FAULT_TYPE_LABELS.get(pred_label, pred_label)} fault"
    try:
        retrieved_chunks = rag_retrieve(query, top_k=3)
    except RuntimeError:
        retrieved_chunks = []

    diagnosis_text = None
    sources = []
    if retrieved_chunks:
        system_prompt, user_prompt = build_diagnosis_prompt(row, pred_label, probabilities, retrieved_chunks)
        try:
            diagnosis_text = chat_complete([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ])
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
{diagnosis_text if diagnosis_text else "_AI diagnosis unavailable (NVIDIA_API_KEY not configured or RAG index not built)._"}

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
