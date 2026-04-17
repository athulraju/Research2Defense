import sys
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("r2d")

sys.path.insert(0, str(Path(__file__).parent))

from database import init_db
from routes import papers, arxiv, schema, detections, skills, jobs, gaps
from services.llm_client import get_model_status

app = FastAPI(title="R2D — AI Security Research to Detection Engineering", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(papers.router)
app.include_router(arxiv.router)
app.include_router(schema.router)
app.include_router(detections.router)
app.include_router(skills.router)
app.include_router(jobs.router)
app.include_router(gaps.router)


@app.on_event("startup")
async def startup():
    init_db()
    logger.info("Database initialized")
    status = get_model_status()
    print("\n" + "="*60)
    print("  Research2Defense (R2D)")
    print("="*60)
    print("  Open http://localhost:9000 in your browser")
    print(f"  Local model: {status['model']}")
    if not status["model_ready"]:
        print("\n  ⚠  WARNING: Local model is not ready.")
        print(f"     {status['message']}")
        print("     Start Ollama, pull the model, then restart the server.")
    print("="*60 + "\n")


@app.get("/api/health")
def health():
    status = get_model_status()
    return {
        "status": "ok",
        "provider": status["provider"],
        "model": status["model"],
        "base_url": status["base_url"],
        "service_up": status["service_up"],
        "model_ready": status["model_ready"],
        "message": status["message"],
    }


STATIC_DIR = Path(__file__).parent.parent / "frontend" / "dist"

if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = STATIC_DIR / "index.html"
        return FileResponse(str(index))
else:
    @app.get("/")
    async def no_frontend():
        return {
            "message": "R2D backend is running. Frontend not built yet.",
            "instructions": "Run: cd app/frontend && npm install && npm run build",
            "api_docs": "http://localhost:9000/docs",
        }
