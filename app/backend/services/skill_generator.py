import json
import logging
from typing import List

from config import MODEL, SKILLS_DIR
from services.llm_client import generate_text
from utils.file_utils import safe_write, new_id, slugify

logger = logging.getLogger(__name__)

SKILL_SYSTEM = """You are a detection engineering lead writing reusable skill files for a security team.
Skill files are markdown documents that teach analysts how to detect a specific threat pattern.
They must be practical, specific, and immediately actionable."""

SKILL_PROMPT = """Write a comprehensive detection skill file for this detection.

Paper Analysis:
{analysis}

Detection:
{detection}

Return the complete markdown document. Use this exact structure:

# Skill: {title}

## Metadata
- **Category:** {detection_type}
- **Severity:** {severity}
- **Source Paper:** {paper_title}
- **Detection Type:** {detection_type}

## Detection Objective
[One paragraph describing what this skill is trying to detect and why]

## Threat Narrative
[2-3 paragraphs describing the attack: how it unfolds, what the attacker is trying to achieve,
why it's difficult to detect, and what makes it dangerous]

## Required Log Sources
[List each required log source with why it's needed]

## Field Mapping
| Field Name | Log Source | Purpose |
|------------|------------|---------|
| field1     | source1    | usage   |

## Detection Logic

### Pseudo Logic
```
[Write pseudo-code or logic flow for the detection]
```

### Behavioral Indicators
[List the specific behavioral signals that indicate this attack]

### Sequence Logic
[Describe the temporal sequence or chain of events that would trigger this detection]

## Query Ideas

### SIEM / Log Platform
```sql
[Example query in SQL/KQL/SPL style]
```

### API / Application Layer
```
[Detection logic at the application or API level]
```

## Tuning Notes
[How to reduce false positives, what baselines to establish]

## Limitations
[What this detection cannot catch, evasion techniques]

## Validation Strategy
[How to test and validate this detection works correctly]

## References
- Source Paper: {paper_title}
- Attack Stage: {attack_stage}"""


def generate_skills(
    paper_id: str,
    paper_title: str,
    analysis: dict,
    detections: List[dict],
) -> List[dict]:
    skill_files = []

    for detection in detections:
        try:
            skill_content = _generate_single_skill(
                analysis=analysis,
                detection=detection,
                paper_title=paper_title,
            )
            skill_name = slugify(detection["title"])
            filename = f"{paper_id[:8]}_{skill_name}.md"
            skill_path = SKILLS_DIR / filename
            safe_write(skill_path, skill_content)

            skill_record = {
                "id": new_id(),
                "paper_id": paper_id,
                "detection_id": detection["id"],
                "filename": filename,
                "content": skill_content,
                "detection_title": detection["title"],
                "severity": detection["severity"],
                "detection_type": detection["detection_type"],
            }
            skill_files.append(skill_record)
            logger.info(f"Generated skill: {filename}")
        except Exception as e:
            logger.error(f"Skill generation failed for '{detection['title']}': {e}")

    return skill_files


def _generate_single_skill(
    analysis: dict,
    detection: dict,
    paper_title: str,
) -> str:
    prompt = SKILL_PROMPT.format(
        analysis=json.dumps(analysis, indent=2)[:6000],
        detection=json.dumps(detection, indent=2),
        title=detection["title"],
        detection_type=detection.get("detection_type", "behavioural"),
        severity=detection.get("severity", "High"),
        paper_title=paper_title,
        attack_stage=detection.get("attack_stage", "execution"),
    )

    return generate_text(
        prompt,
        SKILL_SYSTEM,
        model=MODEL,
        max_output_tokens=4096,
    )
