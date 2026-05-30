"""
Async Redis client singleton.
"""
import logging
import os

import redis.asyncio as aioredis

from core.config import get_settings
from core.redis_url import redis_url_diagnostics

logger = logging.getLogger(__name__)

redis_client: aioredis.Redis | None = None


def _redis_setup_hint(url: str) -> str:
    from urllib.parse import urlparse

    host = urlparse(url).hostname or "unknown"
    on_render = bool(os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID"))
    if host in ("localhost", "127.0.0.1"):
        if on_render:
            return (
                "Redis still points at localhost on Render. "
                "Set REDIS_URL or REDIS_HOST + REDIS_PASSWORD in Environment."
            )
        return "Start local Redis (docker compose up redis) or set REDIS_URL in .env."
    return f"Check credentials and TLS (rediss://) for host {host}."


async def init_redis() -> aioredis.Redis:
    """Create and store the Redis connection from settings."""
    global redis_client  # noqa: PLW0603
    settings = get_settings()
    url = settings.REDIS_URL
    logger.info("Connecting to Redis at %s", redis_url_diagnostics(url))

    connect_kwargs: dict = {"decode_responses": True}
    if url.lower().startswith("rediss://"):
        connect_kwargs["ssl_cert_reqs"] = None

    try:
        redis_client = aioredis.from_url(url, **connect_kwargs)
        await redis_client.ping()
    except ValueError as exc:
        raise ValueError(
            f"{exc}. On Render use REDIS_HOST + REDIS_PASSWORD, or "
            "REDIS_URL=rediss://default:TOKEN@host.upstash.io:6379"
        ) from exc
    except Exception as exc:
        hint = _redis_setup_hint(url)
        raise ConnectionError(f"Redis connection failed. {hint}") from exc

    logger.info("Redis connected")
    return redis_client


async def close_redis() -> None:
    """Gracefully close the Redis connection."""
    global redis_client  # noqa: PLW0603
    if redis_client is not None:
        await redis_client.aclose()
        redis_client = None


async def get_redis() -> aioredis.Redis:
    """FastAPI dependency that returns the Redis client."""
    if redis_client is None:
        raise RuntimeError("Redis client is not initialised. Call init_redis() first.")
    return redis_client
