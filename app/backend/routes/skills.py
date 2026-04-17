import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from database import get_db
from config import SKILLS_DIR

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/skills", tags=["skills"])


@router.get("")
def list_skills(paper_id: str = None):
    db = get_db()
    try:
        if paper_id:
            rows = db.execute(
                "SELECT id, paper_id, detection_id, filename, created_at FROM skill_files "
                "WHERE paper_id = ? ORDER BY created_at DESC",
                (paper_id,)
            ).fetchall()
        else:
            rows = db.execute(
                "SELECT id, paper_id, detection_id, filename, created_at FROM skill_files "
                "ORDER BY created_at DESC"
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        db.close()


@router.get("/{skill_id}")
def get_skill(skill_id: str):
    db = get_db()
    try:
        row = db.execute("SELECT * FROM skill_files WHERE id = ?", (skill_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Skill file not found")
        return dict(row)
    finally:
        db.close()


@router.get("/{skill_id}/download")
def download_skill(skill_id: str):
    db = get_db()
    try:
        row = db.execute("SELECT filename, content FROM skill_files WHERE id = ?", (skill_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Skill file not found")
        return PlainTextResponse(
            content=row["content"],
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="{row["filename"]}"'}
        )
    finally:
        db.close()


@router.get("/files/list")
def list_skill_files():
    files = []
    for f in sorted(SKILLS_DIR.iterdir()):
        if f.is_file() and f.suffix == ".md":
            files.append({
                "filename": f.name,
                "size": f.stat().st_size,
            })
    return files
