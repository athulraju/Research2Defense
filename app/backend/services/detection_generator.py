import json
import logging
from typing import List

from config import MODEL, DETECTIONS_DIR
from services.llm_client import generate_json
from utils.file_utils import safe_write_json, new_id

logger = logging.getLogger(__name__)

DETECTION_SYSTEM = """You are a principal detection engineer with deep expertise in AI/LLM security.
You build detections for SIEM, EDR, cloud, and AI observability platforms.

Your detection philosophy:
- Prioritize BEHAVIORAL signals over keyword/IOC matching
- Think in SEQUENCES: what chain of events reveals attacker intent?
- Consider TEMPORAL patterns: timing, frequency, ordering
- Focus on INTENT indicators: what does this behavior reveal about attacker goals?
- Map to real log sources a security team would actually have
- Always consider false positive rate and tuning guidance

NEVER build shallow keyword-only detections. ALWAYS think about the full attack chain."""

DETECTION_PROMPT = """Based on this AI/LLM security research paper analysis, generate 5-8 high-quality detections.

Paper Analysis:
{analysis}

Log Schema Available: {schema_info}

Generate detections that cover the FULL attack chain: initial access → execution → persistence → exfiltration.
Prefer behavioral and sequence-based detections over simple query/keyword rules.

Return ONLY valid JSON array (no fences, no extra text):
[
  {{
    "title": "Detection name (specific and actionable)",
    "description": "What this detection catches and why it matters",
    "rationale": "Why this behavioral pattern indicates malicious activity vs normal operation",
    "severity": "Critical|High|Medium|Low",
    "confidence": "High|Medium|Low",
    "detection_type": "query|behavioural|sequence|correlation",
    "required_telemetry": ["log source 1", "log source 2"],
    "implementation_notes": "Specific implementation guidance with pseudo-query logic or field references",
    "false_positives": ["FP scenario 1", "FP scenario 2"],
    "tuning_advice": "How to reduce false positives in production",
    "attack_stage": "initial_access|execution|persistence|lateral_movement|exfiltration|impact",
    "behavioral_indicators": ["indicator 1", "indicator 2"],
    "pseudo_logic": "IF condition1 AND condition2 WITHIN timeframe THEN alert"
  }}
]"""

GAPS_SYSTEM = """You are a detection engineering architect. Analyze what telemetry is needed vs available."""

GAPS_PROMPT = """Based on this paper analysis and the detections generated, identify telemetry gaps and assumptions.

Paper Analysis:
{analysis}

Detections Generated:
{detections}

Available Schema:
{schema_info}

Return ONLY valid JSON (no fences):
{{
  "missing_telemetry": [
    {{
      "source": "Log source name",
      "why_needed": "What attack behavior this would capture",
      "priority": "Critical|High|Medium|Low",
      "collection_guidance": "How to collect or enable this telemetry"
    }}
  ],
  "inferred_assumptions": [
    {{
      "assumption": "What we assumed about the environment",
      "impact_if_wrong": "How detections break if assumption is false",
      "validation_step": "How to verify this assumption"
    }}
  ],
  "telemetry_recommendations": [
    {{
      "category": "Category name",
      "sources": ["source1", "source2"],
      "fields_needed": ["field1", "field2"],
      "rationale": "Why this matters for detection"
    }}
  ],
  "coverage_score": {{
    "overall": "percentage or score",
    "by_attack_stage": {{
      "initial_access": "high|medium|low",
      "execution": "high|medium|low",
      "persistence": "high|medium|low",
      "exfiltration": "high|medium|low"
    }}
  }}
}}"""


def generate_detections(
    paper_id: str,
    analysis: dict,
    schema_info: str,
) -> List[dict]:
    prompt = DETECTION_PROMPT.format(
        analysis=json.dumps(analysis, indent=2),
        schema_info=schema_info or "No schema provided — recommend telemetry sources"
    )

    try:
        detections_raw = generate_json(
            prompt,
            DETECTION_SYSTEM,
            model=MODEL,
            max_output_tokens=8192,
        )
    except json.JSONDecodeError as e:
        logger.error(f"Detection JSON parse failed: {e}")
        raise ValueError(f"AI returned invalid JSON for detections: {e}")
    except Exception as e:
        logger.error(f"Local model error: {e}")
        raise

    detections = []
    for d in detections_raw:
        detection = {
            "id": new_id(),
            "paper_id": paper_id,
            "title": d.get("title", "Unnamed Detection"),
            "description": d.get("description", ""),
            "rationale": d.get("rationale", ""),
            "severity": d.get("severity", "Medium"),
            "confidence": d.get("confidence", "Medium"),
            "detection_type": d.get("detection_type", "behavioural"),
            "required_telemetry": d.get("required_telemetry", []),
            "implementation_notes": d.get("implementation_notes", ""),
            "false_positives": d.get("false_positives", []),
            "tuning_advice": d.get("tuning_advice", ""),
            "attack_stage": d.get("attack_stage", "execution"),
            "behavioral_indicators": d.get("behavioral_indicators", []),
            "pseudo_logic": d.get("pseudo_logic", ""),
        }
        detections.append(detection)

    output_path = DETECTIONS_DIR / f"{paper_id}_detections.json"
    safe_write_json(output_path, {"paper_id": paper_id, "detections": detections})

    return detections


def generate_gaps(
    paper_id: str,
    analysis: dict,
    detections: List[dict],
    schema_info: str,
) -> dict:
    prompt = GAPS_PROMPT.format(
        analysis=json.dumps(analysis, indent=2),
        detections=json.dumps(detections, indent=2)[:8000],
        schema_info=schema_info or "No schema provided"
    )

    try:
        gaps = generate_json(
            prompt,
            GAPS_SYSTEM,
            model=MODEL,
            max_output_tokens=4096,
        )
    except Exception as e:
        logger.error(f"Gaps generation failed: {e}")
        gaps = {
            "missing_telemetry": [],
            "inferred_assumptions": [],
            "telemetry_recommendations": [],
            "coverage_score": {"overall": "unknown"}
        }
    from config import RECOMMENDATIONS_DIR
    gaps_path = RECOMMENDATIONS_DIR / f"{paper_id}_gaps.json"
    safe_write_json(gaps_path, gaps)

    return gaps
