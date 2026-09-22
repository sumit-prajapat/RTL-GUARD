"""
Unit & Regression test suite for RTL-guard backend.
Tests:
1. Static pre-checks (pure regex/token checks).
2. RAG similarity retrieval (FAISS).
3. End-to-end /api/review endpoint on clean modules (zero false positives per RULES.md R7.4).
4. End-to-end /api/review endpoint on seeded buggy fixtures.
"""

import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"

import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from main import app
from services.precheck import run_precheck, check_begin_end_balance, check_endmodule_present, check_missing_semicolons
from services.rag import get_rag_service

client = TestClient(app)
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


# ---------------------------------------------------------
# 1. Static Pre-Check Tests
# ---------------------------------------------------------
def test_precheck_clean_counter():
    code = (FIXTURES_DIR / "clean" / "counter.v").read_text()
    issues = run_precheck(code)
    assert len(issues) == 0, f"Expected 0 precheck issues on clean counter, got: {issues}"


def test_precheck_unbalanced_begin():
    code = """
    module test;
        always @(posedge clk) begin
            a <= 1;
        // missing end
    endmodule
    """
    issues = check_begin_end_balance(code)
    assert len(issues) == 1
    assert issues[0].type == "unbalanced_begin_end"


def test_precheck_missing_endmodule():
    code = """
    module test;
        always @(posedge clk) begin
            a <= 1;
        end
    """
    issues = check_endmodule_present(code)
    assert len(issues) == 1
    assert issues[0].type == "missing_endmodule"


def test_precheck_missing_semicolon():
    code = """
    module test;
        wire [3:0] sig
        always @(posedge clk) begin
            a <= 1;
        end
    endmodule
    """
    issues = check_missing_semicolons(code)
    assert any(i.type == "missing_semicolon_heuristic" for i in issues)


# ---------------------------------------------------------
# 2. RAG Vector Retrieval Tests
# ---------------------------------------------------------
def test_rag_retrieves_patterns():
    rag = get_rag_service()
    assert len(rag.documents) == 8, f"Expected 8 corpus documents, found: {len(rag.documents)}"

    # Test latch query
    results = rag.retrieve("always @(*) case (sel) 2'b00: out = in; endcase", k=5)
    matched_ids = [d["pattern_id"] for d in results]
    assert "missing-default-case-latch" in matched_ids, f"Expected latch pattern in top 5, got: {matched_ids}"


# ---------------------------------------------------------
# 3. Clean Fixtures (Zero False Positives Gate - RULES.md R7.4)
# ---------------------------------------------------------
@pytest.mark.parametrize("filename", ["counter.v", "mux4to1.v", "fsm_moore.v", "dff_sync.v", "alu8bit.v"])
def test_clean_fixtures_zero_false_positives(filename):
    filepath = FIXTURES_DIR / "clean" / filename
    assert filepath.exists(), f"Fixture {filename} not found"
    code = filepath.read_text(encoding="utf-8")

    res = client.post("/api/review", json={"code": code})
    assert res.status_code == 200
    data = res.json()

    assert len(data["precheck"]) == 0, f"Precheck false positive on {filename}: {data['precheck']}"
    assert len(data["ai_findings"]) == 0, f"AI false positive on clean fixture {filename}: {data['ai_findings']}"


# ---------------------------------------------------------
# 4. Buggy Fixtures (Positive Bug Detection)
# ---------------------------------------------------------
def test_detects_missing_default_latch():
    code = (FIXTURES_DIR / "buggy" / "buggy_latch_missing_default.v").read_text()
    res = client.post("/api/review", json={"code": code})
    assert res.status_code == 200
    findings = res.json()["ai_findings"]
    assert any(f["pattern_ref"] == "missing-default-case-latch" for f in findings)


def test_detects_blocking_in_sequential():
    code = (FIXTURES_DIR / "buggy" / "buggy_blocking_in_seq.v").read_text()
    res = client.post("/api/review", json={"code": code})
    assert res.status_code == 200
    findings = res.json()["ai_findings"]
    assert any(f["pattern_ref"] == "blocking-in-sequential" for f in findings)


def test_detects_nonblocking_in_combinational():
    code = (FIXTURES_DIR / "buggy" / "buggy_nonblocking_in_comb.v").read_text()
    res = client.post("/api/review", json={"code": code})
    assert res.status_code == 200
    findings = res.json()["ai_findings"]
    assert any(f["pattern_ref"] == "nonblocking-in-combinational" for f in findings)
