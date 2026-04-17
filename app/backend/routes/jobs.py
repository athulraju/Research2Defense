from fastapi import APIRouter, HTTPException
from database import get_db

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("/{job_id}")
def get_job(job_id: str):
    db = get_db()
    try:
        row = db.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Job not found")
        return dict(row)
    finally:
        db.close()


@router.get("/paper/{paper_id}")
def get_paper_jobs(paper_id: str):
    db = get_db()
    try:
        rows = db.execute(
            "SELECT * FROM jobs WHERE paper_id = ? ORDER BY created_at DESC",
            (paper_id,)
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        db.close()
