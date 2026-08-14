from __future__ import annotations

import json
import math
import os
import re
from datetime import datetime, timezone
from typing import Any
from urllib import error, parse, request


DEFAULT_SENTIMENT_MODEL = "cardiffnlp/twitter-xlm-roberta-base-sentiment"
SENTIMENT_LABELS = ("positive", "neutral", "negative")
_TOKEN_PATTERN = re.compile(r"[a-zA-Z\u00C0-\u024F]+(?:[-'][a-zA-Z\u00C0-\u024F]+)*", re.UNICODE)

_POSITIVE_TERMS = {
    "accessible", "amazing", "beautiful", "clear", "easy", "educational", "enjoyable",
    "excellent", "fast", "friendly", "good", "great", "helpful", "informative", "interesting",
    "love", "loved", "recommend", "responsive", "satisfied", "smooth", "useful", "wonderful",
    "ayos", "ganda", "gusto", "kapaki-pakinabang", "magaling", "maganda", "mahusay", "malinaw",
    "masaya", "mabilis", "madali", "nakakaaliw", "nakakamangha", "nasiyahan", "salamat", "sulit",
}
_NEGATIVE_TERMS = {
    "bad", "boring", "broken", "confusing", "difficult", "disappointed", "error", "frustrating",
    "hard", "inaccessible", "issue", "poor", "problem", "slow", "terrible", "unhelpful", "worst",
    "kulang", "mabagal", "mahirap", "mahina", "nakakadismaya", "nakakainis", "nakakalito", "pangit",
    "problema", "sira",
}
_NEGATIONS = {"not", "never", "no", "isn't", "wasn't", "didn't", "hindi", "di", "wala", "walang"}
_INTENSIFIERS = {"very", "really", "extremely", "super", "sobrang", "napaka", "talagang"}


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clamp(value: Any, minimum: float = 0.0, maximum: float = 1.0) -> float:
    try:
        return max(minimum, min(maximum, float(value)))
    except (TypeError, ValueError):
        return minimum


def _softmax(values: list[float]) -> list[float]:
    peak = max(values)
    exponentials = [math.exp(value - peak) for value in values]
    total = sum(exponentials) or 1.0
    return [value / total for value in exponentials]


def _normalize_label(value: Any) -> str:
    label = str(value or "").strip().lower().replace("_", " ")
    mapping = {
        "label 0": "negative",
        "label 1": "neutral",
        "label 2": "positive",
        "negative": "negative",
        "neutral": "neutral",
        "positive": "positive",
    }
    return mapping.get(label, "")


def _result(scores: dict[str, float], *, model: str, provider: str) -> dict[str, Any]:
    normalized = {label: round(_clamp(scores.get(label)), 4) for label in SENTIMENT_LABELS}
    total = sum(normalized.values())
    if total <= 0:
        normalized = {"positive": 0.0, "neutral": 1.0, "negative": 0.0}
    else:
        normalized = {label: round(value / total, 4) for label, value in normalized.items()}
    label = max(SENTIMENT_LABELS, key=lambda key: normalized[key])
    return {
        "sentiment_label": label,
        "sentiment_confidence": normalized[label],
        "sentiment_scores": normalized,
        "sentiment_model": model,
        "sentiment_provider": provider,
        "sentiment_analyzed_at": _utcnow_iso(),
    }


