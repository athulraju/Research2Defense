from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def extract_text_from_pdf(path: Path) -> Optional[str]:
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(str(path)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)
        return "\n\n".join(text_parts) if text_parts else None
    except Exception as e:
        logger.error(f"PDF extraction failed for {path}: {e}")
        return None


def extract_text(path: Path) -> Optional[str]:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return extract_text_from_pdf(path)
    elif suffix in (".txt", ".md", ".markdown"):
        try:
            return path.read_text(encoding="utf-8", errors="replace")
        except Exception as e:
            logger.error(f"Text extraction failed for {path}: {e}")
            return None
    else:
        logger.warning(f"Unsupported file type: {suffix}")
        return None


def truncate_for_llm(text: str, max_chars: int = 80000) -> str:
    if len(text) <= max_chars:
        return text
    half = max_chars // 2
    return text[:half] + "\n\n[... content truncated ...]\n\n" + text[-half:]
