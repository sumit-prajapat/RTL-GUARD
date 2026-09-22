# Project Rules
## AI Verilog Code Reviewer & Bug Detector

**Version:** 1.0
**Last Updated:** 2026-09-21

These rules apply to anyone (human or AI coding assistant) working on this codebase. They exist to keep the project demo-ready, extensible, and honest about what it actually does.

---

## 1. Scope Discipline
- R1.1 — Do not add SystemVerilog, multi-file, timing, or IDE-plugin support in v1. If tempted, add it to `PRD.md`'s "Future Considerations" instead of building it now.
- R1.2 — Every new feature must map to a line item in `PRD.md`'s feature list. If it doesn't, either add it there first (with priority) or don't build it.
- R1.3 — Stretch features (Yosys) must always be feature-flagged and must never be a hard dependency of the core pipeline.

## 2. Corpus (Bug-Pattern Knowledge Base) Rules
- R2.1 — Every bug-pattern doc MUST contain exactly these sections: `Name`, `Tags`, `Explanation`, `Bad Example`, `Fixed Example`, `Why It Matters`. See DESIGN.md for the template.
- R2.2 — Never hardcode bug explanations directly inside prompt strings in code. All domain knowledge lives in `corpus/bug_patterns/*.md`, not in Python files.
- R2.3 — After adding/editing any corpus file, `scripts/ingest_corpus.py` MUST be re-run before the change takes effect. Do not attempt to hot-patch the FAISS index in memory.
- R2.4 — Each corpus doc must be independently understandable — no "see pattern #3" cross-references, since chunks are retrieved individually.

## 3. LLM Prompting Rules
- R3.1 — The system prompt MUST instruct the model to only report an issue if it can cite a specific retrieved pattern reference. Freeform "vibes-based" findings with no `pattern_ref` are not allowed in the output schema.
- R3.2 — Output format MUST be enforced as JSON matching `models/schemas.py`. Never parse free text with regex to extract findings — fix the prompt/schema instead.
- R3.3 — Never send full corpus (all patterns) in every prompt. Only send the top-k retrieved chunks. This is the entire point of using RAG instead of a static system prompt.
- R3.4 — Log the exact prompt sent and raw LLM response (to a local dev log, never to persistent user-facing storage) during development, to make prompt-debugging possible. Strip this logging down for anything resembling a public deployment.

## 4. Static Pre-Check Rules
- R4.1 — Pre-check functions MUST be pure (no I/O, no network calls) and MUST run without the LLM being reachable.
- R4.2 — Pre-check MUST NOT claim more coverage than it has. Do not label a heuristic regex check as "syntax validation" — call it what it is ("missing-semicolon heuristic").
- R4.3 — Never let a pre-check false positive block the request from reaching the AI stage. Pre-check results are additive, not gating.

## 5. Backend/API Rules
- R5.1 — Every endpoint returns a response conforming to a Pydantic schema — no raw dicts returned from route handlers.
- R5.2 — Every external call (LLM, Yosys subprocess) must have an explicit timeout and must degrade gracefully per ARCHITECTURE.md §6, never raise an unhandled 500 to the frontend.
- R5.3 — No code submitted by the user is ever written to a path outside a dedicated temp directory, and temp files must be cleaned up after the request (even on error — use `try/finally` or context managers).
- R5.4 — `llm_client.py` is the only module allowed to import the Groq SDK / call its API directly. All other modules interact with it through its `generate()` interface.

## 6. Frontend Rules
- R6.1 — Precheck, AI findings, and synthesis results render as visually distinct sections — never merge them into one undifferentiated list (the user needs to know which layer caught what).
- R6.2 — Never block the entire results panel on Yosys if it's slow/disabled — it renders last and independently.
- R6.3 — Severity must always be shown with both color AND text label (not color alone), for accessibility.

## 7. Testing Rules
- R7.1 — Every bug pattern in the corpus MUST have at least one corresponding fixture in `tests/fixtures/buggy/` that seeds exactly that bug.
- R7.2 — No pull request / merge to main is considered "done" if it drops detection rate on existing fixtures below the last recorded baseline (see PHASES.md Stage 4).
- R7.3 — At least 3 fixtures must come from external, not-self-written sources at all times, to guard against overfitting to the author's own coding style.
- R7.4 — Clean (bug-free) fixture modules must produce zero AI findings; any nonzero finding on a clean fixture is treated as a bug in the tool itself, not a "maybe correct" flag.

## 8. Honesty & Interview-Readiness Rules
- R8.1 — Never claim in documentation, README, or resume language that the tool does something it doesn't (e.g., don't say "formal verification" — it's pattern-based static+AI review, optionally cross-checked with synthesis).
- R8.2 — The resume bullet and any public description must stay consistent with what's actually implemented at time of writing — update wording immediately if scope changes.
- R8.3 — Keep a running note of known false positives/negatives discovered during testing (see MEMORY.md) — this becomes genuinely useful interview talking-point material ("here's a limitation I found and how I'd address it").

## 9. General Engineering Hygiene
- R9.1 — Small, working increments over big-bang builds — each phase in PHASES.md should produce something runnable/demoable, even if incomplete.
- R9.2 — No secrets (API keys) committed to the repo — `.env` + `.env.example`, `.gitignore` covers `.env`.
- R9.3 — Every new module gets at least a docstring stating its single responsibility, matching its role in ARCHITECTURE.md.
