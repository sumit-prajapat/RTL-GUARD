# Software Requirements Specification (SRS)
## AI Verilog Code Reviewer & Bug Detector

**Version:** 1.0
**Status:** Draft
**Owner:** Project Author
**Last Updated:** 2026-09-21

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for the AI Verilog Code Reviewer, a tool that statically and semantically analyzes Verilog RTL source code, detects common RTL design bugs, and produces plain-English explanations and fix suggestions using a Retrieval-Augmented Generation (RAG) pipeline over a curated knowledge base of RTL bug patterns.

### 1.2 Scope
The system accepts Verilog (`.v`) source files or pasted snippets, runs a static pre-check pass, retrieves relevant bug-pattern documentation via FAISS similarity search, sends the code plus retrieved context to an LLM (via Groq/HuggingFace), and returns a structured report of flagged issues, citations to the matched bug pattern, and suggested fixes. An optional stretch phase integrates Yosys synthesis output as a second validation signal.

Out of scope for v1: SystemVerilog-specific constructs, full formal verification, timing analysis, multi-file hierarchical project analysis (single-module/single-file focus for v1), and IDE plugin integration.

### 1.3 Intended Audience
- The developer building the tool (primary)
- Reviewers evaluating it as a portfolio/interview artifact
- Future contributors extending the bug-pattern corpus

### 1.4 Definitions, Acronyms, Abbreviations
| Term | Definition |
|---|---|
| RTL | Register-Transfer Level (hardware description abstraction) |
| RAG | Retrieval-Augmented Generation |
| FAISS | Facebook AI Similarity Search — vector similarity index |
| Latch inference | Unintended sequential storage element created by incomplete combinational logic |
| Blocking/Non-blocking | `=` vs `<=` assignment operators in Verilog |
| Sensitivity list | Signal list in `always @(...)` that triggers block re-evaluation |
| Yosys | Open-source Verilog synthesis suite |

