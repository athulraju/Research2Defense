import logging
import json
from typing import List, Optional

import arxiv

from config import MODEL, ARXIV_QUERIES
from services.llm_client import generate_json

logger = logging.getLogger(__name__)

RELEVANCE_SYSTEM = """You are a security researcher evaluating arXiv papers for detection engineering relevance.
Focus on papers that describe: attacks on LLMs/agents, prompt injection, goal drift, deceptive alignment,
agent misuse, model manipulation, or novel AI security threats with observable behaviors."""

RELEVANCE_PROMPT = """Evaluate whether this paper is relevant to AI/LLM security detection engineering.

Paper title: {title}
Abstract: {abstract}

Return JSON only (no fences):
{{
  "is_relevant": true/false,
  "relevance_score": 0-10,
  "relevance_reason": "One sentence explaining why this is or is not useful for detection engineering",
  "key_threats": ["threat1", "threat2"],
  "detection_potential": "high/medium/low"
}}"""


def search_arxiv(max_results_per_query: int = 5) -> List[dict]:
    seen_ids = set()
    results = []

    client = arxiv.Client(page_size=max_results_per_query, delay_seconds=1.0)

    for query in ARXIV_QUERIES:
        try:
            search = arxiv.Search(
                query=query,
                max_results=max_results_per_query,
                sort_by=arxiv.SortCriterion.SubmittedDate,
                sort_order=arxiv.SortOrder.Descending,
            )
            for paper in client.results(search):
                arxiv_id = paper.entry_id.split("/")[-1]
                if arxiv_id in seen_ids:
                    continue
                seen_ids.add(arxiv_id)
                results.append({
                    "arxiv_id": arxiv_id,
                    "title": paper.title,
                    "authors": [a.name for a in paper.authors[:5]],
                    "summary": paper.summary[:800],
                    "published": paper.published.strftime("%Y-%m-%d") if paper.published else "",
                    "url": paper.entry_id,
                    "pdf_url": paper.pdf_url or "",
                    "categories": paper.categories[:3],
                    "relevance_reason": "",
                    "relevance_score": 0,
                    "detection_potential": "unknown",
                })
        except Exception as e:
            logger.error(f"arXiv query failed for '{query}': {e}")

    return results


def rank_papers_by_relevance(papers: List[dict]) -> List[dict]:
    ranked = []
    for paper in papers:
        try:
            prompt = RELEVANCE_PROMPT.format(
                title=paper["title"],
                abstract=paper["summary"]
            )
            eval_data = generate_json(
                prompt,
                RELEVANCE_SYSTEM,
                model=MODEL,
                max_output_tokens=512,
            )

            paper["relevance_reason"] = eval_data.get("relevance_reason", "")
            paper["relevance_score"] = eval_data.get("relevance_score", 0)
            paper["detection_potential"] = eval_data.get("detection_potential", "unknown")
            paper["key_threats"] = eval_data.get("key_threats", [])
            paper["is_relevant"] = eval_data.get("is_relevant", False)

            if eval_data.get("is_relevant", False):
                ranked.append(paper)
        except Exception as e:
            logger.warning(f"Relevance scoring failed for '{paper['title']}': {e}")
            paper["relevance_reason"] = "Could not evaluate"
            paper["relevance_score"] = 0
            paper["is_relevant"] = True
            ranked.append(paper)

    return sorted(ranked, key=lambda x: x.get("relevance_score", 0), reverse=True)


def download_arxiv_paper(arxiv_id: str, dest_dir) -> Optional[str]:
    from pathlib import Path
    dest_dir = Path(dest_dir)
    try:
        client = arxiv.Client()
        search = arxiv.Search(id_list=[arxiv_id])
        paper = next(client.results(search))
        filename = f"{arxiv_id.replace('/', '_')}.pdf"
        dest = dest_dir / filename
        paper.download_pdf(dirpath=str(dest_dir), filename=filename)
        return str(dest)
    except Exception as e:
        logger.error(f"Failed to download arXiv paper {arxiv_id}: {e}")
        return None
