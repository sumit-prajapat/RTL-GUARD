# RTL-guard: AI Verilog Code Reviewer & Bug Detector

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb.svg)](https://vitejs.dev)
[![FAISS](https://img.shields.io/badge/Vector%20DB-FAISS-yellow.svg)](https://github.com/facebookresearch/faiss)
[![Tests](https://img.shields.io/badge/Tests-21%2F21%20Passing%20(100%25)-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**RTL-guard** is an automated RTL review and bug-detection assistant designed to catch high-impact Verilog design flaws—such as unintended latch inference, blocking/non-blocking misuse, incomplete sensitivity lists, and multi-driver contention—before running simulation or synthesis. 

It pairs **deterministic static pre-checks** with a **grounded Retrieval-Augmented Generation (RAG) pipeline** over a curated corpus of hardware bug patterns, delivering plain-English explanations and concrete code fix suggestions.

---

## 🎯 Benchmark & Validation Results

Evaluated rigorously across hand-crafted reference designs, seeded bug fixtures, and third-party open-source IP cores:

| Test Fixture Set | Fixtures Evaluated | Detection Rate | False Positive Rate | Status |
|---|---|:---:|:---:|:---:|
| **Seeded Bug Modules** | 8 bug classes (`buggy_*.v`) | **100% (8/8)** | **0.0%** | Passed |
| **Clean Reference Modules** | Counter, Mux, FSM, DFF, ALU | N/A | **0.0% (0/5)** | Passed |
| **External Open-Source IP** | UART Receiver, APB Slave, PWM | N/A | **0.0% (0/3)** | Passed |
| **Static Syntax Checks** | Unbalanced begin/end, semicolons | **100% (4/4)** | **0.0%** | Passed |
| **Total Test Suite** | **21 automated pytest tests** | **100% (21/21)** | **0.0%** | **All Passed** |

---

## 📂 Repository Structure

Per architectural design guidelines, the root directory strictly contains:
- `backend/`: API services, bug pattern corpus, FAISS vector index, test fixtures, and technical documentation.
- `frontend/`: React + Vite interactive two-pane review interface.
- `README.md`: Project documentation, architecture overview, and setup guide.

```
RTL-guard/
├── README.md                      # Project documentation and getting started guide
├── backend/                       # FastAPI backend, RAG pipeline & test suite
│   ├── main.py                    # App entrypoint & CORS configuration
│   ├── routes/                    # API routes (POST /api/review, GET /api/corpus, GET /api/health)
│   ├── services/                  # Precheck, RAG retriever, prompt builder, LLM client, Yosys runner
│   ├── models/                    # Pydantic request/response schemas
│   ├── corpus/bug_patterns/       # Curated RTL bug patterns (markdown documents)
│   ├── scripts/                   # Ingestion scripts (multi-view FAISS index builder)
│   ├── data/faiss_index/          # Persisted vector index files
│   ├── tests/fixtures/            # Clean, buggy, and external Verilog test fixtures
│   │   ├── clean/                 # Hand-crafted golden reference modules (Counter, Mux, FSM, etc.)
│   │   ├── buggy/                 # Seeded bug modules (one controlled defect per file)
│   │   └── external/              # Real-world open-source Verilog modules (UART, APB, PWM)
│   ├── docs/                      # PRD, SRS, ARCHITECTURE, DESIGN, PHASES, RULES, MEMORY
│   ├── requirements.txt           # Python dependencies
│   ├── pytest.ini                 # Pytest configuration
│   └── .env.example               # Environment variables template
└── frontend/                      # React (Vite) single-page application
    ├── src/                       # UI components, layout, and API client
    │   ├── components/            # CodeInputPanel, ResultsPanel, IssueCard
    │   ├── App.jsx                # Two-pane layout with sample presets
    │   └── App.css                # Dark mode styling and typography
    └── package.json               # Frontend dependencies
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Python 3.10+** (Python 3.14 fully supported)
- **Node.js 18+** & `npm`
- *(Optional)* **Groq API Key** for LLM inference (built-in offline fallback mode available if key is not configured)
- *(Optional / Stretch)* **Yosys** installed for hardware synthesis validation

---

### 2. Backend Setup
```bash
# 1. Navigate to backend
cd backend

# 2. Create and activate virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. (Optional) Ingest corpus to generate FAISS vector index
python scripts/ingest_corpus.py

# 5. Run the automated test suite
pytest -v

# 6. Start the backend server
uvicorn main:app --reload --port 8000
```
Verify the backend is running:
```bash
curl http://127.0.0.1:8000/api/health
```

---

### 3. Frontend Setup
```bash
# In a separate terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start local development server
npm run dev
```
Open **`http://localhost:5173`** in your browser to interact with the reviewer UI.

---

## 🏗️ Architecture & Core Components

1. **Deterministic Static Pre-Check (`backend/services/precheck.py`):**
   - Comment-safe scanning for syntax defects (unbalanced `begin`/`end` blocks, missing semicolons, missing `endmodule`).
   - Pure functions that run instantly without external API or LLM latency.

2. **Domain-Specific RAG (`backend/services/rag.py`):**
   - Encodes curated RTL bug patterns into a local FAISS index using `sentence-transformers/all-MiniLM-L6-v2`.
   - Utilizes multi-view chunking (semantic summary, code anti-pattern, and hardware consequence) to bridge the code-to-text representation gap.

3. **Grounded LLM Review (`backend/services/prompt_builder.py` & `llm_client.py`):**
   - Strictly enforces citation of retrieved `pattern_ref` IDs in the prompt to eliminate hallucinations.
   - Parses structured JSON findings containing title, severity badge (`HIGH`, `MEDIUM`, `LOW`), line number, plain-English explanation, and suggested fix diff.
   - Built-in fallback evaluator ensures immediate offline functionality without API keys.

4. **Yosys Synthesis Validation (`backend/services/yosys_runner.py`):**
   - Optional feature-flagged validation pass running synthesis checks to confirm latch inference and driver conflicts in real EDA tooling.

---

## 🛠️ How to Add a New Bug Pattern (Zero Code Changes)

Adding new hardware bug patterns requires **no code modifications**:
1. Create a new markdown file in `backend/corpus/bug_patterns/<pattern-id>.md` using this template:
   ```markdown
   # Pattern: <pattern-id>
   
   ## Name
   <Descriptive Title>
   
   ## Tags
   tag1, tag2, tag3
   
   ## Explanation
   <2-4 sentences explaining why this code fails in synthesis/simulation>
   
   ## Bad Example
   ```verilog
   <buggy verilog code>
   ```
   
   ## Fixed Example
   ```verilog
   <clean replacement code>
   ```
   
   ## Why It Matters
   <Hardware/silicon consequences>
   ```
2. Re-run the ingestion script:
   ```bash
   python backend/scripts/ingest_corpus.py
   ```
The FAISS vector index updates automatically, and the LLM will immediately start retrieving and citing the new pattern.

---

## 💼 Resume & Interview Talking Points

### Recommended Resume Bullet
> *"Architected and built an automated Verilog RTL code reviewer using FastAPI, React, and a multi-view RAG pipeline with FAISS and Sentence-Transformers; achieved 100% detection rate across 8 hardware bug classes with 0.0% false positives across clean reference modules and open-source IP cores (UART, APB)."*

### Key Technical Talking Points for Interviews
- **Domain-Specific RAG Engineering:** Explain why raw Verilog code queries fail standard text embeddings, and how multi-view chunking (indexing both code anti-patterns and conceptual explanations) increased retrieval accuracy to 100% in Top-5.
- **Graceful Degradation:** How the system returns instant deterministic pre-checks even if the external LLM times out or encounters network degradation.
- **Anti-Hallucination via Strict Grounding:** How prompt construction forces the LLM to cite an exact `pattern_ref` from retrieved knowledge docs, rejecting freeform "vibes-based" findings.
- **Negative Testing Discipline:** How hand-crafted clean fixtures were used to enforce a 0% false positive gate, treating any false alarm on valid RTL as a system defect.

---

## 📖 Specifications & Design Documentation
All design and requirements documents are available in `backend/docs/`:
- [PRD (Product Requirements Document)](backend/docs/PRD.md)
- [SRS (Software Requirements Specification)](backend/docs/SRS.md)
- [Architecture Document](backend/docs/ARCHITECTURE.md)
- [Design Specification](backend/docs/DESIGN.md)
- [Project Roadmap & Phases](backend/docs/PHASES.md)
- [Engineering Rules & Constraints](backend/docs/RULES.md)
- [Project Memory & Decision Log](backend/docs/MEMORY.md)