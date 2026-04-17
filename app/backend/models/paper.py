from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PaperBase(BaseModel):
    filename: str
    title: Optional[str] = None
    source: str = "local"
    arxiv_id: Optional[str] = None
    arxiv_url: Optional[str] = None


class PaperCreate(PaperBase):
    pass


class Paper(PaperBase):
    id: str
    status: str
    summary: Optional[str] = None
    analysis: Optional[dict] = None
    created_at: Optional[str] = None
    processed_at: Optional[str] = None

    class Config:
        from_attributes = True


class ArxivPaper(BaseModel):
    arxiv_id: str
    title: str
    authors: List[str]
    summary: str
    published: str
    url: str
    pdf_url: str
    relevance_reason: str
    categories: List[str]


class PaperAnalysis(BaseModel):
    title: str
    abstract: str
    problem_statement: str
    attack_behaviors: List[str]
    affected_entities: List[str]
    telemetry_opportunities: List[str]
    threat_actors: List[str]
    key_techniques: List[str]
    mitre_references: List[str]
