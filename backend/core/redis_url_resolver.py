"""Build and validate REDIS_URL from env (supports Upstash + Render)."""
from __future__ import annotations

import os
import re
from urllib.parse import quote, urlparse

_VALID_SCHEMES = ("redis", "rediss", "unix")


def _strip(raw: str) -> str:
    return (raw or "").strip().strip('"').strip("'")


def _extract_from_cli_command(raw: str) -> str | None:
    """Accept pasted `redis-cli --tls -u rediss://...` lines."""
    match = re.search(r"(rediss?://[^\s]+)", raw, re.IGNORECASE)
    return match.group(1) if match else None


def _has_valid_scheme(url: str) -> bool:
    lower = url.lower()
    return any(lower.startswith(f"{s}://") for s in _VALID_SCHEMES)


_LOCAL_DEFAULT = "redis://localhost:6379/0"


def resolve_redis_url(
    redis_url: str = "",
    *,
    host: str = "",
    password: str = "",
    port: str = "6379",
    username: str = "default",
    use_tls: bool = True,
) -> str:
    """
    Return a redis-py-compatible URL.

    Priority:
    1. REDIS_HOST + REDIS_PASSWORD (best for Render — avoids URL typos)
    2. REDIS_URL if it starts with redis:// or rediss://
    3. redis:// URL inside a pasted redis-cli command
    """
    on_render = bool(os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID"))

    env_host = _strip(host) or _strip(os.getenv("REDIS_HOST", ""))
    env_password = (
        _strip(password)
        or _strip(os.getenv("REDIS_PASSWORD", ""))
        or _strip(os.getenv("UPSTASH_REDIS_REST_TOKEN", ""))
    )
    env_port = _strip(port) or _strip(os.getenv("REDIS_PORT", "")) or "6379"
    env_user = _strip(username) or _strip(os.getenv("REDIS_USERNAME", "")) or "default"
    tls_env = _strip(os.getenv("REDIS_TLS", "true")).lower()
    use_tls = use_tls if tls_env == "" else tls_env in ("1", "true", "yes", "on")

    if env_host and env_password:
        scheme = "rediss" if use_tls else "redis"
        user = quote(env_user, safe="")
        pwd = quote(env_password, safe="")
        return f"{scheme}://{user}:{pwd}@{env_host}:{env_port}"

    raw = _strip(redis_url)
    if raw == _LOCAL_DEFAULT and on_render:
        raw = ""

    if raw:
        cli_url = _extract_from_cli_command(raw)
        if cli_url:
            raw = cli_url
        if _has_valid_scheme(raw):
            if on_render and "localhost" in raw:
                raise ValueError(
                    "REDIS_URL points to localhost on Render. "
                    "Set REDIS_HOST + REDIS_PASSWORD or a rediss:// Upstash URL."
                )
            return raw
        if raw.lower().startswith(("http://", "https://")):
            raise ValueError(
                "REDIS_URL must use rediss:// not https://. "
                "Upstash: Connect tab → redis-cli / TCP URL."
            )

    if raw and "://" not in raw:
        raise ValueError(
            f"REDIS_URL looks like a hostname only ({raw[:40]}...). "
            "Set the full URL: rediss://default:TOKEN@host:6379 "
            "OR set REDIS_HOST + REDIS_PASSWORD on Render instead."
        )

    if not raw:
        on_render = bool(os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID"))
        if on_render:
            raise ValueError(
                "Redis is not configured on Render. Set either:\n"
                "  REDIS_URL=rediss://default:TOKEN@apparent-oriole-94450.upstash.io:6379\n"
                "or (easier):\n"
                "  REDIS_HOST=apparent-oriole-94450.upstash.io\n"
                "  REDIS_PASSWORD=your_upstash_token\n"
                "  REDIS_TLS=true"
            )
        return "redis://localhost:6379/0"

    raise ValueError(
        "REDIS_URL must start with redis:// or rediss://. "
        f"Current value begins with: {raw[:30]!r}..."
    )


def redis_url_diagnostics(url: str) -> str:
    """Safe log line (no password)."""
    try:
        p = urlparse(url)
        return f"{p.scheme}://{p.hostname}:{p.port or 6379}"
    except Exception:
        return "(invalid url)"
