# Architecture Document
## AI Verilog Code Reviewer & Bug Detector

**Version:** 1.0
**Last Updated:** 2026-09-21

---

## 1. High-Level System Diagram (textual)

```
┌─────────────┐      ┌──────────────────────────────────────────────┐
│   React     │ HTTP │                  FastAPI Backend               │
│  Frontend   │ ───► │                                                │
│ (code input,│      │  ┌──────────────┐   ┌────────────────────┐    │
│  results UI)│ ◄─── │  │ Static       │   │ RAG Pipeline        │    │
└─────────────┘      │  │ Pre-Check    │   │ (retriever)         │    │
                      │  │ Module       │   └─────────┬──────────┘    │
                      │  └──────────────┘             │               │
                      │                                ▼               │
                      │                     ┌────────────────────┐    │
                      │                     │  FAISS Index        │    │
                      │                     │ (bug-pattern corpus)│    │
                      │                     └─────────┬──────────┘    │
                      │                                │ top-k chunks  │
                      │                                ▼               │
                      │                     ┌────────────────────┐    │
                      │                     │  Prompt Builder     │    │
                      │                     └─────────┬──────────┘    │
                      │                                ▼               │
                      │                     ┌────────────────────┐    │
                      │                     │  LLM Client (Groq)  │    │
                      │                     └─────────┬──────────┘    │
                      │                                ▼               │
                      │                     ┌────────────────────┐    │
                      │                     │ Response Parser /   │    │
                      │                     │ JSON Validator       │    │
                      │                     └─────────┬──────────┘    │
                      │                                │               │
                      │            (optional) ┌────────▼─────────┐    │
                      │                        │ Yosys Runner     │    │
                      │                        │ (subprocess)     │    │
                      │                        └────────┬─────────┘    │
                      │                                 ▼               │
                      │                     ┌────────────────────┐    │
                      │                     │ Report Aggregator   │    │
                      │                     └────────────────────┘    │
                      └──────────────────────────────────────────────┘
```

## 2. Component Breakdown

### 2.1 Frontend (React)
- **CodeInputPanel**: textarea/Monaco editor + file upload + submit button.
- **ResultsPanel**: renders `precheck`, `ai_findings`, `synthesis` sections separately.
- **IssueCard**: individual finding — title, severity badge, explanation, fix diff view.
- **API client**: thin wrapper around `fetch`/`axios` calling `/api/review`.
- State management: local component state is sufficient for v1 (no Redux needed — single-page, single-request flow).

### 2.2 Backend (FastAPI)

**`main.py`** — app entrypoint, CORS config, route registration.

**`routes/review.py`**
- `POST /api/review` — orchestrates: pre-check → retrieval → prompt → LLM → (optional) Yosys → aggregate → return.

**`services/precheck.py`**
- Pure functions, no external calls. Regex/line-scan based checks:
  - `check_begin_end_balance(code) -> list[Issue]`
  - `check_missing_semicolons(code) -> list[Issue]`
  - `check_endmodule_present(code) -> list[Issue]`

**`services/rag.py`**
- `load_corpus(path) -> list[Document]`
- `build_index(documents) -> FAISSIndex` (run once at startup or via separate ingestion script)
- `retrieve(query_code, k=5) -> list[Document]`

**`services/prompt_builder.py`**
- `build_review_prompt(code: str, retrieved_docs: list[Document]) -> str`
- Enforces strict output-format instructions (JSON schema) inside the system/user prompt.

**`services/llm_client.py`**
- Thin wrapper over Groq API (or HuggingFace inference) with timeout, retry-once, and error normalization.

**`services/yosys_runner.py`** (stretch, feature-flagged)
- `run_synthesis(code: str) -> SynthesisResult` — writes code to a temp file, invokes `yosys -p "synth; write_verilog out.v"`, captures stdout/stderr, parses warnings/errors.

**`services/report_builder.py`**
- Merges precheck + ai_findings + synthesis into the final response schema.
- Validates/sanitizes LLM JSON output (falls back to raw-text mode if JSON parse fails, flagged as `degraded: true`).

**`models/schemas.py`**
- Pydantic models: `ReviewRequest`, `Issue`, `PrecheckIssue`, `AIFinding`, `SynthesisResult`, `ReviewResponse`.

