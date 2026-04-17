import json
import shutil
import logging
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks

from config import INPUT_DIR
from database import get_db
from utils.file_utils import new_id
from services.paper_processor import process_paper
from services.detection_generator import generate_detections, generate_gaps
from services.skill_generator import generate_skills
from services.schema_service import generate_telemetry_recommendations

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/papers", tags=["papers"])
@router.get("")
def list_papers():
    db = get_db()
    try:
        papers = db.execute(
            "SELECT id, filename, title, source, status, summary, created_at, processed_at "
            "FROM papers ORDER BY created_at DESC"
        ).fetchall()
        return [dict(p) for p in papers]
    finally:
        db.close()


@router.get("/files")
def list_input_files():
    files = []
    for f in sorted(INPUT_DIR.iterdir()):
        if f.is_file() and f.suffix.lower() in (".pdf", ".txt", ".md", ".markdown"):
            files.append({
                "name": f.name,
                "size": f.stat().st_size,
                "suffix": f.suffix.lower(),
                "path": str(f),
            })
    return files


@router.post("/upload")
async def upload_paper(file: UploadFile = File(...)):
    allowed = {".pdf", ".txt", ".md", ".markdown"}
    suffix = Path(file.filename).suffix.lower()
    if suffix not in allowed:
        raise HTTPException(400, f"Unsupported file type: {suffix}. Allowed: {allowed}")

    paper_id = new_id()
    dest = INPUT_DIR / file.filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    db = get_db()
    try:
        db.execute(
            "INSERT INTO papers (id, filename, source, status) VALUES (?, ?, 'local', 'pending')",
            (paper_id, file.filename)
        )
        db.commit()
    finally:
        db.close()

    return {"id": paper_id, "filename": file.filename, "status": "pending"}


@router.post("/register")
def register_paper(body: dict):
    filename = body.get("filename")
    if not filename:
        raise HTTPException(400, "filename required")

    file_path = INPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(404, f"File not found: {filename}")

    db = get_db()
    try:
        existing = db.execute("SELECT id FROM papers WHERE filename = ?", (filename,)).fetchone()
        if existing:
            return {"id": existing["id"], "filename": filename, "status": "already_registered"}

        paper_id = new_id()
        db.execute(
            "INSERT INTO papers (id, filename, source, status) VALUES (?, ?, 'local', 'pending')",
            (paper_id, filename)
        )
        db.commit()
        return {"id": paper_id, "filename": filename, "status": "registered"}
    finally:
        db.close()


@router.get("/{paper_id}")
def get_paper(paper_id: str):
    db = get_db()
    try:
        paper = db.execute("SELECT * FROM papers WHERE id = ?", (paper_id,)).fetchone()
        if not paper:
            raise HTTPException(404, "Paper not found")
        p = dict(paper)
        if p.get("analysis"):
            try:
                p["analysis"] = json.loads(p["analysis"])
            except Exception:
                pass
        return p
    finally:
        db.close()


def _do_process(paper_id: str, filename: str, schema_content: Optional[str] = None):
    db = get_db()
    file_path = INPUT_DIR / filename

    try:
        db.execute("UPDATE papers SET status = 'processing' WHERE id = ?", (paper_id,))
        db.commit()

        result = process_paper(paper_id, file_path)
        analysis = result["analysis"]
        title = result["title"]

        db.execute(
            "UPDATE papers SET title = ?, status = 'analyzed', summary = ?, analysis = ?, "
            "processed_at = CURRENT_TIMESTAMP WHERE id = ?",
            (title, result["summary"], json.dumps(analysis), paper_id)
        )
        db.commit()

        schema_info = schema_content or "No schema provided"
        detections = generate_detections(paper_id, analysis, schema_info)

        for det in detections:
            existing = db.execute("SELECT id FROM detections WHERE id = ?", (det["id"],)).fetchone()
            if not existing:
                db.execute(
                    "INSERT INTO detections (id, paper_id, title, description, rationale, severity, "
                    "confidence, detection_type, required_telemetry, implementation_notes, "
                    "false_positives, tuning_advice) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        det["id"], paper_id, det["title"], det["description"],
                        det["rationale"], det["severity"], det["confidence"],
                        det["detection_type"],
                        json.dumps(det.get("required_telemetry", [])),
                        det.get("implementation_notes", ""),
                        json.dumps(det.get("false_positives", [])),
                        det.get("tuning_advice", ""),
                    )
                )
        db.commit()

        gaps = generate_gaps(paper_id, analysis, detections, schema_info)
        skills = generate_skills(paper_id, title, analysis, detections)

        for sk in skills:
            db.execute(
                "INSERT OR IGNORE INTO skill_files (id, paper_id, detection_id, filename, content) "
                "VALUES (?, ?, ?, ?, ?)",
                (sk["id"], paper_id, sk.get("detection_id"), sk["filename"], sk["content"])
            )
        db.commit()

        telemetry = generate_telemetry_recommendations(paper_id, analysis)

        db.execute(
            "UPDATE jobs SET status = 'done', progress = 100, message = 'Processing complete', "
            "updated_at = CURRENT_TIMESTAMP WHERE paper_id = ? AND status = 'running'",
            (paper_id,)
        )
        db.execute("UPDATE papers SET status = 'complete' WHERE id = ?", (paper_id,))
        db.commit()

        logger.info(f"Paper {paper_id} processing complete")

    except Exception as e:
        logger.error(f"Processing failed for paper {paper_id}: {e}")
        db.execute(
            "UPDATE papers SET status = 'error' WHERE id = ?", (paper_id,)
        )
        db.execute(
            "UPDATE jobs SET status = 'error', error = ?, updated_at = CURRENT_TIMESTAMP "
            "WHERE paper_id = ? AND status = 'running'",
            (str(e), paper_id)
        )
        db.commit()
        raise
    finally:
        db.close()


@router.post("/{paper_id}/process")
def start_processing(paper_id: str, background_tasks: BackgroundTasks, body: dict = {}):
    db = get_db()
    try:
        paper = db.execute("SELECT * FROM papers WHERE id = ?", (paper_id,)).fetchone()
        if not paper:
            raise HTTPException(404, "Paper not found")

        if paper["status"] in ("processing",):
            raise HTTPException(409, "Paper is already being processed")

        job_id = new_id()
        db.execute(
            "INSERT INTO jobs (id, paper_id, job_type, status, progress, message) "
            "VALUES (?, ?, 'process', 'running', 0, 'Starting processing...')",
            (job_id, paper_id)
        )
        db.commit()

        schema_content = body.get("schema_content")
        background_tasks.add_task(_do_process, paper_id, paper["filename"], schema_content)

        return {"job_id": job_id, "paper_id": paper_id, "status": "started"}
    finally:
        db.close()


@router.get("/{paper_id}/summary")
def get_summary(paper_id: str):
    from config import SUMMARIES_DIR
    summary_path = SUMMARIES_DIR / f"{paper_id}_summary.md"
    if summary_path.exists():
        return {"content": summary_path.read_text()}
    raise HTTPException(404, "Summary not yet generated")
