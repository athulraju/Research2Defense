<div align="center">

```
██████╗ ██████╗ ██████╗
██╔══██╗╚════██╗██╔══██╗
██████╔╝ █████╔╝██║  ██║
██╔══██╗██╔═══╝ ██║  ██║
██║  ██║███████╗██████╔╝
╚═╝  ╚═╝╚══════╝╚═════╝
```

# Research2Defense

**AI Security Research → Detection Engineering**

A local AI agent that converts AI/LLM/agent security research papers into<br>
practical detection rules, reusable skill files, and telemetry recommendations.

[![Python](https://img.shields.io/badge/Python-3.10+-3776ab?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Ollama](https://img.shields.io/badge/Powered%20by-Ollama-111111?style=flat-square)](https://ollama.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## Overview

Research2Defense (R2D) is a **fully local** detection engineering workbench. It reads AI and LLM security research — from your own paper archive or live from arXiv — and produces detection-ready output: structured JSON detections, analyst-ready skill files, coverage gap reports, and telemetry recommendations.

Everything runs in your browser on `localhost:9000`. The default AI runtime is a local Ollama model, so no API key is required and your paper content can stay on your machine.

```
Research Paper (PDF / TXT / MD)
         │
         ▼
  ┌─────────────────────────┐
  │      Ollama (Local)     │  ← Paper analysis
  │   Attack extraction     │  ← Behavioral modeling
  │   Detection synthesis   │  ← Skill file authoring
  └─────────────────────────┘
         │
         ├── Output/Detections/    → Structured detection rules (JSON + MD)
         ├── Output/Skills/        → Analyst skill files (Markdown)
         ├── Output/Summaries/     → Paper intelligence summary
         └── Output/Recommendations/ → Telemetry gap analysis
```

---

## Features

| Capability | Description |
|---|---|
| **Local Paper Ingestion** | Process PDF, TXT, and Markdown research papers from your own archive |
| **arXiv Discovery** | Query arXiv in real time; papers are AI-ranked by detection engineering usefulness |
| **Log Schema Mapping** | Upload or paste your log schema to map detections to your actual field names |
| **Behavioral Detections** | Sequence-based, temporal, and correlation detections — not just keyword rules |
| **Skill File Generation** | Analyst-ready Markdown files with threat narrative, pseudo-logic, and tuning notes |
| **Gap Analysis** | Identifies missing telemetry, inferred assumptions, and per-stage coverage scoring |
| **Export** | Download skill files as `.md`, export detections as Markdown or JSON |
| **Fully Local** | SQLite metadata store, file-based outputs, and a local Ollama runtime instead of a paid cloud API |

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.10+ | `python3 --version` |
| Node.js | 18+ | `node --version` |
| Ollama | Latest | Install locally and keep it running |
| Local model | — | Optional. If unset, R2D auto-detects your first installed Ollama model |

---

## Quick Start

```bash
# Clone or download the project, then:

ollama pull llama3.1:8b   # or any model you prefer

./start.sh
```

Open **http://localhost:9000** in your browser.

The start script handles everything: Python virtual environment creation, dependency installation, frontend build, and server startup. Subsequent runs skip the build step unless you pass `--rebuild`.

---

## Manual Setup

If you prefer to run each step yourself:

```bash
# 1. Python environment
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 1b. Local model
ollama pull llama3.1:8b   # or another Ollama model

# 2. Frontend build
cd app/frontend
npm install
npm run build
cd ../..

# 3. Start the server
cd app/backend
uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

API documentation is available at **http://localhost:9000/docs** (Swagger UI).

---

## Workflow

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                                                                 │
 │  1. SELECT PAPER          2. MAP SCHEMA         3. PROCESS      │
 │  ─────────────────        ─────────────────     ─────────────── │
 │  Upload a PDF or          Paste JSON/CSV         AI analyzes    │
 │  TXT paper, or            log schema to          paper, models  │
 │  discover one on          map detections         attacks, and   │
 │  arXiv ranked by          to your fields.        generates all  │
 │  detection value.         Optional.              outputs.       │
 │                                                                 │
 │  4. REVIEW DETECTIONS     5. DOWNLOAD SKILLS    6. CLOSE GAPS   │
 │  ─────────────────────    ──────────────────    ─────────────── │
 │  Filter by severity       Download Markdown     Review missing  │
 │  and type. Expand         skill files for       telemetry and   │
 │  each detection for       each detection.       inferred        │
 │  logic, FPs, tuning.      Ready to use.         assumptions.    │
 │                                                                 │
 └─────────────────────────────────────────────────────────────────┘
```

---

## Detection Output

Each detection is generated with the following fields:

```json
{
  "title": "Covert Goal Substitution via Adversarial Instruction Injection",
  "description": "Detects when an agent's active goal set is silently replaced...",
  "rationale": "Legitimate orchestration systems do not require overriding safety...",
  "severity": "Critical",
  "confidence": "High",
  "detection_type": "sequence",
  "required_telemetry": ["Agent trace logs", "Tool invocation logs", "Prompt logs"],
  "implementation_notes": "Correlate prompt tokens against policy baseline...",
  "false_positives": ["Legitimate prompt chaining in multi-turn workflows"],
  "tuning_advice": "Establish per-agent prompt length and topic baselines...",
  "attack_stage": "execution",
  "behavioral_indicators": ["Goal drift between turns", "Unexpected tool invocation"],
  "pseudo_logic": "IF agent_goal[t] != agent_goal[t-1] AND tool_call NOT IN whitelist..."
}
```

---

## Skill File Format

Each detection produces a standalone Markdown skill file:

```
Output/Skills/<paper_id>_<detection_slug>.md
```

Skill files contain:

- Threat narrative and attack context
- Required log sources and field mapping
- Detection pseudo-logic and query ideas (KQL / SPL / SQL style)
- Behavioral indicators and sequence logic
- Tuning notes and false positive guidance
- Validation strategy

---

## Project Structure

```
Research2Defense/
├── app/
│   ├── backend/
│   │   ├── main.py                  # FastAPI app, static file serving, startup
│   │   ├── config.py                # Paths, model, environment config
│   │   ├── database.py              # SQLite schema and connection
│   │   ├── routes/
│   │   │   ├── papers.py            # Paper registration, upload, processing
│   │   │   ├── arxiv.py             # arXiv search and download
│   │   │   ├── schema.py            # Log schema upload and parsing
│   │   │   ├── detections.py        # Detection listing, filtering, export
│   │   │   ├── skills.py            # Skill file listing and download
│   │   │   ├── jobs.py              # Background job status polling
│   │   │   └── gaps.py              # Gap and telemetry analysis
│   │   ├── services/
│   │   │   ├── paper_processor.py   # PDF/text extraction + AI analysis
│   │   │   ├── arxiv_service.py     # arXiv API queries + relevance ranking
│   │   │   ├── detection_generator.py  # Behavioral detection synthesis
│   │   │   ├── skill_generator.py   # Skill Markdown file authoring
│   │   │   └── schema_service.py    # Schema parsing and telemetry recs
│   │   ├── models/
│   │   │   ├── paper.py             # Paper and analysis data models
│   │   │   └── detection.py         # Detection, skill, schema models
│   │   └── utils/
│   │       ├── file_utils.py        # File I/O, ID generation, slugify
│   │       └── pdf_parser.py        # pdfplumber extraction with truncation
│   └── frontend/
│       └── src/
│           ├── pages/
│           │   ├── Landing.jsx       # Home, stats, workflow overview
│           │   ├── LocalPapers.jsx   # Paper selection, upload, processing
│           │   ├── ArxivDiscovery.jsx  # arXiv search and ranked results
│           │   ├── LogSchema.jsx     # Schema input and field parsing
│           │   ├── Results.jsx       # Detection browser with filters
│           │   ├── Skills.jsx        # Skill file viewer and download
│           │   └── AssumptionsGaps.jsx  # Coverage and gap analysis
│           └── components/
│               ├── DetectionCard.jsx    # Expandable detection component
│               ├── MarkdownViewer.jsx   # Inline markdown renderer
│               └── ProgressBar.jsx      # Job status poller
├── Research_Papers/
│   ├── Input/                       # Drop PDF/TXT papers here
│   └── Output/
│       ├── Detections/              # <paper_id>_detections.json
│       ├── Skills/                  # <paper_id>_<slug>.md
│       ├── Summaries/               # <paper_id>_summary.md
│       └── Recommendations/         # <paper_id>_gaps.json, _telemetry.json
├── r2d.db                           # SQLite metadata store (auto-created)
├── requirements.txt
├── start.sh
└── README.md
```

---

## Detection Philosophy

R2D is built around one principle: **detections must reflect attacker intent, not just attacker actions.**

| Approach | R2D Does | R2D Avoids |
|---|---|---|
| Signal type | Behavioral sequences, temporal patterns | Isolated keyword matches |
| Detection layer | Intent + orchestration layer | Surface-level IOCs |
| Scope | Full attack chain (initial access → exfiltration) | Single-event alerting |
| Tuning | Baseline-aware, FP guidance included | Threshold-free rules |
| Output | Annotated with rationale and limitations | Black-box detections |

---

## Supported Input Formats

| Format | Extension | Notes |
|---|---|---|
| PDF | `.pdf` | Full text extracted via pdfplumber |
| Plain text | `.txt` | UTF-8 |
| Markdown | `.md`, `.markdown` | Frontmatter preserved |
| Log schema — JSON | `.json` | Sample record or schema object |
| Log schema — CSV | `.csv` | Headers used as field list |
| Log schema — Text | `.txt` | Field name list, one per line |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `LOCAL_MODEL` | No | Ollama model name to use. Leave unset to auto-detect the first installed model |
| `OLLAMA_BASE_URL` | No | Ollama API endpoint, default `http://127.0.0.1:11434` |
| `LLM_TIMEOUT_SECONDS` | No | Request timeout for long local generations |

---

## Troubleshooting

**Frontend not loading**
```bash
cd app/frontend && npm run build
```

**Local model not ready**
```bash
ollama pull llama3.1:8b
```

**Port 9000 already in use**
```bash
lsof -ti:9000 | xargs kill -9
./start.sh
```

**PDF text extraction returns nothing**
Some PDFs are image-only scans. Convert with OCR first:
```bash
ocrmypdf input.pdf output.pdf
```

**arXiv search is slow**
Expected — the tool queries multiple search terms and runs AI relevance scoring per paper. Allow 30–60 seconds.

---

## License

MIT — use freely, attribution appreciated.

---

<div align="center">

**Research2Defense (R2D)**<br>
Built for detection engineers, by detection engineers.

*Research Paper → Threat Model → Detection → Skill File*

</div>
