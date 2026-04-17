import json
import logging
from pathlib import Path
from typing import Optional

from config import MODEL, SUMMARIES_DIR
from services.llm_client import generate_json
from utils.pdf_parser import extract_text, truncate_for_llm
from utils.file_utils import safe_write

logger = logging.getLogger(__name__)


ANALYSIS_SYSTEM = """You are a senior security researcher and detection engineer specializing in AI/LLM security.
Your job is to deeply analyze security research papers and extract structured intelligence that can be used
to build practical detection engineering content.

You think like a SOC analyst who needs to build detections in a SIEM, EDR, or cloud security platform.
Focus on observable behaviors, telemetry signals, and sequences of events that would indicate an attack."""

ANALYSIS_PROMPT = """Analyze the following security research paper and extract structured intelligence.

Return ONLY valid JSON matching this exact schema (no markdown fences, no extra text):
{{
  "title": "Paper title",
  "abstract": "1-3 sentence abstract",
  "problem_statement": "What threat or vulnerability does this paper describe?",
  "attack_behaviors": [
    "Specific observable behavior 1",
    "Specific observable behavior 2"
  ],
  "affected_entities": [
    "Entity type 1 (e.g., LLM API, Agent runtime, tool calls)"
  ],
  "telemetry_opportunities": [
    "Log source 1 that would capture this attack",
    "Log source 2"
  ],
  "threat_actors": [
    "Adversary type (e.g., malicious prompt injector, compromised tool)"
  ],
  "key_techniques": [
    "Technique 1 (be specific and technical)"
  ],
  "mitre_references": [
    "MITRE ATT&CK or ATLAS technique reference if applicable"
  ],
  "attack_chain": [
    "Step 1: Initial access / trigger",
    "Step 2: ...",
    "Step N: Impact / exfiltration"
  ],
  "detection_opportunities": [
    "Opportunity 1: What event or pattern reveals the attack"
  ]
}}

Paper content:
{text}"""


def analyze_paper(text: str) -> Optional[dict]:
    truncated = truncate_for_llm(text, max_chars=80000)
    try:
        return generate_json(
            ANALYSIS_PROMPT.format(text=truncated),
            ANALYSIS_SYSTEM,
            model=MODEL,
            max_output_tokens=4096,
        )
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse failed in paper analysis: {e}")
        return None
    except Exception as e:
        logger.error(f"Local model error in paper analysis: {e}")
        raise


def process_paper(paper_id: str, file_path: Path) -> dict:
    logger.info(f"Processing paper: {file_path.name}")

    text = extract_text(file_path)
    if not text or len(text.strip()) < 100:
        raise ValueError(f"Could not extract meaningful text from {file_path.name}")

    analysis = analyze_paper(text)
    if not analysis:
        raise ValueError("AI analysis returned no structured data")

    title = analysis.get("title", file_path.stem)
    summary_path = SUMMARIES_DIR / f"{paper_id}_summary.md"
    summary_md = _build_summary_md(title, analysis, file_path.name)
    safe_write(summary_path, summary_md)

    return {
        "id": paper_id,
        "title": title,
        "analysis": analysis,
        "summary": analysis.get("abstract", ""),
        "text_length": len(text),
        "summary_path": str(summary_path),
    }


def _build_summary_md(title: str, analysis: dict, filename: str) -> str:
    lines = [
        f"# {title}",
        f"\n**Source file:** {filename}",
        f"\n## Abstract\n{analysis.get('abstract', 'N/A')}",
        f"\n## Problem Statement\n{analysis.get('problem_statement', 'N/A')}",
        "\n## Attack Behaviors",
    ]
    for b in analysis.get("attack_behaviors", []):
        lines.append(f"- {b}")

    lines.append("\n## Affected Entities")
    for e in analysis.get("affected_entities", []):
        lines.append(f"- {e}")

    lines.append("\n## Telemetry Opportunities")
    for t in analysis.get("telemetry_opportunities", []):
        lines.append(f"- {t}")

    lines.append("\n## Key Techniques")
    for k in analysis.get("key_techniques", []):
        lines.append(f"- {k}")

    lines.append("\n## Attack Chain")
    for i, step in enumerate(analysis.get("attack_chain", []), 1):
        lines.append(f"{i}. {step}")

    lines.append("\n## Detection Opportunities")
    for d in analysis.get("detection_opportunities", []):
        lines.append(f"- {d}")

    if analysis.get("mitre_references"):
        lines.append("\n## MITRE References")
        for m in analysis["mitre_references"]:
            lines.append(f"- {m}")

    return "\n".join(lines)
