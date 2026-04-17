import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent.parent

# Load .env from project root if present (works whether server is started
# via start.sh or manually with uvicorn)
_env_file = BASE_DIR / ".env"
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _, _v = _line.partition("=")
            os.environ.setdefault(_k.strip(), _v.strip())
RESEARCH_PAPERS_DIR = BASE_DIR / "Research_Papers"
INPUT_DIR = RESEARCH_PAPERS_DIR / "Input"
OUTPUT_DIR = RESEARCH_PAPERS_DIR / "Output"
DETECTIONS_DIR = OUTPUT_DIR / "Detections"
SKILLS_DIR = OUTPUT_DIR / "Skills"
SUMMARIES_DIR = OUTPUT_DIR / "Summaries"
RECOMMENDATIONS_DIR = OUTPUT_DIR / "Recommendations"
STATIC_DIR = Path(__file__).parent / "static"
DB_PATH = BASE_DIR / "r2d.db"

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
DEFAULT_MODEL = "llama3.1:8b"
MODEL = os.environ.get("LOCAL_MODEL", "").strip()
LLM_TIMEOUT = float(os.environ.get("LLM_TIMEOUT_SECONDS", "180"))

def get_model_name() -> str:
    return MODEL or DEFAULT_MODEL

ARXIV_QUERIES = [
    "LLM agent security prompt injection",
    "AI agent misuse deceptive alignment",
    "large language model goal drift attack",
    "AI agent tool misuse exploitation",
    "LLM jailbreak adversarial attack detection",
]

for d in [INPUT_DIR, DETECTIONS_DIR, SKILLS_DIR, SUMMARIES_DIR, RECOMMENDATIONS_DIR]:
    d.mkdir(parents=True, exist_ok=True)
