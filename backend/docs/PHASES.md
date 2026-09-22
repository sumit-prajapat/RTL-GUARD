# Project Phases & Roadmap
## AI Verilog Code Reviewer & Bug Detector

**Version:** 1.0
**Last Updated:** 2026-09-21
**Total estimated timeline:** ~2.5–3 weeks

---

## Phase 0: Setup (0.5 day)
**Goal:** Repo and environment ready to build in.

- [ ] Create repo structure per ARCHITECTURE.md (`backend/`, `frontend/`, `corpus/`, `scripts/`, `tests/`)
- [ ] Set up Python venv, FastAPI + dependencies (`fastapi`, `uvicorn`, `pydantic`, `sentence-transformers`, `faiss-cpu`, `groq` SDK)
- [ ] Set up React (Vite) scaffold, reusing prior project's base if available
- [ ] `.env.example` with `GROQ_API_KEY`, `ENABLE_YOSYS`
- [ ] Confirm Groq API access works with a trivial "hello world" completion call

**Exit criteria:** Backend returns 200 on `/api/health`; frontend renders a blank shell that can hit the backend.

---

## Phase 1: Learn Just Enough Verilog (2–3 days)
**Goal:** Enough working knowledge to recognize correct vs buggy RTL, plus your own reference modules.

- [ ] Study: modules, ports, `always` blocks, blocking (`=`) vs non-blocking (`<=`), sensitivity lists, `case`/`casez`, latch inference
- [ ] Hand-write 5–6 clean modules: counter, mux, FSM, D flip-flop, ALU (+ optionally a shift register)
- [ ] Save these under `tests/fixtures/clean/`

**Exit criteria:** 5-6 clean `.v` files exist, each compiles conceptually correct (mentally verified/simulated if a simulator is handy), zero known bugs.

---

## Phase 2: Bug-Pattern Knowledge Base (2–3 days)
**Goal:** The RAG corpus — the most VLSI-specific and highest-value part of the project.

- [ ] Identify 8-10 target bug patterns (see seed list below)
- [ ] Write one markdown doc per pattern under `corpus/bug_patterns/`, following the RULES.md §2 template
- [ ] Derive a "buggy" fixture from each clean Phase-1 module by seeding exactly one bug per file → `tests/fixtures/buggy/`
- [ ] Write `scripts/ingest_corpus.py`: chunk → embed (HuggingFace) → build FAISS index → save to disk
- [ ] Run ingestion, sanity-check retrieval manually (query with a known-buggy snippet, confirm the right pattern doc comes back top-1 or top-2)

**Seed bug-pattern list (minimum 8):**
1. Incomplete sensitivity list in `always @(...)`
2. Blocking assignment (`=`) used in sequential/clocked logic
3. Non-blocking assignment (`<=`) used in combinational logic
4. Missing `else`/`default` causing unintended latch inference
5. Multiple drivers on the same signal (multiple always blocks driving one reg)
6. Width mismatch in assignments (implicit truncation/extension)
7. Mixing blocking and non-blocking in the same always block
8. Using `always @(posedge clk)` without reset handling where required
9. (optional) Combinational loop / self-referential assignment
10. (optional) Unintended `wire` vs `reg` misuse

**Exit criteria:** FAISS index built and loadable; manual retrieval test confirms relevant pattern is returned for at least 8/10 hand-crafted queries.

---

## Phase 3: Build the Pipeline (4–5 days)
**Goal:** End-to-end working product, per ARCHITECTURE.md.

- [ ] Backend: `services/precheck.py` (begin/end balance, missing semicolon heuristic, missing endmodule)
- [ ] Backend: `services/rag.py` (load index, `retrieve()`)
- [ ] Backend: `services/prompt_builder.py` (strict JSON-output prompt template)
- [ ] Backend: `services/llm_client.py` (Groq wrapper, timeout/retry)
- [ ] Backend: `models/schemas.py` (Pydantic models for request/response)
- [ ] Backend: `routes/review.py` (`POST /api/review` orchestration)
- [ ] Frontend: `CodeInputPanel` (textarea or Monaco + upload + submit)
- [ ] Frontend: `ResultsPanel` + `IssueCard` (precheck / ai_findings sections, severity badges)
- [ ] Wire frontend → backend, test manually end-to-end with one clean and one buggy fixture

**Exit criteria:** Paste a known-buggy module in the UI, get back a structured report with at least the seeded bug correctly identified and explained.

---

## Phase 4: Test Against Real Bugs (2 days)
**Goal:** Prove the tool generalizes, not just memorizes its own test cases.

- [ ] Run all `tests/fixtures/buggy/*` through the tool; record detection rate per bug type
- [ ] Run all `tests/fixtures/clean/*` through the tool; confirm zero/near-zero false positives
- [ ] Pull 3-5 additional Verilog modules from open GitHub repos → `tests/fixtures/external/`
- [ ] Run those through the tool; manually review output quality (does it still make sense on code you didn't write?)
- [ ] Record a detection-rate baseline in `MEMORY.md` (see RULES.md R7.2 — never regress below this without knowing why)
- [ ] Iterate on corpus docs / prompt wording based on gaps found

**Exit criteria:** ≥90% detection on seeded fixtures, zero false positives on clean fixtures, and sane (even if imperfect) output on external fixtures.

---

## Phase 5 (Stretch): Yosys Integration (1–2 days)
**Goal:** Real EDA-tool cross-validation — the strongest differentiator for VLSI-adjacent interviews.

- [ ] Install Yosys locally, confirm `yosys -p "synth; write_verilog out.v" input.v` runs on a clean fixture
- [ ] Build `services/yosys_runner.py`: temp-file write → subprocess call with timeout → capture stdout/stderr
- [ ] Parse Yosys warnings/errors into the shared `Issue`-like schema
- [ ] Merge into `report_builder.py` as a distinct `synthesis` section
- [ ] Feature-flag via `ENABLE_YOSYS` env var; confirm the app works fully with it both on and off

**Exit criteria:** With Yosys enabled, at least one fixture's latch-inference bug is independently confirmed by a real Yosys warning, shown side-by-side with the AI finding.

---

## Phase 6: Polish & Packaging (1–2 days)
**Goal:** Make it demo-ready and interview-ready.

- [ ] Write `README.md`: setup instructions, architecture summary, how to add a new bug pattern, known limitations
- [ ] Clean up UI (spacing, severity color legend, empty/error states)
- [ ] Record a 2-3 minute demo video/GIF (paste buggy code → see findings appear)
- [ ] Finalize resume bullet (see PRD.md), sanity-check against RULES.md §8 (no overclaiming)
- [ ] Tag a `v1.0` release/commit

**Exit criteria:** A stranger could clone the repo, follow the README, and get the tool running and demoing correctly within ~15 minutes.

---

## Rough Timeline Summary
| Phase | Duration | Cumulative |
|---|---|---|
| 0. Setup | 0.5 day | 0.5 |
| 1. Learn Verilog | 2–3 days | ~3.5 |
| 2. Bug-pattern KB | 2–3 days | ~6.5 |
| 3. Pipeline build | 4–5 days | ~11.5 |
| 4. Testing | 2 days | ~13.5 |
| 5. Yosys (stretch) | 1–2 days | ~15.5 |
| 6. Polish | 1–2 days | ~17.5 |

~2.5–3 weeks total, matching the original estimate, with Phase 5 explicitly optional/parallelizable if time is tight.