def analyze_feedback_locally(text: Any, rating: Any = 0) -> dict[str, Any]:
    """Deterministic English/Filipino fallback used when hosted inference is disabled."""
    cleaned = " ".join(str(text or "").lower().split())
    tokens = _TOKEN_PATTERN.findall(cleaned)
    positive = 0.0
    negative = 0.0

    for index, token in enumerate(tokens):
        polarity = 1 if token in _POSITIVE_TERMS else -1 if token in _NEGATIVE_TERMS else 0
        if not polarity:
            continue
        window = tokens[max(0, index - 3):index]
        multiplier = 1.45 if any(word in _INTENSIFIERS for word in window) else 1.0
        if any(word in _NEGATIONS for word in window):
            polarity *= -1
        if polarity > 0:
            positive += multiplier
        else:
            negative += multiplier

    try:
        numeric_rating = int(rating)
    except (TypeError, ValueError):
        numeric_rating = 0

    # A small rating prior stabilizes short comments, while the written response
    # remains the primary signal whenever sentiment-bearing words are present.
    rating_prior = {1: -1.2, 2: -0.65, 3: 0.0, 4: 0.65, 5: 1.2}.get(numeric_rating, 0.0)
    lexical_signal = positive - negative
    combined = lexical_signal + rating_prior * (0.35 if positive + negative else 1.0)
    evidence = positive + negative

    if not cleaned:
        model = "rating-fallback-v1"
        provider = "rating"
    else:
        model = "bilingual-lexicon-v1"
        provider = "local"

    neutral_logit = 1.25 if abs(combined) < 0.35 else max(-0.25, 0.8 - abs(combined))
    positive_logit = combined + min(evidence, 3.0) * 0.12
    negative_logit = -combined + min(evidence, 3.0) * 0.12
    probabilities = _softmax([positive_logit, neutral_logit, negative_logit])
    return _result(
        dict(zip(SENTIMENT_LABELS, probabilities)),
        model=model,
        provider=provider,
    )


def _extract_hosted_scores(payload: Any) -> dict[str, float]:
    rows = payload
    if isinstance(rows, list) and rows and isinstance(rows[0], list):
        rows = rows[0]
    if isinstance(rows, dict) and isinstance(rows.get("data"), list):
        rows = rows["data"]
    if not isinstance(rows, list):
        raise ValueError("The sentiment provider returned an unexpected response.")

    scores = {label: 0.0 for label in SENTIMENT_LABELS}
    for row in rows:
        if not isinstance(row, dict):
            continue
        label = _normalize_label(row.get("label"))
        if label:
            scores[label] = _clamp(row.get("score"))
    if not any(scores.values()):
        raise ValueError("The sentiment provider returned no recognized labels.")
    return scores


def analyze_feedback_sentiment(text: Any, rating: Any = 0) -> dict[str, Any]:
    """Use hosted XLM-T only when explicitly configured; otherwise use the local fallback.

    Only the comment text is transmitted. Visitor names, emails, account IDs, and
    other feedback metadata are intentionally excluded from the provider request.
    """
    cleaned = " ".join(str(text or "").strip().split())[:3000]
    token = str(os.getenv("HF_TOKEN") or "").strip()
    enabled = str(os.getenv("FEEDBACK_SENTIMENT_PROVIDER") or "").strip().lower() == "huggingface"
    if not cleaned or not enabled or not token:
        return analyze_feedback_locally(cleaned, rating)

    model = str(os.getenv("FEEDBACK_SENTIMENT_MODEL") or DEFAULT_SENTIMENT_MODEL).strip()
    try:
        timeout = _clamp(os.getenv("FEEDBACK_SENTIMENT_TIMEOUT_SECONDS", "8"), 2.0, 15.0)
        endpoint = "https://router.huggingface.co/hf-inference/models/" + parse.quote(model, safe="/")
        body = json.dumps({"inputs": cleaned, "parameters": {"top_k": 3}}).encode("utf-8")
        provider_request = request.Request(
            endpoint,
            data=body,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "User-Agent": "NHCP-Digital-Heritage/1.0",
            },
            method="POST",
        )
        with request.urlopen(provider_request, timeout=timeout) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
        return _result(
            _extract_hosted_scores(response_payload),
            model=model,
            provider="huggingface",
        )
    except (error.URLError, TimeoutError, ValueError, json.JSONDecodeError, OSError):
        # Feedback submission must remain available even when an external model
        # is loading, rate-limited, unavailable, or returns an unexpected payload.
        return analyze_feedback_locally(cleaned, rating)
