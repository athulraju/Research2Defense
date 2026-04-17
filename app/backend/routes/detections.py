import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from database import get_db
from config import DETECTIONS_DIR

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/detections", tags=["detections"])


def _format_detection(row: dict) -> dict:
    d = dict(row)
    for field in ("required_telemetry", "false_positives"):
        if d.get(field) and isinstance(d[field], str):
            try:
                d[field] = json.loads(d[field])
            except Exception:
                d[field] = []
    return d


@router.get("")
def list_detections(paper_id: str = None, severity: str = None, detection_type: str = None):
    db = get_db()
    try:
        query = "SELECT * FROM detections WHERE 1=1"
        params = []
        if paper_id:
            query += " AND paper_id = ?"
            params.append(paper_id)
        if severity:
            query += " AND severity = ?"
            params.append(severity)
        if detection_type:
            query += " AND detection_type = ?"
            params.append(detection_type)
        query += " ORDER BY created_at DESC"

        rows = db.execute(query, params).fetchall()
        return [_format_detection(row) for row in rows]
    finally:
        db.close()


@router.get("/{detection_id}")
def get_detection(detection_id: str):
    db = get_db()
    try:
        row = db.execute("SELECT * FROM detections WHERE id = ?", (detection_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Detection not found")
        return _format_detection(dict(row))
    finally:
        db.close()


@router.get("/paper/{paper_id}/export")
def export_detections(paper_id: str, fmt: str = "json"):
    db = get_db()
    try:
        rows = db.execute(
            "SELECT * FROM detections WHERE paper_id = ? ORDER BY severity, created_at",
            (paper_id,)
        ).fetchall()

        detections = [_format_detection(dict(r)) for r in rows]

        if fmt == "markdown":
            lines = [f"# Detections\n\n**Paper ID:** {paper_id}\n\n---\n"]
            for d in detections:
                lines.append(f"## {d['title']}")
                lines.append(f"\n**Severity:** {d['severity']} | **Type:** {d['detection_type']} | **Confidence:** {d['confidence']}\n")
                lines.append(f"### Description\n{d['description']}\n")
                lines.append(f"### Rationale\n{d['rationale']}\n")
                lines.append(f"### Required Telemetry")
                for t in d.get("required_telemetry", []):
                    lines.append(f"- {t}")
                lines.append(f"\n### Implementation Notes\n{d['implementation_notes']}\n")
                lines.append(f"### Tuning Advice\n{d['tuning_advice']}\n")
                lines.append("---\n")
            return PlainTextResponse("\n".join(lines), media_type="text/markdown")

        return detections
    finally:
        db.close()
