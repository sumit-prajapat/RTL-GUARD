"""
Prompt builder service for RTL-guard.
Constructs structured, grounded prompts combining submitted Verilog code with
top-k retrieved bug patterns. Complies with RULES.md R3.1-R3.3.
"""

from typing import List, Dict, Any, Tuple


SYSTEM_PROMPT = """You are a senior RTL and ASIC/VLSI design reviewer.
Your job is to analyze Verilog code, detect subtle design bugs, and explain the physical hardware and simulation implications.

STRICT GROUNDING RULES:
1. You will be provided with:
   (a) A set of retrieved bug patterns from our hardware knowledge base.
   (b) The user's submitted Verilog source code.
2. You MUST ONLY report an issue if it directly matches one of the provided bug patterns.
3. Every finding MUST cite the exact kebab-case identifier in `pattern_ref` corresponding to the matched pattern. Do not invent custom pattern names or report generic style remarks outside the provided patterns.
4. If the code is clean and exhibits none of the provided bug patterns, return an empty list: {"findings": []}.
5. Line numbers: provide the 1-indexed line number where the issue occurs in the submitted code (best-effort).
6. Severity assignment:
   - "high": Fatal functional defect or silicon hazard (e.g. unintended latch, multiple drivers, blocking assignment in sequential logic).
   - "medium": Simulation/synthesis divergence or race hazard (e.g. incomplete sensitivity list, non-blocking in combinational, missing reset).
   - "low": Bit-width truncation or non-critical coding guideline discrepancy.
7. Explanations: Explain clearly in 2-4 sentences WHY this pattern fails in hardware synthesis or simulation.
8. Suggested fix: Provide clean, idiomatic replacement Verilog code for the affected statement or block.

OUTPUT FORMAT:
Output ONLY a valid JSON object matching this schema, with no markdown fences, no preface, and no commentary:
{
  "findings": [
    {
      "title": "Short descriptive title",
      "pattern_ref": "exact-kebab-case-id-from-retrieved-patterns",
      "line": 10,
      "severity": "high",
      "explanation": "Clear explanation of why it is a bug.",
      "suggested_fix": "Exact fixed code replacement."
    }
  ]
}
"""


def build_review_prompt(code: str, retrieved_patterns: List[Dict[str, Any]]) -> Tuple[str, str]:
    """
    Constructs the system prompt and user prompt for LLM evaluation.
    Returns (system_prompt, user_prompt).
    """
    pattern_sections = []
    for doc in retrieved_patterns:
        section = (
            f"### Pattern Reference: {doc['pattern_id']}\n"
            f"Name: {doc['name']}\n"
            f"Explanation: {doc['explanation']}\n"
            f"Hardware Consequence: {doc['why_it_matters']}\n"
            f"Example Bad Code:\n```verilog\n{doc['bad_example']}\n```\n"
            f"Example Fixed Code:\n```verilog\n{doc['fixed_example']}\n```"
        )
        pattern_sections.append(section)

    patterns_text = "\n\n".join(pattern_sections) if pattern_sections else "No matching patterns retrieved."

    user_prompt = f"""## Retrieved Bug Patterns Knowledge Base
{patterns_text}

---

## Submitted Verilog Code for Review
```verilog
{code}
```

Review the submitted Verilog code strictly against the retrieved patterns above and output the result as JSON.
"""

    return SYSTEM_PROMPT, user_prompt
