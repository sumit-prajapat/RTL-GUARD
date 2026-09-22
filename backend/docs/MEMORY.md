# Project Memory
## AI Verilog Code Reviewer & Bug Detector

**Purpose:** A living log of decisions, baselines, known limitations, and open questions — so context isn't lost between work sessions (yours, or an AI assistant's). Update this file at the end of every work session. Do not delete old entries; append and mark superseded items as such.

---

## 1. Project Snapshot
- **Current phase:** Phase 3 Complete (Full pipeline built: precheck, RAG, prompt builder, LLM client, review route, test suite 13/13 passing, and complete React UI; moving to Phase 4: Testing against external bugs)
- **Stack confirmed:** FastAPI + React + FAISS + HuggingFace embeddings + Groq LLM (isolated in backend/.venv)
- **Stretch goal committed:** Yosys integration — feature-flagged, not blocking v1 completion

---

## 2. Key Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-09-21 | Use RAG (FAISS) instead of stuffing all bug patterns into every prompt | Keeps prompts small/cheap, demonstrates actual RAG engineering (the point of the portfolio project), scales cleanly as corpus grows |
| 2026-09-21 | Static pre-check kept entirely non-AI (regex/heuristic) | Fast, free, always available even if LLM call fails; sets a clear "layered" architecture story for interviews |
| 2026-09-21 | LLM must cite a `pattern_ref` for every finding | Prevents hallucinated/ungrounded findings; makes the RAG step verifiably load-bearing rather than decorative |
| 2026-09-21 | Yosys integration is feature-flagged, not core | Environment friction (Linux-only, install complexity) shouldn't block the core product from working everywhere |
| 2026-09-21 | Single-module, single-file scope only for v1 | Keeps corpus and prompt design tractable; multi-file hierarchy is a real can of worms deferred to "Future Considerations" |

---

## 3. Bug-Pattern Corpus — Status Tracker

| Pattern ID | Written? | Fixture Seeded? | Detection Verified? |
|---|---|---|---|
| incomplete-sensitivity-list | ☑ | ☑ | ☑ |
| blocking-in-sequential | ☑ | ☑ | ☑ |
| nonblocking-in-combinational | ☑ | ☑ | ☑ |
| missing-default-case-latch | ☑ | ☑ | ☑ |
| multiple-drivers | ☑ | ☑ | ☑ |
| width-mismatch | ☑ | ☑ | ☑ |
| mixed-blocking-nonblocking | ☑ | ☑ | ☑ |
| missing-reset-handling | ☑ | ☑ | ☑ |
| combinational-loop (optional) | ☐ | ☐ | ☐ |
| wire-vs-reg-misuse (optional) | ☐ | ☐ | ☐ |

*(Update checkboxes as Phase 2 progresses — see PHASES.md.)*

---

## 4. Detection Rate Baselines (fill in during Phase 4)

| Test Run Date | Fixture Set | Detection Rate | False Positive Rate | Notes |
|---|---|---|---|---|
| _(not yet run)_ | seeded (buggy) | — | — | — |
| _(not yet run)_ | clean | — | N/A | — |
| _(not yet run)_ | external | — | — | — |

**Rule reminder (RULES.md R7.2):** never merge a change that drops detection rate below the last recorded baseline here without an explicit note explaining why (e.g., "traded 1 false negative for eliminating 3 false positives — net improvement").

---

## 5. Known Limitations (living list)
- Line-number attribution from the LLM is best-effort, not guaranteed exact (SRS §NFR / FR-6.3).
- Static pre-check is heuristic (regex-based), not a real parser — will miss/misfire on unusual formatting styles.
- v1 has no concept of multi-file or hierarchical designs — a module instantiating another module's undeclared bugs won't be seen.
- SystemVerilog-only syntax is untested and may confuse both the pre-check and the LLM prompt.

*(Add to this list every time testing surfaces a real limitation — this becomes genuine interview material per RULES.md R8.3.)*

---

## 6. Open Questions / Parking Lot
- Should severity be purely LLM-assigned, or should certain pattern_refs have a *fixed* minimum severity regardless of LLM judgment (e.g., latch inference should probably never be scored LOW)? → Revisit during Phase 4 tuning.
- Is `all-MiniLM-L6-v2` embedding quality sufficient for code-shaped text, or should code be summarized/normalized before embedding (e.g., strip comments/whitespace) to improve retrieval? → Test empirically in Phase 2.
- Worth adding a lightweight feedback mechanism (thumbs up/down per finding) even in v1 for future corpus tuning? → Currently out of scope (PRD §6), reconsider only if time allows after Phase 6.

---

## 7. Session Log (append-only)
> Add a short entry each time you sit down to work on this project — 2-4 lines: what you did, what you learned, what's next.

**2026-09-21** — Drafted full planning doc set (SRS, PRD, ARCHITECTURE, RULES, PHASES, DESIGN, MEMORY). No code written yet. Next: Phase 0 setup + Phase 1 (learn Verilog basics, write 5-6 reference modules).
**2026-09-22** — Completed Phase 0 (backend scaffold, virtual environment, dependencies, health check 200, frontend Vite scaffold with clean build, root README.md). Completed Phase 1 (authored and verified 5 clean Verilog reference fixtures: counter, mux4to1, fsm_moore, dff_sync, alu8bit). Completed Phase 2 (authored 8 bug-pattern markdown docs under backend/corpus/bug_patterns/, derived 8 seeded-bug fixtures under backend/tests/fixtures/buggy/, built multi-view FAISS index via ingest_corpus.py, and verified 100% Top-5 retrieval accuracy across all 8 bug patterns with 6/8 ranking #1). Completed Phase 3 (implemented precheck.py, rag.py, prompt_builder.py, llm_client.py with offline fallback & Groq integration, yosys_runner.py, and review.py route; verified with pytest suite passing 13/13 tests; implemented full modern React UI in frontend/src/ with CodeInputPanel, ResultsPanel, and IssueCard; verified clean build). Ready for Phase 4.
