import json
import csv
import io
import logging
from typing import List, Optional

from config import MODEL, INPUT_DIR, RECOMMENDATIONS_DIR
from services.llm_client import generate_json
from utils.file_utils import safe_write_json

logger = logging.getLogger(__name__)

SCHEMA_SYSTEM = """You are a log schema analyst helping map security telemetry to detection fields."""

SCHEMA_PROMPT = """Parse this log schema and extract field information.

Schema content:
{content}

Return ONLY valid JSON (no fences):
{{
  "source_name": "Inferred log source name",
  "fields": [
    {{
      "name": "field_name",
      "type": "string|integer|boolean|timestamp|array|object",
      "description": "What this field contains",
      "sample_values": ["example1", "example2"]
    }}
  ],
  "log_type": "Type of log (e.g., API logs, agent traces, process logs)",
  "coverage_assessment": "What attacks this schema can help detect"
}}"""

TELEMETRY_PROMPT = """Based on this paper analysis, recommend what telemetry sources and log schemas
a detection engineer should collect to detect these attacks.

Paper Analysis:
{analysis}

Return ONLY valid JSON (no fences):
{{
  "recommended_sources": [
    {{
      "name": "Log source name",
      "description": "What this source captures",
      "key_fields": ["field1", "field2"],
      "collection_method": "How to collect this",
      "priority": "Critical|High|Medium|Low",
      "platform_examples": ["Platform A implementation", "Platform B implementation"]
    }}
  ],
  "schema_templates": [
    {{
      "name": "Schema template name",
      "fields": [
        {{"name": "field", "type": "type", "description": "desc"}}
      ]
    }}
  ]
}}"""


def parse_schema_text(content: str) -> dict:
    content_stripped = content.strip()

    parsed = None
    if content_stripped.startswith("{") or content_stripped.startswith("["):
        try:
            parsed = json.loads(content_stripped)
            return _normalize_json_schema(parsed)
        except json.JSONDecodeError:
            pass

    if "," in content_stripped and "\n" in content_stripped:
        try:
            reader = csv.DictReader(io.StringIO(content_stripped))
            rows = list(reader)
            if rows:
                return _normalize_csv_schema(rows, reader.fieldnames or [])
        except Exception:
            pass

    return _parse_via_llm(content)


def _normalize_json_schema(data) -> dict:
    fields = []
    if isinstance(data, dict):
        for k, v in data.items():
            fields.append({
                "name": k,
                "type": type(v).__name__ if not isinstance(v, (dict, list)) else ("object" if isinstance(v, dict) else "array"),
                "description": "",
                "sample_values": [str(v)] if not isinstance(v, (dict, list)) else [],
            })
    elif isinstance(data, list) and data:
        first = data[0]
        if isinstance(first, dict):
            for k, v in first.items():
                vals = [str(row.get(k, "")) for row in data[:3] if k in row]
                fields.append({
                    "name": k,
                    "type": type(v).__name__,
                    "description": "",
                    "sample_values": vals,
                })
    return {
        "source_name": "JSON Schema",
        "fields": fields,
        "log_type": "structured",
        "coverage_assessment": "",
    }


def _normalize_csv_schema(rows: list, fieldnames: list) -> dict:
    fields = []
    for name in fieldnames:
        vals = [row.get(name, "") for row in rows[:3]]
        fields.append({
            "name": name,
            "type": "string",
            "description": "",
            "sample_values": [v for v in vals if v],
        })
    return {
        "source_name": "CSV Schema",
        "fields": fields,
        "log_type": "tabular",
        "coverage_assessment": "",
    }


def _parse_via_llm(content: str) -> dict:
    try:
        return generate_json(
            SCHEMA_PROMPT.format(content=content[:8000]),
            SCHEMA_SYSTEM,
            model=MODEL,
            max_output_tokens=2048,
        )
    except Exception as e:
        logger.error(f"Schema LLM parse failed: {e}")
        return {"source_name": "Unknown", "fields": [], "log_type": "unknown", "coverage_assessment": ""}


def generate_telemetry_recommendations(
    paper_id: str,
    analysis: dict,
) -> dict:
    try:
        recs = generate_json(
            TELEMETRY_PROMPT.format(analysis=json.dumps(analysis, indent=2)[:6000]),
            SCHEMA_SYSTEM,
            model=MODEL,
            max_output_tokens=4096,
        )
    except Exception as e:
        logger.error(f"Telemetry recommendations failed: {e}")
        recs = {"recommended_sources": [], "schema_templates": []}

    recs_path = RECOMMENDATIONS_DIR / f"{paper_id}_telemetry.json"
    safe_write_json(recs_path, recs)
    return recs
