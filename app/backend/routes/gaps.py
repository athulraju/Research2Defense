import json
import logging
from fastapi import APIRouter, HTTPException

from config import RECOMMENDATIONS_DIR

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/gaps", tags=["gaps"])


@router.get("/{paper_id}")
def get_gaps(paper_id: str):
    gaps_path = RECOMMENDATIONS_DIR / f"{paper_id}_gaps.json"
    telemetry_path = RECOMMENDATIONS_DIR / f"{paper_id}_telemetry.json"

    result = {}
    if gaps_path.exists():
        try:
            result["gaps"] = json.loads(gaps_path.read_text())
        except Exception:
            result["gaps"] = {}

    if telemetry_path.exists():
        try:
            result["telemetry"] = json.loads(telemetry_path.read_text())
        except Exception:
            result["telemetry"] = {}

    if not result:
        raise HTTPException(404, "No gaps analysis found for this paper. Run processing first.")

    return result
