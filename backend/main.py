import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="RTL-guard Backend",
    description="AI Verilog Code Reviewer & Bug Detector API",
    version="1.0.0",
)

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    """Service health check endpoint."""
    return {
        "status": "ok",
        "service": "RTL-guard",
        "yosys_enabled": os.getenv("ENABLE_YOSYS", "false").lower() == "true",
    }
