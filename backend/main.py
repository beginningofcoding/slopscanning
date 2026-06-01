"""
main.py — SlopScanning FastAPI application entry point.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.app_config import get_settings
from core.project_metadata import PROJECT_AUTHOR, PROJECT_GITHUB_URL, PROJECT_NAME, PROJECT_SLUG
from core.redis_client import init_redis, close_redis
from routers import github_router, pr_review_router, docs_verifier_router, code_review_router, commit_verifier_router, repo_audit_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting SlopScanning backend…")

    # Redis
    await init_redis()
    logger.info("Redis connected")

    # NLTK and Tree-sitter data downloads removed (unused services)

    # Embedding model warm-up removed per user request

    logger.info("SlopScanning startup complete")
    yield

    # Shutdown
    await close_redis()
    from services.github_service import close_client
    await close_client()
    logger.info("SlopScanning shutdown complete")


app = FastAPI(
    title=PROJECT_NAME,
    description=f"{PROJECT_NAME} API — by {PROJECT_AUTHOR}",
    version="1.0.0",
    lifespan=lifespan,
    contact={"name": PROJECT_AUTHOR, "url": PROJECT_GITHUB_URL},
    license_info={"name": "MIT", "url": f"{PROJECT_GITHUB_URL}/blob/main/LICENSE"},
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers — no /api prefix (frontend hits these paths directly at port 8000)
app.include_router(github_router.router)
app.include_router(pr_review_router.router)
app.include_router(docs_verifier_router.router)
app.include_router(code_review_router.router)
app.include_router(commit_verifier_router.router)
app.include_router(repo_audit_router.router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": PROJECT_SLUG,
        "name": PROJECT_NAME,
        "author": PROJECT_AUTHOR,
        "repository": PROJECT_GITHUB_URL,
    }