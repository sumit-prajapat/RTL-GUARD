"""
Deterministic static pre-check module for Verilog code.
Performs lightweight, pure regex/token scanning without calling external services.
Complies with RULES.md R4.1 - R4.3 (pure functions, no network/LLM dependencies).
"""

import re
from typing import List, Tuple
from models.schemas import PrecheckIssue


def strip_comments_and_strings(code: str) -> str:
    """
    Strips single-line (//) and multi-line (/* */) comments,
    preserving line count so line numbering remains accurate.
    """
    def replacer(match):
        s = match.group(0)
        if s.startswith("/"):
            # Replace comment with same number of newlines to keep line numbers aligned
            return "\n" * s.count("\n")
        return s

    pattern = re.compile(
        r'//.*?$|/\*.*?\*/|"(?:\\.|[^\\"])*"',
        re.DOTALL | re.MULTILINE
    )
    return re.sub(pattern, replacer, code)


def check_begin_end_balance(code: str) -> List[PrecheckIssue]:
    """Detects unbalanced begin and end keyword pairs."""
    issues: List[PrecheckIssue] = []
    clean_code = strip_comments_and_strings(code)
    
    begin_matches = list(re.finditer(r"\bbegin\b", clean_code))
    end_matches = list(re.finditer(r"\bend\b", clean_code))

    begin_count = len(begin_matches)
    end_count = len(end_matches)

    if begin_count > end_count:
        # Highlight approximate location of last unpaired begin
        last_begin_idx = begin_matches[-1].start()
        line_no = clean_code[:last_begin_idx].count("\n") + 1
        issues.append(
            PrecheckIssue(
                type="unbalanced_begin_end",
                line=line_no,
                message=f"Syntax notice: Found {begin_count} 'begin' keywords but only {end_count} 'end' keywords (missing {begin_count - end_count} 'end')."
            )
        )
    elif end_count > begin_count:
        last_end_idx = end_matches[-1].start()
        line_no = clean_code[:last_end_idx].count("\n") + 1
        issues.append(
            PrecheckIssue(
                type="unbalanced_begin_end",
                line=line_no,
                message=f"Syntax notice: Found {end_count} 'end' keywords but only {begin_count} 'begin' keywords (extraneous {end_count - begin_count} 'end')."
            )
        )

    return issues


def check_endmodule_present(code: str) -> List[PrecheckIssue]:
    """Detects missing endmodule in Verilog module definition."""
    issues: List[PrecheckIssue] = []
    clean_code = strip_comments_and_strings(code)

    has_module = bool(re.search(r"\bmodule\b", clean_code))
    has_endmodule = bool(re.search(r"\bendmodule\b", clean_code))

    if has_module and not has_endmodule:
        total_lines = len(code.splitlines())
        issues.append(
            PrecheckIssue(
                type="missing_endmodule",
                line=total_lines,
                message="Syntax notice: 'module' declared but 'endmodule' keyword is missing."
            )
        )

    return issues


def check_missing_semicolons(code: str) -> List[PrecheckIssue]:
    """
    Heuristic check for missing semicolons on common single-line declarations or assignments.
    Conservative to prevent false positives on multi-line statements.
    """
    issues: List[PrecheckIssue] = []
    lines = code.splitlines()

    for idx, raw_line in enumerate(lines, start=1):
        line = re.sub(r"//.*$", "", raw_line).strip()
        if not line:
            continue

        # Check standard port, wire, reg declarations or assignments that must end in semicolon
        is_candidate = bool(
            re.match(r"^(?:input|output|inout|wire|reg|integer|parameter|localparam)\b", line) or
            re.search(r"<=\s*[^;]+$|=\s*[^;]+$", line)
        )

        # Exclude block starters, conditionals, and module headers
        is_exempt = bool(
            line.endswith(";") or
            line.endswith(",") or
            line.endswith("(") or
            line.endswith(")") or
            line.endswith("begin") or
            re.search(r"\b(?:module|endmodule|case|endcase|if|else|fork|join)\b", line)
        )

        if is_candidate and not is_exempt:
            # Check if next non-empty line starts with a continuing token
            next_line_continuation = False
            for forward_idx in range(idx, min(idx + 3, len(lines))):
                f_line = re.sub(r"//.*$", "", lines[forward_idx]).strip()
                if f_line:
                    if f_line.startswith(("begin", "else", ";", ",", ")", "=")):
                        next_line_continuation = True
                    break

            if not next_line_continuation:
                issues.append(
                    PrecheckIssue(
                        type="missing_semicolon_heuristic",
                        line=idx,
                        message=f"Missing semicolon heuristic: statement on line {idx} may be missing a terminating ';'."
                    )
                )

    return issues


def run_precheck(code: str) -> List[PrecheckIssue]:
    """Executes all deterministic static checks and aggregates issues."""
    issues: List[PrecheckIssue] = []
    issues.extend(check_begin_end_balance(code))
    issues.extend(check_endmodule_present(code))
    issues.extend(check_missing_semicolons(code))
    return issues
