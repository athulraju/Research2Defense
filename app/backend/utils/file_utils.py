import uuid
import json
from pathlib import Path
from typing import Optional


def new_id() -> str:
    return str(uuid.uuid4())


def safe_read(path: Path) -> Optional[str]:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return None


def safe_write(path: Path, content: str) -> bool:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return True
    except Exception:
        return False


def safe_write_json(path: Path, data: dict) -> bool:
    return safe_write(path, json.dumps(data, indent=2, default=str))


def list_files(directory: Path, extensions: Optional[list] = None) -> list:
    if not directory.exists():
        return []
    files = []
    for f in sorted(directory.iterdir()):
        if f.is_file():
            if extensions is None or f.suffix.lower() in extensions:
                files.append(f)
    return files


def slugify(text: str) -> str:
    import re
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "_", text)
    return text[:80]