### 2.3 Data / Corpus Layer
- `corpus/bug_patterns/*.md` — one file per bug pattern (see DESIGN.md for template).
- `scripts/ingest_corpus.py` — chunks corpus docs, generates embeddings (HuggingFace sentence-transformers), builds/saves FAISS index to `data/faiss_index/`.
- Index loaded into memory at backend startup (lazy-load singleton).

### 2.4 Testing Layer
- `tests/fixtures/buggy/*.v` — seeded-bug modules (one per bug type, plus combinations).
- `tests/fixtures/clean/*.v` — Stage-1 hand-written reference modules (should produce zero/near-zero findings).
- `tests/fixtures/external/*.v` — pulled from open GitHub repos, used for generalization testing.
- `tests/test_precheck.py`, `tests/test_rag_retrieval.py`, `tests/test_end_to_end.py`.

## 3. Data Flow (single request)
1. Frontend POSTs `{ code, options }` to `/api/review`.
2. Backend runs static pre-check synchronously (fast, no I/O).
3. Backend embeds the submitted code (or a normalized feature summary of it) and queries FAISS for top-k bug-pattern chunks.
4. Backend builds a single prompt: system instructions (output format, "only flag what you can tie to a cited pattern") + retrieved context + submitted code.
5. Backend calls Groq LLM, parses JSON response.
6. (If enabled) Backend runs Yosys in a subprocess with a timeout; captures output.
7. Backend aggregates all three result sets into `ReviewResponse` and returns.
8. Frontend renders sections progressively (precheck can render immediately if you choose to stream later; v1 can be a single blocking response).

## 4. Technology Stack
| Layer | Choice | Notes |
|---|---|---|
| Backend framework | FastAPI | async support, Pydantic validation built-in |
| Frontend framework | React (Vite) | reuse existing project scaffold |
| Code editor component | Monaco Editor (or plain `<textarea>` for v1 speed) | Monaco gives line highlighting for free |
| Embeddings | HuggingFace `sentence-transformers` (e.g. `all-MiniLM-L6-v2`) | already used in prior project |
| Vector index | FAISS (local, flat index — corpus is small, <100 docs) | no need for IVF/HNSW at this scale |
| LLM | Groq-hosted model (existing account/integration) | fast inference, already integrated previously |
| Synthesis (stretch) | Yosys (CLI, subprocess) | Linux-only; feature-flagged |
| Testing | pytest | fixtures-based regression tests |

## 5. Deployment (v1 scope: local/dev only)
- Backend: `uvicorn main:app --reload` locally, or a single Docker container.
- Frontend: `vite dev` locally, or built static assets served by any static host / same FastAPI app via `StaticFiles`.
- No database required — corpus is filesystem-based; FAISS index persisted to disk and rebuilt via script when corpus changes.
- Environment variables: `GROQ_API_KEY`, `ENABLE_YOSYS` (bool), `FAISS_INDEX_PATH`.

## 6. Error Handling & Resilience
- LLM call failure/timeout → return precheck results only, with `ai_findings: [], degraded: true, error_message`.
- Malformed LLM JSON → one retry with a stricter "return only JSON" reminder; if it fails again, fall back to degraded mode.
- Yosys not installed / binary missing → `synthesis.enabled = false`, no request failure.
- Oversized input (>~500 lines for v1) → reject with a clear 413-style error before calling the LLM (cost control).

## 7. Security & Privacy Notes
- No code persistence beyond request lifecycle by default (NFR-2 in SRS).
- No auth in v1 (single-user/local/demo use only) — do not deploy publicly without adding auth/rate-limiting.
- Sanitize any code embedded into shell commands (Yosys subprocess) — always write to a controlled temp file, never interpolate code into a shell string directly.

## 8. Extensibility Points
- New bug pattern = new markdown file in `corpus/bug_patterns/` + re-run `ingest_corpus.py`. No code changes.
- Swappable LLM backend: `llm_client.py` is the only file that should know about Groq specifics — keep the interface (`generate(prompt) -> str`) provider-agnostic for future swap to another provider.
- Yosys output parsing is isolated in `yosys_runner.py` so it can be replaced/extended with other EDA tools (e.g., Verilator lint) later.
