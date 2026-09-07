"""
Period-aware cache for admin dashboard analytics endpoints.
Uses a version counter so invalidation works with LocMem and Redis.
"""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

from backend.cache_utils import cache_get, cache_set

logger = logging.getLogger(__name__)

ANALYTICS_VERSION_KEY = "admin:analytics:version"
ANALYTICS_TTL = 15 * 60  # 15 minutes


def _analytics_version() -> int:
    version = cache_get(ANALYTICS_VERSION_KEY, 1)
    try:
        return int(version or 1)
    except (TypeError, ValueError):
        return 1


def invalidate_analytics_cache() -> None:
    """
    Bump the analytics cache version so all period-keyed entries miss.
    """
    version = _analytics_version()
    # Keep version key alive longer than analytics payloads.
    cache_set(ANALYTICS_VERSION_KEY, version + 1, ANALYTICS_TTL * 4)


def _normalize_filters(filters: dict[str, Any] | None) -> dict[str, Any]:
    if not filters:
        return {}

    # Prefer stable period-based keys. Including rolling start/end dates
    # is unnecessary when period is set and can cause avoidable misses.
    period = filters.get("period")
    custom_from = filters.get("from") or filters.get("start_date")
    custom_to = filters.get("to") or filters.get("end_date")
    has_custom_range = bool(filters.get("from") or filters.get("to"))

    normalized: dict[str, Any] = {
        "period": period or "30d",
        "service": filters.get("service") or None,
        "provider_id": filters.get("provider_id") or None,
        "status": filters.get("status") or None,
    }

    if has_custom_range:
        for key, value in (
            ("from", custom_from),
            ("to", custom_to),
        ):
            if value is None:
                continue
            if hasattr(value, "isoformat"):
                value = value.isoformat()
            normalized[key] = value

    return normalized


def make_analytics_cache_key(endpoint: str, filters: dict[str, Any] | None = None) -> str:
    payload = {
        "endpoint": endpoint,
        "filters": _normalize_filters(filters),
        "version": _analytics_version(),
    }
    digest = hashlib.sha256(
        json.dumps(payload, sort_keys=True, default=str).encode("utf-8"),
    ).hexdigest()[:24]
    return f"admin:analytics:v3:{endpoint}:{digest}"


def get_analytics_cache(endpoint: str, filters: dict[str, Any] | None = None) -> Any | None:
    key = make_analytics_cache_key(endpoint, filters)
    cached = cache_get(key)
    if cached is not None:
        logger.debug("analytics cache HIT %s", key)
    else:
        logger.debug("analytics cache MISS %s", key)
    return cached


def set_analytics_cache(
    endpoint: str,
    filters: dict[str, Any] | None,
    payload: Any,
    ttl: int = ANALYTICS_TTL,
) -> None:
    key = make_analytics_cache_key(endpoint, filters)
    ok = cache_set(key, payload, ttl)
    if ok:
        logger.debug("analytics cache SET %s ttl=%s", key, ttl)
