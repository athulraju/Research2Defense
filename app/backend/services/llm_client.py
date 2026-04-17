import json
import logging
from typing import Optional

import httpx

from config import DEFAULT_MODEL, LLM_TIMEOUT, MODEL, OLLAMA_BASE_URL

logger = logging.getLogger(__name__)


def _get_http_client() -> httpx.Client:
    return httpx.Client(base_url=OLLAMA_BASE_URL, timeout=LLM_TIMEOUT)


def _fetch_available_models() -> list[str]:
    with _get_http_client() as client:
        response = client.get("/api/tags")
        response.raise_for_status()
    models = response.json().get("models", [])
    return [item.get("name", "") for item in models if item.get("name")]


def resolve_model_name(preferred_model: Optional[str] = None) -> str:
    preferred = (preferred_model or "").strip()
    if preferred:
        return preferred

    try:
        models = _fetch_available_models()
    except httpx.HTTPError:
        return DEFAULT_MODEL

    return models[0] if models else DEFAULT_MODEL

def _num_predict(max_output_tokens: int) -> int:
    return min(max(max_output_tokens, 256), 8192)


def _generate(prompt: str, system: str, *, model: str, max_output_tokens: int, json_mode: bool) -> str:
    resolved_model = resolve_model_name(model)
    payload = {
        "model": resolved_model,
        "prompt": prompt,
        "system": system,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": _num_predict(max_output_tokens),
        },
    }
    if json_mode:
        payload["format"] = "json"

    try:
        with _get_http_client() as client:
            response = client.post("/api/generate", json=payload)
            response.raise_for_status()
    except httpx.ConnectError as exc:
        raise ValueError(
            f"Could not reach Ollama at {OLLAMA_BASE_URL}. Start Ollama and try again."
        ) from exc
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text.strip()
        if exc.response.status_code == 404:
            raise ValueError(
                f"Local model '{resolved_model}' is not available in Ollama. Run: ollama pull {resolved_model}"
            ) from exc
        raise ValueError(f"Ollama request failed: {detail or exc}") from exc

    data = response.json()
    raw = (data.get("response") or "").strip()
    if not raw:
        raise ValueError("Local model returned an empty response")
    return raw


def generate_text(prompt: str, system: str, *, model: str = MODEL, max_output_tokens: int = 4096) -> str:
    return _generate(prompt, system, model=model, max_output_tokens=max_output_tokens, json_mode=False)


def generate_json(prompt: str, system: str, *, model: str = MODEL, max_output_tokens: int = 4096):
    raw = _generate(prompt, system, model=model, max_output_tokens=max_output_tokens, json_mode=True)

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Local JSON parse failed: %s", exc)
        raise ValueError(f"Local model returned invalid JSON: {exc}") from exc


def get_model_status(model: str = MODEL) -> dict:
    requested_model = (model or "").strip()
    status = {
        "provider": "ollama",
        "base_url": OLLAMA_BASE_URL,
        "model": requested_model or DEFAULT_MODEL,
        "requested_model": requested_model or None,
        "auto_detected": not bool(requested_model),
        "service_up": False,
        "model_ready": False,
        "message": "",
    }

    try:
        model_names = _fetch_available_models()
    except httpx.ConnectError:
        status["message"] = f"Ollama is not reachable at {OLLAMA_BASE_URL}"
        return status
    except httpx.HTTPError as exc:
        status["message"] = f"Ollama health check failed: {exc}"
        return status

    status["service_up"] = True
    if requested_model:
        resolved_model = requested_model
    elif model_names:
        resolved_model = model_names[0]
    else:
        resolved_model = DEFAULT_MODEL

    status["model"] = resolved_model
    available = set(model_names)
    if resolved_model in available:
        status["model_ready"] = True
        if requested_model:
            status["message"] = f"Local model '{resolved_model}' is ready"
        else:
            status["message"] = f"Auto-detected local model '{resolved_model}'"
    else:
        status["message"] = f"Model '{resolved_model}' is not pulled yet. Run: ollama pull {resolved_model}"
    status["available_models"] = model_names
    return status
