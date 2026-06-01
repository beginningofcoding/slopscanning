import os
from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from core.redis_url_resolver import resolve_redis_url

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
ENV_PATH = os.path.join(BASE_DIR, ".env")
ROOT_ENV_PATH = os.path.join(ROOT_DIR, ".env")


def _env_files() -> tuple[str, ...]:
    """On Render/production, use only platform env vars (never a baked-in .env)."""
    if os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID"):
        return ()
    return (ENV_PATH, ROOT_ENV_PATH)


class Settings(BaseSettings):
    """Central configuration for the SlopScanning backend."""

    model_config = SettingsConfigDict(
        env_file=_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Database (Removed) ──────────────────────────────────
    # DATABASE_URL: str = (
    #     "postgresql+asyncpg://postgres:postgres@localhost:5432/slopscanning"
    # )

    # ── Redis ───────────────────────────────────────────────
    # Option A: full URL (Upstash Connect → redis-cli line)
    REDIS_URL: str = "redis://localhost:6379/0"
    # Option B (Render-friendly): host + password instead of full URL
    REDIS_HOST: str = ""
    REDIS_PASSWORD: str = ""
    REDIS_PORT: str = "6379"
    REDIS_USERNAME: str = "default"
    REDIS_TLS: bool = True

    # ── GitHub ──────────────────────────────────────────────
    GITHUB_TOKEN: str = ""

    # ── Fireworks AI (primary) ──────────────────────────────
    FIREWORKS_API_KEY: str = ""
    # DeepSeek-V4-Pro: frontier coding + reasoning, 1M context (best for SlopScanning audits)
    FIREWORKS_MODEL: str = "accounts/fireworks/models/deepseek-v4-pro"

    # ── Gemini AI (fallback) ────────────────────────────────
    GEMINI_API_KEY: str = ""

    # ── Legacy / optional ───────────────────────────────────
    GROQ_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""

    # ── Sandboxing ──────────────────────────────────────────
    SANDBOX_ROOT: str = "/tmp/sandboxed"
    MAX_REPO_SIZE_MB: int = 200
    SCAN_TIMEOUT_SECONDS: int = 120

    # ── CORS ────────────────────────────────────────────────
    # Example:
    # CORS_ORIGINS=https://slop-scanning-theta.vercel.app
    CORS_ORIGINS: str = ""

    # ── Embedding Model ─────────────────────────────────────
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # ── Unified audit ───────────────────────────────────────
    AUDIT_LLM_BRIEF: bool = True
    AUDIT_MAX_CODE_FILES: int = 50
    AUDIT_PR_SAMPLE: int = 3
    AUDIT_COMMIT_SAMPLE: int = 20

    @model_validator(mode="after")
    def _assemble_redis_url(self) -> "Settings":
        resolved = resolve_redis_url(
            self.REDIS_URL,
            host=self.REDIS_HOST,
            password=self.REDIS_PASSWORD,
            port=self.REDIS_PORT,
            username=self.REDIS_USERNAME,
            use_tls=self.REDIS_TLS,
        )
        self.REDIS_URL = resolved
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        """
        Always allow localhost for development.
        Additionally load production origins from CORS_ORIGINS in .env.
        """

        origins = {
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        }

        if self.CORS_ORIGINS:
            origins.update(
                origin.strip()
                for origin in self.CORS_ORIGINS.split(",")
                if origin.strip()
            )

        return list(origins)


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (parsed once per process)."""
    return Settings()