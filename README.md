# GridGuard

**AI Power System Fault Diagnosis Assistant** — classifies electrical fault
records from three-phase voltage/current/frequency data and generates
protection-guideline-grounded diagnosis, corrective actions, and downloadable
fault reports.

**Live demo:** _[add your deployed frontend URL here after deploying]_

---

## What it does

- **Fault classification** — a scikit-learn model (decision tree, with a
  logistic-regression baseline picked automatically if it scores higher on
  cross-validation) identifies the fault type of a record: `NONE`, `LG`
  (line-to-ground), `LL` (line-to-line), `LLG` (double line-to-ground), `LLL`
  (three-phase), `LLLG` (three-phase-to-ground).
- **Waveform visualization** — per-record phase voltage/current charts for
  one electrical cycle, plus frequency, unbalance, and duration metrics.
- **RAG-grounded AI diagnosis** — five original power-system protection
  guideline documents are chunked, embedded with NVIDIA's
  `nv-embedqa-e5-v5` model, and stored in ChromaDB. At diagnosis time,
  GridGuard retrieves the most relevant guideline passages and asks
  `meta/llama-3.1-70b-instruct` (via NVIDIA NIM) to produce a diagnosis,
  likely cause, recommended corrective actions, and reclose/restoration
  guidance — grounded in those passages, with sources cited.
- **Automated fault reports** — a full markdown report (measurements,
  classification, AI diagnosis, sources) viewable on-screen and downloadable.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React (Vite), Tailwind CSS, Recharts |
| Backend | Python, Flask, REST API |
| ML | scikit-learn (decision tree / logistic regression) |
| RAG | ChromaDB (local persistent vector store) |
| AI (embeddings + generation) | NVIDIA NIM API — OpenAI-compatible client |
| Deployment | Vercel (frontend) · Render (backend) |

## Project structure

```
gridguard/
├── backend/
│   ├── app.py                  Flask REST API
│   ├── data/
│   │   └── generate_synthetic_data.py   dataset generator (+ fault_dataset.csv)
│   ├── ml/
│   │   └── train_classifier.py          trains & saves fault_classifier.joblib
│   ├── rag/
│   │   ├── knowledge_base/*.md          protection guideline documents
│   │   ├── build_index.py               chunks + embeds + stores in ChromaDB
│   │   └── retrieve.py                  query-time retrieval
│   ├── utils/nvidia_client.py           NVIDIA NIM API wrapper
│   ├── requirements.txt
│   ├── .env.example
│   ├── render.yaml / Procfile
│   └── ...
└── frontend/
    ├── src/
    │   ├── App.jsx, api.js, index.css
    │   └── components/ (Header, RecordList, FaultCharts, ClassificationPanel,
    │                     DiagnosisPanel, ReportView)
    ├── package.json
    ├── vercel.json
    └── .env.example
```

## Dataset

No suitable Kaggle credential/network access was available in this
environment, so `backend/data/generate_synthetic_data.py` generates a
physically-plausible synthetic dataset: 360 three-phase fault records (60 per
fault class) with per-phase RMS voltage/current, frequency, sequence-based
unbalance features, fault resistance, and estimated location — built from
standard power-system fault modeling (phase sag/swell, current multipliers,
harmonic content, and frequency deviation per fault type). The generator is a
drop-in replacement point: swap in a real Kaggle "electrical fault
classification" dataset by pointing `train_classifier.py` at a CSV with the
same column names.

## Local setup

### 1. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt

cp .env.example .env
# edit .env and set NVIDIA_API_KEY=nvapi-...  (get one at https://build.nvidia.com)

# generate data, train the classifier, and build the RAG index (one-time / whenever KB changes)
python data/generate_synthetic_data.py
python ml/train_classifier.py
python rag/build_index.py      # requires NVIDIA_API_KEY for embeddings

python app.py                  # runs on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_URL=http://localhost:5000 (default is already correct for local dev)
npm run dev                    # runs on http://localhost:5173
```

Open http://localhost:5173, pick a fault record, click **Classify**, then
**Diagnose**, then **Generate Report**.

## REST API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/records` | List records (`?fault_type=&limit=&offset=`) |
| GET | `/api/records/<id>` | Full record incl. waveform samples |
| POST | `/api/classify/<id>` | Run the ML classifier |
| POST | `/api/diagnose/<id>` | RAG-grounded AI diagnosis + recommendations |
| GET | `/api/report/<id>` | Full markdown report (`?format=markdown` to download) |
| POST | `/api/chat` | Freeform Q&A grounded in the protection knowledge base |

## Deployment

### Backend → Render

1. Push this repo to GitHub.
2. In Render, **New → Web Service**, connect the repo, root directory
   `backend/`. Render will pick up `render.yaml` (build command installs
   deps, regenerates the dataset, trains the classifier, and builds the
   ChromaDB index; start command runs `gunicorn`).
3. Add the `NVIDIA_API_KEY` environment variable in the Render dashboard
   (**never** commit it) — it's required at build time too, since the RAG
   index build step calls the NVIDIA embedding API.
4. Note the deployed backend URL, e.g. `https://gridguard-backend.onrender.com`.

### Frontend → Vercel

1. In Vercel, **New Project**, import the repo, root directory `frontend/`.
2. Framework preset: Vite (auto-detected via `vercel.json`).
3. Set environment variable `VITE_API_URL` to your Render backend URL.
4. Deploy, then paste the resulting URL into the **Live demo** link at the
   top of this README.

## Environment variables

| Var | Where | Description |
|---|---|---|
| `NVIDIA_API_KEY` | `backend/.env` | NVIDIA NIM API key (embeddings + generation). Never committed — see `.gitignore`. |
| `VITE_API_URL` | `frontend/.env` | Base URL of the deployed Flask backend. |

## Safety note

GridGuard's diagnosis and recommendations are decision support only. They do
not replace utility protection engineering review, established switching
procedures, or applicable safety/regulatory requirements — see
`backend/rag/knowledge_base/05_fault_reporting_and_restoration.md`.

## License

MIT
# Gridguard
