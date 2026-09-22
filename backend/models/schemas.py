from typing import Optional, List, Literal
from pydantic import BaseModel, Field


class ReviewOptions(BaseModel):
    use_yosys: bool = False


class ReviewRequest(BaseModel):
    code: str = Field(..., description="Verilog module source code")
    options: Optional[ReviewOptions] = Field(default_factory=ReviewOptions)


class PrecheckIssue(BaseModel):
    type: str = Field(..., description="Identifier for precheck rule")
    line: Optional[int] = Field(None, description="Line number if localized")
    message: str = Field(..., description="Human-readable issue description")


class AIFinding(BaseModel):
    title: str = Field(..., description="Finding headline")
    pattern_ref: str = Field(..., description="Cited pattern kebab-case ID from corpus")
    line: Optional[int] = Field(None, description="Best-effort line number")
    severity: Literal["high", "medium", "low"] = Field(..., description="Severity level")
    explanation: str = Field(..., description="Plain-English explanation of why this is a bug")
    suggested_fix: str = Field(..., description="Recommended replacement code")


class SynthesisResult(BaseModel):
    enabled: bool = False
    warnings: List[str] = []
    errors: List[str] = []


class ReviewResponse(BaseModel):
    precheck: List[PrecheckIssue] = []
    ai_findings: List[AIFinding] = []
    synthesis: SynthesisResult = Field(default_factory=SynthesisResult)
    degraded: bool = False
    error_message: Optional[str] = None
