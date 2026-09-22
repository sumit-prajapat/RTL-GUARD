# Product Requirements Document (PRD)
## AI Verilog Code Reviewer & Bug Detector

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-09-21

---

## 1. Problem Statement
Junior and self-taught RTL/VLSI engineers frequently introduce subtle, high-impact bugs in Verilog code — blocking vs non-blocking misuse, unintended latch inference, incomplete sensitivity lists — that simulate "fine" in many test scenarios but cause real silicon/synthesis mismatches. These bugs are also exactly the vocabulary tested in RTL design interviews. There's no lightweight, explain-as-you-go tool that catches these specific patterns and teaches the "why" in plain English, the way a senior engineer would during a code review.

## 2. Goal
Build a tool that acts like a senior RTL reviewer: paste/upload Verilog, get back a list of likely bugs, each explained simply, each with a suggested fix — while also serving as a strong, demonstrable portfolio project that proves applied RAG + LLM engineering skill in a hardware-adjacent domain.

## 3. Objectives & Success Metrics
| Objective | Metric |
|---|---|
| Catch the core bug classes reliably | ≥90% detection rate on seeded fixture bugs (5 bug types × multiple instances) |
| Low noise | Zero false positives on hand-verified "clean" reference modules |
| Fast enough to feel interactive | <10s median response time |
| Usable as an interview artifact | Working live demo + README + resume bullet backed by Yosys validation (stretch) |
| Reusable knowledge base | Adding a new bug pattern requires no code changes, only a corpus doc |

## 4. Target Users
- **Primary:** the builder, both as a learning exercise and as an interview-prep artifact.
- **Secondary:** any junior RTL engineer or student wanting a quick sanity check on small Verilog modules before simulation.

## 5. User Stories
1. As a user, I want to paste a Verilog module and get a list of likely bugs, so I can fix them before running simulation.
2. As a user, I want each flagged issue explained in plain English, so I understand *why* it's a bug, not just that it is one.
3. As a user, I want a suggested fix (code-level), so I can compare it against my own code directly.
4. As a user, I want obvious syntax problems caught instantly without waiting on an LLM call, so feedback feels fast.
5. As a user, I want to optionally validate findings against real synthesis output (Yosys), so I trust the tool isn't just "guessing."
6. As a developer extending this tool, I want to add a new bug pattern by writing a markdown doc, not by editing prompt code, so the corpus stays maintainable.

## 6. Scope

### In Scope (v1)
- Single-module Verilog input (paste or file upload).
- Static pre-check pass (non-AI).
- RAG-based retrieval over a bug-pattern corpus (8-10 patterns minimum).
- LLM-based issue detection + explanation + fix suggestion.
- Structured results UI.
- Regression test fixtures with seeded bugs.

### Out of Scope (v1)
- SystemVerilog-only constructs (interfaces, classes, assertions).
- Multi-file/hierarchical designs.
- Timing/power analysis.
- User accounts, auth, saved history.
- IDE integration.

### Stretch
- Yosys synthesis integration as a secondary validation signal.

## 7. Feature List (Prioritized)

| Priority | Feature |
|---|---|
| P0 | Code input (paste + upload) |
| P0 | Static pre-check (begin/end, semicolons, endmodule) |
| P0 | Bug-pattern corpus (8-10 docs) + FAISS indexing |
| P0 | RAG retrieval + LLM prompt construction |
| P0 | Structured issue report (title, line, severity, explanation, fix) |
| P0 | Results UI panel |
| P1 | Line-highlighting of flagged code in the editor |
| P1 | Regression test suite against seeded + external Verilog samples |
| P2 (stretch) | Yosys synthesis integration |
| P2 (stretch) | Confidence/severity tuning based on pattern match strength |

## 8. Non-Goals
- This is not a full linter/formal-verification replacement (e.g., not a Verilator or SpyGlass competitor).
- Not intended for production/tapeout-grade sign-off — explicitly a learning + review-assist tool.

## 9. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| LLM hallucinates issues not actually present | Ground every finding in a retrieved corpus citation; require the prompt to only flag patterns it can tie to a specific rule |
| LLM misses real bugs (false negatives) | Static pre-check catches syntax-level issues independent of LLM; corpus expanded iteratively based on test failures |
| Regex-based pre-check is fragile on real-world code | Scope pre-check to a small, well-tested set of checks only; don't over-promise its coverage |
| Yosys install/environment friction | Feature-flag it; core product works fully without it |
| Line-number attribution from LLM is inaccurate | Treat line numbers as "best effort"; always show full code alongside |

## 10. Milestones (ties to PHASES.md)
1. Learn Verilog basics + write reference modules
2. Build bug-pattern knowledge base
3. Build backend + frontend pipeline
4. Test against seeded + external bugs
5. (Stretch) Yosys integration
6. Polish, README, resume bullet, demo recording

## 11. Deliverables
- Working web app (FastAPI backend + React frontend)
- Bug-pattern corpus (markdown/JSON docs)
- FAISS index build script
- Test fixture set (buggy + clean modules)
- README with setup instructions and corpus-extension guide
- Short demo (screen recording or live) for interview use
