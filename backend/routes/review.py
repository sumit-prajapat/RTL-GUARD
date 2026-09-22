"""
Review API route for RTL-guard.
Orchestrates: Precheck -> RAG Retrieval -> Prompt Construction -> LLM Review -> Synthesis -> Aggregation.
"""

from fastapi import APIRouter, HTTPException
from models.schemas import ReviewRequest, ReviewResponse, SynthesisResult
from services.precheck import run_precheck
from services.rag import get_rag_service
from services.prompt_builder import build_review_prompt
from services.llm_client import get_llm_client
from services.yosys_runner import run_synthesis

router = APIRouter(prefix="/api", tags=["review"])

MAX_LINES = 600
MAX_BYTES = 60_000


@router.post("/review", response_model=ReviewResponse)
async def review_code(request: ReviewRequest) -> ReviewResponse:
    code = request.code.strip()

    if not code:
        raise HTTPException(status_code=400, detail="Submitted Verilog code cannot be empty.")

    # Guard against oversized input (ARCHITECTURE.md §6)
    lines = code.splitlines()
    if len(lines) > MAX_LINES or len(code.encode("utf-8")) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Input code exceeds maximum allowed size ({MAX_LINES} lines / {MAX_BYTES // 1000} KB for v1)."
        )

    # 1. Deterministic static pre-checks (pure, synchronous, fast)
    precheck_issues = run_precheck(code)

    # 2. RAG retrieval of top-k matching bug patterns
    rag_service = get_rag_service()
    retrieved_patterns = rag_service.retrieve(code, k=5)

    # 3. Prompt construction with strict grounding instructions
    system_prompt, user_prompt = build_review_prompt(code, retrieved_patterns)

    # 4. LLM execution with timeout, retry, and fallback
    llm_client = get_llm_client()
    ai_findings, degraded, error_msg = llm_client.generate(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        code_snippet=code,
        retrieved_patterns=retrieved_patterns,
    )

    # 5. Optional Yosys synthesis validation (feature-flagged)
    synthesis_result = SynthesisResult()
    if request.options and request.options.use_yosys:
        synthesis_result = run_synthesis(code)

    # 6. Aggregate response
    return ReviewResponse(
        precheck=precheck_issues,
        ai_findings=ai_findings,
        synthesis=synthesis_result,
        degraded=degraded,
        error_message=error_msg,
    )


@router.get("/corpus")
async def get_corpus_patterns():
    """Dev/Admin endpoint listing loaded bug-pattern documents (SRS.md §5.1)."""
    rag_service = get_rag_service()
    return {
        "count": len(rag_service.documents),
        "patterns": [
            {
                "pattern_id": doc["pattern_id"],
                "name": doc["name"],
                "tags": doc["tags"],
            }
            for doc in rag_service.documents
        ]
    }
