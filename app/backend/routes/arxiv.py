import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks

from config import INPUT_DIR
from database import get_db
from utils.file_utils import new_id
from services.arxiv_service import search_arxiv, rank_papers_by_relevance, download_arxiv_paper

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/arxiv", tags=["arxiv"])


@router.get("/search")
def search_papers(ranked: bool = True, max_results: int = 5):
    papers = search_arxiv(max_results_per_query=max_results)

    if ranked and papers:
        papers = rank_papers_by_relevance(papers)

    return papers


@router.post("/save")
def save_arxiv_paper(body: dict):
    arxiv_id = body.get("arxiv_id")
    title = body.get("title")
    url = body.get("url")
    summary = body.get("summary", "")

    if not arxiv_id:
        raise HTTPException(400, "arxiv_id required")

    db = get_db()
    try:
        existing = db.execute("SELECT id FROM papers WHERE arxiv_id = ?", (arxiv_id,)).fetchone()
        if existing:
            return {"id": existing["id"], "status": "already_saved"}

        paper_id = new_id()
        filename = f"{arxiv_id.replace('/', '_')}.pdf"

        db.execute(
            "INSERT INTO papers (id, filename, title, source, status, arxiv_id, arxiv_url, summary) "
            "VALUES (?, ?, ?, 'arxiv', 'pending', ?, ?, ?)",
            (paper_id, filename, title, arxiv_id, url, summary[:500])
        )
        db.commit()

        return {"id": paper_id, "arxiv_id": arxiv_id, "status": "saved", "filename": filename}
    finally:
        db.close()


@router.post("/download/{paper_id}")
def download_paper(paper_id: str, background_tasks: BackgroundTasks):
    db = get_db()
    try:
        paper = db.execute("SELECT * FROM papers WHERE id = ?", (paper_id,)).fetchone()
        if not paper:
            raise HTTPException(404, "Paper not found")
        if not paper["arxiv_id"]:
            raise HTTPException(400, "Not an arXiv paper")

        def _download():
            db2 = get_db()
            try:
                db2.execute("UPDATE papers SET status = 'downloading' WHERE id = ?", (paper_id,))
                db2.commit()
                path = download_arxiv_paper(paper["arxiv_id"], INPUT_DIR)
                if path:
                    db2.execute("UPDATE papers SET status = 'pending' WHERE id = ?", (paper_id,))
                else:
                    db2.execute("UPDATE papers SET status = 'download_failed' WHERE id = ?", (paper_id,))
                db2.commit()
            finally:
                db2.close()

        background_tasks.add_task(_download)
        return {"paper_id": paper_id, "status": "downloading"}
    finally:
        db.close()