### 1.5 References
- IEEE 1364-2005 Verilog HDL Standard
- Yosys documentation (https://yosyshq.net/yosys/)
- Existing internal stack: FastAPI + React + FAISS + HuggingFace/Groq (Document QA project)

---

## 2. Overall Description

### 2.1 Product Perspective
This is a standalone web application reusing an existing internal RAG architecture (previously built for a Document QA system), repointed at a domain-specific corpus (RTL bug patterns) and a domain-specific input type (Verilog code instead of prose documents).

### 2.2 Product Functions (Summary)
1. Accept Verilog code input (file upload or pasted text).
2. Run deterministic static pre-checks (syntax-level, regex/parser-based).
3. Chunk/query a FAISS vector index of bug-pattern documents.
4. Construct an LLM prompt combining source code + retrieved patterns.
5. Call LLM (Groq) to identify issues, cite matched patterns, and suggest fixes.
6. Render results in a structured UI panel with severity, line references, explanation, and fix.
7. (Stretch) Run Yosys synthesis and merge its warnings/errors into the same report.

### 2.3 User Classes
- **Primary user:** the developer, testing/demoing the tool (single-user, no auth required for v1).
- **Secondary (future):** hiring managers/interviewers viewing a live demo.

### 2.4 Operating Environment
- Backend: Python 3.10+, FastAPI, running locally or on a single cloud VM/container.
- Frontend: React (Vite), served locally or via static hosting.
- LLM inference: Groq API (hosted, network-dependent).
- Optional: Yosys installed locally in the backend environment (Linux).

### 2.5 Design & Implementation Constraints
- Must reuse existing FAISS + HuggingFace embeddings pipeline (no new vector DB).
- Must keep LLM calls stateless per request (no persistent chat memory required for v1).
- Static pre-check must run without any LLM call (cost/latency control).
- No paid Verilog parser libraries; regex/lightweight parsing acceptable for v1.

### 2.6 Assumptions & Dependencies
- Input code is single-module, synthesizable-intent Verilog (not testbenches).
- Groq API key and rate limits are available and sufficient for demo-scale usage.
- User has basic familiarity with Verilog terminology when reading output.

---

## 3. Functional Requirements

### FR-1: Code Input
- FR-1.1 The system SHALL accept Verilog code via pasted text in a code editor component.
- FR-1.2 The system SHALL accept Verilog code via `.v` file upload.
- FR-1.3 The system SHALL reject empty or non-Verilog-looking input with a clear error message before invoking any backend analysis.

### FR-2: Static Pre-Check (non-AI)
- FR-2.1 The system SHALL detect unbalanced `begin`/`end` pairs.
- FR-2.2 The system SHALL detect missing semicolons on statement lines (heuristic).
- FR-2.3 The system SHALL detect missing `endmodule`.
- FR-2.4 Pre-check results SHALL be returned even if the LLM/RAG step fails or is skipped.

### FR-3: Bug-Pattern Knowledge Base (RAG corpus)
- FR-3.1 The system SHALL maintain a corpus of at least 8 bug-pattern documents, each with: name, explanation, bad-code example, fixed-code example, and tags.
- FR-3.2 Corpus documents SHALL be chunked and embedded into a FAISS index at build/startup time.
- FR-3.3 The corpus SHALL be re-indexable without code changes (e.g., re-run an ingestion script) when new patterns are added.

### FR-4: Retrieval
- FR-4.1 Given submitted code, the system SHALL query the FAISS index and retrieve the top-k (default k=5) most relevant bug-pattern chunks.
- FR-4.2 Retrieval SHALL be based on embedding similarity between code features/snippet and corpus documents.

### FR-5: LLM Analysis
- FR-5.1 The system SHALL construct a prompt containing: the submitted code, the retrieved bug-pattern context, and explicit output-format instructions.
- FR-5.2 The LLM response SHALL be structured (JSON) and include, per issue: issue title, matched pattern reference, line number(s) (best-effort), severity, plain-English explanation, and suggested fix.
- FR-5.3 The system SHALL handle and surface LLM/API errors gracefully (timeout, rate limit, malformed JSON) without crashing the request.

### FR-6: Results Display
- FR-6.1 The frontend SHALL display pre-check results separately from AI-detected issues.
- FR-6.2 The frontend SHALL display each AI-flagged issue with severity color-coding, explanation, and fix suggestion.
- FR-6.3 The frontend SHALL allow the user to view the original code with flagged lines highlighted (best-effort based on returned line numbers).

### FR-7: Yosys Integration (Stretch)
- FR-7.1 IF Yosys is available in the environment, the system SHALL run `synth` on submitted code and capture stdout/stderr.
- FR-7.2 Yosys warnings/errors SHALL be merged into the same structured report as a distinct "synthesis validation" section.
- FR-7.3 IF Yosys is unavailable, the system SHALL skip this step silently (feature-flagged) without failing the request.

### FR-8: Testing/Validation Support
- FR-8.1 The system SHALL include a small fixture set of known-buggy Verilog modules (derived from Stage 4) used for regression testing of detection accuracy.

---

## 4. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | End-to-end response time for a typical module (<150 lines) SHALL be under 10 seconds under normal API latency. |
| NFR-2 | The system SHALL not persist submitted code beyond the request lifecycle unless the user explicitly saves it (privacy-by-default). |
| NFR-3 | The backend SHALL log request/response metadata (not full code) for debugging, configurable via log level. |
| NFR-4 | The system SHALL degrade gracefully: if the LLM call fails, static pre-check results are still returned. |
| NFR-5 | The corpus and prompts SHALL be stored as versioned files (not hardcoded inline strings scattered across code) to support iteration. |
| NFR-6 | The UI SHALL be usable on a single laptop screen (1366x768 minimum) without horizontal scrolling of core panels. |

---

## 5. External Interface Requirements

### 5.1 API Endpoints (indicative)
- `POST /api/review` — body: `{ code: string, options?: { use_yosys: bool } }` → returns structured report JSON.
- `GET /api/health` — service health check.
- `GET /api/corpus` — (dev/admin) list loaded bug-pattern documents.

### 5.2 Report JSON Shape (indicative)
```json
{
  "precheck": [{"type": "unbalanced_begin_end", "line": 12, "message": "..."}],
  "ai_findings": [
    {
      "title": "Latch inference risk",
      "pattern_ref": "missing-default-case",
      "line": 24,
      "severity": "high",
      "explanation": "...",
      "suggested_fix": "..."
    }
  ],
  "synthesis": {"enabled": false, "warnings": []}
}
```

---

## 6. Acceptance Criteria (v1 "done" definition)
- Tool correctly flags all 5 seeded bug types in the Stage 4 test fixtures.
- Tool runs end-to-end on at least 3 external (not self-written) Verilog modules pulled from open repos.
- False-positive rate on the 5-6 hand-written "clean" modules from Stage 1 is zero for basic patterns (sensitivity list, blocking/non-blocking, latch).
- README documents setup, corpus format, and how to add a new bug pattern.

---

## 7. Future Considerations (post-v1)
- Multi-file/hierarchical project support.
- SystemVerilog construct support.
- IDE plugin (VS Code extension).
- Confidence scoring / false-positive suppression via user feedback loop.
