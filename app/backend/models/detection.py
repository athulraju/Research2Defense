from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class Severity(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class DetectionType(str, Enum):
    QUERY = "query"
    BEHAVIOURAL = "behavioural"
    SEQUENCE = "sequence"
    CORRELATION = "correlation"


class Detection(BaseModel):
    id: str
    paper_id: str
    title: str
    description: str
    rationale: str
    severity: Severity
    confidence: str
    detection_type: DetectionType
    required_telemetry: List[str]
    implementation_notes: str
    false_positives: List[str]
    tuning_advice: str
    created_at: Optional[str] = None


class DetectionCreate(BaseModel):
    title: str
    description: str
    rationale: str
    severity: str
    confidence: str
    detection_type: str
    required_telemetry: List[str]
    implementation_notes: str
    false_positives: List[str]
    tuning_advice: str


class SkillFile(BaseModel):
    id: str
    paper_id: str
    detection_id: Optional[str] = None
    filename: str
    content: str
    created_at: Optional[str] = None


class SchemaField(BaseModel):
    name: str
    type: Optional[str] = "string"
    description: Optional[str] = None
    sample_values: Optional[List[str]] = None


class LogSchema(BaseModel):
    id: str
    source_name: str
    fields: List[SchemaField]
    raw_content: str
    coverage_gaps: Optional[List[str]] = None
