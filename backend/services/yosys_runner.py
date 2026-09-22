"""
Yosys synthesis runner service for RTL-guard.
Executes open-source Yosys synthesis checks in an isolated subprocess.
Feature-flagged via ENABLE_YOSYS environment variable per RULES.md R1.3 and R5.2.
"""

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from models.schemas import SynthesisResult


def run_synthesis(code: str) -> SynthesisResult:
    """
    Runs Yosys synthesis on the provided code if enabled and installed.
    Degrades silently if disabled or if Yosys is not available.
    """
    enabled_env = os.getenv("ENABLE_YOSYS", "false").lower() == "true"
    if not enabled_env:
        return SynthesisResult(enabled=False, warnings=[], errors=[])

    yosys_bin = shutil.which("yosys")
    if not yosys_bin:
        return SynthesisResult(
            enabled=False,
            warnings=["Yosys synthesis enabled in config but 'yosys' binary was not found in PATH."],
            errors=[]
        )

    # Isolated temporary execution directory
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        input_file = tmp_path / "top.v"
        output_file = tmp_path / "out.v"
        input_file.write_text(code, encoding="utf-8")

        cmd = [
            yosys_bin,
            "-p",
            f"read_verilog {input_file}; synth; write_verilog {output_file}"
        ]

        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=15,
                check=False
            )

            warnings = []
            errors = []

            for line in res.stdout.splitlines() + res.stderr.splitlines():
                if "Warning:" in line or "warning:" in line:
                    warnings.append(line.strip())
                elif "ERROR:" in line or "error:" in line:
                    errors.append(line.strip())

            return SynthesisResult(
                enabled=True,
                warnings=warnings[:10], # Cap to top 10 warnings
                errors=errors[:10],
            )
        except subprocess.TimeoutExpired:
            return SynthesisResult(
                enabled=True,
                warnings=["Yosys synthesis process timed out after 15 seconds."],
                errors=[]
            )
        except Exception as e:
            return SynthesisResult(
                enabled=True,
                warnings=[f"Yosys execution failed: {str(e)}"],
                errors=[]
            )
