import json
import shutil
import logging
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException

from config import INPUT_DIR
from database import get_db
from utils.file_utils import new_id
from services.schema_service import parse_schema_text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/schema", tags=["schema"])


@router.get("/detect")
def detect_schemas():
    schemas = []
    for f in INPUT_DIR.iterdir():
        if f.is_file() and f.suffix.lower() in (".json", ".csv", ".txt"):
            size = f.stat().st_size
            schemas.append({
                "filename": f.name,
                "size": size,
                "suffix": f.suffix.lower(),
                "path": str(f),
            })
    return schemas


@router.post("/upload")
async def upload_schema(file: UploadFile = File(...)):
    allowed = {".json", ".csv", ".txt"}
    suffix = Path(file.filename).suffix.lower()
    if suffix not in allowed:
        raise HTTPException(400, f"Unsupported schema type: {suffix}")

    dest = INPUT_DIR / file.filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"filename": file.filename, "path": str(dest)}


@router.post("/parse")
def parse_schema(body: dict):
    content = body.get("content", "")
    paper_id = body.get("paper_id")

    if not content.strip():
        raise HTTPException(400, "Schema content is empty")

    parsed = parse_schema_text(content)

    schema_id = new_id()
    db = get_db()
    try:
        db.execute(
            "INSERT INTO schemas (id, paper_id, content, parsed) VALUES (?, ?, ?, ?)",
            (schema_id, paper_id, content[:10000], json.dumps(parsed))
        )
        db.commit()
    finally:
        db.close()

    return {"id": schema_id, "parsed": parsed}


@router.get("/{schema_id}")
def get_schema(schema_id: str):
    db = get_db()
    try:
        row = db.execute("SELECT * FROM schemas WHERE id = ?", (schema_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Schema not found")
        s = dict(row)
        if s.get("parsed"):
            try:
                s["parsed"] = json.loads(s["parsed"])
            except Exception:
                pass
        return s
    finally:
        db.close()
