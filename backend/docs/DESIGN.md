# Design Document
## AI Verilog Code Reviewer & Bug Detector

**Version:** 1.0
**Last Updated:** 2026-09-21

This document covers UI/UX design and the internal document/schema design (corpus format, report format, prompt structure). For system architecture, see `ARCHITECTURE.md`.

---

## 1. UI/UX Design

### 1.1 Layout (single-page, two-pane)
```
┌───────────────────────────────────────────────────────────────┐
│  Header: "AI Verilog Code Reviewer"        [Options ▾] [Run]   │
├───────────────────────────────┬─────────────────────────────────┤
│                                 │  Results                        │
│   Code Input Panel             │  ┌─────────────────────────┐    │
│   (Monaco / textarea)          │  │ Pre-Check (2 issues)      │    │
│                                 │  └─────────────────────────┘    │
│   [Upload .v file]              │  ┌─────────────────────────┐    │
│                                 │  │ AI Findings (3 issues)   │    │
│                                 │  │  ● HIGH  Latch inference │    │
│                                 │  │  ● MED   Sensitivity...  │    │
│                                 │  │  ● LOW   Width mismatch  │    │
│                                 │  └─────────────────────────┘    │
│                                 │  ┌─────────────────────────┐    │
│                                 │  │ Synthesis (Yosys) [off]  │    │
│                                 │  └─────────────────────────┘    │
└───────────────────────────────┴─────────────────────────────────┘
```

### 1.2 Core Screens/States
1. **Empty state** — placeholder text in code panel ("Paste your Verilog module here, or upload a .v file"), Run button disabled.
2. **Loading state** — Run button shows spinner + "Analyzing…"; pre-check results may appear near-instantly, then AI findings populate when ready (progressive reveal is a nice-to-have, not required for v1).
3. **Results state** — three collapsible sections as shown above.
4. **Error state** — a single dismissible banner: "Analysis failed: [reason]. Static checks below are still shown." (per ARCHITECTURE.md §6 graceful degradation).
5. **Degraded state** — badge next to "AI Findings" header: "⚠ AI response format issue — showing best-effort results."

### 1.3 IssueCard Component
Each issue renders as a card with:
- Severity dot + label (`HIGH` / `MEDIUM` / `LOW`) — color AND text (accessibility, RULES.md R6.3)
- Title (e.g., "Blocking assignment in clocked always block")
- Line reference (e.g., "Line 24" — clickable, scrolls/highlights code panel)
- Explanation (plain English, 2-4 sentences)
- Matched pattern reference (small caption: "Matched pattern: blocking-assignment-in-sequential-logic")
- Suggested fix (code block, diff-style if feasible: `- old_line` / `+ new_line`)

### 1.4 Severity Color Convention
| Severity | Color | Meaning |
|---|---|---|
| HIGH | Red | Likely functional bug (e.g., latch inference, blocking/non-blocking misuse in sequential logic) |
| MEDIUM | Amber | Style/robustness issue that can cause bugs under some conditions (e.g., incomplete sensitivity list) |
| LOW | Blue/Gray | Best-practice suggestion, unlikely to cause a functional bug alone (e.g., naming, minor width mismatch) |

### 1.5 Visual Style Notes
- Monospace font (e.g., `JetBrains Mono` or system monospace fallback) for all code display.
- Keep the palette simple: neutral background, one accent color for the "Run" CTA, severity colors reserved only for issue badges (don't overload color elsewhere).
- Line-highlighting in the editor should use a subtle background tint matching severity color at low opacity, not a jarring full-saturation highlight.

---

## 2. Bug-Pattern Corpus Document Template

Every file in `corpus/bug_patterns/` MUST follow this exact structure (enforced by RULES.md R2.1):

```markdown
# Pattern: <short-kebab-case-id>

## Name
<Human-readable name, e.g., "Missing Default Case Causing Latch Inference">

## Tags
combinational, latch, case-statement

## Explanation
<2-4 sentences explaining the mechanism of the bug in plain English —
what the synthesis tool actually does when it sees this code, and why
it differs from what a simulation-only mental model might expect.>

## Bad Example
```verilog
always @(*) begin
    case (sel)
        2'b00: out = a;
        2'b01: out = b;
        // missing 2'b10, 2'b11, and no default
    endcase
end
```

## Fixed Example
```verilog
always @(*) begin
    case (sel)
        2'b00: out = a;
        2'b01: out = b;
        default: out = 1'b0;
    endcase
end
```

## Why It Matters
<1-2 sentences: what breaks in real hardware/synthesis if this ships
as-is — e.g., "The synthesizer infers a latch to hold `out`'s previous
value for unhandled `sel` values, which is almost never the intended
behavior and can cause timing/glitch issues.">
```

Notes:
- Keep each doc self-contained (RULES.md R2.4) — no cross-references to other pattern IDs.
- The `Tags` line aids future filtering/debugging of retrieval quality; it is not currently used to hard-filter retrieval in v1 (pure embedding similarity is used), but should stay accurate.

---

## 3. Prompt Design

### 3.1 System Prompt (fixed, versioned in `prompt_builder.py` or a `prompts/system.md` file)
Key instructions the system prompt MUST encode:
1. You are a senior RTL design reviewer.
2. You will be given: (a) a Verilog module, (b) a set of retrieved bug-pattern references.
3. Only report an issue if it matches one of the provided pattern references — cite the pattern's id in `pattern_ref`. Do not invent issues outside the provided patterns.
4. If you're unsure of the exact line number, give your best estimate rather than omitting it.
5. Output ONLY valid JSON matching the given schema. No prose before or after.
6. Assign severity based on functional-impact guidance (see §1.4 severities above) mapped into the prompt.

### 3.2 User Message Structure
```
## Retrieved Bug Patterns
[pattern_id_1]: <full markdown doc text>
[pattern_id_2]: <full markdown doc text>
...

## Submitted Verilog Code
```verilog
<code>
```

## Output Schema
{ "findings": [ { "title": ..., "pattern_ref": ..., "line": ..., "severity": ..., "explanation": ..., "suggested_fix": ... } ] }
```

### 3.3 Prompt Iteration Log
Maintain a running log (in `MEMORY.md` or a dedicated `prompts/CHANGELOG.md`) of prompt wording changes and their measured effect on the Phase-4 fixture detection rate, so regressions are traceable.

---

## 4. Report Schema (canonical — mirrors SRS §5.2)

```json
{
  "precheck": [
    {
      "type": "unbalanced_begin_end",
      "line": 12,
      "message": "..."
    }
  ],
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
  "synthesis": {
    "enabled": false,
    "warnings": []
  },
  "degraded": false,
  "error_message": null
}
```

## 5. Accessibility & Responsiveness Notes
- Minimum supported width: 1366px for the two-pane layout; below that, stack panels vertically (code on top, results below).
- All severity indicators paired with text labels, never color-only (RULES.md R6.3).
- Ensure sufficient contrast ratio (WCAG AA) between severity badge backgrounds and text.
